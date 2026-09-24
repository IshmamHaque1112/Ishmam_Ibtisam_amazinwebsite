import React, { useState } from 'react';
import { useDb } from '../db/DbProvider';
import { href, navigate } from '../router';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
  };

  const field = 'border border-gray-300 rounded px-2 py-1 text-sm text-gray-900';

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border-b shadow-sm"
      role="search"
      aria-label="Product search"
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-xs text-gray-600 flex-1 min-w-[180px]">
          Search
          <input
            type="search"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Product name, category or seller"
            className={field}
            autoFocus
          />
        </label>
        <label className="flex flex-col text-xs text-gray-600 w-24">
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
        <label className="flex flex-col text-xs text-gray-600 w-24">
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
        <label className="flex flex-col text-xs text-gray-600">
          Category
          <select value={category} onChange={e => setCategory(e.target.value)} className={field}>
            <option value="">All categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs text-gray-600">
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
            className="bg-amazin-orange hover:bg-amazin-yellow text-white font-semibold px-4 py-1.5 rounded text-sm"
          >
            Search
          </button>
          <button type="button" onClick={handleClear} className="text-sm text-gray-600 hover:underline px-2">
            Clear
          </button>
        </div>
      </div>
    </form>
  );
};

export default SearchBar;
