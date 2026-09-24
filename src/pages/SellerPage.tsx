import React from 'react';
import { useDb } from '../db/DbProvider';
import { href } from '../router';
import { calculateSellerRating } from '../utils/ratingCalculations';
import { Stars } from '../components/Icons';
import ProductRow from '../components/ProductRow';
import NotFoundPage from './NotFoundPage';

const RatingBar: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="text-sm">
    <div className="flex justify-between text-gray-600">
      <span>{label}</span>
      <span>{value.toFixed(1)} / 5</span>
    </div>
    <div className="h-2 bg-gray-200 rounded-full overflow-hidden" role="presentation">
      <div className="h-full bg-amazin-orange" style={{ width: `${(value / 5) * 100}%` }} />
    </div>
  </div>
);

const SellerPage: React.FC<{ id: string }> = ({ id }) => {
  const db = useDb();
  const seller = db.getSeller(id);
  if (!seller) return <NotFoundPage message="That seller doesn't exist." />;

  const rating = calculateSellerRating(seller);
  const products = db.getProductsBySeller(seller.id);

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <a href={href.sellers()} className="text-sm text-amazin-blue hover:underline">← All sellers</a>

      <div className="mt-3 bg-white border rounded-lg p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{seller.name}</h1>
          <p className="text-sm text-gray-600">Seller ID {seller.id}</p>
          <div className="mt-1"><Stars rating={seller.overallRating} /></div>
          <p className="mt-2 text-sm">
            <span className="bg-green-50 text-green-800 px-2 py-0.5 rounded-full">{rating.badge}</span>
            <span className="ml-2 font-bold">{rating.score}/100</span>
          </p>
          <dl className="mt-4 text-sm space-y-1">
            <div><dt className="inline text-gray-500">Return policy: </dt><dd className="inline">{seller.returnPolicy}</dd></div>
            <div><dt className="inline text-gray-500">Source of supply: </dt><dd className="inline">{seller.sourceOfSupply}</dd></div>
            <div><dt className="inline text-gray-500">Years active: </dt><dd className="inline">{seller.yearsActive}</dd></div>
            <div>
              <dt className="inline text-gray-500">Price lock: </dt>
              <dd className="inline">{seller.priceLockEligible ? '🔒 Available on this seller’s items' : 'Not available'}</dd>
            </div>
          </dl>
        </div>
        <div className="space-y-3">
          <RatingBar label="Price" value={seller.priceRating} />
          <RatingBar label="Quality" value={seller.qualityRating} />
          <RatingBar label="Delivery time" value={seller.deliveryTimeRating} />
          <RatingBar label="Overall" value={seller.overallRating} />
        </div>
      </div>

      <h2 className="font-semibold text-gray-900 mt-6 mb-2">
        Products from {seller.name} ({products.length})
      </h2>
      {products.length === 0 ? (
        <p className="text-sm text-gray-600">This seller has no products listed right now.</p>
      ) : (
        <ul className="space-y-2">
          {products.map(product => (
            <ProductRow key={product.id} product={product} seller={seller} />
          ))}
        </ul>
      )}
    </div>
  );
};

export default SellerPage;
