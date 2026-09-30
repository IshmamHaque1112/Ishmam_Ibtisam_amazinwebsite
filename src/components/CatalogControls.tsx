import React from 'react';
import { CatalogFilters, hasActiveFilters, NEAR_LOW_MARGIN, SORT_OPTIONS, SortKey } from '../utils/catalog';

interface CatalogControlsProps {
  filters: CatalogFilters;
  onChange: (filters: CatalogFilters) => void;
  resultCount: number;
}

// Sort menu and quick filters for product lists. Every change updates the
// URL, so the list can be refreshed, bookmarked or shared as it is.
const CatalogControls: React.FC<CatalogControlsProps> = ({ filters, onChange, resultCount }) => {
  const toggle = (key: 'nearLow' | 'priceLock' | 'recommended', label: string, hint: string) => (
    <label className="inline-flex items-center gap-2 text-sm text-gray-800 cursor-pointer select-none" title={hint}>
      <input
        type="checkbox"
        checked={filters[key]}
        onChange={e => onChange({ ...filters, [key]: e.target.checked })}
        className="w-4 h-4"
      />
      {label}
    </label>
  );

  return (
    <section
      className="bg-white border rounded-lg p-3 mb-4 flex flex-wrap items-center gap-x-5 gap-y-3"
      aria-label="Sort and filter products"
    >
      <div className="flex items-center gap-2">
        <label htmlFor="catalog-sort" className="text-sm font-medium text-gray-800">
          Sort by
        </label>
        <select
          id="catalog-sort"
          value={filters.sort}
          onChange={e => onChange({ ...filters, sort: e.target.value as SortKey })}
          className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 bg-white max-w-[15rem]"
        >
          {SORT_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
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
        <button
          type="button"
          onClick={() => onChange({ ...filters, nearLow: false, priceLock: false, recommended: false })}
          className="text-sm text-amazin-blue hover:underline"
        >
          Clear filters
        </button>
      )}
      <p className="text-sm text-gray-600 sm:ml-auto" role="status" aria-live="polite">
        {resultCount} {resultCount === 1 ? 'product' : 'products'}
      </p>
    </section>
  );
};

export default CatalogControls;
