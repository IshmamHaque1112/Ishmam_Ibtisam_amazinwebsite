import React from 'react';
import { useDb } from '../db/DbProvider';
import ProductRow from '../components/ProductRow';
import CatalogControls from '../components/CatalogControls';
import { formatMoney } from '../utils/cartPricing';
import { href, navigate, useDocumentTitle } from '../router';
import { applyCatalogFilters, CatalogFilters, readCatalogFilters, sortLabel, writeCatalogFilters } from '../utils/catalog';
import { NoSponsoredNote } from '../components/TrustSignals';

interface SearchPageProps {
  params: URLSearchParams;
}

const SearchPage: React.FC<SearchPageProps> = ({ params }) => {
  const db = useDb();
  const search = {
    text: params.get('q') ?? undefined,
    sellerId: params.get('seller') ?? undefined
  };
  useDocumentTitle(search.text ? `Search: ${search.text}` : 'Search results');
  const sellers = new Map(db.getSellers().map(s => [s.id, s]));
  // Words and seller narrow the list first; category, price, rating and the
  // quick filters are applied by the same controls as the Products page.
  const filters = readCatalogFilters(params);
  const matches = db.searchProducts(search);
  const results = applyCatalogFilters(matches, filters, sellers, product => {
    const reviews = db.getProductReviews(product.id);
    return reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : product.rating;
  });
  const sellerName = search.sellerId ? sellers.get(search.sellerId)?.name : undefined;

  const described = [
    search.text && `“${search.text}”`,
    filters.category,
    sellerName && `sold by ${sellerName}`,
    filters.minPrice !== undefined && `from ${formatMoney(filters.minPrice)}`,
    filters.maxPrice !== undefined && `up to ${formatMoney(filters.maxPrice)}`,
    filters.minRating && `${filters.minRating}+ stars`
  ].filter(Boolean);

  const update = (next: CatalogFilters) => navigate(href.search(writeCatalogFilters(params, next)), { quiet: true });

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold text-gray-900">Search results</h1>
      <p className="text-sm text-gray-600 mb-4">
        {described.length ? described.join(' · ') : 'All products'} · {results.length} found
      </p>
      {matches.length > 0 && <CatalogControls filters={filters} onChange={update} resultCount={results.length} categories={db.getCategories()} />}
      {matches.length > 0 && <NoSponsoredNote sortLabel={sortLabel(filters.sort)} />}
      {results.length === 0 ? (
        <div className="bg-white border rounded-lg p-8 text-center text-gray-700" data-testid="no-results">
          <p>Products cannot be found</p>
          <p className="mt-2 text-sm text-gray-600">
            Try fewer words or a wider price range, or{' '}
            <a href={href.products()} className="text-amazin-blue hover:underline">browse all products</a>.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {results.map(product => (
            <ProductRow
              key={product.id}
              product={product}
              seller={sellers.get(product.sellerId)}
              reviews={db.getProductReviews(product.id)}
              tags={db.getProductTags(product.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchPage;
