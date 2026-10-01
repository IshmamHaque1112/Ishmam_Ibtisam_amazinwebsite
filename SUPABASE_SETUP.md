# Connecting Amazin to Supabase

The site works in two modes:

- **Supabase mode:** used when `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set and the `products` and `sellers` tables have rows. Reviews, tags and new accounts are saved to Supabase.
- **CSV mode (fallback):** used when those variables are missing or Supabase can't be reached. The catalog comes from `src/data/*.csv`, and reviews, tags and new accounts are saved in the browser. The site never shows a blank page because of a backend problem.

The browser console says which mode is running: `Amazin data source: Supabase` or `Amazin data source: bundled CSV files`.

## 1. Create the tables and load the data (one time)

1. Open the Supabase project, go to **SQL Editor → New query**.
2. Paste the whole of `supabase-setup.sql` and click **Run**.
3. The last result should show `25 | 25 | 25` (sellers, products, customers).

The script creates every table the app uses:

- `sellers` (with the blurbs), `products` and `customers`
- `product_reviews`, `seller_reviews`, `product_tags`, `seller_tags` and `price_history`

It also turns on Row Level Security, so visitors can read the catalog and add reviews, tags and accounts, but can't edit or delete anything. It's safe to run more than once.

**Then run `supabase-restore-data.sql` the same way.** `supabase-setup.sql` only seeds `product_reviews`, `seller_reviews`, `product_tags`, `seller_tags` and `price_history` with empty tables - this second script fills them, and also restores 20 products (`P026`-`P045`) that an earlier merge dropped. The last result should show `45 | 540 | 1091 | 726 | 24 | 14`. Also safe to run more than once - it truncates those 5 tables and re-inserts, and upserts the products by `product_id`, so re-running never duplicates rows.

## 2. Add the keys to Vercel

Vite builds these values into the site at build time, so they have to be set in Vercel. A `.env.local` file only works on your own computer.

1. In Supabase, go to **Project Settings → API Keys** and copy the **Project URL** and a **Publishable key** (`sb_publishable_...`). Do not use a Secret key (`sb_secret_...`) in this browser app.
2. In Vercel, open the project and go to **Settings → Environment Variables**. Add:
   - `VITE_SUPABASE_URL` = the Project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = the publishable key

   Tick **Production** and **Preview**.
3. **Redeploy** (Deployments → ⋯ → Redeploy). Variables only take effect on a new build.

Do the same for both Vercel projects (`ishmam-ibtisam-amazinwebsite` and `ishmam-ibtisam-amazinwebsite-yrwq`) if you keep both.

## 3. Run it locally (optional)

```bash
cp .env.example .env.local   # then paste the anon key into .env.local
npm install
npm run dev
```

## 4. Set up login passwords (one time)

The login page now checks a real password (10-15 characters), via Supabase Auth - not the `customers` table (see Notes below on why). The 25 demo accounts from `supabase-setup.sql` exist as *customers* but don't have a password yet, since they were never signed up through Auth. Create one for each with:

```bash
SUPABASE_URL=https://xxxx.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJ...   \
node scripts/seed-auth-users.mjs
```

- Both values are in Supabase under **Project Settings → API** (`Project URL` and the **service_role secret** - not the anon key).
- Passwords come from `scripts/customer-auth-seed.csv` (gitignored - placeholder values, but keep it out of the repo regardless). Reissued any time by regenerating that file.
- Safe to re-run; it skips accounts that already have a password.
- Anyone who registers a new account through the site itself doesn't need this - `db.registerCustomer()` already creates their Auth user automatically.

Accounts created some other way (not through `supabase-setup.sql`'s seed data and not through the site's own sign-up) will hit the "set a password" screen on first login instead of a plain login form - that's expected, see Notes below.

## Notes

- **Passwords are not stored in the `customers` table**, and never have been in Supabase mode - that table is readable with the public anon key, so anything in it is visible to anyone. Real passwords live in Supabase Auth instead (`supabase.auth.signUp` / `signInWithPassword`), under a synthetic email (`username@accounts.amazin.invalid`) since Auth requires one but the site only ever asks for a username.
- **"Set a password" vs a wrong-password error:** the login page can only safely offer a first-time "set a password" screen in CSV/local mode, where a missing password lives in that one visitor's own browser storage (nobody else's account to protect). In Supabase mode a customer row with no matching Auth user looks exactly like a wrong password, and stays that way - there's no safe way to tell those two apart from the browser, and guessing wrong would let anyone "claim" an existing username. That's what `scripts/seed-auth-users.mjs` is for: it sets up the 25 demo accounts' passwords in advance, over an admin connection, so visitors never hit that ambiguity for them.
- The anon key is meant to be public. Never put the `service_role` key in the frontend, in a `VITE_` variable, or anywhere it would ship to the browser - only use it locally, like the script above.
