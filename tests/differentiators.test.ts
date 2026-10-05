import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  findVerifyingOrder,
  formatReplyTime,
  getPriceSignal,
  getSellerResponsiveness,
  getStockLabel,
  median,
  summarizeResponsiveness
} from '../src/utils/differentiators';
import { sortLabel } from '../src/utils/catalog';
import { FeedbackMessage, FeedbackThread, Order } from '../src/types';
import { product } from './fixtures';

// ---------- Price signals ----------

test('price signal: missing or zero history shows nothing', () => {
  assert.equal(getPriceSignal(product({ allTimeLowPrice: 0 })).kind, 'none');
  assert.equal(getPriceSignal(product({ thirtyDayHighPrice: NaN })).kind, 'none');
});

test('price signal: at or below the recorded low', () => {
  assert.deepEqual(getPriceSignal(product({ currentPrice: 8, allTimeLowPrice: 8 })), {
    kind: 'good',
    label: 'Lowest price we have recorded'
  });
  assert.equal(getPriceSignal(product({ currentPrice: 7.5, allTimeLowPrice: 8 })).kind, 'good');
});

test('price signal: within 5% of the low', () => {
  const s = getPriceSignal(product({ currentPrice: 8.4, allTimeLowPrice: 8, thirtyDayHighPrice: 12 }));
  assert.deepEqual(s, { kind: 'good', label: 'Within 5% of its lowest price' });
});

test('price signal: equal to the 30-day high is a caution, not "raised before a sale"', () => {
  const s = getPriceSignal(product({ currentPrice: 12, allTimeLowPrice: 8, thirtyDayHighPrice: 12 }));
  assert.deepEqual(s, { kind: 'caution', label: 'Highest price in the last 30 days' });
});

test('price signal: near both low and high reports the low', () => {
  const s = getPriceSignal(product({ currentPrice: 10.2, allTimeLowPrice: 10, thirtyDayHighPrice: 10.3 }));
  assert.equal(s.label, 'Within 5% of its lowest price');
});

test('price signal: otherwise shows the percent above the low', () => {
  const s = getPriceSignal(product({ currentPrice: 10, allTimeLowPrice: 8, thirtyDayHighPrice: 12 }));
  assert.deepEqual(s, { kind: 'neutral', label: '25% above its lowest price' });
});

// ---------- Stock ----------

test('stock label uses the real number at every level', () => {
  assert.deepEqual(getStockLabel(0), { status: 'out', label: 'Out of stock' });
  assert.deepEqual(getStockLabel(1), { status: 'in', label: '1 in stock' });
  assert.deepEqual(getStockLabel(23), { status: 'in', label: '23 in stock' });
});

test('stock label: negative, undefined or NaN is unknown', () => {
  assert.equal(getStockLabel(-1).status, 'unknown');
  assert.equal(getStockLabel(undefined).status, 'unknown');
  assert.equal(getStockLabel(NaN).status, 'unknown');
});

// ---------- Seller responsiveness ----------

const thread = (id: string, status: 'open' | 'resolved' = 'open'): FeedbackThread => ({
  threadId: id,
  customerUsername: 'shopper',
  sellerId: 'S1',
  status,
  createdAt: '2026-09-01'
});
const msg = (threadId: string, senderType: 'customer' | 'seller', sentAt: string): FeedbackMessage => ({
  messageId: `${threadId}-${senderType}-${sentAt}`,
  threadId,
  senderType,
  senderName: senderType,
  messageText: 'hi',
  sentAt
});

test('responsiveness: zero threads is not enough data', () => {
  const stats = getSellerResponsiveness([], () => []);
  assert.equal(stats.enoughData, false);
  assert.equal(summarizeResponsiveness(stats), 'Not enough conversations yet to show reply times (0 so far).');
});

test('responsiveness: two threads still hides the numbers', () => {
  const threads = [thread('A'), thread('B')];
  const messages: Record<string, FeedbackMessage[]> = {
    A: [msg('A', 'customer', '2026-09-01T10:00:00Z'), msg('A', 'seller', '2026-09-01T11:00:00Z')],
    B: [msg('B', 'customer', '2026-09-01T10:00:00Z'), msg('B', 'seller', '2026-09-01T12:00:00Z')]
  };
  const stats = getSellerResponsiveness(threads, id => messages[id] ?? []);
  assert.equal(stats.enoughData, false);
  assert.match(summarizeResponsiveness(stats), /2 so far/);
});

test('responsiveness: median reply time, unanswered and resolved counts', () => {
  const threads = [thread('A', 'resolved'), thread('B', 'resolved'), thread('C'), thread('D')];
  const messages: Record<string, FeedbackMessage[]> = {
    A: [msg('A', 'customer', '2026-09-01T10:00:00Z'), msg('A', 'seller', '2026-09-01T11:00:00Z')],
    B: [msg('B', 'customer', '2026-09-01T10:00:00Z'), msg('B', 'seller', '2026-09-01T13:00:00Z')],
    C: [msg('C', 'customer', '2026-09-01T10:00:00Z'), msg('C', 'seller', '2026-09-03T10:00:00Z')],
    D: [msg('D', 'customer', '2026-09-01T10:00:00Z')]
  };
  const stats = getSellerResponsiveness(threads, id => messages[id] ?? []);
  assert.equal(stats.totalThreads, 4);
  assert.equal(stats.resolvedThreads, 2);
  assert.equal(stats.unansweredThreads, 1);
  assert.equal(stats.medianReplyMs, 3 * 60 * 60 * 1000);
  assert.equal(stats.dayPrecision, false);
  assert.equal(summarizeResponsiveness(stats), 'Usually replies in about 3 hours · Resolved 2 of 4 conversations');
});

test('responsiveness: all resolved, date-only timestamps are stated in days', () => {
  const threads = [thread('A', 'resolved'), thread('B', 'resolved'), thread('C', 'resolved')];
  const messages: Record<string, FeedbackMessage[]> = {
    A: [msg('A', 'customer', '2026-09-16'), msg('A', 'seller', '2026-09-17')],
    B: [msg('B', 'customer', '2026-09-16'), msg('B', 'seller', '2026-09-16')],
    C: [msg('C', 'customer', '2026-09-16'), msg('C', 'seller', '2026-09-18')]
  };
  const stats = getSellerResponsiveness(threads, id => messages[id] ?? []);
  assert.equal(stats.dayPrecision, true);
  assert.equal(summarizeResponsiveness(stats), 'Usually replies in about 1 day · Resolved 3 of 3 conversations');
});

test('formatReplyTime wording', () => {
  assert.equal(formatReplyTime(30 * 60 * 1000, false), 'Usually replies in under an hour');
  assert.equal(formatReplyTime(60 * 60 * 1000, false), 'Usually replies in about 1 hour');
  assert.equal(formatReplyTime(72 * 60 * 60 * 1000, false), 'Usually replies in about 3 days');
  assert.equal(formatReplyTime(0, true), 'Usually replies the same day');
  assert.equal(formatReplyTime(2 * 24 * 60 * 60 * 1000, true), 'Usually replies in about 2 days');
});

test('median of even and odd lists', () => {
  assert.equal(median([]), null);
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(median([4, 1, 3, 2]), 2.5);
});

// ---------- Verified purchase ----------

const order = (id: string, placedAt: number, productIds: string[]): Order => ({
  id,
  placedAt,
  lines: productIds.map(productId => ({
    productId,
    productName: productId,
    category: 'Groceries',
    sellerId: 'S1',
    sellerName: 'Seller',
    quantity: 1,
    unitPrice: 1,
    lineTotal: 1,
    priceLocked: false
  })),
  itemCount: productIds.length,
  subtotal: 1,
  tax: 0,
  shipping: 0,
  grandTotal: 1
});

test('verified purchase: no orders means not verified', () => {
  assert.equal(findVerifyingOrder('P1', [], 1000), undefined);
});

test('verified purchase: an order for a different product does not count', () => {
  assert.equal(findVerifyingOrder('P1', [order('O1', 100, ['P2'])], 1000), undefined);
});

test('verified purchase: an order placed after the review does not count', () => {
  assert.equal(findVerifyingOrder('P1', [order('O1', 2000, ['P1'])], 1000), undefined);
});

test('verified purchase: returns the earliest qualifying order', () => {
  const orders = [order('O2', 500, ['P1']), order('O1', 100, ['P1', 'P3']), order('O3', 5000, ['P1'])];
  assert.equal(findVerifyingOrder('P1', orders, 1000), 'O1');
});

// ---------- No sponsored note ----------

test('sortLabel names the order the list is actually in', () => {
  assert.equal(sortLabel('name'), 'Name (A to Z)');
  assert.equal(sortLabel('price-asc'), 'Price: low to high');
});
