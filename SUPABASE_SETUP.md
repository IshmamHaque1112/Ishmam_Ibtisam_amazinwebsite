# Connecting Amazin to Supabase

The site works in two modes:

- **Supabase mode:** used when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set and the `products` and `sellers` tables have rows. Reviews, tags and new accounts are saved to Supabase.
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

## 2. Add the keys to Vercel

Vite builds these values into the site at build time, so they have to be set in Vercel. A `.env.local` file only works on your own computer.

1. In Supabase, go to **Project Settings → API** and copy the **Project URL** and the **anon public** key.
2. In Vercel, open the project and go to **Settings → Environment Variables**. Add:
   - `VITE_SUPABASE_URL` = the Project URL
   - `VITE_SUPABASE_ANON_KEY` = the anon public key

   Tick **Production** and **Preview**.
3. **Redeploy** (Deployments → ⋯ → Redeploy). Variables only take effect on a new build.

Do the same for both Vercel projects (`ishmam-ibtisam-amazinwebsite` and `ishmam-ibtisam-amazinwebsite-yrwq`) if you keep both.

## 3. Run it locally (optional)

```bash
cp .env.example .env.local   # then paste the anon key into .env.local
npm install
npm run dev
```

## Notes

- Passwords are no longer stored in the `customers` table. It's readable with the public anon key, so anything in it is visible to anyone. For real passwords, use Supabase Auth (`supabase.auth.signUp` / `signInWithPassword`). The login page still accepts any known username, as before.
- The anon key is meant to be public. Never put the `service_role` key in the frontend or in a `VITE_` variable.
