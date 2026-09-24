import React from 'react';
import { useDb } from '../db/DbProvider';
import { href } from '../router';
import { calculateSellerRating } from '../utils/ratingCalculations';
import { Stars } from '../components/Icons';

const SellersPage: React.FC = () => {
  const db = useDb();
  const sellers = db.getSellers();
  const counts = db.getSellerProductCounts();

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold text-gray-900">3rd party sellers</h1>
      <p className="text-sm text-gray-600 mb-4">
        {sellers.length} sellers · see where products come from and each seller's return policy before you buy
      </p>
      <ul className="space-y-2">
        {sellers.map(seller => {
          const rating = calculateSellerRating(seller);
          const productCount = counts[seller.id] ?? 0;
          return (
            <li key={seller.id} className="bg-white border rounded-lg p-3 flex flex-wrap items-center gap-3" data-testid="seller-row">
              <div className="flex-1 min-w-[220px]">
                <a href={href.seller(seller.id)} className="font-semibold text-amazin-blue hover:underline">
                  {seller.name}
                </a>
                <div className="text-xs text-gray-600 flex flex-wrap gap-x-3 gap-y-1 mt-0.5">
                  <Stars rating={seller.overallRating} />
                  <span>{seller.yearsActive} {seller.yearsActive === 1 ? 'year' : 'years'} active</span>
                  <span>{seller.sourceOfSupply}</span>
                </div>
                <div className="text-xs text-gray-600 mt-0.5">Returns: {seller.returnPolicy}</div>
              </div>
              <div className="text-xs text-right">
                <span className="bg-green-50 text-green-800 px-2 py-0.5 rounded-full">{rating.badge}</span>
                <div className="text-gray-500 mt-1">
                  {productCount} {productCount === 1 ? 'product' : 'products'}
                  {seller.priceLockEligible && ' · 🔒 Price lock'}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default SellersPage;
