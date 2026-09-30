import React from 'react';
import { ProductReview, SellerReview } from '../types';

type Review = ProductReview | SellerReview;

const RatingGraph: React.FC<{ reviews: Review[] }> = ({ reviews }) => {
  const counts = [1, 2, 3, 4, 5].map(rating =>
    reviews.filter(review => Math.round(review.rating) === rating).length
  );
  const maxCount = Math.max(1, ...counts);

  return (
    <section className="bg-white border rounded-lg p-4" aria-label="Review rating distribution">
      <h2 className="font-semibold text-gray-900 mb-3">Rating breakdown</h2>
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map(rating => {
          const count = counts[rating - 1];
          return (
            <div key={rating} className="grid grid-cols-[3rem_1fr_3rem] items-center gap-3 text-sm">
              <span className="text-gray-700">{rating} star{rating === 1 ? '' : 's'}</span>
              <div
                className="h-3 rounded-full bg-gray-100 overflow-hidden"
                role="progressbar"
                aria-label={`${rating} star reviews`}
                aria-valuemin={0}
                aria-valuemax={reviews.length}
                aria-valuenow={count}
              >
                <div className="h-full bg-amazin-orange" style={{ width: `${(count / maxCount) * 100}%` }} />
              </div>
              <span className="text-right text-gray-500">{count}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default RatingGraph;
