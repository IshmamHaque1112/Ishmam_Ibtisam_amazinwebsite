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

export interface CatalogFilters {
  sort: SortKey;
  nearLow: boolean; // within NEAR_LOW_MARGIN of the all-time low
  priceLock: boolean; // seller offers a 24h price lock
  recommended: boolean; // store recommended
}

// "Near all-time low" means today's price is at most 10% above the lowest
// price on record.
export const NEAR_LOW_MARGIN = 0.1;

export const isNearAllTimeLow = (product: Product): boolean =>
  product.currentPrice <= product.allTimeLowPrice * (1 + NEAR_LOW_MARGIN) + 1e-9;

const isSortKey = (value: string | null): value is SortKey =>
  SORT_OPTIONS.some(option => option.value === value);

export const readCatalogFilters = (params: URLSearchParams): CatalogFilters => {
  const sort = params.get('sort');
  return {
    sort: isSortKey(sort) ? sort : 'name',
    nearLow: params.get('near_low') === '1',
    priceLock: params.get('lock') === '1',
    recommended: params.get('rec') === '1'
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
  return next;
};

export const hasActiveFilters = (filters: CatalogFilters): boolean =>
  filters.nearLow || filters.priceLock || filters.recommended;

export const applyCatalogFilters = (
  products: Product[],
  filters: CatalogFilters,
  sellers: Map<string, Seller>,
  ratingFor: (product: Product) => number = product => product.rating
): Product[] => {
  const filtered = products.filter(product => {
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
