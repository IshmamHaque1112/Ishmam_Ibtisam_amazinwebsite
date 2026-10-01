-- Restore public reads for the optional review, tag, and price-history data
-- displayed by the Amazin storefront. Safe to run more than once.
-- Run this in Supabase SQL Editor for the same project used by the app.

do $$
declare
  table_name text;
  optional_tables text[] := array[
    'product_reviews',
    'seller_reviews',
    'product_tags',
    'seller_tags',
    'price_history'
  ];
begin
  foreach table_name in array optional_tables loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('grant select on table public.%I to anon, authenticated', table_name);

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = table_name
        and policyname = 'amazin_public_read'
    ) then
      execute format(
        'create policy amazin_public_read on public.%I for select to anon, authenticated using (true)',
        table_name
      );
    end if;
  end loop;
end $$;
