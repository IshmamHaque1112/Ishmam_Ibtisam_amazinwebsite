-- READ BEFORE RUNNING: this closes the open "anon can insert anything" policies.
-- Ship it together with the app change that stops the browser inserting into
-- `customers` (registerCustomer should call supabase.auth.signUp with
-- options.data.display_name and let the trigger below create the row), and
-- backfill customers.auth_user_id for the demo accounts. Running it alone
-- will make new sign-ups fail. Needs a server-side checkout that writes
-- `orders` before seller reviews can be posted again.
-- ============ Lock down writes: signed-in users only, as themselves ============
-- Run after supabase-setup.sql. Safe to run more than once.

-- 1) Link each customer row to its Supabase Auth user.
alter table customers add column if not exists auth_user_id uuid unique references auth.users(id) on delete cascade;
alter table customers add column if not exists role text not null default 'shopper'
  check (role in ('shopper', 'seller', 'admin'));

-- The signed-in user's username (null for guests).
create or replace function current_username() returns text
language sql stable security definer set search_path = public as $$
  select username from customers where auth_user_id = auth.uid()
$$;

-- 2) New Auth users get their customers row from the server, not the browser.
--    The app signs up with email = <username>@accounts.amazin.invalid and
--    options.data.display_name, so both values arrive here.
create or replace function handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_username text := split_part(new.email, '@', 1);
begin
  if new.email like '%@accounts.amazin.invalid' then
    insert into customers (customer_id, username, display_name, join_date, auth_user_id)
    values ('C' || replace(new.id::text, '-', ''), v_username,
            coalesce(new.raw_user_meta_data ->> 'display_name', v_username),
            to_char(now(), 'YYYY-MM-DD'), new.id)
    on conflict (username) do update set auth_user_id = excluded.auth_user_id
      where customers.auth_user_id is null;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function handle_new_auth_user();

-- 3) Orders on the server, so "verified buyer" can be checked by the database.
create table if not exists orders (
  order_id    uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  placed_at   timestamptz not null default now(),
  subtotal    numeric(10,2) not null,
  tax         numeric(10,2) not null,
  shipping    numeric(10,2) not null,
  total       numeric(10,2) not null
);
create table if not exists order_items (
  order_id    uuid not null references orders(order_id) on delete cascade,
  product_id  text not null references products(product_id),
  seller_id   text not null references sellers(seller_id),
  quantity    int not null check (quantity between 1 and 10),
  unit_price  numeric(10,2) not null,
  primary key (order_id, product_id)
);
alter table orders enable row level security;
alter table order_items enable row level security;
drop policy if exists orders_own_read on orders;
create policy orders_own_read on orders for select to authenticated using (owner_id = auth.uid());
drop policy if exists order_items_own_read on order_items;
create policy order_items_own_read on order_items for select to authenticated
  using (exists (select 1 from orders o where o.order_id = order_items.order_id and o.owner_id = auth.uid()));
-- No insert policy: orders are written by the server (service role) at checkout.

create or replace function is_verified_buyer(p_seller text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from orders o join order_items i using (order_id)
                 where o.owner_id = auth.uid() and i.seller_id = p_seller)
$$;

-- 4) Replace every open anon insert policy.
drop policy if exists customers_insert on customers;
drop policy if exists product_reviews_insert on product_reviews;
drop policy if exists seller_reviews_insert on seller_reviews;
drop policy if exists product_tags_insert on product_tags;
drop policy if exists seller_tags_insert on seller_tags;

create policy product_reviews_insert on product_reviews for insert to authenticated
  with check (username = current_username());

create policy seller_reviews_insert on seller_reviews for insert to authenticated
  with check (username = current_username() and is_verified_buyer(seller_id));

create policy product_tags_insert on product_tags for insert to authenticated
  with check (added_by_username = current_username());

create policy seller_tags_insert on seller_tags for insert to authenticated
  with check (added_by_username = current_username());

-- customers: no insert policy at all (the trigger above creates rows).
-- A user may change only their own display name and favourite category.
drop policy if exists customers_update_own on customers;
create policy customers_update_own on customers for update to authenticated
  using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());
revoke update on customers from anon, authenticated;
grant update (display_name, favorite_category) on customers to authenticated;
