import { FeedbackMessage, FeedbackThread, Order, Product } from '../types';
import { PRICE_SIGNAL, SELLER_REPLIES, STOCK } from '../copy/differentiators';

// Plain logic behind the five Amazin promises (no sponsored placement,
// honest price signals, reachable sellers, verified purchase reviews, real
// stock counts). No React here so it can be unit tested with Node.

export type SignalKind = 'good' | 'caution' | 'neutral';

// ---------- Price signals ----------

export interface PriceSignal {
  kind: SignalKind | 'none';
  label: string;
}

export const NEAR_LOW_PERCENT = 0.05;

const validPrice = (n: number) => Number.isFinite(n) && n > 0;

// Where today's price sits against the product's own history. Checks run in
// order and the first match wins, so a price that is within 5% of both the
// low and the 30-day high is reported as near the low.
export const getPriceSignal = (product: Pick<Product, 'currentPrice' | 'allTimeLowPrice' | 'thirtyDayHighPrice'>): PriceSignal => {
  const { currentPrice, allTimeLowPrice, thirtyDayHighPrice } = product;
  if (!validPrice(currentPrice) || !validPrice(allTimeLowPrice) || !validPrice(thirtyDayHighPrice)) {
    return { kind: 'none', label: '' };
  }
  // Small tolerance so 4.99999 vs 5 from float math still counts as equal.
  const eps = 1e-9;
  if (currentPrice <= allTimeLowPrice + eps) return { kind: 'good', label: PRICE_SIGNAL.atLow };
  if (currentPrice <= allTimeLowPrice * (1 + NEAR_LOW_PERCENT) + eps) return { kind: 'good', label: PRICE_SIGNAL.nearLow };
  if (currentPrice >= thirtyDayHighPrice - eps) return { kind: 'caution', label: PRICE_SIGNAL.atHigh };
  const percent = Math.round(((currentPrice - allTimeLowPrice) / allTimeLowPrice) * 100);
  return { kind: 'neutral', label: PRICE_SIGNAL.aboveLow(percent) };
};

// ---------- Stock ----------

export interface StockLabel {
  status: 'out' | 'in' | 'unknown';
  label: string;
}

// Same wording at every quantity: the real number, no "hurry" language.
export const getStockLabel = (quantity: number | null | undefined): StockLabel => {
  if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity < 0) {
    return { status: 'unknown', label: STOCK.unknown };
  }
  const n = Math.floor(quantity);
  if (n === 0) return { status: 'out', label: STOCK.out };
  return { status: 'in', label: STOCK.inStock(n) };
};

// ---------- Seller responsiveness ----------

export const MIN_THREADS_FOR_STATS = 3;

export interface SellerResponsiveness {
  totalThreads: number;
  resolvedThreads: number;
  unansweredThreads: number;
  // Median time from a thread's first customer message to the first seller
  // reply. Null when no thread has a reply yet.
  medianReplyMs: number | null;
  // True when any timestamp used is a bare date (YYYY-MM-DD), so the reply
  // time can only be stated in days.
  dayPrecision: boolean;
  enoughData: boolean;
}

const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value.trim());

const toTime = (value: string): number => {
  const t = Date.parse(isDateOnly(value) ? `${value.trim()}T00:00:00Z` : value);
  return Number.isNaN(t) ? NaN : t;
};

export const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export const getSellerResponsiveness = (
  threads: FeedbackThread[],
  messagesForThread: (threadId: string) => FeedbackMessage[]
): SellerResponsiveness => {
  const replyTimes: number[] = [];
  let unanswered = 0;
  let dayPrecision = false;

  for (const thread of threads) {
    const messages = [...messagesForThread(thread.threadId)].sort((a, b) => toTime(a.sentAt) - toTime(b.sentAt));
    const firstCustomer = messages.find(m => m.senderType === 'customer');
    const firstReply = firstCustomer
      ? messages.find(m => m.senderType === 'seller' && toTime(m.sentAt) >= toTime(firstCustomer.sentAt))
      : undefined;
    if (!firstCustomer) continue;
    if (!firstReply) {
      unanswered++;
      continue;
    }
    const ms = toTime(firstReply.sentAt) - toTime(firstCustomer.sentAt);
    if (!Number.isFinite(ms)) continue;
    if (isDateOnly(firstReply.sentAt) || isDateOnly(firstCustomer.sentAt)) dayPrecision = true;
    replyTimes.push(ms);
  }

  return {
    totalThreads: threads.length,
    resolvedThreads: threads.filter(t => t.status === 'resolved').length,
    unansweredThreads: unanswered,
    medianReplyMs: median(replyTimes),
    dayPrecision,
    enoughData: threads.length >= MIN_THREADS_FOR_STATS
  };
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// "Usually replies ..." text. Dates without a time of day can only support a
// statement in days, so those never claim an hour count.
export const formatReplyTime = (ms: number, dayPrecision: boolean): string => {
  if (dayPrecision) {
    const days = Math.round(ms / DAY);
    if (days <= 0) return 'Usually replies the same day';
    return `Usually replies in about ${days} ${days === 1 ? 'day' : 'days'}`;
  }
  if (ms < HOUR) return 'Usually replies in under an hour';
  if (ms < 48 * HOUR) {
    const hours = Math.round(ms / HOUR);
    return `Usually replies in about ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  const days = Math.round(ms / DAY);
  return `Usually replies in about ${days} days`;
};

// One-line summary for compact spots like the product page seller box.
export const summarizeResponsiveness = (stats: SellerResponsiveness): string => {
  if (!stats.enoughData) return SELLER_REPLIES.notEnough(stats.totalThreads);
  const parts: string[] = [];
  if (stats.medianReplyMs !== null) parts.push(formatReplyTime(stats.medianReplyMs, stats.dayPrecision));
  parts.push(SELLER_REPLIES.resolved(stats.resolvedThreads, stats.totalThreads));
  return parts.join(' · ');
};

// ---------- Verified purchase ----------

// Returns the id of the shopper's earliest order that contains this product
// and was placed before the review, or undefined if there is none. Orders are
// the shopper's own (from their account in this browser).
export const findVerifyingOrder = (productId: string, orders: Order[], reviewTime: number): string | undefined => {
  const matching = orders
    .filter(order => order.placedAt <= reviewTime && order.lines.some(line => line.productId === productId))
    .sort((a, b) => a.placedAt - b.placedAt);
  return matching[0]?.id;
};
