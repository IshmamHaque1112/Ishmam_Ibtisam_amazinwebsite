import React from 'react';
import { Product, Seller } from '../types';
import { href } from '../router';
import { calculateProductRating } from '../utils/ratingCalculations';
import { formatMoney } from '../utils/cartPricing';
import { CategoryIcon, Stars } from './Icons';
import AddToCart from './AddToCart';

interface ProductRowProps {
  product: Product;
  seller?: Seller;
}

const ProductRow: React.FC<ProductRowProps> = ({ product, seller }) => {
  const rating = calculateProductRating(product, seller);

  return (
    <li className="bg-white border rounded-lg p-3 flex flex-wrap sm:flex-nowrap items-center gap-3" data-testid="product-row">
      <CategoryIcon category={product.category} />
      <div className="flex-1 min-w-[200px]">
        <a href={href.product(product.id)} className="font-semibold text-amazin-blue hover:underline">
          {product.name}
        </a>
        <div className="text-xs text-gray-600 flex flex-wrap gap-x-3 gap-y-1 mt-0.5">
          <span>{product.category}</span>
          <Stars rating={product.rating} />
          <span>
            Sold by{' '}
            <a href={href.seller(product.sellerId)} className="text-amazin-blue hover:underline">
              {product.sellerName}
            </a>
          </span>
          {product.storeRecommended && <span className="text-green-700">✓ Store recommended</span>}
        </div>
        <div className="text-xs mt-1">
          <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded-full">{rating.badge}</span>
          <span className="text-gray-500 ml-2">Score {rating.score}/100</span>
        </div>
      </div>
      <div className="text-right w-28">
        <div className="font-bold text-gray-900">{formatMoney(product.currentPrice)}</div>
        <div className="text-[11px] text-gray-500">Low {formatMoney(product.allTimeLowPrice)}</div>
      </div>
      <div className="w-full sm:w-auto sm:min-w-[130px] text-right">
        <AddToCart product={product} compact />
      </div>
    </li>
  );
};

export default ProductRow;
