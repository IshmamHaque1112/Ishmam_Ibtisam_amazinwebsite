import React from 'react';
import { Seller, TagWithCount, SellerReview } from '../types';
import { href } from '../router';
import { calculateSellerRating } from '../utils/ratingCalculations';
import { SellerLogo, Stars } from './Icons';

interface SellerRowProps {
  seller: Seller;
  productCount?: number;
  tags?: TagWithCount[];
  reviews?: SellerReview[];
  showFullDetails?: boolean;
}

const SellerRow: React.FC<SellerRowProps> = ({ seller, productCount = 0, tags = [], reviews = [], showFullDetails = false }) => {
  const rating = calculateSellerRating(seller);
  
  // Calculate review average for display
  const reviewAverage = reviews.length > 0 
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
    : null;

  // Get review excerpt based on rating rules. Returns the source review too,
  // so the excerpt can link straight to it on the seller page.
  const getReviewExcerpt = (): { text: string; reviewId: string } | null => {
    if (!reviews.length) return null;
    
    const averageRating = reviewAverage || seller.overallRating;
    const threshold = averageRating > 3 ? 3 : averageRating < 3 ? 3 : 3;
    
    const qualifyingReviews = reviews.filter(r => 
      averageRating > 3 ? r.rating > 3 : r.rating < 3
    );
    
    if (qualifyingReviews.length === 0) return null;
    
    const review = qualifyingReviews[0];
    const text = review.reviewText || review.title || '';
    if (!text) return null;
    
    const excerpt = text.length > 90 ? text.substring(0, 90) + '...' : text;
    return { text: excerpt, reviewId: review.reviewId };
  };

  const reviewExcerpt = getReviewExcerpt();
  const displayTags = showFullDetails ? tags : tags.slice(0, 10);

  return (
    <li className="bg-white border rounded-lg p-4 flex flex-col sm:flex-row items-start gap-4" data-testid="seller-row">
      <SellerLogo sellerId={seller.id} />
      <div className="flex-1 min-w-[220px]">
        <a href={href.seller(seller.id)} className="font-semibold text-amazin-blue hover:underline">
          {seller.name}
        </a>
        <div className="text-xs text-gray-600 flex flex-wrap gap-x-3 gap-y-1 mt-0.5">
          <Stars rating={reviewAverage || seller.overallRating} />
          <span>{seller.yearsActive} {seller.yearsActive === 1 ? 'year' : 'years'} active</span>
          <span>{seller.sourceOfSupply}</span>
        </div>
        <div className="text-xs text-gray-600 mt-0.5">Returns: {seller.returnPolicy}</div>
        
        {/* Blurb */}
        {seller.blurb && (
          <div className="text-sm text-gray-700 mt-2">{seller.blurb}</div>
        )}

        {/* Tags */}
        {displayTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {displayTags.map(tag => (
              <span 
                key={tag.tagName} 
                className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full"
                title={`${tag.count} customers added this tag`}
              >
                {tag.tagName} ({tag.count})
              </span>
            ))}
            {!showFullDetails && tags.length > 10 && (
              <span className="text-xs text-gray-500">+{tags.length - 10} more</span>
            )}
          </div>
        )}

        {/* Review excerpt - links to that exact review on the seller page */}
        {reviewExcerpt && (
          <a
            href={href.seller(seller.id, reviewExcerpt.reviewId)}
            className="block text-sm text-gray-600 mt-2 italic hover:text-amazin-blue hover:underline"
          >
            "{reviewExcerpt.text}"
          </a>
        )}
      </div>
      <div className="text-xs text-right sm:mt-0">
        <span className="bg-green-50 text-green-800 px-2 py-0.5 rounded-full">{rating.badge}</span>
        <div className="text-gray-500 mt-1">
          {productCount} {productCount === 1 ? 'product' : 'products'}
          {seller.priceLockEligible && ' · 🔒 Price lock'}
        </div>
      </div>
    </li>
  );
};

export default SellerRow;