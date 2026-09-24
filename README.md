# Amazin - Transparent Shopping Platform

A functional, Amazon-style digital marketplace that puts price history, seller details and quality ratings in front of shoppers.

## Features

### Store layout
- **Top bar:** the logo and the cursive **Amazin** brand name on the left. **Products** and **3rd party sellers** sit in the middle. The right side has three icons:
  - 🔍 **Search** opens a search bar under the top bar.
  - 🔑 **Login** opens the username login page.
  - 🛒 **Cart** opens your cart. Guests are asked to log in first.
- **Products page:** a scrollable list of every product showing its category, rating, price, all-time low and seller. Click a product name to open its page.
- **Product page:** today's price next to the all-time low and 30-day high, a deal score, the Amazin product score, and seller details.
- **3rd party sellers page:** a scrollable list of sellers showing rating, years active, source of supply, return policy and price-lock eligibility. Click a seller name to open their page.
- **Seller page:** price, quality and delivery ratings, plus every product that seller sells.
- **Search:** search by words (product name, category or seller name), price range, category and 3rd party seller. The results page scrolls, and shows **"Products cannot be found"** when nothing matches.

### Accounts and guests
- **Guests can browse everything.** A username login is needed only to add to cart or view the cart.
- **Log in** with an existing username from `customers.csv` (for example `ava.nguyen`).
- **Register** a new account with a username and display name. New accounts are added to the SQLite `customers` table and kept in the browser, so they are still there after a reload.
- Usernames are checked (3-30 characters: letters, numbers, `.`, `-`, `_`). No passwords are used in this prototype.

### Cart
- Custom cart folders, split checkout (only selected items are checked out), and select/deselect all.
- Free-shipping progress bar (free at $35+) and 8.875% estimated tax.
- **Price lock (24h)**, offered only for items from sellers marked `price_lock_eligible` in `sellers.csv`.
- Carts are saved per username in `localStorage`.

## Data: SQLite in the browser

The datasets live in `src/data/`:

| File | Table | Rows |
|---|---|---|
| `products.csv` | `products` | 25 |
| `sellers.csv` | `sellers` | 25 |
| `customers.csv` | `customers` | 25 + newly registered |

On page load, `src/db/database.ts` starts **SQLite** in the browser with [sql.js](https://github.com/sql-js/sql.js) (SQLite compiled to WebAssembly), creates the tables, and seeds them from the CSVs. Every page reads through SQL queries with bound parameters, so search input is never pasted into SQL.

To change the catalog, edit the CSV files and redeploy.

> Because Vercel hosts this as a static site, the database runs in each visitor's browser. Registered accounts are stored per browser. A shared server database would be the next step for real multi-user accounts.

## Scores

- **Seller score (0-100):** price 35%, quality 40%, delivery 25% (from `sellers.csv`).
- **Product score (0-100):** customer rating 50%, deal score 30%, seller score 20%.
- **Deal score:** 100 means today's price is at the all-time low; 0 means it is at or above the 30-day high.

## Tech stack
- React 18 + TypeScript, Vite, Tailwind CSS
- Zustand for the session and cart
- sql.js (SQLite/WASM) for the catalog and customers
- Hash routing (`#/products`, `#/product/P001`, `#/sellers`, `#/seller/S003`, `#/search?...`, `#/login`, `#/cart`), which works on Vercel with no rewrite rules

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run preview
```

## Project structure

```
src/
├── data/            # products.csv, sellers.csv, customers.csv
├── db/              # SQLite setup, CSV parser, React provider
├── pages/           # Products, Product, Sellers, Seller, Search, Login, NotFound
├── components/      # Header, SearchBar, ProductRow, AddToCart, Cart*, Icons
├── context/store.ts # Session + cart (Zustand)
├── utils/           # cart pricing, ratings, storage helpers
├── router.ts        # tiny hash router
└── App.tsx
```

## Security notes
- No API keys or secrets. `.env` is git-ignored.
- All SQL uses bound parameters. LIKE wildcards in search text are escaped.
- The post-login redirect only accepts in-app routes.
- Prototype auth: usernames only, stored client-side. It is not suitable for real accounts or payments.
