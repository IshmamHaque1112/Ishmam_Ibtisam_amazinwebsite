import React from 'react';
import { useDb } from '../db/DbProvider';
import ProductRow from '../components/ProductRow';
import { formatMoney } from '../utils/cartPricing';

interface SearchPageProps {
  params: URLSearchParams;
}

const toNumber = (value: string | null) => {
  if (value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const SearchPage: React.FC<SearchPageProps> = ({ params }) => {
  const db = useDb();
  const search = {
    text: params.get('q') ?? undefined,
    minPrice: toNumber(params.get('min')),
    maxPrice: toNumber(params.get('max')),
    category: params.get('category') ?? undefined,
    sellerId: params.get('seller') ?? undefined
  };
  const results = db.searchProducts(search);
  const sellers = new Map(db.getSellers().map(s => [s.id, s]));
  const sellerName = search.sellerId ? sellers.get(search.sellerId)?.name : undefined;

  const filters = [
    search.text && `“${search.text}”`,
    search.category,
    sellerName && `sold by ${sellerName}`,
    search.minPrice !== undefined && `from ${formatMoney(search.minPrice)}`,
    search.maxPrice !== undefined && `up to ${formatMoney(search.maxPrice)}`
  ].filter(Boolean);

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold text-gray-900">Search results</h1>
      <p className="text-sm text-gray-600 mb-4">
        {filters.length ? filters.join(' · ') : 'All products'} · {results.length} found
      </p>
      {results.length === 0 ? (
        <p className="bg-white border rounded-lg p-8 text-center text-gray-700" data-testid="no-results">
          Products cannot be found
        </p>
      ) : (
        <ul className="space-y-2">
          {results.map(product => (
            <ProductRow key={product.id} product={product} seller={sellers.get(product.sellerId)} reviews={db.getProductReviews(product.id)} tags={db.getProductTags(product.id)} />
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchPage;
