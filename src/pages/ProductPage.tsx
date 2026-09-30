import React, { useEffect, useState } from 'react';
import { useDb } from '../db/DbProvider';
import { useStore } from '../context/store';
import { href } from '../router';
import { calculateDealScore, calculateProductRating, calculateSellerRating } from '../utils/ratingCalculations';
import { formatMoney } from '../utils/cartPricing';
import { CategoryIcon, Stars } from '../components/Icons';
import AddToCart from '../components/AddToCart';
import NotFoundPage from './NotFoundPage';

const ProductPage: React.FC<{ id: string; params?: URLSearchParams }> = ({ id, params }) => {
  const db = useDb();
  const { username } = useStore();
  const product = db.getProduct(id);
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

  // A review excerpt in a product/seller row links here with ?review=<id>;
  // once that review renders below, scroll it into view automatically.
  useEffect(() => {
    if (!highlightReviewId) return;
    const el = document.getElementById(`review-${highlightReviewId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightReviewId, id]);

  if (!product) return <NotFoundPage message="That product doesn't exist." />;

  const seller = db.getSeller(product.sellerId);
  const rating = calculateProductRating(product, seller);
  const sellerRating = seller ? calculateSellerRating(seller) : undefined;
  const dealScore = calculateDealScore(product);
  const reviews = db.getProductReviews(id);
  const tags = db.getProductTags(id);
  const more = db
    .searchProducts({ category: product.category })
    .filter(p => p.id !== product.id)
    .slice(0, 4);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;
    
    try {
      await db.addProductReview({
        productId: id,
        username,
        rating: reviewForm.rating,
        title: reviewForm.title || undefined,
        reviewText: reviewForm.reviewText || undefined,
        reviewDate: new Date().toISOString().slice(0, 10),
        helpfulVotes: 0
      });
    } catch {
      alert('Sorry, your review could not be saved. Please try again.');
      return;
    }
    
    setShowReviewForm(false);
    setReviewForm({ rating: 5, title: '', reviewText: '' });
    window.location.reload();
  };

  const handleTagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !newTag.trim()) return;
    
    try {
      await db.addProductTag({
        productId: id,
        tagName: newTag.trim(),
        addedByUsername: username,
        dateAdded: new Date().toISOString().slice(0, 10)
      });
    } catch {
      alert('Sorry, your tag could not be saved. Please try again.');
      return;
    }
    
    setNewTag('');
    setShowTagForm(false);
    window.location.reload();
  };

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
          <p className="text-sm text-gray-600">No tags yet. Be the first to tag this product!</p>
        )}
      </div>

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
                placeholder="Share your experience with this product"
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
                className={`bg-white border rounded-lg p-4 scroll-mt-24 ${
                  review.reviewId === highlightReviewId
                    ? 'border-amazin-orange ring-2 ring-amazin-orange'
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
          <p className="text-sm text-gray-600">No reviews yet. Be the first to review this product!</p>
        )}
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
