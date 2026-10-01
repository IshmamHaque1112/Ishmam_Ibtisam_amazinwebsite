import React, { useId, useState } from 'react';
import { useDb } from '../db/DbProvider';
import { href, navigate } from '../router';
import { getSuggestions, Suggestion } from '../utils/catalog';

interface SearchBarProps {
  initial?: URLSearchParams;
  onSearched?: () => void;
}

// Search by words, price range, category and 3rd party seller.
const SearchBar: React.FC<SearchBarProps> = ({ initial, onSearched }) => {
  const db = useDb();
  const categories = db.getCategories();
  const sellers = db.getSellers();

  const [text, setText] = useState(initial?.get('q') ?? '');
  const [minPrice, setMinPrice] = useState(initial?.get('min') ?? '');
  const [maxPrice, setMaxPrice] = useState(initial?.get('max') ?? '');
  const [category, setCategory] = useState(initial?.get('category') ?? '');
  const [sellerId, setSellerId] = useState(initial?.get('seller') ?? '');
  const [error, setError] = useState<string | null>(null);
  // Autocomplete (ARIA combobox): suggestions update as the shopper types.
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const suggestions = open ? getSuggestions(text, db.getProducts(), sellers) : [];

  const choose = (suggestion: Suggestion) => {
    setOpen(false);
    setActive(-1);
    if (suggestion.kind === 'product') navigate(href.product(suggestion.productId));
    else if (suggestion.kind === 'seller') navigate(href.seller(suggestion.sellerId));
    else navigate(href.search(new URLSearchParams({ category: suggestion.label })));
    onSearched?.();
  };

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && suggestions.length) {
      e.preventDefault();
      setOpen(true);
      setActive(i => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp' && suggestions.length) {
      e.preventDefault();
      setActive(i => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && open && active >= 0 && suggestions[active]) {
      e.preventDefault();
      choose(suggestions[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const min = minPrice === '' ? undefined : Number(minPrice);
    const max = maxPrice === '' ? undefined : Number(maxPrice);
    if ((min !== undefined && (!Number.isFinite(min) || min < 0)) || (max !== undefined && (!Number.isFinite(max) || max < 0))) {
      setError('Prices must be numbers of 0 or more.');
      return;
    }
    if (min !== undefined && max !== undefined && min > max) {
      setError('The minimum price is higher than the maximum price.');
      return;
    }
    setError(null);
    setOpen(false);
    const params = new URLSearchParams();
    if (text.trim()) params.set('q', text.trim());
    if (minPrice !== '') params.set('min', minPrice);
    if (maxPrice !== '') params.set('max', maxPrice);
    if (category) params.set('category', category);
    if (sellerId) params.set('seller', sellerId);
    navigate(href.search(params));
    onSearched?.();
  };

  const handleClear = () => {
    setText('');
    setMinPrice('');
    setMaxPrice('');
    setCategory('');
    setSellerId('');
    setError(null);
  };

  const field = 'min-h-11 border border-gray-500 rounded px-2 py-1 text-sm text-gray-900 bg-white max-w-full';

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border-b shadow-sm"
      role="search"
      aria-label="Product search"
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-end gap-3">
        <div className="relative flex flex-col text-xs text-gray-700 flex-1 min-w-[180px]">
          <label htmlFor={`${listId}-input`}>Search</label>
          <input
            id={`${listId}-input`}
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={suggestions.length > 0}
            aria-controls={`${listId}-list`}
            aria-activedescendant={active >= 0 && suggestions[active] ? `${listId}-opt-${active}` : undefined}
            autoComplete="off"
            value={text}
            onChange={e => {
              setText(e.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onKeyDown={onSearchKeyDown}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Product name, category or seller"
            className={field}
            autoFocus
          />
          <ul
            id={`${listId}-list`}
            role="listbox"
            aria-label="Search suggestions"
            className={`absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg ${
              suggestions.length ? '' : 'hidden'
            }`}
          >
            {suggestions.map((suggestion, index) => (
              <li
                key={`${suggestion.kind}-${suggestion.label}`}
                id={`${listId}-opt-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseDown={e => {
                  e.preventDefault();
                  choose(suggestion);
                }}
                onMouseEnter={() => setActive(index)}
                className={`cursor-pointer px-3 py-2 text-sm ${index === active ? 'bg-amber-50' : ''}`}
              >
                <span className="block text-gray-900">{suggestion.label}</span>
                <span className="block text-xs text-gray-600">
                  {suggestion.kind === 'product' ? 'Product' : suggestion.kind === 'category' ? 'Category' : 'Seller'} ·{' '}
                  {suggestion.detail}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <label className="flex flex-col text-xs text-gray-700 w-24">
          Min price
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={minPrice}
            onChange={e => setMinPrice(e.target.value)}
            placeholder="$0"
            className={field}
          />
        </label>
        <label className="flex flex-col text-xs text-gray-700 w-24">
          Max price
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={maxPrice}
            onChange={e => setMaxPrice(e.target.value)}
            placeholder="Any"
            className={field}
          />
        </label>
        <label className="flex flex-col text-xs text-gray-700">
          Category
          <select value={category} onChange={e => setCategory(e.target.value)} className={field}>
            <option value="">All categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs text-gray-700 min-w-0 max-w-full">
          3rd party seller
          <select value={sellerId} onChange={e => setSellerId(e.target.value)} className={field}>
            <option value="">All sellers</option>
            {sellers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-amazin-orange hover:bg-amazin-yellow text-gray-900 font-semibold px-4 py-1.5 rounded text-sm"
          >
            Search
          </button>
          <button type="button" onClick={handleClear} className="min-h-11 text-sm text-gray-700 hover:underline px-3">
            Clear
          </button>
        </div>
        {error && (
          <p className="w-full text-sm text-red-800" role="alert">{error}</p>
        )}
      </div>
    </form>
  );
};

export default SearchBar;
