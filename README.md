# Amazin - Transparent Shopping Platform

A functional, Amazon-style digital marketplace that puts price history, seller details and quality ratings in front of shoppers.

## Features

### Store layout
- **Top bar:** the logo and the cursive **Amazin** brand name on the left. **Products** and **3rd party sellers** sit in the middle. The right side has three icons:
  - 🔍 **Search** opens a search bar under the top bar.
  - 🔑 **Login** opens the username login page. When you're logged in it opens **Your account** (order history and log out).
  - 🛒 **Cart** opens your cart. Guests are asked to log in first.
- **Products page:** a scrollable list of every product showing its category, rating, price, all-time low and seller. Sort by name, price, best deal, customer rating or Amazin score. Filters combine: category, price range, minimum star rating, and quick toggles for items near their all-time low, items with a price lock, or store-recommended items. The choices are kept in the URL (for example `#/products?sort=deal&category=Groceries&rating=4`), so a refresh or a shared link shows the same list. Click a product name to open its page.
- **Product page:** today's price next to the all-time low and 30-day high, a deal score, the Amazin product score, and seller details.
- **3rd party sellers page:** a scrollable list of sellers showing rating, years active, source of supply, return policy and price-lock eligibility. Click a seller name to open their page.
- **Seller page:** price, quality and delivery ratings, plus every product that seller sells. Seller ratings are separate from product reviews, and only verified buyers (accounts with an order from that seller) can post one; those show a "Verified buyer" badge.
- **Search:** suggestions appear as you type (products, categories and sellers; arrow keys and Enter work). Search by words, price range, category and 3rd party seller. Results use the same sort and filter controls. The page shows **"Products cannot be found"** when nothing matches, and the search bar explains a minimum price that is higher than the maximum.

### Accounts and guests
- **Guests can browse everything.** A username login is needed to use the cart, see orders, and post reviews or tags.
- **Log in** with an existing username from `customers.csv` (for example `ava.nguyen`).
- **Register** a new account with a username and display name. In CSV mode new accounts are kept in this browser; in Supabase mode they are saved to the `customers` table.
- Usernames are checked (3-30 characters: letters, numbers, `.`, `-`, `_`). **There are no passwords in this prototype.** The login page says so; it used to show a password box that accepted anything.

### Cart
- The cart is grouped into folders plus **Unassigned items**. Each item has a **Folder** menu to move it into a folder, back out to Unassigned, or into a new folder. On desktop you can also drag an item onto a folder.
- **Organize by category** files unassigned items into folders named after their category. An optional setting does this automatically for new items. Items you placed yourself are never moved.
- Each folder has a checkbox: tick one or more folders (or single items) and **Place order** buys exactly those. **Buy only this folder** selects one folder and nothing else. The order summary lists which folders the order includes.
- Free-shipping progress bar (free at $35+) and 8.875% estimated tax.
- **Price lock (24h)**, offered only for items from sellers marked `price_lock_eligible` in `sellers.csv`.
- Up to 10 of each item per cart line.
- Checkout is a **demo**: no payment is taken. Each order is saved to **Your account → Order history** with its items, prices and totals, and **Buy again** puts the items back in the cart at today's prices.
- Carts and orders are saved per username in `localStorage`, and other open tabs pick up cart changes.

## Data

The site runs in one of two modes (see `SUPABASE_SETUP.md`):

- **Supabase mode:** when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set at build time. The Supabase client is loaded only in this mode.
- **CSV mode (fallback):** the catalog comes from the files in `src/data/`, and new accounts, reviews and tags are saved in the browser.

| File | Contents | Rows |
|---|---|---|
| `products.csv` | products | 25 |
| `sellers.csv` | sellers | 25 |
| `seller_blurbs.csv` | seller descriptions | 25 |
| `customers.csv` | demo customers (no passwords) | 25 |

Everything in `src/data/` is bundled into the public JavaScript, so it must never hold secrets. A unit test checks that `customers.csv` has no password column.

## Scores

- **Seller score (0-100):** price 35%, quality 40%, delivery 25% (from `sellers.csv`).
- **Product score (0-100):** customer rating 50%, deal score 30%, seller score 20%.
- **Deal score:** 100 means today's price is at the all-time low; 0 means it is at or above the 30-day high.

## Tech stack
- React 18 + TypeScript, Vite, Tailwind CSS
- Zustand for the session and cart
- Supabase (optional, loaded on demand) or the bundled CSV files for the catalog
- Hash routing (`#/products`, `#/product/P001`, `#/sellers`, `#/seller/S003`, `#/search?...`, `#/login`, `#/cart`, `#/account`), which works on Vercel with no rewrite rules

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run preview
npm test          # unit tests (Node's built-in runner, no extra packages)
```

The tests cover the cart math, order records, sorting and filters, routes and the CSV parser. They compile `src/**/*.ts` with the TypeScript compiler that is already a dev dependency, so run `npm install` first.

## Project structure

```
src/
├── data/            # products.csv, sellers.csv, seller_blurbs.csv, customers.csv
├── db/              # data loading (Supabase or CSV), CSV parser, React provider
├── lib/supabase.ts  # on-demand Supabase client
├── pages/           # Home, Products, Product, Sellers, Seller, Search, Login, Account, NotFound
├── components/      # Header, SearchBar, CatalogControls, ProductRow, AddToCart, Cart*, FeedbackForms, Icons
├── context/store.ts # session, cart and orders (Zustand)
├── utils/           # cart pricing, orders, catalog sort/filter, ratings, storage
├── routes.ts        # route table and link builders (unit tested)
├── router.ts        # React hooks for routing and page titles
└── App.tsx
tests/               # unit tests (npm test)
```

## Security notes
- No secrets in the code. `.env` is git-ignored, and the Supabase anon key is meant to be public (never put the `service_role` key in a `VITE_` variable).
- The bundled data has no passwords.
- The post-login redirect only accepts in-app routes.
- Prototype auth: usernames only, no passwords, stored client-side. Anyone can log in as any username. It is not suitable for real accounts or payments; real sign-in would need Supabase Auth.
