import React, { useEffect, useState } from 'react';
import {
  CatalogFilters,
  clearedFilters,
  hasActiveFilters,
  NEAR_LOW_MARGIN,
  RATING_OPTIONS,
  SORT_OPTIONS,
  SortKey
} from '../utils/catalog';

interface CatalogControlsProps {
  filters: CatalogFilters;
  onChange: (filters: CatalogFilters) => void;
  resultCount: number;
  categories: string[];
}

const field = 'min-h-11 border border-gray-500 rounded px-2 py-1 text-sm text-gray-900 bg-white';

// Sort menu and filters for product lists: category, price range, minimum
// star rating and three quick toggles. Filters combine, and every change
// updates the URL, so the list can be refreshed, bookmarked or shared as is.
const CatalogControls: React.FC<CatalogControlsProps> = ({ filters, onChange, resultCount, categories }) => {
  // Price boxes apply on "Apply" or Enter, not on every keystroke.
  const [minPrice, setMinPrice] = useState(filters.minPrice?.toString() ?? '');
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice?.toString() ?? '');
  const [priceError, setPriceError] = useState<string | null>(null);

  useEffect(() => {
    setMinPrice(filters.minPrice?.toString() ?? '');
    setMaxPrice(filters.maxPrice?.toString() ?? '');
  }, [filters.minPrice, filters.maxPrice]);

  const applyPrices = (e?: React.FormEvent) => {
    e?.preventDefault();
    const min = minPrice.trim() === '' ? undefined : Number(minPrice);
    const max = maxPrice.trim() === '' ? undefined : Number(maxPrice);
    if ((min !== undefined && (!Number.isFinite(min) || min < 0)) || (max !== undefined && (!Number.isFinite(max) || max < 0))) {
      setPriceError('Prices must be numbers of 0 or more.');
      return;
    }
    if (min !== undefined && max !== undefined && min > max) {
      setPriceError('The minimum is higher than the maximum.');
      return;
    }
    setPriceError(null);
    onChange({ ...filters, minPrice: min, maxPrice: max });
  };

  const toggle = (key: 'nearLow' | 'priceLock' | 'recommended', label: string, hint: string) => (
    <label className="inline-flex min-h-11 items-center gap-2 text-sm text-gray-800 cursor-pointer select-none" title={hint}>
      <input
        type="checkbox"
        checked={filters[key]}
        onChange={e => onChange({ ...filters, [key]: e.target.checked })}
        aria-describedby={`catalog-hint-${key}`}
        className="w-5 h-5"
      />
      {label}
      <span id={`catalog-hint-${key}`} className="sr-only">{hint}</span>
    </label>
  );

  return (
    <section className="bg-white border rounded-lg p-3 mb-4 space-y-3" aria-label="Sort and filter products">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="flex flex-col">
          <label htmlFor="catalog-sort" className="text-xs font-medium text-gray-700">
            Sort by
          </label>
          <select
            id="catalog-sort"
            value={filters.sort}
            onChange={e => onChange({ ...filters, sort: e.target.value as SortKey })}
            className={`${field} max-w-[15rem]`}
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label htmlFor="catalog-category" className="text-xs font-medium text-gray-700">
            Category
          </label>
          <select
            id="catalog-category"
            value={filters.category ?? ''}
            onChange={e => onChange({ ...filters, category: e.target.value || undefined })}
            className={`${field} max-w-[12rem]`}
          >
            <option value="">All categories</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label htmlFor="catalog-rating" className="text-xs font-medium text-gray-700">
            Customer rating
          </label>
          <select
            id="catalog-rating"
            value={filters.minRating ?? ''}
            onChange={e => onChange({ ...filters, minRating: e.target.value ? Number(e.target.value) : undefined })}
            className={field}
          >
            <option value="">Any rating</option>
            {RATING_OPTIONS.map(stars => (
              <option key={stars} value={stars}>
                {stars} stars and up
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={applyPrices} className="flex flex-col" aria-label="Price range">
          <fieldset>
          <legend className="text-xs font-medium text-gray-700">Price range</legend>
          <div className="flex items-end gap-2">
            <label className="flex flex-col text-xs text-gray-700">
            Min ($)
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              className={`${field} w-24`}
            />
            </label>
            <label className="flex flex-col text-xs text-gray-700">
            Max ($)
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              className={`${field} w-24`}
            />
            </label>
            <button type="submit" className="min-h-11 text-sm font-semibold border border-gray-500 rounded px-4 hover:bg-gray-50">
              Apply
            </button>
          </div>
          </fieldset>
        </form>
      </div>

      {priceError && (
        <p className="text-sm text-red-800" role="alert">
          {priceError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <legend className="sr-only">Show only</legend>
          {toggle(
            'nearLow',
            'Near all-time low',
            `Today's price is within ${Math.round(NEAR_LOW_MARGIN * 100)}% of the lowest price on record`
          )}
          {toggle('priceLock', 'Price lock available', 'The seller offers a 24-hour price lock')}
          {toggle('recommended', 'Store recommended', 'Marked as recommended by Amazin')}
        </fieldset>
        {hasActiveFilters(filters) && (
          <button type="button" onClick={() => onChange(clearedFilters(filters))} className="min-h-11 px-3 text-sm text-amazin-blue hover:underline">
            Clear filters
          </button>
        )}
        <p className="text-sm text-gray-600 sm:ml-auto" role="status" aria-live="polite">
          {resultCount} {resultCount === 1 ? 'product' : 'products'}
        </p>
      </div>
    </section>
  );
};

export default CatalogControls;
