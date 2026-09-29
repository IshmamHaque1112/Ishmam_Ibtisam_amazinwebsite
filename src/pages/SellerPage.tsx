import React, { useEffect, useState } from 'react';
import { useDb } from '../db/DbProvider';
import { useStore } from '../context/store';
import { href } from '../router';
import { calculateSellerRating } from '../utils/ratingCalculations';
import { SellerLogo, Stars } from '../components/Icons';
import ProductRow from '../components/ProductRow';
import RatingGraph from '../components/RatingGraph';
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

const SellerPage: React.FC<{ id: string; params?: URLSearchParams }> = ({ id, params }) => {
  const db = useDb();
  const { username } = useStore();
  const seller = db.getSeller(id);
  // Set when a review excerpt elsewhere links here with ?review=<id>, so the
  // matching review can be scrolled to and highlighted once it's rendered.
  const highlightReviewId = params?.get('review') ?? null;

  // Hooks must run unconditionally on every render, so these are declared
  // before the early "not found" return below rather than after it.
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showTagForm, setShowTagForm] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: '',
    reviewText: ''
  });

  // A review excerpt in a seller row links here with ?review=<id>; once that
  // review renders below, scroll it into view automatically.
  useEffect(() => {
    if (!highlightReviewId) return;
    const el = document.getElementById(`review-${highlightReviewId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightReviewId, id]);

  if (!seller) return <NotFoundPage message="That seller doesn't exist." />;

  const rating = calculateSellerRating(seller);
  const products = db.getProductsBySeller(seller.id);
  const reviews = db.getSellerReviews(id);
  const tags = db.getSellerTags(id);
  const reviewAverage = db.getSellerReviewAverage(id);

  // Pre-fetch tags and reviews for seller's products
  const productTags = new Map(
    products.map(p => [p.id, db.getProductTags(p.id)])
  );
  const productReviews = new Map(
    products.map(p => [p.id, db.getProductReviews(p.id)])
  );

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;
    
    db.addSellerReview({
      sellerId: id,
      username,
      rating: reviewForm.rating,
      title: reviewForm.title || undefined,
      reviewText: reviewForm.reviewText || undefined,
      reviewDate: new Date().toISOString().slice(0, 10),
      helpfulVotes: 0
    });
    
    setShowReviewForm(false);
    setReviewForm({ rating: 5, title: '', reviewText: '' });
    window.location.reload();
  };

  const handleTagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !newTag.trim()) return;
    
    db.addSellerTag({
      sellerId: id,
      tagName: newTag.trim(),
      addedByUsername: username,
      dateAdded: new Date().toISOString().slice(0, 10)
    });
    
    setNewTag('');
    setShowTagForm(false);
    window.location.reload();
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <a href={href.sellers()} className="text-sm text-amazin-blue hover:underline">← All sellers</a>

      <div className="mt-3 bg-white border rounded-lg p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center gap-3">
            <SellerLogo sellerId={seller.id} className="w-14 h-14" />
            <h1 className="text-2xl font-bold text-gray-900">{seller.name}</h1>
          </div>
          <p className="text-sm text-gray-600">Seller ID {seller.id}</p>
          <div className="mt-1"><Stars rating={reviewAverage || seller.overallRating} /></div>
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

      {/* Blurb */}
      {seller.blurb && (
        <div className="mt-6 bg-white border rounded-lg p-4">
          <h2 className="font-semibold text-gray-900 mb-2">About this seller</h2>
          <p className="text-sm text-gray-700">{seller.blurb}</p>
        </div>
      )}

      {/* Tags */}
      <div className="mt-6 bg-white border rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-gray-900">Customer tags</h2>
          {username && (
            <button
              onClick={() => setShowTagForm(!showTagForm)}
              className="text-sm text-amazin-blue hover:underline"
            >
              {showTagForm ? 'Cancel' : '+ Add tag'}
            </button>
          )}
        </div>
        {showTagForm && (
          <form onSubmit={handleTagSubmit} className="mb-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Enter a tag"
                className="flex-1 text-sm border rounded px-3 py-1.5"
              />
              <button
                type="submit"
                className="text-sm bg-amazin-orange text-amazin-dark px-3 py-1.5 rounded hover:bg-orange-600"
              >
                Add
              </button>
            </div>
          </form>
        )}
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <span
                key={tag.tagName}
                className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full"
                title={`${tag.count} customers added this tag`}
              >
                {tag.tagName} ({tag.count})
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">No tags yet. Be the first to tag this seller!</p>
        )}
      </div>

      {/* Rating Graph */}
      {reviews.length > 0 && (
        <div className="mt-6">
          <RatingGraph reviews={reviews} />
        </div>
      )}

      {/* Reviews */}
      <div className="mt-6 bg-white border rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-gray-900">Customer reviews ({reviews.length})</h2>
          {username && (
            <button
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="text-sm text-amazin-blue hover:underline"
            >
              {showReviewForm ? 'Cancel' : '+ Write a review'}
            </button>
          )}
        </div>

        {showReviewForm && (
          <form onSubmit={handleReviewSubmit} className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-gray-900 mb-3">Write a review</h3>
            <div className="mb-3">
              <label className="block text-sm text-gray-700 mb-1">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                    className={`text-2xl ${reviewForm.rating >= star ? 'text-amazin-orange' : 'text-gray-300'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-sm text-gray-700 mb-1">Title (optional)</label>
              <input
                type="text"
                value={reviewForm.title}
                onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                className="w-full text-sm border rounded px-3 py-1.5"
                placeholder="Summarize your review"
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm text-gray-700 mb-1">Review (optional)</label>
              <textarea
                value={reviewForm.reviewText}
                onChange={(e) => setReviewForm({ ...reviewForm, reviewText: e.target.value })}
                className="w-full text-sm border rounded px-3 py-1.5"
                rows={4}
                placeholder="Share your experience with this seller"
              />
            </div>
            <button
              type="submit"
              className="text-sm bg-amazin-orange text-amazin-dark px-4 py-2 rounded hover:bg-orange-600"
            >
              Submit review
            </button>
          </form>
        )}

        {reviews.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {reviews.map(review => (
              <div
                key={review.reviewId}
                id={`review-${review.reviewId}`}
                className={`bg-gray-50 rounded-lg p-4 scroll-mt-24 ${
                  review.reviewId === highlightReviewId
                    ? 'border border-amazin-orange ring-2 ring-amazin-orange'
                    : ''
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <Stars rating={review.rating} />
                    <span className="text-sm text-gray-600 ml-2">{review.username}</span>
                  </div>
                  <span className="text-xs text-gray-500">{review.reviewDate}</span>
                </div>
                {review.title && (
                  <h4 className="font-medium text-gray-900 mb-1">{review.title}</h4>
                )}
                {review.reviewText && (
                  <p className="text-sm text-gray-700">{review.reviewText}</p>
                )}
                <div className="text-xs text-gray-500 mt-2">
                  {review.helpfulVotes} {review.helpfulVotes === 1 ? 'person found this helpful' : 'people found this helpful'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">No reviews yet. Be the first to review this seller!</p>
        )}
      </div>

      <h2 className="font-semibold text-gray-900 mt-6 mb-2">
        Products from {seller.name} ({products.length})
      </h2>
      {products.length === 0 ? (
        <p className="text-sm text-gray-600">This seller has no products listed right now.</p>
      ) : (
        <ul className="space-y-2">
          {products.map(product => (
            <ProductRow 
              key={product.id} 
              product={product} 
              seller={seller}
              tags={productTags.get(product.id)}
              reviews={productReviews.get(product.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

export default SellerPage;
