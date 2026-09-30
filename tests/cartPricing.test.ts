import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCartTotals,
  calculateGroupTotals,
  clampQuantity,
  FREE_SHIPPING_THRESHOLD,
  getEffectivePrice,
  MAX_QUANTITY,
  STANDARD_SHIPPING,
  TAX_RATE
} from '../src/utils/cartPricing';
import { cartItem, product } from './fixtures';

test('clampQuantity keeps quantities between 1 and MAX_QUANTITY', () => {
  assert.equal(clampQuantity(0), 1);
  assert.equal(clampQuantity(-4), 1);
  assert.equal(clampQuantity(3.7), 3);
  assert.equal(clampQuantity(MAX_QUANTITY + 5), MAX_QUANTITY);
  assert.equal(clampQuantity(Number.NaN), 1);
});

test('only selected items count toward the totals', () => {
  const products = [product({ id: 'A', currentPrice: 20 }), product({ id: 'B', currentPrice: 5 })];
  const items = [
    cartItem({ id: '1', productId: 'A', quantity: 2 }),
    cartItem({ id: '2', productId: 'B', quantity: 1, isSelected: false })
  ];
  const totals = calculateCartTotals(items, products);
  assert.equal(totals.subtotal, 40);
  assert.equal(totals.selectedQuantity, 2);
  assert.equal(totals.totalQuantity, 3);
  assert.equal(totals.tax, Math.round(40 * TAX_RATE * 100) / 100);
  assert.equal(totals.shipping, 0, 'orders at or over the threshold ship free');
});

test('shipping is charged below the free-shipping threshold and not on an empty selection', () => {
  const products = [product({ id: 'A', currentPrice: FREE_SHIPPING_THRESHOLD - 1 })];
  assert.equal(calculateCartTotals([cartItem({ productId: 'A' })], products).shipping, STANDARD_SHIPPING);
  assert.equal(calculateCartTotals([cartItem({ productId: 'A', isSelected: false })], products).shipping, 0);
});

test('folder checkout counts every item in the folder, ticked or not', () => {
  const products = [product({ id: 'A', currentPrice: 10 })];
  const totals = calculateGroupTotals([cartItem({ productId: 'A', isSelected: false, quantity: 3 })], products);
  assert.equal(totals.subtotal, 30);
});

test('an active price lock never charges more than the locked price', () => {
  const now = Date.now();
  const locked = cartItem({ priceLocked: true, lockedPrice: 9, lockedTimestamp: now });
  assert.equal(getEffectivePrice(locked, product({ currentPrice: 12 })), 9);
  assert.equal(getEffectivePrice(locked, product({ currentPrice: 7 })), 7, 'a price drop still wins');
  const expired = cartItem({ priceLocked: true, lockedPrice: 9, lockedTimestamp: now - 25 * 60 * 60 * 1000 });
  assert.equal(getEffectivePrice(expired, product({ currentPrice: 12 })), 12);
});
