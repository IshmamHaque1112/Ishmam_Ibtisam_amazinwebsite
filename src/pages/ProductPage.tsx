import React from 'react';
import { useDb } from '../db/DbProvider';
import { href } from '../router';
import { calculateDealScore, calculateProductRating, calculateSellerRating } from '../utils/ratingCalculations';
import { formatMoney } from '../utils/cartPricing';
import { CategoryIcon, Stars } from '../components/Icons';
import AddToCart from '../components/AddToCart';
import NotFoundPage from './NotFoundPage';

const ProductPage: React.FC<{ id: string }> = ({ id }) => {
  const db = useDb();
  const product = db.getProduct(id);
  if (!product) return <NotFoundPage message="That product doesn't exist." />;

  const seller = db.getSeller(product.sellerId);
  const rating = calculateProductRating(product, seller);
  const sellerRating = seller ? calculateSellerRating(seller) : undefined;
  const dealScore = calculateDealScore(product);
  const more = db
    .searchProducts({ category: product.category })
    .filter(p => p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <a href={href.products()} className="text-sm text-amazin-blue hover:underline">← All products</a>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white border rounded-lg p-5">
          <div className="flex gap-4 items-start">
            <CategoryIcon category={product.category} className="w-24 h-24 text-5xl" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
              <p className="text-sm text-gray-600">
                {product.category} · Product ID {product.id}
              </p>
              <div className="mt-1"><Stars rating={product.rating} /></div>
              {product.storeRecommended && (
                <p className="text-sm text-green-700 mt-1">✓ Store recommended</p>
              )}
            </div>
          </div>

          <h2 className="font-semibold text-gray-900 mt-6 mb-2">Price transparency</h2>
          <dl className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-50 rounded p-3">
              <dt className="text-xs text-gray-500">Today</dt>
              <dd className="text-xl font-bold">{formatMoney(product.currentPrice)}</dd>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <dt className="text-xs text-gray-500">All-time low</dt>
              <dd className="text-xl font-bold text-green-700">{formatMoney(product.allTimeLowPrice)}</dd>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <dt className="text-xs text-gray-500">30-day high</dt>
              <dd className="text-xl font-bold text-red-700">{formatMoney(product.thirtyDayHighPrice)}</dd>
            </div>
          </dl>
          <p className="text-sm text-gray-600 mt-2">
            Deal score {dealScore}/100: today's price is {formatMoney(product.currentPrice - product.allTimeLowPrice)} above
            the all-time low.
          </p>

          <h2 className="font-semibold text-gray-900 mt-6 mb-2">Amazin product score</h2>
          <p className="text-sm">
            <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded-full">{rating.badge}</span>
            <span className="ml-2 font-bold">{rating.score}/100</span>
          </p>
          <ul className="text-sm text-gray-600 mt-2 list-disc pl-5">
            <li>Customer rating: {rating.factors.customerRating}/100 (50% weight)</li>
            <li>Deal score: {rating.factors.dealScore}/100 (30% weight)</li>
            <li>Seller score: {rating.factors.sellerScore}/100 (20% weight)</li>
          </ul>
        </div>

        <aside className="space-y-4">
          <div className="bg-white border rounded-lg p-4">
            <div className="text-2xl font-bold">{formatMoney(product.currentPrice)}</div>
            <div className="mt-3">
              <AddToCart product={product} showFolderPicker />
            </div>
          </div>

          {seller && sellerRating && (
            <div className="bg-white border rounded-lg p-4 text-sm">
              <h2 className="font-semibold text-gray-900 mb-1">Sold by</h2>
              <a href={href.seller(seller.id)} className="text-amazin-blue font-medium hover:underline">
                {seller.name}
              </a>
              <p className="mt-1">
                <span className="bg-green-50 text-green-800 px-2 py-0.5 rounded-full text-xs">{sellerRating.badge}</span>
                <span className="ml-2 text-gray-600">Seller score {sellerRating.score}/100</span>
              </p>
              <ul className="mt-2 text-gray-600 space-y-0.5">
                <li>Returns: {seller.returnPolicy}</li>
                <li>Supply: {seller.sourceOfSupply}</li>
                <li>Price lock: {seller.priceLockEligible ? 'Available' : 'Not available'}</li>
              </ul>
            </div>
          )}
        </aside>
      </div>

      {more.length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold text-gray-900 mb-2">More in {product.category}</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {more.map(p => (
              <li key={p.id} className="bg-white border rounded p-3 flex justify-between text-sm">
                <a href={href.product(p.id)} className="text-amazin-blue hover:underline">{p.name}</a>
                <span className="font-medium">{formatMoney(p.currentPrice)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ProductPage;
