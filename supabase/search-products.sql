-- ============ Server-side catalog search (Phase 2) ============
-- Needs supabase/metrics-workers.sql first (it creates product_metrics).
-- Filters, sorts and pages in one query with the same parameter names and
-- sort keys as readCatalogFilters() in src/utils/catalog.ts.
create extension if not exists pg_trgm;

do $$ begin
  if not exists (select 1 from information_schema.columns where table_name = 'products' and column_name = 'search') then
    alter table products add column search tsvector
      generated always as (to_tsvector('english', product_name || ' ' || category || ' ' || coalesce(seller_name, ''))) stored;
  end if;
end $$;
create index if not exists products_search_idx on products using gin (search);
create index if not exists products_category_price_idx on products (category, current_price);

-- One round trip: filter, count, facet and page in Postgres.
create or replace function search_products(
  p_q text, p_categories text[], p_sellers text[],
  p_min numeric, p_max numeric, p_min_rating numeric,
  p_near_low boolean, p_price_lock boolean, p_recommended boolean,
  p_sort text, p_offset int, p_limit int
) returns jsonb
language sql stable security invoker as $$
  with hits as (
    select p.*, m.amazin_score, m.deal_score, m.pct_from_low, m.spark_30d, m.badges
    from products p
    join product_metrics m using (product_id)
    join sellers s on s.seller_id = p.seller_id
    where (p_q is null or p.search @@ websearch_to_tsquery('english', p_q)
                       or p_q <% p.product_name)                      -- pg_trgm word similarity (typos)
      and (cardinality(p_categories) = 0 or p.category = any(p_categories))
      and (cardinality(p_sellers)    = 0 or p.seller_id = any(p_sellers))
      and (p_min is null or p.current_price >= p_min)
      and (p_max is null or p.current_price <= p_max)
      and (p_min_rating is null or p.product_rating >= p_min_rating)
      and (not p_near_low    or p.current_price <= p.all_time_low_price * 1.10)
      and (not p_price_lock  or s.price_lock_eligible = 1)
      and (not p_recommended or p.store_recommended = 1)
  ),
  page as (
    select * from hits
    order by
      case when p_sort = 'name'       then product_name end asc,
      case when p_sort = 'price-asc'  then current_price end asc,
      case when p_sort = 'price-desc' then current_price end desc,
      case when p_sort = 'deal'       then deal_score end desc,
      case when p_sort = 'rating'     then product_rating end desc,
      case when p_sort = 'score'      then amazin_score end desc,
      product_name, product_id              -- same tie-break as applyCatalogFilters()
    offset p_offset limit p_limit
  )
  select jsonb_build_object(
    'total',  (select count(*) from hits),
    'items',  coalesce((select jsonb_agg(to_jsonb(page)) from page), '[]'::jsonb),
    'facets', jsonb_build_object(
      'category', coalesce((select jsonb_agg(jsonb_build_object('value', category, 'count', n))
                            from (select category, count(*) n from hits group by category order by category) c), '[]'::jsonb)
    )
  );
$$;

grant execute on function search_products(text, text[], text[], numeric, numeric, numeric, boolean, boolean, boolean, text, int, int) to anon, authenticated;
