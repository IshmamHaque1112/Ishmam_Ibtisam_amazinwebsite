# Supabase Dataset Files

This document lists all the dataset files available for Supabase backend integration.

## Dataset Files Location
All dataset files are located in: `src/data/`

## Available Dataset Files

### 1. customers.csv
**Location:** `src/data/customers.csv`
**Purpose:** Customer account data with generated passwords
**Columns:**
- customer_id (Primary Key)
- username (Unique, case-insensitive)
- display_name
- join_date
- account_type
- favorite_category
- avg_cart_size
- has_left_seller_ratings
- password (10-15 characters, auto-generated)

**Sample Data:**
```csv
customer_id,username,display_name,join_date,account_type,favorite_category,avg_cart_size,has_left_seller_ratings,password
C001,ava.nguyen,Ava Nguyen,2021-08-08,Regular,Appliances,4,No,A7xK9@mPq3L
```

### 2. products.csv
**Location:** `src/data/products.csv`
**Purpose:** Product catalog data
**Columns:**
- product_id (Primary Key)
- product_name
- category
- current_price
- all_time_low_price
- thirty_day_high_price
- store_recommended
- product_rating
- seller_id (Foreign Key)
- seller_name

**Sample Data:**
```csv
product_id,product_name,category,current_price,all_time_low_price,thirty_day_high_price,store_recommended,product_rating,seller_id,seller_name
P001,Organic Cane Sugar (5lb Bag),Groceries,5.62,5.08,6.17,No,2.7,S014,Ironclad Hardware Co.
```

### 3. sellers.csv
**Location:** `src/data/sellers.csv`
**Purpose:** Seller profile data
**Columns:**
- seller_id (Primary Key)
- seller_name
- return_policy
- source_of_supply
- years_active
- price_rating
- quality_rating
- delivery_time_rating
- overall_rating
- price_lock_eligible

**Sample Data:**
```csv
seller_id,seller_name,return_policy,source_of_supply,years_active,price_rating,quality_rating,delivery_time_rating,overall_rating,price_lock_eligible
S001,Northwind Traders,30 days,Direct from manufacturer,12,4.2,4.1,4.0,Yes
```

### 4. seller_blurbs.csv
**Location:** `src/data/seller_blurbs.csv`
**Purpose:** Seller descriptions and blurbs
**Columns:**
- seller_id (Foreign Key)
- blurb

**Sample Data:**
```csv
seller_id,blurb
S001,"A general merchandise seller with over a decade on the platform, known for consistent packaging and predictable delivery windows."
```

## Database Schema Reference

### Tables Structure

#### customers
```sql
CREATE TABLE customers (
  customer_id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  join_date TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'New',
  favorite_category TEXT,
  avg_cart_size INTEGER,
  has_left_seller_ratings INTEGER NOT NULL DEFAULT 0,
  password TEXT NOT NULL
);
```

#### products
```sql
CREATE TABLE products (
  product_id TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  current_price REAL NOT NULL,
  all_time_low_price REAL,
  thirty_day_high_price REAL,
  store_recommended INTEGER NOT NULL DEFAULT 0,
  product_rating REAL,
  seller_id TEXT REFERENCES sellers(seller_id),
  seller_name TEXT
);
```

#### sellers
```sql
CREATE TABLE sellers (
  seller_id TEXT PRIMARY KEY,
  seller_name TEXT NOT NULL,
  return_policy TEXT,
  source_of_supply TEXT,
  years_active INTEGER,
  price_rating REAL,
  quality_rating REAL,
  delivery_time_rating REAL,
  overall_rating REAL,
  price_lock_eligible INTEGER NOT NULL DEFAULT 0,
  blurb TEXT
);
```

## Additional Notes

- **Password Generation:** All customer passwords are auto-generated (10-15 characters) with mixed case, numbers, and special characters
- **Username Pattern:** Usernames follow pattern: 3-30 characters, letters, numbers, dots, dashes, or underscores (`/^[a-z0-9._-]{3,30}$/`)
- **Case Insensitivity:** Usernames are case-insensitive (COLLATE NOCASE)
- **Relationships:** Products reference sellers via seller_id
- **Data Types:** Boolean values stored as 0/1 integers, NULL for missing values

## Import Instructions for Supabase

1. Create the tables using the schema above
2. Import CSV files in this order:
   - sellers.csv
   - seller_blurbs.csv (update existing sellers)
   - products.csv
   - customers.csv

3. Set up appropriate indexes:
   ```sql
   CREATE INDEX idx_products_category ON products(category);
   CREATE INDEX idx_products_seller ON products(seller_id);
   ```

## Password Security Note

The passwords in customers.csv are generated for demonstration purposes. For production use with Supabase Auth, you should:
- Use Supabase's built-in authentication system
- Implement proper password hashing (bcrypt/argon2)
- Consider password reset functionality
- Follow Supabase security best practices