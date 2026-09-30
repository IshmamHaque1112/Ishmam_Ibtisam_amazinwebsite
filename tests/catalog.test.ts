import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyCatalogFilters,
  clearedFilters,
  getSuggestions,
  isNearAllTimeLow,
  readCatalogFilters,
  writeCatalogFilters
} from '../src/utils/catalog';
import { product, seller } from './fixtures';

const sellers = new Map([
  ['S1', seller({ id: 'S1', priceLockEligible: true })],
  ['S2', seller({ id: 'S2', priceLockEligible: false })]
]);
const catalog = [
  product({ id: 'A', name: 'Cheap', currentPrice: 5, allTimeLowPrice: 5, thirtyDayHighPrice: 9, rating: 3, sellerId: 'S1' }),
  product({ id: 'B', name: 'Pricey', currentPrice: 50, allTimeLowPrice: 30, thirtyDayHighPrice: 55, rating: 5, sellerId: 'S2', storeRecommended: true }),
  product({ id: 'C', name: 'Middle', currentPrice: 20, allTimeLowPrice: 19, thirtyDayHighPrice: 30, rating: 4, sellerId: 'S2' })
];
const names = (list: { name: string }[]) => list.map(p => p.name);
const base = { sort: 'name' as const, nearLow: false, priceLock: false, recommended: false };

test('sorts by name, price, rating and deal score', () => {
  assert.deepEqual(names(applyCatalogFilters(catalog, base, sellers)), ['Cheap', 'Middle', 'Pricey']);
  assert.deepEqual(names(applyCatalogFilters(catalog, { ...base, sort: 'price-asc' }, sellers)), ['Cheap', 'Middle', 'Pricey']);
  assert.deepEqual(names(applyCatalogFilters(catalog, { ...base, sort: 'price-desc' }, sellers)), ['Pricey', 'Middle', 'Cheap']);
  assert.deepEqual(names(applyCatalogFilters(catalog, { ...base, sort: 'rating' }, sellers)), ['Pricey', 'Middle', 'Cheap']);
  assert.deepEqual(names(applyCatalogFilters(catalog, { ...base, sort: 'deal' }, sellers)), ['Cheap', 'Middle', 'Pricey']);
});

test('rating sort can use shopper review averages', () => {
  const ratings: Record<string, number> = { A: 5, B: 1, C: 3 };
  const sorted = applyCatalogFilters(catalog, { ...base, sort: 'rating' }, sellers, p => ratings[p.id]);
  assert.deepEqual(names(sorted), ['Cheap', 'Middle', 'Pricey']);
});

test('quick filters narrow the list', () => {
  assert.deepEqual(names(applyCatalogFilters(catalog, { ...base, nearLow: true }, sellers)), ['Cheap', 'Middle']);
  assert.deepEqual(names(applyCatalogFilters(catalog, { ...base, priceLock: true }, sellers)), ['Cheap']);
  assert.deepEqual(names(applyCatalogFilters(catalog, { ...base, recommended: true }, sellers)), ['Pricey']);
  assert.deepEqual(names(applyCatalogFilters(catalog, { ...base, nearLow: true, recommended: true }, sellers)), []);
});

test('near all-time low means at most 10% above the lowest recorded price', () => {
  assert.equal(isNearAllTimeLow(product({ currentPrice: 11, allTimeLowPrice: 10 })), true);
  assert.equal(isNearAllTimeLow(product({ currentPrice: 11.01, allTimeLowPrice: 10 })), false);
});

test('filters round-trip through the URL and ignore unknown values', () => {
  const written = writeCatalogFilters(new URLSearchParams('q=pan'), { sort: 'deal', nearLow: true, priceLock: false, recommended: true });
  assert.equal(written.toString(), 'q=pan&sort=deal&near_low=1&rec=1');
  assert.deepEqual(readCatalogFilters(written), {
    sort: 'deal',
    nearLow: true,
    priceLock: false,
    recommended: true,
    category: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    minRating: undefined
  });
  assert.equal(readCatalogFilters(new URLSearchParams('sort=bogus')).sort, 'name');
  assert.equal(writeCatalogFilters(new URLSearchParams('sort=deal'), base).toString(), '');
});

test('category, price range and rating filters combine', () => {
  const filters = { ...base, category: 'Groceries', minPrice: 6, maxPrice: 60, minRating: 4 };
  assert.deepEqual(names(applyCatalogFilters(catalog, filters, sellers)), ['Middle', 'Pricey']);
  assert.deepEqual(names(applyCatalogFilters(catalog, { ...filters, maxPrice: 30 }, sellers)), ['Middle']);
  assert.deepEqual(names(applyCatalogFilters(catalog, { ...filters, category: 'Toys' }, sellers)), []);
  assert.deepEqual(clearedFilters({ ...filters, sort: 'deal' }), { sort: 'deal', nearLow: false, priceLock: false, recommended: false });
});

test('price and rating filters read from the URL and reject bad values', () => {
  const read = readCatalogFilters(new URLSearchParams('category=Medicine&min=5&max=abc&rating=9'));
  assert.equal(read.category, 'Medicine');
  assert.equal(read.minPrice, 5);
  assert.equal(read.maxPrice, undefined);
  assert.equal(read.minRating, undefined);
  const written = writeCatalogFilters(new URLSearchParams(), { ...base, minPrice: 0, minRating: 3 });
  assert.equal(written.toString(), 'min=0&rating=3');
});

test('search suggestions match words in any order and cover products, categories and sellers', () => {
  const products = [
    product({ id: 'P1', name: 'Non-Stick Frying Pan', category: 'Kitchenware' }),
    product({ id: 'P2', name: 'Pancake Mix', category: 'Groceries' }),
    product({ id: 'P3', name: 'Garden Rake', category: 'Outdoor & Garden' })
  ];
  const sellerList = [seller({ id: 'S1', name: 'Pantry Plus' })];
  const pan = getSuggestions('pan', products, sellerList);
  assert.deepEqual(pan.map(s => s.label), ['Non-Stick Frying Pan', 'Pancake Mix', 'Pantry Plus']);
  assert.deepEqual(getSuggestions('pan frying', products, sellerList).map(s => s.label), ['Non-Stick Frying Pan']);
  assert.deepEqual(getSuggestions('garden', products, sellerList).map(s => s.kind), ['product', 'category']);
  assert.deepEqual(getSuggestions('   ', products, sellerList), []);
});
