import productsCsv from '../data/products.csv?raw';
import sellersCsv from '../data/sellers.csv?raw';
import customersCsv from '../data/customers.csv?raw';
import sellerBlurbsCsv from '../data/seller_blurbs.csv?raw';
import { parseCsv } from './csv';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';
import {
  Customer,
  Product,
  ProductReview,
  ProductSearch,
  Seller,
  SellerReview,
  TagWithCount
} from '../types';

// The store keeps the whole catalog in memory and answers page queries
// synchronously (pages call db.getProducts() etc. directly while rendering).
// Data is loaded once at startup:
//   1. from Supabase, when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set
//      and the products + sellers tables have rows;
//   2. otherwise from the CSV files bundled with the app, so the site never
//      goes blank because of a backend problem.
// Writes (new customers, reviews, tags) go to Supabase when it's the source,
// or to localStorage in CSV mode.

export type DataSource = 'supabase' | 'csv';

export interface PriceHistoryPoint {
  productId: string;
  price: number;
  recordedAt: string;
}

interface ProductTagRow {
  productId: string;
  tagName: string;
  addedByUsername: string;
  dateAdded: string;
}

interface SellerTagRow {
  sellerId: string;
  tagName: string;
  addedByUsername: string;
  dateAdded: string;
}

export type NewProductReview = Omit<ProductReview, 'reviewId'>;
export type NewSellerReview = Omit<SellerReview, 'reviewId'>;
export type NewProductTag = ProductTagRow;
export type NewSellerTag = SellerTagRow;

// Usernames: 3-30 characters, letters, numbers, dots, dashes or underscores.
export const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;
export const normalizeUsername = (username: string) => username.trim().toLowerCase();

type Row = Record<string, unknown>;

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};
// Handles 1/0, true/false and the CSV's Yes/No, whichever way the data was imported.
const flag = (v: unknown): boolean =>
  v === true || v === 1 || (typeof v === 'string' && /^(yes|true|1|y)$/i.test(v.trim()));

const toProduct = (r: Row): Product => ({
  id: str(r.product_id),
  name: str(r.product_name),
  category: str(r.category),
  currentPrice: num(r.current_price),
  allTimeLowPrice: num(r.all_time_low_price),
  thirtyDayHighPrice: num(r.thirty_day_high_price),
  storeRecommended: flag(r.store_recommended),
  rating: num(r.product_rating),
  sellerId: str(r.seller_id),
  sellerName: str(r.seller_name)
});

const toSeller = (r: Row): Seller => ({
  id: str(r.seller_id),
  name: str(r.seller_name),
  returnPolicy: str(r.return_policy),
  sourceOfSupply: str(r.source_of_supply),
  yearsActive: num(r.years_active),
  priceRating: num(r.price_rating),
  qualityRating: num(r.quality_rating),
  deliveryTimeRating: num(r.delivery_time_rating),
  overallRating: num(r.overall_rating),
  priceLockEligible: flag(r.price_lock_eligible),
  blurb: r.blurb ? str(r.blurb) : undefined
});

// Passwords are never loaded into the browser.
const toCustomer = (r: Row): Customer => ({
  id: str(r.customer_id),
  username: str(r.username),
  displayName: str(r.display_name),
  joinDate: str(r.join_date),
  accountType: str(r.account_type) || 'New',
  favoriteCategory: r.favorite_category ? str(r.favorite_category) : null,
  password: ''
});

const toProductReview = (r: Row): ProductReview => ({
  reviewId: str(r.review_id),
  productId: str(r.product_id),
  username: str(r.username),
  rating: num(r.rating),
  title: r.title ? str(r.title) : undefined,
  reviewText: r.review_text ? str(r.review_text) : undefined,
  reviewDate: str(r.review_date).slice(0, 10),
  helpfulVotes: num(r.helpful_votes)
});

const toSellerReview = (r: Row): SellerReview => ({
  reviewId: str(r.review_id),
  sellerId: str(r.seller_id),
  username: str(r.username),
  rating: num(r.rating),
  title: r.title ? str(r.title) : undefined,
  reviewText: r.review_text ? str(r.review_text) : undefined,
  reviewDate: str(r.review_date).slice(0, 10),
  helpfulVotes: num(r.helpful_votes),
  // Only present if the Supabase table has a verified_buyer column.
  verifiedBuyer: r.verified_buyer === true ? true : undefined
});

const toProductTag = (r: Row): ProductTagRow => ({
  productId: str(r.product_id),
  tagName: str(r.tag_name),
  addedByUsername: str(r.added_by_username),
  dateAdded: str(r.date_added).slice(0, 10)
});

const toSellerTag = (r: Row): SellerTagRow => ({
  sellerId: str(r.seller_id),
  tagName: str(r.tag_name),
  addedByUsername: str(r.added_by_username),
  dateAdded: str(r.date_added).slice(0, 10)
});

const toPricePoint = (r: Row): PriceHistoryPoint => ({
  productId: str(r.product_id),
  price: num(r.price),
  recordedAt: str(r.recorded_at).slice(0, 10)
});

// Groups tag rows into "tag (count)" chips, most used first.
const countTags = (rows: { tagName: string }[]): TagWithCount[] => {
  const counts = new Map<string, TagWithCount>();
  for (const row of rows) {
    const key = row.tagName.trim().toLowerCase();
    if (!key) continue;
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { tagName: row.tagName.trim(), count: 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.tagName.localeCompare(b.tagName));
};

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name);
const newestFirst = <T extends { reviewDate: string }>(a: T, b: T) => b.reviewDate.localeCompare(a.reviewDate);

// Set by loadStoreData() once the (lazily loaded) Supabase client is ready.
// Stays null in CSV mode.
let supabase: SupabaseClient | null = null;

// ---------- localStorage helpers for CSV mode ----------

const LOCAL_KEY = 'amazin_local_data_v1';

interface LocalData {
  customers: Customer[];
  productReviews: ProductReview[];
  sellerReviews: SellerReview[];
  productTags: ProductTagRow[];
  sellerTags: SellerTagRow[];
}

const emptyLocal = (): LocalData => ({
  customers: [],
  productReviews: [],
  sellerReviews: [],
  productTags: [],
  sellerTags: []
});

const readLocal = (): LocalData => {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null');
    const data = { ...emptyLocal(), ...(parsed || {}) };
    // Accounts created before this change were stored under a different key.
    const legacy = JSON.parse(localStorage.getItem('amazin_registered_customers') || '[]');
    for (const c of Array.isArray(legacy) ? legacy : []) {
      if (!data.customers.some((x: Customer) => x.username === c.username)) {
        data.customers.push({
          id: c.id,
          username: c.username,
          displayName: c.displayName,
          joinDate: c.joinDate,
          accountType: 'New',
          favoriteCategory: null,
          password: ''
        });
      }
    }
    return data;
  } catch {
    return emptyLocal();
  }
};

const writeLocal = (data: LocalData) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Could not save to localStorage:', error);
  }
};

const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// ---------- The store ----------

export class StoreData {
  constructor(
    readonly source: DataSource,
    private products: Product[],
    private sellers: Seller[],
    private customers: Customer[],
    private productReviews: ProductReview[],
    private sellerReviews: SellerReview[],
    private productTags: ProductTagRow[],
    private sellerTags: SellerTagRow[],
    private priceHistory: PriceHistoryPoint[],
    // Lets the provider re-render pages after a write.
    private onChange: () => void = () => {}
  ) {
    this.products.sort(byName);
    this.sellers.sort(byName);
  }

  setOnChange(fn: () => void) {
    this.onChange = fn;
  }

  // Products
  getProducts(): Product[] {
    return [...this.products];
  }

  getProduct(id: string): Product | undefined {
    return this.products.find(p => p.id === id);
  }

  getProductsBySeller(sellerId: string): Product[] {
    return this.products.filter(p => p.sellerId === sellerId);
  }

  searchProducts(search: ProductSearch): Product[] {
    const text = search.text?.trim().toLowerCase();
    return this.products.filter(p => {
      if (text && ![p.name, p.category, p.sellerName].some(v => v.toLowerCase().includes(text))) return false;
      if (search.minPrice !== undefined && Number.isFinite(search.minPrice) && p.currentPrice < search.minPrice) return false;
      if (search.maxPrice !== undefined && Number.isFinite(search.maxPrice) && p.currentPrice > search.maxPrice) return false;
      if (search.category && p.category !== search.category) return false;
      if (search.sellerId && p.sellerId !== search.sellerId) return false;
      return true;
    });
  }

  getCategories(): string[] {
    return [...new Set(this.products.map(p => p.category))].sort();
  }

  getProductPriceHistory(productId: string): PriceHistoryPoint[] {
    return this.priceHistory
      .filter(p => p.productId === productId)
      .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  }

  // Sellers
  getSellers(): Seller[] {
    return [...this.sellers];
  }

  getSeller(id: string): Seller | undefined {
    return this.sellers.find(s => s.id === id);
  }

  getSellerProductCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const p of this.products) counts[p.sellerId] = (counts[p.sellerId] || 0) + 1;
    return counts;
  }

  // Reviews and tags
  getProductReviews(productId: string): ProductReview[] {
    return this.productReviews.filter(r => r.productId === productId).sort(newestFirst);
  }

  getSellerReviews(sellerId: string): SellerReview[] {
    return this.sellerReviews.filter(r => r.sellerId === sellerId).sort(newestFirst);
  }

  getSellerReviewAverage(sellerId: string): number | null {
    const reviews = this.getSellerReviews(sellerId);
    if (!reviews.length) return null;
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  }

  getProductTags(productId: string): TagWithCount[] {
    return countTags(this.productTags.filter(t => t.productId === productId));
  }

  getSellerTags(sellerId: string): TagWithCount[] {
    return countTags(this.sellerTags.filter(t => t.sellerId === sellerId));
  }

  async addProductReview(review: NewProductReview): Promise<void> {
    const saved = await this.insert('product_reviews', {
      product_id: review.productId,
      username: review.username,
      rating: review.rating,
      title: review.title ?? null,
      review_text: review.reviewText ?? null,
      review_date: review.reviewDate,
      helpful_votes: review.helpfulVotes
    });
    const row: ProductReview = saved ? toProductReview(saved) : { ...review, reviewId: newId('PR') };
    this.productReviews.push(row);
    this.persistLocal();
    this.onChange();
  }

  async addSellerReview(review: NewSellerReview): Promise<void> {
    const saved = await this.insert('seller_reviews', {
      seller_id: review.sellerId,
      username: review.username,
      rating: review.rating,
      title: review.title ?? null,
      review_text: review.reviewText ?? null,
      review_date: review.reviewDate,
      helpful_votes: review.helpfulVotes
    });
    const row: SellerReview = saved
      ? { ...toSellerReview(saved), verifiedBuyer: review.verifiedBuyer }
      : { ...review, reviewId: newId('SR') };
    this.sellerReviews.push(row);
    this.persistLocal();
    this.onChange();
  }

  async addProductTag(tag: NewProductTag): Promise<void> {
    const saved = await this.insert('product_tags', {
      product_id: tag.productId,
      tag_name: tag.tagName,
      added_by_username: tag.addedByUsername,
      date_added: tag.dateAdded
    });
    this.productTags.push(saved ? toProductTag(saved) : tag);
    this.persistLocal();
    this.onChange();
  }

  async addSellerTag(tag: NewSellerTag): Promise<void> {
    const saved = await this.insert('seller_tags', {
      seller_id: tag.sellerId,
      tag_name: tag.tagName,
      added_by_username: tag.addedByUsername,
      date_added: tag.dateAdded
    });
    this.sellerTags.push(saved ? toSellerTag(saved) : tag);
    this.persistLocal();
    this.onChange();
  }

  // Customers
  async findCustomer(username: string): Promise<Customer | undefined> {
    const name = normalizeUsername(username);
    const local = this.customers.find(c => c.username.toLowerCase() === name);
    if (local || this.source !== 'supabase' || !supabase) return local;
    // Someone may have registered on another device since the page loaded.
    const { data } = await supabase
      .from('customers')
      .select('customer_id, username, display_name, join_date, account_type, favorite_category')
      .ilike('username', name)
      .maybeSingle();
    if (!data) return undefined;
    const customer = toCustomer(data);
    this.customers.push(customer);
    return customer;
  }

  async registerCustomer(username: string, displayName: string): Promise<{ customer?: Customer; error?: string }> {
    const name = normalizeUsername(username);
    const display = displayName.trim().slice(0, 60);
    if (!USERNAME_PATTERN.test(name)) {
      return { error: 'Usernames must be 3-30 characters: letters, numbers, dots, dashes or underscores.' };
    }
    if (!display) return { error: 'Please enter a display name.' };
    if (await this.findCustomer(name)) return { error: 'That username is already taken.' };

    const customer: Customer = {
      id: newId('C'),
      username: name,
      displayName: display,
      joinDate: new Date().toISOString().slice(0, 10),
      accountType: 'New',
      favoriteCategory: null,
      password: ''
    };

    if (this.source === 'supabase' && supabase) {
      const { error } = await supabase.from('customers').insert({
        customer_id: customer.id,
        username: customer.username,
        display_name: customer.displayName,
        join_date: customer.joinDate,
        account_type: 'New',
        favorite_category: null,
        avg_cart_size: 0,
        has_left_seller_ratings: 0
      });
      if (error) {
        console.error('Supabase registerCustomer error:', error);
        return { error: 'Could not create the account right now. Please try again.' };
      }
    }

    this.customers.push(customer);
    this.persistLocal();
    return { customer };
  }

  // Inserts into Supabase and returns the saved row (with its generated id),
  // or null in CSV mode. Throws if Supabase rejects the write so the page can
  // tell the shopper.
  private async insert(table: string, values: Row): Promise<Row | null> {
    if (this.source !== 'supabase' || !supabase) return null;
    const { data, error } = await supabase.from(table).insert(values).select().single();
    if (error) {
      console.error(`Supabase insert into ${table} failed:`, error);
      throw new Error(error.message);
    }
    return data as Row;
  }

  private persistLocal() {
    if (this.source !== 'csv') return;
    const seeded = new Set(parseCsv(customersCsv).map(c => c.username.toLowerCase()));
    writeLocal({
      customers: this.customers.filter(c => !seeded.has(c.username.toLowerCase())),
      productReviews: this.productReviews,
      sellerReviews: this.sellerReviews,
      productTags: this.productTags,
      sellerTags: this.sellerTags
    });
  }
}

// ---------- Loading ----------

const loadFromCsv = (): StoreData => {
  const blurbs = new Map(parseCsv(sellerBlurbsCsv).map(b => [b.seller_id, b.blurb]));
  const sellers = parseCsv(sellersCsv).map(s => toSeller({ ...s, blurb: blurbs.get(s.seller_id) }));
  const products = parseCsv(productsCsv).map(toProduct);
  const local = readLocal();
  const customers = [...parseCsv(customersCsv).map(toCustomer), ...local.customers];
  return new StoreData(
    'csv',
    products,
    sellers,
    customers,
    local.productReviews,
    local.sellerReviews,
    local.productTags,
    local.sellerTags,
    []
  );
};

// Optional tables (reviews, tags, price history) may not exist yet; treat a
// missing table as empty instead of failing the whole store.
const fetchOptional = async (table: string, columns = '*'): Promise<Row[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from(table).select(columns);
  if (error) {
    console.warn(`Supabase table "${table}" unavailable (${error.message}); continuing without it.`);
    return [];
  }
  return (data || []) as unknown as Row[];
};

const loadFromSupabase = async (): Promise<StoreData> => {
  if (!supabase) throw new Error('Supabase is not configured');
  const [productsRes, sellersRes] = await Promise.all([
    supabase.from('products').select('*'),
    supabase.from('sellers').select('*')
  ]);
  if (productsRes.error) throw new Error(`products: ${productsRes.error.message}`);
  if (sellersRes.error) throw new Error(`sellers: ${sellersRes.error.message}`);
  if (!productsRes.data?.length || !sellersRes.data?.length) {
    throw new Error('products or sellers table is empty');
  }

  const [customers, productReviews, sellerReviews, productTags, sellerTags, priceHistory] = await Promise.all([
    // Never select the password column into the browser.
    fetchOptional('customers', 'customer_id, username, display_name, join_date, account_type, favorite_category'),
    fetchOptional('product_reviews'),
    fetchOptional('seller_reviews'),
    fetchOptional('product_tags'),
    fetchOptional('seller_tags'),
    fetchOptional('price_history')
  ]);

  // Blurbs can live on the sellers table or in a separate seller_blurbs table.
  let sellerRows = sellersRes.data as Row[];
  if (!sellerRows.some(s => s.blurb)) {
    const blurbs = await fetchOptional('seller_blurbs');
    const map = new Map(blurbs.map(b => [str(b.seller_id), b.blurb]));
    sellerRows = sellerRows.map(s => ({ ...s, blurb: map.get(str(s.seller_id)) ?? null }));
  }

  return new StoreData(
    'supabase',
    (productsRes.data as Row[]).map(toProduct),
    sellerRows.map(toSeller),
    customers.map(toCustomer),
    productReviews.map(toProductReview),
    sellerReviews.map(toSellerReview),
    productTags.map(toProductTag),
    sellerTags.map(toSellerTag),
    priceHistory.map(toPricePoint)
  );
};

let storePromise: Promise<StoreData> | null = null;

export const loadStoreData = (): Promise<StoreData> => {
  if (!storePromise) {
    storePromise = (async () => {
      supabase = await getSupabase();
      if (supabase) {
        try {
          const store = await loadFromSupabase();
          console.info('Amazin data source: Supabase');
          return store;
        } catch (error) {
          console.error('Could not load data from Supabase, using the bundled CSV data instead:', error);
        }
      }
      console.info('Amazin data source: bundled CSV files');
      return loadFromCsv();
    })();
  }
  return storePromise;
};
