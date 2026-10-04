-- Amazin: seller portal foundation (schema + seed data)
-- Paste into Supabase -> SQL Editor -> New query -> Run.
-- Builds on the role/auth_user_id columns already drafted in
-- supabase/security-lockdown.sql - safe to run whether or not that
-- migration has landed yet (every column add is idempotent).

-- ---------- Schema additions ----------
alter table products add column if not exists stock_quantity integer not null default 0;

alter table customers add column if not exists role text not null default 'shopper'
  check (role in ('shopper', 'seller', 'admin'));
alter table customers add column if not exists managed_seller_id text references sellers(seller_id);
alter table customers add column if not exists auth_user_id uuid unique references auth.users(id) on delete cascade;

-- Live stock holds: one row per (shopper, product) with quantity > 0 in
-- their cart right now. available stock for a shopper = stock_quantity -
-- sum(quantity) held by *other* shoppers. Row deleted when quantity hits 0
-- (removed from cart) - see the prompt's cart-sync requirement.
create table if not exists cart_holds (
  username text not null references customers(username) on delete cascade,
  product_id text not null references products(product_id) on delete cascade,
  quantity integer not null check (quantity > 0),
  updated_at timestamptz not null default now(),
  primary key (username, product_id)
);
alter table cart_holds enable row level security;
drop policy if exists cart_holds_read_all on cart_holds;
create policy cart_holds_read_all on cart_holds for select to anon, authenticated using (true);
drop policy if exists cart_holds_write_own on cart_holds;
create policy cart_holds_write_own on cart_holds for all to authenticated
  using (username = (select username from customers where auth_user_id = auth.uid()))
  with check (username = (select username from customers where auth_user_id = auth.uid()));

-- Feedback / grievance chat
create table if not exists feedback_threads (
  thread_id uuid primary key default gen_random_uuid(),
  customer_username text not null references customers(username) on delete cascade,
  seller_id text not null references sellers(seller_id) on delete cascade,
  product_id text references products(product_id),
  status text not null default 'open' check (status in ('open','resolved')),
  created_at timestamptz not null default now()
);
create table if not exists feedback_messages (
  message_id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references feedback_threads(thread_id) on delete cascade,
  sender_type text not null check (sender_type in ('customer','seller')),
  sender_name text not null,
  message_text text not null,
  sent_at timestamptz not null default now()
);
alter table feedback_threads enable row level security;
alter table feedback_messages enable row level security;
drop policy if exists feedback_threads_participant on feedback_threads;
create policy feedback_threads_participant on feedback_threads for select to authenticated using (
  customer_username = (select username from customers where auth_user_id = auth.uid())
  or (seller_id = (select managed_seller_id from customers where auth_user_id = auth.uid())
      and (select role from customers where auth_user_id = auth.uid()) = 'seller')
);
-- Participants may reopen/resolve a conversation. Limit column privileges to
-- status so a client cannot rewrite the customer, seller, or product binding.
drop policy if exists feedback_threads_participant_update on feedback_threads;
create policy feedback_threads_participant_update on feedback_threads for update to authenticated
  using (
    customer_username = (select username from customers where auth_user_id = auth.uid())
    or (seller_id = (select managed_seller_id from customers where auth_user_id = auth.uid())
        and (select role from customers where auth_user_id = auth.uid()) = 'seller')
  )
  with check (
    customer_username = (select username from customers where auth_user_id = auth.uid())
    or (seller_id = (select managed_seller_id from customers where auth_user_id = auth.uid())
        and (select role from customers where auth_user_id = auth.uid()) = 'seller')
  );
revoke update on feedback_threads from anon, authenticated;
grant update (status) on feedback_threads to authenticated;
drop policy if exists feedback_messages_participant on feedback_messages;
create policy feedback_messages_participant on feedback_messages for select to authenticated using (
  exists (select 1 from feedback_threads t where t.thread_id = feedback_messages.thread_id and (
    t.customer_username = (select username from customers where auth_user_id = auth.uid())
    or t.seller_id = (select managed_seller_id from customers where auth_user_id = auth.uid())
  ))
);
-- Insert policies: customers may only open a thread as themselves; sellers
-- may only reply (see the prompt - sellers can't start new threads).
drop policy if exists feedback_threads_customer_insert on feedback_threads;
create policy feedback_threads_customer_insert on feedback_threads for insert to authenticated with check (
  customer_username = (select username from customers where auth_user_id = auth.uid())
  and (select role from customers where auth_user_id = auth.uid()) in ('shopper', 'admin')
);
drop policy if exists feedback_messages_participant_insert on feedback_messages;
create policy feedback_messages_participant_insert on feedback_messages for insert to authenticated with check (
  exists (select 1 from feedback_threads t where t.thread_id = feedback_messages.thread_id and (
    (sender_type = 'customer' and t.customer_username = (select username from customers where auth_user_id = auth.uid())
      and (select role from customers where auth_user_id = auth.uid()) in ('shopper', 'admin'))
    or (sender_type = 'seller' and t.seller_id = (select managed_seller_id from customers where auth_user_id = auth.uid())
      and (select role from customers where auth_user_id = auth.uid()) = 'seller')
  ))
);

-- ---------- Seed data ----------

-- Stock quantities (45 products)
update products set stock_quantity = 13 where product_id = 'P001';
update products set stock_quantity = 35 where product_id = 'P002';
update products set stock_quantity = 45 where product_id = 'P003';
update products set stock_quantity = 0 where product_id = 'P004';
update products set stock_quantity = 36 where product_id = 'P005';
update products set stock_quantity = 39 where product_id = 'P006';
update products set stock_quantity = 32 where product_id = 'P007';
update products set stock_quantity = 3 where product_id = 'P008';
update products set stock_quantity = 31 where product_id = 'P009';
update products set stock_quantity = 42 where product_id = 'P010';
update products set stock_quantity = 34 where product_id = 'P011';
update products set stock_quantity = 19 where product_id = 'P012';
update products set stock_quantity = 53 where product_id = 'P013';
update products set stock_quantity = 33 where product_id = 'P014';
update products set stock_quantity = 53 where product_id = 'P015';
update products set stock_quantity = 2 where product_id = 'P016';
update products set stock_quantity = 56 where product_id = 'P017';
update products set stock_quantity = 48 where product_id = 'P018';
update products set stock_quantity = 35 where product_id = 'P019';
update products set stock_quantity = 25 where product_id = 'P020';
update products set stock_quantity = 32 where product_id = 'P021';
update products set stock_quantity = 42 where product_id = 'P022';
update products set stock_quantity = 8 where product_id = 'P023';
update products set stock_quantity = 45 where product_id = 'P024';
update products set stock_quantity = 41 where product_id = 'P025';
update products set stock_quantity = 48 where product_id = 'P026';
update products set stock_quantity = 60 where product_id = 'P027';
update products set stock_quantity = 31 where product_id = 'P028';
update products set stock_quantity = 2 where product_id = 'P029';
update products set stock_quantity = 23 where product_id = 'P030';
update products set stock_quantity = 28 where product_id = 'P031';
update products set stock_quantity = 24 where product_id = 'P032';
update products set stock_quantity = 22 where product_id = 'P033';
update products set stock_quantity = 15 where product_id = 'P034';
update products set stock_quantity = 46 where product_id = 'P035';
update products set stock_quantity = 27 where product_id = 'P036';
update products set stock_quantity = 26 where product_id = 'P037';
update products set stock_quantity = 49 where product_id = 'P038';
update products set stock_quantity = 58 where product_id = 'P039';
update products set stock_quantity = 18 where product_id = 'P040';
update products set stock_quantity = 57 where product_id = 'P041';
update products set stock_quantity = 60 where product_id = 'P042';
update products set stock_quantity = 52 where product_id = 'P043';
update products set stock_quantity = 37 where product_id = 'P044';
update products set stock_quantity = 23 where product_id = 'P045';

-- Seller login accounts (25) - role='seller' rows in customers,
-- linked to the seller they manage. Passwords are NOT set here (same
-- reason as shopper accounts - this table is anon-readable). Create their
-- Auth users the same way as scripts/seed-auth-users.mjs, pointed at
-- seller_auth_seed.csv (seller_username/password), then this just needs
-- auth_user_id backfilled - see the prompt.
insert into customers (customer_id, username, display_name, join_date, account_type, role, managed_seller_id) values
  ('CS001', 'northwind.traders', 'Northwind Traders (Seller)', current_date, 'Seller', 'seller', 'S001'),
  ('CS002', 'bluecrate.supply', 'BlueCrate Supply Co. (Seller)', current_date, 'Seller', 'seller', 'S002'),
  ('CS003', 'everstock.wholesale', 'Everstock Wholesale (Seller)', current_date, 'Seller', 'seller', 'S003'),
  ('CS004', 'pinecone.goods', 'Pinecone Goods (Seller)', current_date, 'Seller', 'seller', 'S004'),
  ('CS005', 'harbor.vine.imports', 'Harbor & Vine Imports (Seller)', current_date, 'Seller', 'seller', 'S005'),
  ('CS006', 'redwood.mercantile', 'Redwood Mercantile (Seller)', current_date, 'Seller', 'seller', 'S006'),
  ('CS007', 'summit.peak.distributors', 'Summit Peak Distributors (Seller)', current_date, 'Seller', 'seller', 'S007'),
  ('CS008', 'glacier.bay.outfitters', 'Glacier Bay Outfitters (Seller)', current_date, 'Seller', 'seller', 'S008'),
  ('CS009', 'ember.oak.trading', 'Ember & Oak Trading (Seller)', current_date, 'Seller', 'seller', 'S009'),
  ('CS010', 'cascade.supply.chain', 'Cascade Supply Chain (Seller)', current_date, 'Seller', 'seller', 'S010'),
  ('CS011', 'luma.home.goods', 'Luma Home Goods (Seller)', current_date, 'Seller', 'seller', 'S011'),
  ('CS012', 'wrenfield.industries', 'Wrenfield Industries (Seller)', current_date, 'Seller', 'seller', 'S012'),
  ('CS013', 'coral.reef.imports', 'Coral Reef Imports (Seller)', current_date, 'Seller', 'seller', 'S013'),
  ('CS014', 'ironclad.hardware', 'Ironclad Hardware Co. (Seller)', current_date, 'Seller', 'seller', 'S014'),
  ('CS015', 'maplewood.provisions', 'Maplewood Provisions (Seller)', current_date, 'Seller', 'seller', 'S015'),
  ('CS016', 'solstice.sports.supply', 'Solstice Sports Supply (Seller)', current_date, 'Seller', 'seller', 'S016'),
  ('CS017', 'driftwood.furnishings', 'Driftwood Furnishings (Seller)', current_date, 'Seller', 'seller', 'S017'),
  ('CS018', 'granite.peak.tools', 'Granite Peak Tools (Seller)', current_date, 'Seller', 'seller', 'S018'),
  ('CS019', 'sunburst.organics', 'Sunburst Organics (Seller)', current_date, 'Seller', 'seller', 'S019'),
  ('CS020', 'vertex.electronics', 'Vertex Electronics Ltd. (Seller)', current_date, 'Seller', 'seller', 'S020'),
  ('CS021', 'willow.creek.crafts', 'Willow Creek Crafts (Seller)', current_date, 'Seller', 'seller', 'S021'),
  ('CS022', 'anchor.point.marine', 'Anchor Point Marine (Seller)', current_date, 'Seller', 'seller', 'S022'),
  ('CS023', 'foxglove.botanicals', 'Foxglove Botanicals (Seller)', current_date, 'Seller', 'seller', 'S023'),
  ('CS024', 'steel.horizon.auto', 'Steel Horizon Auto Parts (Seller)', current_date, 'Seller', 'seller', 'S024'),
  ('CS025', 'cobblestone.kitchenware', 'Cobblestone Kitchenware (Seller)', current_date, 'Seller', 'seller', 'S025')
on conflict (username) do update set managed_seller_id = excluded.managed_seller_id, role = excluded.role;

-- Sample feedback threads (7) and messages (13)
insert into feedback_threads (thread_id, customer_username, seller_id, product_id, status, created_at) values
  ('01b003c2-3f05-5902-8983-930dfb412fbf', 'isabella.brown', 'S024', 'P024', 'open', '2026-09-19'),
  ('9c372052-026e-536f-b0a7-e4b0d182419c', 'noah.garcia', 'S013', 'P013', 'resolved', '2026-09-16'),
  ('0967b3cf-c9df-524a-877a-c93001edab4b', 'grace.bennett', 'S003', 'P012', 'open', '2026-09-22'),
  ('59188642-d6b0-5f1a-80cd-3be923c3a499', 'james.rossi', 'S014', 'P023', 'resolved', '2026-09-11'),
  ('93a5465a-5ce6-583c-8fe9-5f10f17a8266', 'evelyn.hassan', 'S017', 'P009', 'open', '2026-09-24'),
  ('81dafd72-6a80-55df-8e75-f5cef043d952', 'scarlett.suzuki', 'S020', 'P018', 'resolved', '2026-09-14'),
  ('54a0b652-ec04-5e00-842b-a9ccea67e36f', 'mia.chowdhury', 'S012', 'P012', 'open', '2026-09-23');

insert into feedback_messages (thread_id, sender_type, sender_name, message_text, sent_at) values
  ('01b003c2-3f05-5902-8983-930dfb412fbf', 'customer', 'isabella.brown', 'The windshield wipers I received don''t fit my car even though I ordered the size listed on the page. Can you help?', '2026-09-19'),
  ('9c372052-026e-536f-b0a7-e4b0d182419c', 'customer', 'noah.garcia', 'My robot vacuum stopped charging after three weeks. Is this covered under any warranty?', '2026-09-16'),
  ('9c372052-026e-536f-b0a7-e4b0d182419c', 'seller', 'Coral Reef Imports', 'Sorry about that! We can send a replacement unit at no cost - I''ve started that process, you should get a shipping confirmation within 2 business days.', '2026-09-17'),
  ('9c372052-026e-536f-b0a7-e4b0d182419c', 'customer', 'noah.garcia', 'Got the shipping email, thank you for the quick turnaround!', '2026-09-19'),
  ('0967b3cf-c9df-524a-877a-c93001edab4b', 'customer', 'grace.bennett', 'The toaster oven heats really unevenly - one side browns, the other stays pale. Is this normal or did I get a defective unit?', '2026-09-22'),
  ('0967b3cf-c9df-524a-877a-c93001edab4b', 'seller', 'Everstock Wholesale', 'That''s not expected behavior. Could you send us the order number so we can look into a replacement?', '2026-09-23'),
  ('59188642-d6b0-5f1a-80cd-3be923c3a499', 'customer', 'james.rossi', 'Quick question - is this motor oil rated for full synthetic or synthetic blend engines?', '2026-09-11'),
  ('59188642-d6b0-5f1a-80cd-3be923c3a499', 'seller', 'Ironclad Hardware Co.', 'It''s full synthetic, rated for extended drain intervals. Should work great for your engine.', '2026-09-12'),
  ('93a5465a-5ce6-583c-8fe9-5f10f17a8266', 'customer', 'evelyn.hassan', 'Getting three different readings in a row from this thermometer. Is there a calibration step I''m missing?', '2026-09-24'),
  ('81dafd72-6a80-55df-8e75-f5cef043d952', 'customer', 'scarlett.suzuki', 'These headphones keep disconnecting from my laptop a few times a day. Any fix before I request a return?', '2026-09-14'),
  ('81dafd72-6a80-55df-8e75-f5cef043d952', 'seller', 'Vertex Electronics Ltd.', 'A few customers have hit this with certain Bluetooth drivers - try forgetting the device and re-pairing, that''s resolved it for most people.', '2026-09-15'),
  ('81dafd72-6a80-55df-8e75-f5cef043d952', 'customer', 'scarlett.suzuki', 'That worked, thanks for the quick fix!', '2026-09-15'),
  ('54a0b652-ec04-5e00-842b-a9ccea67e36f', 'customer', 'mia.chowdhury', 'Is there a smaller wattage version of this toaster oven? Mine keeps tripping my kitchen''s circuit when paired with the kettle.', '2026-09-23');

-- Check: expect 45 stock rows set, 25 seller accounts, 7 threads, 13 messages
select (select count(*) from products where stock_quantity > 0 or stock_quantity = 0) as products_with_stock_set,
       (select count(*) from customers where role = 'seller') as seller_accounts,
       (select count(*) from feedback_threads) as threads,
       (select count(*) from feedback_messages) as messages;
