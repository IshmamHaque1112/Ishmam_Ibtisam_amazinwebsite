import React from 'react';
import { mockProducts, getSellersForProduct } from '../data/mockData';
import ProductCard from './ProductCard';

const ProductList: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Amazin</h1>
        <p className="text-gray-600">Transparent pricing, quality ratings, and smart shopping tools</p>
      </div>

      {/* Category Filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button className="px-4 py-2 bg-amazin-orange text-white rounded-full text-sm font-medium">
          All Products
        </button>
        <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-300">
          Electronics
        </button>
        <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-300">
          Pantry
        </button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {mockProducts.map((product) => {
          const sellers = getSellersForProduct(product.id);
          return (
            <ProductCard
              key={product.id}
              product={product}
              sellers={sellers}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ProductList;
