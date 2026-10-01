-- ============ Amazin metrics workers (Postgres 15+ / Supabase) ============
-- Run after supabase-setup.sql. Then schedule the jobs (enable pg_cron first):
--   select cron.schedule('amazin-snapshot-prices', '5 0 * * *',  $$select snapshot_prices()$$);
--   select cron.schedule('amazin-nightly-metrics', '15 0 * * *', $$select compute_seller_metrics(); select compute_product_metrics(null)$$);
--   select cron.schedule('amazin-metrics-queue',   '*/5 * * * *', $$select process_metrics_queue()$$);
-- Safe to run more than once.

-- One close per product per day.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'price_history_one_per_day') then
    alter table price_history add constraint price_history_one_per_day unique (product_id, recorded_at);
  end if;
end $$;

create table if not exists seller_metrics (
  seller_id         text primary key references sellers(seller_id) on delete cascade,
  seller_score      smallint not null,                 -- 0-100, same formula as calculateSellerRating()
  price_factor      smallint not null,
  quality_factor    smallint not null,
  delivery_factor   smallint not null,
  reviews_90d       int not null default 0,
  avg_review_90d    numeric(3,2),
  flags             text[] not null default '{}',
  computed_at       timestamptz not null default now()
);

create table if not exists product_metrics (
  product_id      text primary key references products(product_id) on delete cascade,
  amazin_score    smallint not null,
  deal_score      smallint not null,
  pct_from_low    numeric(8,2) not null,
  volatility_30d  numeric(6,4),
  all_time_low    numeric(10,2) not null,
  all_time_low_at date,
  high_30d        numeric(10,2) not null,
  spark_30d       numeric(10,2)[] not null default '{}',
  badges          text[] not null default '{}',
  computed_at     timestamptz not null default now()
);

-- Products whose price changed and need recomputing soon.
create table if not exists metrics_queue (
  product_id  text primary key references products(product_id) on delete cascade,
  queued_at   timestamptz not null default now()
);

-- Every price drop, for the alert sender (feature 7.1).
create table if not exists price_drop_events (
  id          bigint generated always as identity primary key,
  product_id  text not null references products(product_id) on delete cascade,
  old_price   numeric(10,2) not null,
  new_price   numeric(10,2) not null,
  created_at  timestamptz not null default now(),
  processed_at timestamptz
);

-- Price and rating columns are `real`, so clamp works on double precision.
create or replace function clamp100(v double precision) returns double precision
language sql immutable as $$ select greatest(0, least(100, v)) $$;

-- 1) Daily snapshot: today's price for every product.
create or replace function snapshot_prices() returns int
language plpgsql as $$
declare n int;
begin
  insert into price_history (product_id, price, recorded_at)
  select product_id, current_price, current_date from products
  on conflict (product_id, recorded_at) do update set price = excluded.price;
  get diagnostics n = row_count;
  return n;
end $$;

-- 2) Seller scores: price 35%, quality 40%, delivery 25% (calculateSellerRating()).
create or replace function compute_seller_metrics() returns int
language plpgsql as $$
declare n int;
begin
  insert into seller_metrics as sm (seller_id, seller_score, price_factor, quality_factor, delivery_factor,
                                    reviews_90d, avg_review_90d, flags, computed_at)
  select s.seller_id,
         round(clamp100(f.price * 0.35 + f.quality * 0.40 + f.delivery * 0.25)),
         f.price, f.quality, f.delivery,
         coalesce(r.n, 0), r.avg_rating,
         array_remove(array[
           case when s.price_rating >= 4 and s.quality_rating < 3 then 'cheap_but_risky' end,
           case when s.quality_rating < 2.5 then 'quality_concerns' end,
           case when s.delivery_time_rating < 2.2 then 'slow_delivery' end
         ], null),
         now()
  from sellers s
  cross join lateral (select round(s.price_rating * 20) as price,
                             round(s.quality_rating * 20) as quality,
                             round(s.delivery_time_rating * 20) as delivery) f
  left join lateral (select count(*) as n, round(avg(rating)::numeric, 2) as avg_rating
                     from seller_reviews sr
                     where sr.seller_id = s.seller_id
                       and sr.review_date >= current_date - 90) r on true
  on conflict (seller_id) do update set
    seller_score = excluded.seller_score, price_factor = excluded.price_factor,
    quality_factor = excluded.quality_factor, delivery_factor = excluded.delivery_factor,
    reviews_90d = excluded.reviews_90d, avg_review_90d = excluded.avg_review_90d,
    flags = excluded.flags, computed_at = excluded.computed_at;
  get diagnostics n = row_count;
  return n;
end $$;

-- 3) Product metrics. Pass null to recompute every product, or a list of ids.
create or replace function compute_product_metrics(p_ids text[] default null) returns int
language plpgsql as $$
declare n int;
begin
  insert into product_metrics as pm (product_id, amazin_score, deal_score, pct_from_low, volatility_30d,
                                     all_time_low, all_time_low_at, high_30d, spark_30d, badges, computed_at)
  select p.product_id,
         -- calculateProductRating(): rating 50%, deal 30%, seller 20%
         round(clamp100(round(clamp100(p.product_rating * 20)) * 0.5 + d.deal * 0.3 + coalesce(sm.seller_score, 50) * 0.2)),
         d.deal,
         round(((p.current_price - lo.atl) / nullif(lo.atl, 0) * 100)::numeric, 2),
         case when h30.n >= 7 then round((h30.sd / nullif(h30.mean, 0))::numeric, 4) end,
         lo.atl, lo.atl_at, hi.high30, coalesce(h30.closes, '{}'),
         array_remove(array[
           case when p.product_rating < 3 then 'low_rating' end,
           case when s.quality_rating < 2.5 then 'quality_concerns' end,
           case when p.current_price <= lo.atl * 1.10 + 1e-9 then 'near_low' end,
           case when p.store_recommended = 1 then 'store_rec' end,
           case when d.deal <= 15 then 'near_30d_high' end,
           case when sm.seller_score >= 80 then 'top_value_seller' end
         ], null),
         now()
  from products p
  join sellers s on s.seller_id = p.seller_id
  left join seller_metrics sm on sm.seller_id = p.seller_id
  -- last 30 daily closes, oldest first
  cross join lateral (
    select count(*) as n, avg(price) as mean, stddev_samp(price) as sd, max(price) as max30,
           array_agg(round(price::numeric, 2) order by recorded_at) as closes
    from (select price, recorded_at from price_history ph
          where ph.product_id = p.product_id and ph.recorded_at > current_date - 30
          order by recorded_at desc limit 30) last30
  ) h30
  -- all-time low: the lower of the stored low and every recorded close
  cross join lateral (
    select least(coalesce(min(ph.price), p.all_time_low_price), coalesce(p.all_time_low_price, min(ph.price)), p.current_price) as atl,
           (select recorded_at from price_history x where x.product_id = p.product_id
            order by x.price asc, x.recorded_at desc limit 1) as atl_at
    from price_history ph where ph.product_id = p.product_id
  ) lo
  -- 30-day high: from recorded closes once there are 7+ of them in the window;
  -- until then also respect the stored value. Never below today's price.
  cross join lateral (
    select greatest(
             case when h30.n >= 7 then h30.max30
                  else greatest(coalesce(h30.max30, p.thirty_day_high_price), coalesce(p.thirty_day_high_price, h30.max30)) end,
             p.current_price) as high30
  ) hi
  -- calculateDealScore(): 100 at the all-time low, 0 at or above the 30-day high
  cross join lateral (
    select case when hi.high30 - lo.atl <= 0 then 50
                else round(clamp100((hi.high30 - p.current_price) / (hi.high30 - lo.atl) * 100)) end as deal
  ) d
  where p_ids is null or p.product_id = any(p_ids)
  on conflict (product_id) do update set
    amazin_score = excluded.amazin_score, deal_score = excluded.deal_score,
    pct_from_low = excluded.pct_from_low, volatility_30d = excluded.volatility_30d,
    all_time_low = excluded.all_time_low, all_time_low_at = excluded.all_time_low_at,
    high_30d = excluded.high_30d, spark_30d = excluded.spark_30d,
    badges = excluded.badges, computed_at = excluded.computed_at;
  get diagnostics n = row_count;

  -- keep the columns today's frontend reads in step with the metrics
  update products p set all_time_low_price = pm.all_time_low, thirty_day_high_price = pm.high_30d
  from product_metrics pm
  where pm.product_id = p.product_id and (p_ids is null or p.product_id = any(p_ids))
    and (p.all_time_low_price is distinct from pm.all_time_low or p.thirty_day_high_price is distinct from pm.high_30d);
  return n;
end $$;

-- 4) On any price change: queue the product, and log drops for alerts.
create or replace function on_price_change() returns trigger
language plpgsql as $$
begin
  if new.current_price is distinct from old.current_price then
    insert into metrics_queue (product_id) values (new.product_id)
    on conflict (product_id) do update set queued_at = now();
    if new.current_price < old.current_price then
      insert into price_drop_events (product_id, old_price, new_price)
      values (new.product_id, old.current_price, new.current_price);
    end if;
  end if;
  return new;
end $$;

drop trigger if exists products_price_change on products;
create trigger products_price_change after update of current_price on products
for each row execute function on_price_change();

-- 5) Drain the queue (runs every 5 minutes). skip locked = safe if two runs overlap.
create or replace function process_metrics_queue() returns int
language plpgsql as $$
declare ids text[];
begin
  with taken as (
    delete from metrics_queue
    where product_id in (select product_id from metrics_queue order by queued_at limit 500 for update skip locked)
    returning product_id
  )
  select array_agg(product_id) into ids from taken;
  if ids is null then return 0; end if;
  return compute_product_metrics(ids);
end $$;
