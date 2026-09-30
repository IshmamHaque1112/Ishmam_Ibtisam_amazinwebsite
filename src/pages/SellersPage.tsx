import React from 'react';
import { useDb } from '../db/DbProvider';
import SellerRow from '../components/SellerRow';
import { useDocumentTitle } from '../router';

const SellersPage: React.FC = () => {
  const db = useDb();
  useDocumentTitle('3rd party sellers');
  const sellers = db.getSellers();
  const counts = db.getSellerProductCounts();

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold text-gray-900">3rd party sellers</h1>
      <p className="text-sm text-gray-600 mb-4">
        {sellers.length} sellers · see where products come from and each seller's return policy before you buy
      </p>
      <ul className="space-y-2">
        {sellers.map(seller => (
          <SellerRow
            key={seller.id}
            seller={seller}
            productCount={counts[seller.id] ?? 0}
            reviews={db.getSellerReviews(seller.id)}
            tags={db.getSellerTags(seller.id)}
          />
        ))}
      </ul>
    </div>
  );
};

export default SellersPage;
