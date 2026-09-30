import initSqlJs, { Database, SqlValue } from 'sql.js';
import productsCsv from '../data/products.csv?raw';
import sellersCsv from '../data/sellers.csv?raw';
import customersCsv from '../data/customers.csv?raw';
import sellerBlurbsCsv from '../data/seller_blurbs.csv?raw';
import { parseCsv } from './csv';
import { Customer, Product, ProductSearch, Seller } from '../types';

// The store runs SQLite in the browser (sql.js / WebAssembly). The catalog is
// seeded from the CSV datasets on every load, and new customer accounts are
// saved to localStorage and replayed into the database on the next load.

const REGISTERED_KEY = 'amazin_registered_customers';

const SCHEMA = `
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
  CREATE INDEX idx_products_category ON products(category);
  CREATE INDEX idx_products_seller ON products(seller_id);
`;

const yes = (value: string) => (value.toLowerCase() === 'yes' ? 1 : 0);
const num = (value: string) => (value === '' ? null : Number(value));

// Generate random password between 10-15 characters
const generatePassword = (): string => {
  const length = Math.floor(Math.random() * 6) + 10; // 10-15 characters
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

interface RegisteredCustomer {
  id: string;
  username: string;
  displayName: string;
  joinDate: string;
  password: string;
}

const readRegistered = (): RegisteredCustomer[] => {
  try {
    return JSON.parse(localStorage.getItem(REGISTERED_KEY) || '[]');
  } catch {
    return [];
  }
};

const writeRegistered = (list: RegisteredCustomer[]) => {
  try {
    localStorage.setItem(REGISTERED_KEY, JSON.stringify(list));
  } catch (error) {
    console.error('Could not save registered customers:', error);
  }
};

const seed = (db: Database) => {
  db.run('BEGIN');
  const sellerStmt = db.prepare('INSERT INTO sellers VALUES (?,?,?,?,?,?,?,?,?,?,?)');
  for (const s of parseCsv(sellersCsv)) {
    sellerStmt.run([
      s.seller_id, s.seller_name, s.return_policy, s.source_of_supply, num(s.years_active),
      num(s.price_rating), num(s.quality_rating), num(s.delivery_time_rating), num(s.overall_rating),
      yes(s.price_lock_eligible), null
    ]);
  }
  sellerStmt.free();

  // Load seller blurbs
  const blurbsMap = new Map(parseCsv(sellerBlurbsCsv).map(b => [b.seller_id, b.blurb]));
  const blurbStmt = db.prepare('UPDATE sellers SET blurb = ? WHERE seller_id = ?');
  for (const [sellerId, blurb] of blurbsMap) {
    blurbStmt.run([blurb, sellerId]);
  }
  blurbStmt.free();

  const productStmt = db.prepare('INSERT INTO products VALUES (?,?,?,?,?,?,?,?,?,?)');
  for (const p of parseCsv(productsCsv)) {
    productStmt.run([
      p.product_id, p.product_name, p.category, num(p.current_price), num(p.all_time_low_price),
      num(p.thirty_day_high_price), yes(p.store_recommended), num(p.product_rating), p.seller_id, p.seller_name
    ]);
  }
  productStmt.free();

  const customerStmt = db.prepare('INSERT INTO customers VALUES (?,?,?,?,?,?,?,?,?)');
  for (const c of parseCsv(customersCsv)) {
    customerStmt.run([
      c.customer_id, c.username, c.display_name, c.join_date, c.account_type,
      c.favorite_category || null, num(c.avg_cart_size), yes(c.has_left_seller_ratings),
      generatePassword()
    ]);
  }
  for (const r of readRegistered()) {
    customerStmt.run([r.id, r.username, r.displayName, r.joinDate, 'New', null, 0, 0, r.password]);
  }
  customerStmt.free();
  db.run('COMMIT');
};

type Row = Record<string, SqlValue>;

const toProduct = (r: Row): Product => ({
  id: String(r.product_id),
  name: String(r.product_name),
  category: String(r.category),
  currentPrice: Number(r.current_price),
  allTimeLowPrice: Number(r.all_time_low_price),
  thirtyDayHighPrice: Number(r.thirty_day_high_price),
  storeRecommended: r.store_recommended === 1,
  rating: Number(r.product_rating),
  sellerId: String(r.seller_id),
  sellerName: String(r.seller_name)
});

const toSeller = (r: Row): Seller => ({
  id: String(r.seller_id),
  name: String(r.seller_name),
  returnPolicy: String(r.return_policy),
  sourceOfSupply: String(r.source_of_supply),
  yearsActive: Number(r.years_active),
  priceRating: Number(r.price_rating),
  qualityRating: Number(r.quality_rating),
  deliveryTimeRating: Number(r.delivery_time_rating),
  overallRating: Number(r.overall_rating),
  priceLockEligible: r.price_lock_eligible === 1,
  blurb: r.blurb === null ? null : String(r.blurb)
});

const toCustomer = (r: Row): Customer => ({
  id: String(r.customer_id),
  username: String(r.username),
  displayName: String(r.display_name),
  joinDate: String(r.join_date),
  accountType: String(r.account_type),
  favoriteCategory: r.favorite_category === null ? null : String(r.favorite_category),
  password: String(r.password)
});

// Usernames: 3-30 characters, letters, numbers, dots, dashes or underscores.
export const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;
export const normalizeUsername = (username: string) => username.trim().toLowerCase();

const escapeLike = (value: string) => value.replace(/[\\%_]/g, match => `\\${match}`);

export class StoreDatabase {
  constructor(private db: Database) {}

  // All queries use bound parameters; user input is never concatenated into SQL.
  private all(sql: string, params: SqlValue[] = []): Row[] {
    const stmt = this.db.prepare(sql);
    try {
      stmt.bind(params);
      const rows: Row[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as Row);
      return rows;
    } finally {
      stmt.free();
    }
  }

  getProducts(): Product[] {
    return this.all('SELECT * FROM products ORDER BY product_name').map(toProduct);
  }

  getProduct(id: string): Product | undefined {
    return this.all('SELECT * FROM products WHERE product_id = ?', [id]).map(toProduct)[0];
  }

  getProductsBySeller(sellerId: string): Product[] {
    return this.all('SELECT * FROM products WHERE seller_id = ? ORDER BY product_name', [sellerId]).map(toProduct);
  }

  searchProducts(search: ProductSearch): Product[] {
    const where: string[] = [];
    const params: SqlValue[] = [];
    const text = search.text?.trim();
    if (text) {
      const like = `%${escapeLike(text)}%`;
      where.push("(product_name LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\' OR seller_name LIKE ? ESCAPE '\\')");
      params.push(like, like, like);
    }
    if (search.minPrice !== undefined && Number.isFinite(search.minPrice)) {
      where.push('current_price >= ?');
      params.push(search.minPrice);
    }
    if (search.maxPrice !== undefined && Number.isFinite(search.maxPrice)) {
      where.push('current_price <= ?');
      params.push(search.maxPrice);
    }
    if (search.category) {
      where.push('category = ?');
      params.push(search.category);
    }
    if (search.sellerId) {
      where.push('seller_id = ?');
      params.push(search.sellerId);
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    return this.all(`SELECT * FROM products ${clause} ORDER BY product_name`, params).map(toProduct);
  }

  getCategories(): string[] {
    return this.all('SELECT DISTINCT category FROM products ORDER BY category').map(r => String(r.category));
  }

  getSellers(): Seller[] {
    return this.all('SELECT * FROM sellers ORDER BY seller_name').map(toSeller);
  }

  getSeller(id: string): Seller | undefined {
    return this.all('SELECT * FROM sellers WHERE seller_id = ?', [id]).map(toSeller)[0];
  }

  getSellerProductCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const r of this.all('SELECT seller_id, COUNT(*) AS n FROM products GROUP BY seller_id')) {
      counts[String(r.seller_id)] = Number(r.n);
    }
    return counts;
  }

  findCustomer(username: string): Customer | undefined {
    return this.all('SELECT * FROM customers WHERE username = ?', [normalizeUsername(username)]).map(toCustomer)[0];
  }

  // Registers a new customer. Returns an error message instead of throwing so
  // the login page can show it.
  registerCustomer(username: string, displayName: string): { customer?: Customer; error?: string } {
    const name = normalizeUsername(username);
    const display = displayName.trim().slice(0, 60);
    if (!USERNAME_PATTERN.test(name)) {
      return { error: 'Usernames must be 3-30 characters: letters, numbers, dots, dashes or underscores.' };
    }
    if (!display) {
      return { error: 'Please enter a display name.' };
    }
    if (this.findCustomer(name)) {
      return { error: 'That username is already taken.' };
    }
    const count = Number(this.all('SELECT COUNT(*) AS n FROM customers')[0].n);
    const id = `C${String(count + 1).padStart(3, '0')}`;
    const joinDate = new Date().toISOString().slice(0, 10);
    const password = generatePassword();
    this.db.run(
      "INSERT INTO customers VALUES (?,?,?,?,'New',NULL,0,0,?)",
      [id, name, display, joinDate, password]
    );
    writeRegistered([...readRegistered(), { id, username: name, displayName: display, joinDate, password }]);
    return { customer: this.findCustomer(name) };
  }
}

let dbPromise: Promise<StoreDatabase> | null = null;

export const loadDatabase = (): Promise<StoreDatabase> => {
  if (!dbPromise) {
    dbPromise = initSqlJs({
      locateFile: (file) => {
        // Use CDN for sql.js WASM file to avoid Vercel build issues
        return `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`;
      }
    }).then(SQL => {
      try {
        const db = new SQL.Database();
        db.run(SCHEMA);
        seed(db);
        return new StoreDatabase(db);
      } catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
      }
    }).catch(error => {
      console.error('Failed to load sql.js:', error);
      throw error;
    });
  }
  return dbPromise;
};
