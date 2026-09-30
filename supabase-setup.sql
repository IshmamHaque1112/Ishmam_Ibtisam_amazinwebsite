-- Amazin: Supabase setup
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- It is safe to run more than once (it only creates what's missing and
-- upserts the seed rows).

-- ---------- Tables ----------
create table if not exists sellers (
  seller_id text primary key,
  seller_name text not null,
  return_policy text,
  source_of_supply text,
  years_active integer,
  price_rating real,
  quality_rating real,
  delivery_time_rating real,
  overall_rating real,
  price_lock_eligible integer not null default 0,
  blurb text
);

create table if not exists products (
  product_id text primary key,
  product_name text not null,
  category text not null,
  current_price real not null,
  all_time_low_price real,
  thirty_day_high_price real,
  store_recommended integer not null default 0,
  product_rating real,
  seller_id text references sellers(seller_id),
  seller_name text
);
create index if not exists idx_products_category on products(category);
create index if not exists idx_products_seller on products(seller_id);

-- Passwords are NOT stored here. The browser can read this table with the
-- public anon key, so a password column would be visible to anyone. Use
-- Supabase Auth for real passwords.
create table if not exists customers (
  customer_id text primary key,
  username text not null unique,
  display_name text not null,
  join_date text not null,
  account_type text not null default 'New',
  favorite_category text,
  avg_cart_size integer default 0,
  has_left_seller_ratings integer not null default 0
);

create table if not exists product_reviews (
  review_id uuid primary key default gen_random_uuid(),
  product_id text not null references products(product_id),
  username text not null,
  rating integer not null check (rating between 1 and 5),
  title text,
  review_text text,
  review_date date not null default current_date,
  helpful_votes integer not null default 0
);

create table if not exists seller_reviews (
  review_id uuid primary key default gen_random_uuid(),
  seller_id text not null references sellers(seller_id),
  username text not null,
  rating integer not null check (rating between 1 and 5),
  title text,
  review_text text,
  review_date date not null default current_date,
  helpful_votes integer not null default 0
);

create table if not exists product_tags (
  id bigint generated always as identity primary key,
  product_id text not null references products(product_id),
  tag_name text not null,
  added_by_username text not null,
  date_added date not null default current_date
);

create table if not exists seller_tags (
  id bigint generated always as identity primary key,
  seller_id text not null references sellers(seller_id),
  tag_name text not null,
  added_by_username text not null,
  date_added date not null default current_date
);

create table if not exists price_history (
  id bigint generated always as identity primary key,
  product_id text not null references products(product_id),
  price real not null,
  recorded_at date not null default current_date
);

-- ---------- Row Level Security ----------
-- The site uses the public anon key, so every table needs explicit policies.
-- Catalog tables are read-only for visitors; reviews, tags and new customer
-- accounts can be added but not changed or deleted.
alter table sellers enable row level security;
alter table products enable row level security;
alter table customers enable row level security;
alter table product_reviews enable row level security;
alter table seller_reviews enable row level security;
alter table product_tags enable row level security;
alter table seller_tags enable row level security;
alter table price_history enable row level security;

do $$
declare t text;
begin
  foreach t in array array['sellers','products','customers','product_reviews','seller_reviews','product_tags','seller_tags','price_history'] loop
    if not exists (select 1 from pg_policies where tablename = t and policyname = t || '_read') then
      execute format('create policy %I on %I for select to anon, authenticated using (true)', t || '_read', t);
    end if;
  end loop;
  foreach t in array array['customers','product_reviews','seller_reviews','product_tags','seller_tags'] loop
    if not exists (select 1 from pg_policies where tablename = t and policyname = t || '_insert') then
      execute format('create policy %I on %I for insert to anon, authenticated with check (true)', t || '_insert', t);
    end if;
  end loop;
end $$;

-- ---------- Seed data (from src/data/*.csv) ----------

insert into sellers (seller_id, seller_name, return_policy, source_of_supply, years_active, price_rating, quality_rating, delivery_time_rating, overall_rating, price_lock_eligible, blurb) values
  ('S001', 'Northwind Traders', '60-day returns, buyer pays shipping', 'Overseas manufacturer (Vietnam)', 4, 3.9, 2.1, 2.5, 2.83, 1, 'A general merchandise seller with over a decade on the platform, known for consistent packaging and predictable delivery windows.'),
  ('S002', 'BlueCrate Supply Co.', '60-day returns, buyer pays shipping', 'Domestic manufacturer (Canada)', 1, 3.8, 2.1, 1.8, 2.57, 1, 'A supply company specializing in bulk household goods, popular with shoppers who restock the same essentials regularly.'),
  ('S003', 'Everstock Wholesale', '45-day returns, store credit only', 'Direct from artisan co-op', 1, 4.1, 4.1, 3.0, 3.73, 1, 'A wholesale outfit moving high volumes of everyday items, which keeps prices competitive but customer service response times average.'),
  ('S004', 'Pinecone Goods', 'No returns accepted', 'Overseas manufacturer (China)', 3, 4.1, 3.0, 2.0, 3.03, 0, 'A boutique goods seller that pays close attention to how fragile items are packed, favored for gifts and breakables.'),
  ('S005', 'Harbor & Vine Imports', '30-day free returns', 'Third-party liquidation stock', 18, 2.3, 4.5, 3.6, 3.47, 1, 'An imports specialist bringing in home goods sourced from small overseas workshops, with limited-run inventory that sells out fast.'),
  ('S006', 'Redwood Mercantile', 'No returns accepted', 'Regional wholesale distributor', 3, 4.9, 3.1, 3.4, 3.8, 1, 'A mercantile seller with a broad, ever-changing catalog spanning kitchen, decor, and outdoor categories.'),
  ('S007', 'Summit Peak Distributors', '60-day returns, buyer pays shipping', 'Overseas manufacturer (China)', 13, 4.0, 4.3, 4.9, 4.4, 0, 'A distributor known for going out of its way on service recovery — missing items are typically resolved within a day.'),
  ('S008', 'Glacier Bay Outfitters', 'No returns accepted', 'Regional wholesale distributor', 9, 3.4, 4.5, 2.1, 3.33, 1, 'An outfitter focused on outdoor and travel gear, with dependable but unremarkable shipping speed.'),
  ('S009', 'Ember & Oak Trading', '14-day returns (restocking fee applies)', 'Third-party liquidation stock', 13, 3.8, 2.5, 4.1, 3.47, 0, 'A trading company blending home goods with seasonal decor, restocking inventory every few weeks.'),
  ('S010', 'Cascade Supply Chain', 'No returns accepted', 'Domestic manufacturer (USA)', 8, 5.0, 3.9, 3.4, 4.1, 1, 'A supply chain specialist that consistently ships same-day, a favorite among shoppers who need items quickly.'),
  ('S011', 'Luma Home Goods', 'No returns accepted', 'Regional wholesale distributor', 16, 4.4, 3.2, 1.7, 3.1, 0, 'A home goods seller with a design-forward catalog, though pricing tends to run slightly above average for similar items.'),
  ('S012', 'Wrenfield Industries', '14-day returns (restocking fee applies)', 'Regional wholesale distributor', 18, 4.7, 3.9, 2.0, 3.53, 0, 'An industrial supplier of hardware and tools, reliable on product quality but with a return process some shoppers find tedious.'),
  ('S013', 'Coral Reef Imports', 'No returns accepted', 'Regional wholesale distributor', 5, 4.2, 3.3, 3.5, 3.67, 0, 'An imports seller specializing in coastal and nautical-themed goods, with seasonal inventory swings.'),
  ('S014', 'Ironclad Hardware Co.', '14-day returns (restocking fee applies)', 'Overseas manufacturer (India)', 3, 2.3, 2.1, 1.9, 2.1, 0, 'A hardware-focused seller with a long track record, popular for tools and auto parts that match their listings closely.'),
  ('S015', 'Maplewood Provisions', '30-day free returns', 'Overseas manufacturer (China)', 18, 3.1, 5.0, 3.4, 3.83, 0, 'A provisions seller carrying pantry and kitchen staples, with steady but not especially fast shipping.'),
  ('S016', 'Solstice Sports Supply', '14-day returns (restocking fee applies)', 'Third-party liquidation stock', 1, 4.3, 3.0, 2.5, 3.27, 0, 'A sports and fitness equipment seller with a fast-growing catalog, quick to restock popular items though packaging quality gets mixed reviews.'),
  ('S017', 'Driftwood Furnishings', 'No returns, exchanges only', 'Direct from artisan co-op', 17, 4.9, 4.3, 3.3, 4.17, 1, 'A furnishings seller offering handcrafted-style home decor, with shipping times that run longer than most on the platform.'),
  ('S018', 'Granite Peak Tools', '30-day free returns', 'Domestic manufacturer (Mexico)', 16, 2.5, 4.3, 3.4, 3.4, 1, 'A tool supplier with strong product quality but delivery estimates that tend to run optimistic.'),
  ('S019', 'Sunburst Organics', '90-day returns, full refund', 'Regional wholesale distributor', 2, 2.3, 3.1, 4.9, 3.43, 1, 'An organics-focused seller specializing in wellness and grocery items, sourced primarily from domestic farms.'),
  ('S020', 'Vertex Electronics Ltd.', '45-day returns, store credit only', 'Overseas manufacturer (China)', 18, 4.6, 4.8, 1.8, 3.73, 1, 'An electronics retailer carrying a wide range of gadgets, generally reliable but priced a bit higher than competing sellers.'),
  ('S021', 'Willow Creek Crafts', '90-day returns, full refund', 'Domestic manufacturer (Canada)', 14, 2.4, 3.4, 3.4, 3.07, 1, 'A crafts and hobby seller with a loyal following among board game and DIY shoppers.'),
  ('S022', 'Anchor Point Marine', '90-day returns, full refund', 'Overseas manufacturer (India)', 12, 4.8, 4.3, 3.9, 4.33, 0, 'A marine and outdoor equipment seller known for proactive shipping updates and accurate delivery estimates.'),
  ('S023', 'Foxglove Botanicals', 'No returns, exchanges only', 'Domestic manufacturer (Mexico)', 1, 4.7, 3.4, 2.4, 3.5, 1, 'A botanicals seller specializing in plant care and garden products, with occasional stock shortages on popular items.'),
  ('S024', 'Steel Horizon Auto Parts', '30-day free returns', 'Regional wholesale distributor', 3, 3.8, 2.0, 4.0, 3.27, 1, 'An auto parts seller carrying a wide range of vehicle-specific parts, with mixed accuracy on order fulfillment.'),
  ('S025', 'Cobblestone Kitchenware', '45-day returns, store credit only', 'Regional wholesale distributor', 18, 4.6, 2.2, 2.3, 3.03, 1, 'A kitchenware seller with a reputation for consistent quality across repeat purchases, a favorite for cookware and bakeware.')
on conflict (seller_id) do update set seller_name = excluded.seller_name, return_policy = excluded.return_policy, source_of_supply = excluded.source_of_supply, years_active = excluded.years_active, price_rating = excluded.price_rating, quality_rating = excluded.quality_rating, delivery_time_rating = excluded.delivery_time_rating, overall_rating = excluded.overall_rating, price_lock_eligible = excluded.price_lock_eligible, blurb = excluded.blurb;

insert into products (product_id, product_name, category, current_price, all_time_low_price, thirty_day_high_price, store_recommended, product_rating, seller_id, seller_name) values
  ('P001', 'Organic Cane Sugar (5lb Bag)', 'Groceries', 5.62, 5.08, 6.17, 0, 2.7, 'S014', 'Ironclad Hardware Co.'),
  ('P002', 'Classic Italian Cookbook', 'Groceries', 16.45, 12.98, 17.35, 1, 4.2, 'S024', 'Steel Horizon Auto Parts'),
  ('P003', 'Vanilla Cake Mix Box', 'Groceries', 3.17, 2.53, 3.19, 0, 3.0, 'S004', 'Pinecone Goods'),
  ('P004', 'No. 2 Pencils (30-Pack)', 'School Supplies', 7.17, 6.66, 7.27, 1, 3.6, 'S008', 'Glacier Bay Outfitters'),
  ('P005', 'Wide-Ruled Composition Notebook', 'School Supplies', 3.27, 2.3, 3.33, 1, 4.8, 'S001', 'Northwind Traders'),
  ('P006', 'Backpack with Laptop Sleeve', 'School Supplies', 33.93, 25.85, 38.75, 1, 2.9, 'S013', 'Coral Reef Imports'),
  ('P007', 'Children''s Fever Reducer Syrup', 'Medicine', 11.04, 9.17, 12.66, 0, 3.6, 'S015', 'Maplewood Provisions'),
  ('P008', 'Allergy Relief Tablets (60ct)', 'Medicine', 9.51, 6.59, 9.92, 0, 4.3, 'S002', 'BlueCrate Supply Co.'),
  ('P009', 'Digital Thermometer', 'Medicine', 10.45, 9.56, 10.93, 0, 2.9, 'S017', 'Driftwood Furnishings'),
  ('P010', 'Non-Stick Frying Pan 10-inch', 'Kitchenware', 40.04, 35.87, 43.53, 0, 3.5, 'S003', 'Everstock Wholesale'),
  ('P011', 'Stainless Steel Mixing Bowl Set', 'Kitchenware', 39.17, 32.84, 42.39, 1, 4.1, 'S003', 'Everstock Wholesale'),
  ('P012', '6-Slice Toaster Oven', 'Appliances', 38.45, 35.84, 39.64, 0, 3.1, 'S023', 'Foxglove Botanicals'),
  ('P013', 'Robot Vacuum Cleaner', 'Appliances', 312.71, 256.96, 327.45, 1, 3.6, 'S003', 'Everstock Wholesale'),
  ('P014', 'Cordless Leaf Blower', 'Outdoor & Garden', 95.84, 78.02, 100.15, 0, 4.8, 'S009', 'Ember & Oak Trading'),
  ('P015', 'Garden Rake, Steel Head', 'Outdoor & Garden', 24.71, 18.29, 25.61, 0, 4.0, 'S018', 'Granite Peak Tools'),
  ('P016', 'Settlers Strategy Board Game', 'Tabletop Games', 46.49, 36.84, 52.59, 1, 4.8, 'S022', 'Anchor Point Marine'),
  ('P017', 'Cooperative Dungeon Crawler Game', 'Tabletop Games', 61.88, 53.44, 70.98, 0, 3.2, 'S005', 'Harbor & Vine Imports'),
  ('P018', 'Wireless Noise-Cancelling Headphones', 'Electronics', 87.34, 72.02, 97.26, 0, 3.7, 'S009', 'Ember & Oak Trading'),
  ('P019', 'USB-C Fast Charging Cable (6ft)', 'Electronics', 7.37, 5.92, 7.41, 1, 2.5, 'S009', 'Ember & Oak Trading'),
  ('P020', '4K Streaming Media Player', 'Electronics', 49.05, 35.35, 53.27, 1, 3.9, 'S023', 'Foxglove Botanicals'),
  ('P021', 'Ceramic Table Lamp', 'Home Decor', 50.89, 43.56, 56.2, 0, 2.9, 'S019', 'Sunburst Organics'),
  ('P022', 'Set of 4 Throw Pillow Covers', 'Home Decor', 25.1, 19.48, 26.82, 0, 3.0, 'S002', 'BlueCrate Supply Co.'),
  ('P023', 'Synthetic Motor Oil, 5-Quart', 'Auto Parts', 35.44, 23.62, 37.96, 0, 4.4, 'S014', 'Ironclad Hardware Co.'),
  ('P024', 'All-Season Windshield Wipers', 'Auto Parts', 23.96, 22.33, 26.48, 1, 2.6, 'S006', 'Redwood Mercantile'),
  ('P025', 'Reusable Silicone Food Storage Bags', 'Groceries', 19.77, 12.89, 22.21, 0, 3.2, 'S022', 'Anchor Point Marine')
on conflict (product_id) do update set product_name = excluded.product_name, category = excluded.category, current_price = excluded.current_price, all_time_low_price = excluded.all_time_low_price, thirty_day_high_price = excluded.thirty_day_high_price, store_recommended = excluded.store_recommended, product_rating = excluded.product_rating, seller_id = excluded.seller_id, seller_name = excluded.seller_name;

insert into customers (customer_id, username, display_name, join_date, account_type, favorite_category, avg_cart_size, has_left_seller_ratings) values
  ('C001', 'ava.nguyen', 'Ava Nguyen', '2021-08-08', 'Regular', 'Appliances', 4, 0),
  ('C002', 'liam.smith', 'Liam Smith', '2022-04-01', 'Regular', 'Electronics', 11, 1),
  ('C003', 'noah.garcia', 'Noah Garcia', '2023-02-25', 'Occasional', 'Tabletop Games', 5, 0),
  ('C004', 'emma.patel', 'Emma Patel', '2026-09-11', 'Occasional', 'Appliances', 1, 1),
  ('C005', 'olivia.kim', 'Olivia Kim', '2025-05-02', 'Regular', 'Medicine', 2, 0),
  ('C006', 'ethan.johnson', 'Ethan Johnson', '2024-10-17', 'Regular', 'Tabletop Games', 2, 0),
  ('C007', 'sophia.martinez', 'Sophia Martinez', '2023-01-23', 'Occasional', 'Kitchenware', 7, 1),
  ('C008', 'mason.lee', 'Mason Lee', '2026-12-24', 'Occasional', 'Auto Parts', 12, 1),
  ('C009', 'isabella.brown', 'Isabella Brown', '2021-11-11', 'Regular', 'Appliances', 10, 0),
  ('C010', 'lucas.davis', 'Lucas Davis', '2025-05-22', 'Regular', 'Electronics', 7, 0),
  ('C011', 'mia.chowdhury', 'Mia Chowdhury', '2025-03-07', 'Occasional', 'Electronics', 7, 0),
  ('C012', 'james.rossi', 'James Rossi', '2025-05-13', 'Regular', 'Home Decor', 9, 1),
  ('C013', 'amelia.khan', 'Amelia Khan', '2022-07-26', 'Regular', 'Electronics', 10, 0),
  ('C014', 'benjamin.anderson', 'Benjamin Anderson', '2024-11-07', 'Occasional', 'Outdoor & Garden', 9, 0),
  ('C015', 'harper.wright', 'Harper Wright', '2023-09-22', 'Regular', 'School Supplies', 11, 0),
  ('C016', 'elijah.torres', 'Elijah Torres', '2026-05-08', 'Regular', 'Kitchenware', 4, 1),
  ('C017', 'evelyn.hassan', 'Evelyn Hassan', '2022-08-20', 'Regular', 'Groceries', 2, 0),
  ('C018', 'logan.clark', 'Logan Clark', '2022-12-23', 'Occasional', 'Home Decor', 7, 0),
  ('C019', 'abigail.rivera', 'Abigail Rivera', '2022-11-23', 'Occasional', 'Kitchenware', 1, 1),
  ('C020', 'alexander.walker', 'Alexander Walker', '2022-12-17', 'Occasional', 'Kitchenware', 8, 1),
  ('C021', 'ella.mitchell', 'Ella Mitchell', '2021-08-05', 'Occasional', 'Kitchenware', 8, 0),
  ('C022', 'daniel.cohen', 'Daniel Cohen', '2026-09-14', 'Occasional', 'Home Decor', 9, 0),
  ('C023', 'scarlett.suzuki', 'Scarlett Suzuki', '2024-05-25', 'Regular', 'Outdoor & Garden', 4, 0),
  ('C024', 'matthew.alvarez', 'Matthew Alvarez', '2026-04-09', 'Occasional', 'Outdoor & Garden', 8, 1),
  ('C025', 'grace.bennett', 'Grace Bennett', '2023-06-11', 'Regular', 'Kitchenware', 9, 1)
on conflict (customer_id) do nothing;

-- Check: these should return 25, 25 and 25.
select (select count(*) from sellers) as sellers, (select count(*) from products) as products, (select count(*) from customers) as customers;
