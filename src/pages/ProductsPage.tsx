import React from 'react';
import { useDb } from '../db/DbProvider';
import ProductRow from '../components/ProductRow';

const ProductsPage: React.FC = () => {
  const db = useDb();
  const products = db.getProducts();
  const sellers = new Map(db.getSellers().map(s => [s.id, s]));

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold text-gray-900">Products</h1>
      <p className="text-sm text-gray-600 mb-4">
        {products.length} products · transparent pricing, quality ratings and seller details
      </p>
      <ul className="space-y-2">
        {products.map(product => (
          <ProductRow key={product.id} product={product} seller={sellers.get(product.sellerId)} />
        ))}
      </ul>
    </div>
  );
};

export default ProductsPage;
