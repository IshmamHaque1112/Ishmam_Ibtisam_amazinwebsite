import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildOrder, splitReorderable } from '../src/utils/orders';
import { calculateGroupTotals } from '../src/utils/cartPricing';
import { cartItem, product, seller } from './fixtures';

const products = [
  product({ id: 'A', name: 'Apples', currentPrice: 12.5, sellerId: 'S1', sellerName: 'Orchard' }),
  product({ id: 'B', name: 'Bread', currentPrice: 4, sellerId: 'S2', sellerName: 'Bakery' })
];
const sellers = [seller({ id: 'S1', name: 'Orchard Co.' }), seller({ id: 'S2', name: 'Bakery' })];

test('buildOrder copies names and prices and matches the cart totals', () => {
  const items = [
    cartItem({ id: '1', productId: 'A', sellerId: 'S1', quantity: 2 }),
    cartItem({ id: '2', productId: 'B', sellerId: 'S2', quantity: 1, isSelected: false })
  ];
  const order = buildOrder(items, products, sellers, { id: 'AMZ-1', placedAt: 1000, folderName: 'Pantry' });
  assert.ok(order);
  const totals = calculateGroupTotals(items, products);
  assert.equal(order.grandTotal, totals.grandTotal);
  assert.equal(order.itemCount, 3);
  assert.equal(order.folderName, 'Pantry');
  assert.deepEqual(
    order.lines.map(l => [l.productName, l.sellerName, l.quantity, l.unitPrice, l.lineTotal]),
    [
      ['Apples', 'Orchard Co.', 2, 12.5, 25],
      ['Bread', 'Bakery', 1, 4, 4]
    ]
  );
});

test('buildOrder skips products that left the catalog and returns null when nothing is left', () => {
  const gone = cartItem({ productId: 'ZZZ' });
  assert.equal(buildOrder([gone], products, sellers, { id: 'x', placedAt: 0 }), null);
  const order = buildOrder([gone, cartItem({ id: '2', productId: 'B', sellerId: 'S2' })], products, sellers, {
    id: 'y',
    placedAt: 0
  });
  assert.equal(order?.lines.length, 1);
});

test('buildOrder records the locked price when a lock is active', () => {
  const item = cartItem({ productId: 'A', sellerId: 'S1', priceLocked: true, lockedPrice: 10, lockedTimestamp: Date.now() });
  const order = buildOrder([item], products, sellers, { id: 'z', placedAt: 0 });
  assert.equal(order?.lines[0].unitPrice, 10);
  assert.equal(order?.lines[0].priceLocked, true);
});

test('splitReorderable only offers items still sold by the same seller', () => {
  const order = buildOrder(
    [cartItem({ id: '1', productId: 'A', sellerId: 'S1' }), cartItem({ id: '2', productId: 'B', sellerId: 'S2' })],
    products,
    sellers,
    { id: 'o', placedAt: 0 }
  )!;
  const today = [products[0], product({ id: 'B', sellerId: 'S9' })];
  const { available, unavailable } = splitReorderable(order, today);
  assert.deepEqual(available.map(a => a.product.id), ['A']);
  assert.deepEqual(unavailable.map(l => l.productId), ['B']);
});
