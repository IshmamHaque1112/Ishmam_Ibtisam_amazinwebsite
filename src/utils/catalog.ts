import { Product, Seller } from '../types';
import { calculateDealScore, calculateProductRating } from './ratingCalculations';

// Sorting and quick filters shared by the Products and Search pages. The
// choices live in the URL (?sort=price-asc&near_low=1) so a filtered list
// survives a refresh and can be shared as a link.

export type SortKey = 'name' | 'price-asc' | 'price-desc' | 'deal' | 'rating' | 'score';

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'name', label: 'Name (A to Z)' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'deal', label: 'Best deal (closest to all-time low)' },
  { value: 'rating', label: 'Customer rating' },
  { value: 'score', label: 'Amazin product score' }
];

// The order the list is actually in, as shown next to "No sponsored results".
export const sortLabel = (sort: SortKey): string =>
  SORT_OPTIONS.find(option => option.value === sort)?.label ?? SORT_OPTIONS[0].label;

export interface CatalogFilters {
  sort: SortKey;
  nearLow: boolean; // within NEAR_LOW_MARGIN of the all-time low
  priceLock: boolean; // seller offers a 24h price lock
  recommended: boolean; // store recommended
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number; // 1-5 stars
}

export const RATING_OPTIONS = [4, 3, 2];

// "Near all-time low" means today's price is at most 10% above the lowest
// price on record.
export const NEAR_LOW_MARGIN = 0.1;

export const isNearAllTimeLow = (product: Product): boolean =>
  product.currentPrice <= product.allTimeLowPrice * (1 + NEAR_LOW_MARGIN) + 1e-9;

const isSortKey = (value: string | null): value is SortKey =>
  SORT_OPTIONS.some(option => option.value === value);

const readNumber = (value: string | null, max = Infinity): number | undefined => {
  if (value === null || value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= max ? n : undefined;
};

// Uses the same parameter names as the search bar (category, min, max) so
// the two stay in step.
export const readCatalogFilters = (params: URLSearchParams): CatalogFilters => {
  const sort = params.get('sort');
  const category = params.get('category')?.trim();
  return {
    sort: isSortKey(sort) ? sort : 'name',
    nearLow: params.get('near_low') === '1',
    priceLock: params.get('lock') === '1',
    recommended: params.get('rec') === '1',
    category: category || undefined,
    minPrice: readNumber(params.get('min')),
    maxPrice: readNumber(params.get('max')),
    minRating: readNumber(params.get('rating'), 5)
  };
};

// Returns a copy of params with the filters written in. Defaults are left
// out so plain links stay short.
export const writeCatalogFilters = (params: URLSearchParams, filters: CatalogFilters): URLSearchParams => {
  const next = new URLSearchParams(params);
  const set = (key: string, on: boolean, value = '1') => (on ? next.set(key, value) : next.delete(key));
  set('sort', filters.sort !== 'name', filters.sort);
  set('near_low', filters.nearLow);
  set('lock', filters.priceLock);
  set('rec', filters.recommended);
  set('category', Boolean(filters.category), filters.category);
  set('min', filters.minPrice !== undefined, String(filters.minPrice));
  set('max', filters.maxPrice !== undefined, String(filters.maxPrice));
  set('rating', Boolean(filters.minRating), String(filters.minRating));
  return next;
};

export const hasActiveFilters = (filters: CatalogFilters): boolean =>
  filters.nearLow ||
  filters.priceLock ||
  filters.recommended ||
  Boolean(filters.category) ||
  filters.minPrice !== undefined ||
  filters.maxPrice !== undefined ||
  Boolean(filters.minRating);

export const clearedFilters = (filters: CatalogFilters): CatalogFilters => ({
  sort: filters.sort,
  nearLow: false,
  priceLock: false,
  recommended: false
});

export const applyCatalogFilters = (
  products: Product[],
  filters: CatalogFilters,
  sellers: Map<string, Seller>,
  ratingFor: (product: Product) => number = product => product.rating
): Product[] => {
  const filtered = products.filter(product => {
    if (filters.category && product.category !== filters.category) return false;
    if (filters.minPrice !== undefined && product.currentPrice < filters.minPrice) return false;
    if (filters.maxPrice !== undefined && product.currentPrice > filters.maxPrice) return false;
    if (filters.minRating && ratingFor(product) < filters.minRating) return false;
    if (filters.nearLow && !isNearAllTimeLow(product)) return false;
    if (filters.priceLock && !sellers.get(product.sellerId)?.priceLockEligible) return false;
    if (filters.recommended && !product.storeRecommended) return false;
    return true;
  });

  const byName = (a: Product, b: Product) => a.name.localeCompare(b.name);
  // Each comparator falls back to the name so equal values keep a stable,
  // predictable order.
  const compare: Record<SortKey, (a: Product, b: Product) => number> = {
    name: byName,
    'price-asc': (a, b) => a.currentPrice - b.currentPrice || byName(a, b),
    'price-desc': (a, b) => b.currentPrice - a.currentPrice || byName(a, b),
    deal: (a, b) => calculateDealScore(b) - calculateDealScore(a) || byName(a, b),
    rating: (a, b) => ratingFor(b) - ratingFor(a) || byName(a, b),
    score: (a, b) =>
      calculateProductRating(b, sellers.get(b.sellerId)).score -
        calculateProductRating(a, sellers.get(a.sellerId)).score || byName(a, b)
  };

  return [...filtered].sort(compare[filters.sort]);
};

// ---------- Search suggestions ----------

export type Suggestion =
  | { kind: 'product'; label: string; detail: string; productId: string }
  | { kind: 'category'; label: string; detail: string }
  | { kind: 'seller'; label: string; detail: string; sellerId: string };

// Suggestions for the search box as the shopper types: matching products
// first, then categories, then sellers. Words can match in any order, and
// matches at the start of a word rank higher.
export const getSuggestions = (
  query: string,
  products: Product[],
  sellers: Seller[],
  limit = 8
): Suggestion[] => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const score = (text: string): number => {
    const lower = text.toLowerCase();
    let total = 0;
    for (const word of words) {
      const index = lower.indexOf(word);
      if (index === -1) return -1;
      const startsWord = index === 0 || /[^a-z0-9]/.test(lower[index - 1]);
      total += startsWord ? 2 : 1;
    }
    return total;
  };

  const ranked = <T,>(items: T[], text: (item: T) => string) =>
    items
      .map(item => ({ item, s: score(text(item)) }))
      .filter(entry => entry.s >= 0)
      .sort((a, b) => b.s - a.s || text(a.item).localeCompare(text(b.item)))
      .map(entry => entry.item);

  const productHits: Suggestion[] = ranked(products, p => p.name).map(p => ({
    kind: 'product',
    label: p.name,
    detail: `${p.category} · $${p.currentPrice.toFixed(2)}`,
    productId: p.id
  }));
  const categories = [...new Set(products.map(p => p.category))];
  const categoryHits: Suggestion[] = ranked(categories, c => c).map(c => ({
    kind: 'category',
    label: c,
    detail: `${products.filter(p => p.category === c).length} products`
  }));
  const sellerHits: Suggestion[] = ranked(sellers, s => s.name).map(s => ({
    kind: 'seller',
    label: s.name,
    detail: '3rd party seller',
    sellerId: s.id
  }));

  // Keep a couple of category and seller hits visible even when many
  // products match.
  const others = [...categoryHits.slice(0, 2), ...sellerHits.slice(0, 2)];
  return [...productHits.slice(0, Math.max(limit - others.length, 4)), ...others].slice(0, limit);
};
