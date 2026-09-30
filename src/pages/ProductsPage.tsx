import React from 'react';
import { useDb } from '../db/DbProvider';
import ProductRow from '../components/ProductRow';
import CatalogControls from '../components/CatalogControls';
import { href, navigate, useDocumentTitle } from '../router';
import { applyCatalogFilters, CatalogFilters, readCatalogFilters, writeCatalogFilters } from '../utils/catalog';

const ProductsPage: React.FC<{ params: URLSearchParams }> = ({ params }) => {
  const db = useDb();
  useDocumentTitle('Products');
  const sellers = new Map(db.getSellers().map(s => [s.id, s]));
  const filters = readCatalogFilters(params);
  const all = db.getProducts();

  // Match the star rating shown in each row: shopper reviews when there are
  // any, otherwise the catalog rating.
  const ratingFor = (productId: string, fallback: number) => {
    const reviews = db.getProductReviews(productId);
    return reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : fallback;
  };
  const products = applyCatalogFilters(all, filters, sellers, p => ratingFor(p.id, p.rating));

  const update = (next: CatalogFilters) => navigate(href.products(writeCatalogFilters(params, next)), { quiet: true });

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold text-gray-900">Products</h1>
      <p className="text-sm text-gray-600 mb-4">
        {all.length} products · transparent pricing, quality ratings and seller details
      </p>
      <CatalogControls filters={filters} onChange={update} resultCount={products.length} />
      {products.length === 0 ? (
        <div className="bg-white border rounded-lg p-8 text-center text-gray-700" data-testid="no-results">
          <p>No products match these filters.</p>
          <a href={href.products()} className="mt-2 inline-block text-amazin-blue hover:underline">
            Show all products
          </a>
        </div>
      ) : (
        <ul className="space-y-2">
          {products.map(product => (
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

export default ProductsPage;
