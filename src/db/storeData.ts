import productsCsv from '../data/products.csv?raw';
import sellersCsv from '../data/sellers.csv?raw';
import customersCsv from '../data/customers.csv?raw';
import sellerBlurbsCsv from '../data/seller_blurbs.csv?raw';
import feedbackThreadsCsv from '../../supabase/feedback_threads_seed.csv?raw';
import feedbackMessagesCsv from '../../supabase/feedback_messages_seed.csv?raw';
import { parseCsv } from './csv';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase, authSignUp, authSignIn, authSignOut } from '../lib/supabase';
import { setLocalPassword, verifyLocalPassword, hasLocalPassword } from '../utils/localAuth';
import {
  Customer,
  Product,
  ProductReview,
  ProductSearch,
  Seller,
  SellerReview,
  TagWithCount,
  FeedbackThread,
  FeedbackMessage,
  CartHold
} from '../types';

// The store keeps the whole catalog in memory and answers page queries
// synchronously (pages call db.getProducts() etc. directly while rendering).
// Data is loaded once at startup:
//   1. from Supabase, when VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY are set
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

// Passwords: 10-15 characters. No character-class requirement beyond length.
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 15;
export const validatePassword = (password: string): string | null => {
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    return `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters.`;
  }
  return null;
};

type Row = Record<string, unknown>;

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
const first = (row: Row, ...keys: string[]): unknown => {
  for (const key of keys) if (row[key] !== null && row[key] !== undefined) return row[key];
  return undefined;
};
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
  sellerName: str(r.seller_name),
  stockQuantity: r.stock_quantity !== undefined ? num(r.stock_quantity) : 999 // Default high stock for CSV mode
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
  password: '',
  role: (r.role as 'shopper' | 'seller' | 'admin') || 'shopper',
  managedSellerId: r.managed_seller_id ? str(r.managed_seller_id) : undefined,
  authUserId: r.auth_user_id ? str(r.auth_user_id) : undefined
});

const toProductReview = (r: Row): ProductReview => ({
  reviewId: str(first(r, 'review_id', 'product_review_id', 'id')),
  productId: str(first(r, 'product_id', 'productId')),
  username: str(first(r, 'username', 'reviewer_username', 'reviewer_name', 'user_name')),
  rating: num(first(r, 'rating', 'review_rating', 'product_rating')),
  title: first(r, 'title', 'review_title') ? str(first(r, 'title', 'review_title')) : undefined,
  reviewText: first(r, 'review_text', 'reviewText', 'review', 'text', 'body', 'content') ? str(first(r, 'review_text', 'reviewText', 'review', 'text', 'body', 'content')) : undefined,
  reviewDate: str(first(r, 'review_date', 'reviewDate', 'date_written', 'created_at', 'date')).slice(0, 10),
  helpfulVotes: num(first(r, 'helpful_votes', 'helpfulVotes', 'helpful_count'))
});

const toSellerReview = (r: Row): SellerReview => ({
  reviewId: str(first(r, 'review_id', 'seller_review_id', 'id')),
  sellerId: str(first(r, 'seller_id', 'sellerId')),
  username: str(first(r, 'username', 'reviewer_username', 'reviewer_name', 'user_name')),
  rating: num(first(r, 'rating', 'review_rating', 'seller_rating')),
  title: first(r, 'title', 'review_title') ? str(first(r, 'title', 'review_title')) : undefined,
  reviewText: first(r, 'review_text', 'reviewText', 'review', 'text', 'body', 'content') ? str(first(r, 'review_text', 'reviewText', 'review', 'text', 'body', 'content')) : undefined,
  reviewDate: str(first(r, 'review_date', 'reviewDate', 'date_written', 'created_at', 'date')).slice(0, 10),
  helpfulVotes: num(first(r, 'helpful_votes', 'helpfulVotes', 'helpful_count')),
  // Only present if the Supabase table has a verified_buyer column.
  verifiedBuyer: first(r, 'verified_buyer', 'verifiedBuyer') === true ? true : undefined
});

const toProductTag = (r: Row): ProductTagRow => ({
  productId: str(first(r, 'product_id', 'productId')),
  tagName: str(first(r, 'tag_name', 'tag', 'name')),
  addedByUsername: str(first(r, 'added_by_username', 'tagged_by_username', 'username', 'added_by')),
  dateAdded: str(first(r, 'date_added', 'dateAdded', 'created_at', 'date')).slice(0, 10)
});

const toSellerTag = (r: Row): SellerTagRow => ({
  sellerId: str(first(r, 'seller_id', 'sellerId')),
  tagName: str(first(r, 'tag_name', 'tag', 'name')),
  addedByUsername: str(first(r, 'added_by_username', 'tagged_by_username', 'username', 'added_by')),
  dateAdded: str(first(r, 'date_added', 'dateAdded', 'created_at', 'date')).slice(0, 10)
});

const toPricePoint = (r: Row): PriceHistoryPoint => ({
  productId: str(first(r, 'product_id', 'productId')),
  price: num(first(r, 'price', 'product_price', 'current_price')),
  recordedAt: str(first(r, 'recorded_at', 'recordedAt', 'price_date', 'history_date', 'date', 'created_at')).slice(0, 10)
});

const toFeedbackThread = (r: Row): FeedbackThread => ({
  threadId: str(first(r, 'thread_id', 'threadId')),
  customerUsername: str(first(r, 'customer_username', 'customerUsername')),
  sellerId: str(first(r, 'seller_id', 'sellerId')),
  productId: r.product_id ? str(first(r, 'product_id', 'productId')) : undefined,
  status: (first(r, 'status') as 'open' | 'resolved') || 'open',
  createdAt: str(first(r, 'created_at', 'createdAt', 'created'))
});

const toFeedbackMessage = (r: Row): FeedbackMessage => ({
  messageId: str(first(r, 'message_id', 'messageId')),
  threadId: str(first(r, 'thread_id', 'threadId')),
  senderType: (first(r, 'sender_type', 'senderType') as 'customer' | 'seller') || 'customer',
  senderName: str(first(r, 'sender_name', 'senderName')),
  messageText: str(first(r, 'message_text', 'messageText', 'text')),
  sentAt: str(first(r, 'sent_at', 'sentAt', 'created_at'))
});

const toCartHold = (r: Row): CartHold => ({
  username: str(first(r, 'username')),
  productId: str(first(r, 'product_id', 'productId')),
  quantity: num(first(r, 'quantity')),
  updatedAt: str(first(r, 'updated_at', 'updatedAt'))
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
  feedbackThreads: FeedbackThread[];
  feedbackMessages: FeedbackMessage[];
  cartHolds: CartHold[];
}

const emptyLocal = (): LocalData => ({
  customers: [],
  productReviews: [],
  sellerReviews: [],
  productTags: [],
  sellerTags: [],
  feedbackThreads: [],
  feedbackMessages: [],
  cartHolds: []
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
          password: '',
          role: 'shopper',
          managedSellerId: undefined,
          authUserId: undefined
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
    private feedbackThreads: FeedbackThread[],
    private feedbackMessages: FeedbackMessage[],
    private cartHolds: CartHold[],
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

  async updateProductStock(productId: string, stockQuantity: number): Promise<void> {
    const product = this.getProduct(productId);
    if (!product) throw new Error('Product not found');
    
    if (this.source === 'supabase' && supabase) {
      const { error } = await supabase
        .from('products')
        .update({ stock_quantity: stockQuantity })
        .eq('product_id', productId);
      if (error) throw new Error(error.message);
    }
    
    product.stockQuantity = stockQuantity;
    this.onChange();
  }

  async updateProductPrice(productId: string, currentPrice: number): Promise<void> {
    const product = this.getProduct(productId);
    if (!product) throw new Error('Product not found');
    
    if (this.source === 'supabase' && supabase) {
      const { error } = await supabase
        .from('products')
        .update({ current_price: currentPrice })
        .eq('product_id', productId);
      if (error) throw new Error(error.message);
    }
    
    product.currentPrice = currentPrice;
    this.onChange();
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

  // Feedback threads and messages
  getFeedbackThreadsForCustomer(username: string): FeedbackThread[] {
    return this.feedbackThreads.filter(t => t.customerUsername === username).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getFeedbackThreadsForSeller(sellerId: string): FeedbackThread[] {
    return this.feedbackThreads.filter(t => t.sellerId === sellerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getFeedbackThread(threadId: string): FeedbackThread | undefined {
    return this.feedbackThreads.find(t => t.threadId === threadId);
  }

  getFeedbackMessages(threadId: string): FeedbackMessage[] {
    return this.feedbackMessages.filter(m => m.threadId === threadId).sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  }

  async refreshFeedback(): Promise<void> {
    if (this.source !== 'supabase' || !supabase) return;
    const [threads, messages] = await Promise.all([
      supabase.from('feedback_threads').select('*'),
      supabase.from('feedback_messages').select('*')
    ]);
    if (threads.error) throw new Error(threads.error.message);
    if (messages.error) throw new Error(messages.error.message);
    this.feedbackThreads = (threads.data ?? []).map(toFeedbackThread);
    this.feedbackMessages = (messages.data ?? []).map(toFeedbackMessage);
    this.onChange();
  }

  async createFeedbackThread(thread: Omit<FeedbackThread, 'threadId' | 'createdAt'>): Promise<FeedbackThread> {
    const saved = await this.insert('feedback_threads', {
      customer_username: thread.customerUsername,
      seller_id: thread.sellerId,
      product_id: thread.productId ?? null,
      status: thread.status
    });
    const newThread: FeedbackThread = saved ? toFeedbackThread(saved) : {
      ...thread,
      threadId: newId('FT'),
      createdAt: new Date().toISOString().slice(0, 10)
    };
    this.feedbackThreads.push(newThread);
    this.persistLocal();
    this.onChange();
    return newThread;
  }

  async addFeedbackMessage(message: Omit<FeedbackMessage, 'messageId' | 'sentAt'>): Promise<void> {
    const saved = await this.insert('feedback_messages', {
      thread_id: message.threadId,
      sender_type: message.senderType,
      sender_name: message.senderName,
      message_text: message.messageText
    });
    const newMessage: FeedbackMessage = saved ? toFeedbackMessage(saved) : {
      ...message,
      messageId: newId('FM'),
      sentAt: new Date().toISOString().slice(0, 10)
    };
    this.feedbackMessages.push(newMessage);
    this.persistLocal();
    this.onChange();
  }

  async updateThreadStatus(threadId: string, status: 'open' | 'resolved'): Promise<void> {
    if (this.source === 'supabase' && supabase) {
      const { error } = await supabase
        .from('feedback_threads')
        .update({ status })
        .eq('thread_id', threadId);
      if (error) throw new Error(error.message);
    }
    const thread = this.feedbackThreads.find(t => t.threadId === threadId);
    if (thread) {
      thread.status = status;
      this.persistLocal();
      this.onChange();
    }
  }

  // Cart holds for stock reservation
  getCartHoldsForProduct(productId: string): CartHold[] {
    return this.cartHolds.filter(h => h.productId === productId);
  }

  getCartHold(username: string, productId: string): CartHold | undefined {
    return this.cartHolds.find(h => h.username === username && h.productId === productId);
  }

  async setCartHold(username: string, productId: string, quantity: number): Promise<void> {
    if (quantity <= 0) {
      // Delete the hold
      if (this.source === 'supabase' && supabase) {
        const { error } = await supabase
          .from('cart_holds')
          .delete()
          .eq('username', username)
          .eq('product_id', productId);
        if (error) throw new Error(error.message);
      }
      this.cartHolds = this.cartHolds.filter(h => !(h.username === username && h.productId === productId));
    } else {
      // Upsert the hold
      const existing = this.getCartHold(username, productId);
      if (this.source === 'supabase' && supabase) {
        const { error } = await supabase
          .from('cart_holds')
          .upsert({
            username,
            product_id: productId,
            quantity,
            updated_at: new Date().toISOString()
          }, { onConflict: 'username,product_id' });
        if (error) throw new Error(error.message);
      }
      if (existing) {
        existing.quantity = quantity;
        existing.updatedAt = new Date().toISOString();
      } else {
        this.cartHolds.push({
          username,
          productId,
          quantity,
          updatedAt: new Date().toISOString()
        });
      }
    }
    this.persistLocal();
    this.onChange();
  }

  async clearCartHolds(username: string): Promise<void> {
    if (this.source === 'supabase' && supabase) {
      const { error } = await supabase
        .from('cart_holds')
        .delete()
        .eq('username', username);
      if (error) throw new Error(error.message);
    }
    this.cartHolds = this.cartHolds.filter(h => h.username !== username);
    this.persistLocal();
    this.onChange();
  }

  getAvailableStock(productId: string, excludeUsername?: string): number {
    const product = this.getProduct(productId);
    if (!product) return 0;
    
    const heldByOthers = this.cartHolds
      .filter(h => h.productId === productId && (!excludeUsername || h.username !== excludeUsername))
      .reduce((sum, h) => sum + h.quantity, 0);
    
    return Math.max(0, product.stockQuantity - heldByOthers);
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
    const saved = await this.insert(['product_tags', 'product_tag'], {
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
    const saved = await this.insert(['seller_tags', 'seller_tag'], {
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
  getCustomer(username: string): Customer | undefined {
    return this.customers.find(c => c.username.toLowerCase() === normalizeUsername(username));
  }

  async findCustomer(username: string): Promise<Customer | undefined> {
    const name = normalizeUsername(username);
    const local = this.customers.find(c => c.username.toLowerCase() === name);
    if (local || this.source !== 'supabase' || !supabase) return local;
    // Someone may have registered on another device since the page loaded.
    const { data } = await supabase
      .from('customers')
      .select('customer_id, username, display_name, join_date, account_type, favorite_category, role, managed_seller_id, auth_user_id')
      .ilike('username', name)
      .maybeSingle();
    if (!data) return undefined;
    const customer = toCustomer(data);
    this.customers.push(customer);
    return customer;
  }

  async registerCustomer(username: string, displayName: string, password: string): Promise<{ customer?: Customer; error?: string }> {
    const name = normalizeUsername(username);
    const display = displayName.trim().slice(0, 60);
    if (!USERNAME_PATTERN.test(name)) {
      return { error: 'Usernames must be 3-30 characters: letters, numbers, dots, dashes or underscores.' };
    }
    if (!display) return { error: 'Please enter a display name.' };
    const passwordError = validatePassword(password);
    if (passwordError) return { error: passwordError };
    if (await this.findCustomer(name)) return { error: 'That username is already taken.' };

    // Supabase's lockdown migration creates the public customer row from an
    // Auth trigger, so pass display_name as metadata and reuse that row. Older
    // projects without the trigger still use the legacy customer insert below.
    if (this.source === 'supabase' && supabase) {
      const auth = await authSignUp(name, password, display);
      if (!auth.ok) return { error: auth.error ?? 'Could not set a password for this account.' };
      const triggerCreatedCustomer = await this.findCustomer(name);
      if (triggerCreatedCustomer) return { customer: triggerCreatedCustomer };
    } else {
      await setLocalPassword(name, password);
    }

    const customer: Customer = {
      id: newId('C'),
      username: name,
      displayName: display,
      joinDate: new Date().toISOString().slice(0, 10),
      accountType: 'New',
      favoriteCategory: null,
      password: '',
      role: 'shopper'
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
        // An Auth trigger can win a race against this compatibility insert.
        // If so, return the row it created instead of reporting a false error.
        const triggerCreatedCustomer = await this.findCustomer(name);
        if (triggerCreatedCustomer) return { customer: triggerCreatedCustomer };
        console.error('Supabase registerCustomer error:', error);
        return {
          error: error.code === '42501'
            ? 'Supabase blocked customer-row creation. Apply the signup trigger from supabase/security-lockdown.sql, then remove any Auth account left by this failed attempt before retrying.'
            : 'Could not create the account right now. Please try again.'
        };
      }
    }

    this.customers.push(customer);
    this.persistLocal();
    return { customer };
  }

  // True when this username exists as a customer but has never had a
  // password set in this data source - only meaningful in CSV/local mode,
  // where "no password yet" can safely be resolved by setting one right in
  // the browser (there's no other party's account to protect). In Supabase
  // mode this is always false; a missing Auth user there just looks like an
  // incorrect password, which is the correct, safe behavior.
  needsPasswordSetup(username: string): boolean {
    if (this.source === 'supabase') return false;
    return !hasLocalPassword(normalizeUsername(username));
  }

  async setPassword(username: string, password: string): Promise<{ ok: boolean; error?: string }> {
    const passwordError = validatePassword(password);
    if (passwordError) return { ok: false, error: passwordError };
    const name = normalizeUsername(username);
    if (this.source === 'supabase' && supabase) {
      const auth = await authSignUp(name, password);
      if (!auth.ok) return { ok: false, error: auth.error };
      return { ok: true };
    }
    await setLocalPassword(name, password);
    return { ok: true };
  }

  async verifyPassword(username: string, password: string): Promise<{ ok: boolean; error?: string }> {
    const name = normalizeUsername(username);
    if (this.source === 'supabase') {
      const auth = await authSignIn(name, password);
      return auth.ok ? { ok: true } : { ok: false, error: auth.error };
    }
    const ok = await verifyLocalPassword(name, password);
    return ok ? { ok: true } : { ok: false, error: 'Incorrect password.' };
  }

  async signOut(): Promise<void> {
    if (this.source === 'supabase') await authSignOut();
  }

  // Inserts into Supabase and returns the saved row (with its generated id),
  // or null in CSV mode. Throws if Supabase rejects the write so the page can
  // tell the shopper.
  private async insert(table: string | string[], values: Row): Promise<Row | null> {
    if (this.source !== 'supabase' || !supabase) return null;
    const tables = Array.isArray(table) ? table : [table];
    let lastError: { message: string } | null = null;
    for (const name of tables) {
      const { data, error } = await supabase.from(name).insert(values).select().single();
      if (!error) return data as Row;
      lastError = error;
    }
    console.error(`Supabase insert into ${tables.join(' or ')} failed:`, lastError);
    throw new Error(lastError?.message ?? 'Supabase insert failed.');
  }

  private persistLocal() {
    if (this.source !== 'csv') return;
    const seeded = new Set(parseCsv(customersCsv).map(c => c.username.toLowerCase()));
    writeLocal({
      customers: this.customers.filter(c => !seeded.has(c.username.toLowerCase())),
      productReviews: this.productReviews,
      sellerReviews: this.sellerReviews,
      productTags: this.productTags,
      sellerTags: this.sellerTags,
      feedbackThreads: this.feedbackThreads,
      feedbackMessages: this.feedbackMessages,
      cartHolds: this.cartHolds
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
  const seedThreads = parseCsv(feedbackThreadsCsv).map(toFeedbackThread);
  const seedMessages = parseCsv(feedbackMessagesCsv).map(toFeedbackMessage);
  const feedbackThreads = [...seedThreads, ...local.feedbackThreads.filter(t => !seedThreads.some(seed => seed.threadId === t.threadId))];
  const feedbackMessages = [...seedMessages, ...local.feedbackMessages.filter(m => !seedMessages.some(seed => seed.messageId === m.messageId))];
  return new StoreData(
    'csv',
    products,
    sellers,
    customers,
    local.productReviews,
    local.sellerReviews,
    local.productTags,
    local.sellerTags,
    [],
    feedbackThreads,
    feedbackMessages,
    local.cartHolds
  );
};

// Optional tables (reviews, tags, price history) may not exist yet; treat a
// missing table as empty instead of failing the whole store.
const fetchOptional = async (table: string | string[], columns = '*'): Promise<Row[]> => {
  if (!supabase) return [];
  const tables = Array.isArray(table) ? table : [table];
  let lastError: { message: string } | null = null;
  let querySucceeded = false;
  for (const name of tables) {
    const { data, error } = await supabase.from(name).select(columns);
    if (error) {
      lastError = error;
      continue;
    }
    querySucceeded = true;
    if (data?.length) {
      if (tables.length > 1 && name !== tables[0]) {
        console.info(`Loaded optional data from Supabase table "${name}".`);
      }
      return data as unknown as Row[];
    }
  }
  if (lastError && !querySucceeded) {
    console.warn(`Supabase table "${tables.join(' or ')}" unavailable (${lastError.message}); continuing without it.`);
  }
  return [];
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

  const [customers, productReviews, sellerReviews, productTags, sellerTags, priceHistory, feedbackThreads, feedbackMessages, cartHolds] = await Promise.all([
    // Never select the password column into the browser.
    fetchOptional('customers', 'customer_id, username, display_name, join_date, account_type, favorite_category, role, managed_seller_id, auth_user_id'),
    fetchOptional('product_reviews'),
    fetchOptional('seller_reviews'),
    fetchOptional(['product_tags', 'product_tag']),
    fetchOptional(['seller_tags', 'seller_tag']),
    fetchOptional('price_history'),
    fetchOptional('feedback_threads'),
    fetchOptional('feedback_messages'),
    fetchOptional('cart_holds')
  ]);

  // Blurbs can live on the sellers table or in a separate seller_blurbs table.
  let sellerRows = sellersRes.data as Row[];
  if (!sellerRows.some(s => s.blurb)) {
    const blurbs = await fetchOptional('seller_blurbs');
    const map = new Map(blurbs.map(b => [str(b.seller_id), b.blurb]));
    sellerRows = sellerRows.map(s => ({ ...s, blurb: map.get(str(s.seller_id)) ?? null }));
  }

  console.info('Supabase optional rows loaded:', {
    productReviews: productReviews.length,
    sellerReviews: sellerReviews.length,
    productTags: productTags.length,
    sellerTags: sellerTags.length,
    priceHistory: priceHistory.length
  });

  return new StoreData(
    'supabase',
    (productsRes.data as Row[]).map(toProduct),
    sellerRows.map(toSeller),
    customers.map(toCustomer),
    productReviews.map(toProductReview),
    sellerReviews.map(toSellerReview),
    productTags.map(toProductTag),
    sellerTags.map(toSellerTag),
    priceHistory.map(toPricePoint),
    feedbackThreads.map(toFeedbackThread),
    feedbackMessages.map(toFeedbackMessage),
    cartHolds.map(toCartHold)
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
