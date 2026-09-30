import React from 'react';
import { Product, Seller, TagWithCount, ProductReview } from '../types';
import { href } from '../router';
import { calculateProductRating } from '../utils/ratingCalculations';
import { formatMoney } from '../utils/cartPricing';
import { CategoryIcon, Stars } from './Icons';
import AddToCart from './AddToCart';

interface ProductRowProps {
  product: Product;
  seller?: Seller;
  tags?: TagWithCount[];
  reviews?: ProductReview[];
}

const ProductRow: React.FC<ProductRowProps> = ({ product, seller, tags = [], reviews = [] }) => {
  const rating = calculateProductRating(product, seller);
  
  // Calculate review average for display
  const reviewAverage = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
    : null;

  // Get review excerpt based on rating rules. Returns the source review too,
  // so the excerpt can link straight to it on the product page.
  const getReviewExcerpt = (): { text: string; reviewId: string } | null => {
    if (!reviews.length) return null;
    
    const averageRating = reviewAverage || product.rating;
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
  const displayTags = tags.slice(0, 10);

  return (
    <li className="bg-white border rounded-lg p-3 flex flex-wrap sm:flex-nowrap items-center gap-3" data-testid="product-row">
      <CategoryIcon category={product.category} />
      <div className="flex-1 min-w-[200px]">
        <a href={href.product(product.id)} className="font-semibold text-amazin-blue hover:underline">
          {product.name}
        </a>
        <div className="text-xs text-gray-600 flex flex-wrap gap-x-3 gap-y-1 mt-0.5">
          <span>{product.category}</span>
          <Stars rating={reviewAverage ?? product.rating} />
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
          <span className="text-gray-600 ml-2">Score {rating.score}/100</span>
        </div>

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
            {tags.length > 10 && (
              <span className="text-xs text-gray-600">+{tags.length - 10} more</span>
            )}
          </div>
        )}

        {/* Review excerpt - links to that exact review on the product page */}
        {reviewExcerpt && (
          <a
            href={href.product(product.id, reviewExcerpt.reviewId)}
            className="block text-sm text-gray-600 mt-2 italic hover:text-amazin-blue hover:underline"
          >
            "{reviewExcerpt.text}"
          </a>
        )}
      </div>
      <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3 border-t sm:border-0 pt-2 sm:pt-0">
        <div className="sm:text-right sm:w-28">
          <div className="font-bold text-gray-900">{formatMoney(product.currentPrice)}</div>
          <div className="text-xs text-gray-600">Low {formatMoney(product.allTimeLowPrice)}</div>
        </div>
        <div className="sm:min-w-[130px] text-right">
          <AddToCart product={product} compact />
        </div>
      </div>
    </li>
  );
};

export default ProductRow;
