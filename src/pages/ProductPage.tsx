import React, { useEffect, useState } from 'react';
import { useDb } from '../db/DbProvider';
import { useStore } from '../context/store';
import { href, useDocumentTitle } from '../router';
import { calculateDealScore, calculateProductRating, calculateSellerRating } from '../utils/ratingCalculations';
import { formatMoney } from '../utils/cartPricing';
import { CategoryIcon, Stars } from '../components/Icons';
import AddToCart from '../components/AddToCart';
import RatingGraph from '../components/RatingGraph';
import PriceHistoryChart from '../components/PriceHistoryChart';
import NotFoundPage from './NotFoundPage';

const ProductPage: React.FC<{ id: string; params?: URLSearchParams }> = ({ id, params }) => {
  const db = useDb();
  const { username } = useStore();
  const product = db.getProduct(id);
  const highlightReviewId = params?.get('review') ?? null;

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showTagForm, setShowTagForm] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  useDocumentTitle(product ? product.name : 'Product not found');

  // Load async data when product is available
  useEffect(() => {
    const loadData = async () => {
      if (!product) return;
      
      try {
        setDataLoading(true);
        const [reviewsData, tagsData, priceHistoryData] = await Promise.all([
          db.getProductReviews(id),
          db.getProductTags(id),
          db.getProductPriceHistory(id)
        ]);
        setReviews(reviewsData);
        setTags(tagsData);
        setPriceHistory(priceHistoryData);
      } catch (error) {
        console.error('Failed to load product data:', error);
      } finally {
        setDataLoading(false);
      }
    };
    
    loadData();
  }, [id, product, db]);

  // Scroll to highlighted review
  useEffect(() => {
    if (!highlightReviewId) return;
    const el = document.getElementById(`review-${highlightReviewId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightReviewId]);

  if (!product) return <NotFoundPage message="That product doesn't exist." />;

  const seller = db.getSeller(product.sellerId);
  const rating = calculateProductRating(product, seller);
  const sellerRating = seller ? calculateSellerRating(seller) : undefined;
  const dealScore = calculateDealScore(product);
  const more = db
    .searchProducts({ category: product.category })
    .filter(p => p.id !== product.id)
    .slice(0, 4);

  const saveReview = async (review: { rating: number; title?: string; reviewText?: string }) => {
    if (!username) throw new Error('Not logged in');
    await db.addProductReview({
      productId: id,
      username,
      ...review,
      reviewDate: new Date().toISOString().slice(0, 10),
      helpfulVotes: 0
    });
    // Reload reviews after adding
    const reviewsData = await db.getProductReviews(id);
    setReviews(reviewsData);
  };

  const saveTag = async (tagName: string) => {
    if (!username) throw new Error('Not logged in');
    await db.addProductTag({
      productId: id,
      tagName,
      addedByUsername: username,
      dateAdded: new Date().toISOString().slice(0, 10)
    });
    // Reload tags after adding
    const tagsData = await db.getProductTags(id);
    setTags(tagsData);
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <a href={href.products()} className="text-sm text-amazin-blue hover:underline">← All products</a>

      {notice && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-900" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-green-900 hover:underline" aria-label="Dismiss message">
            Dismiss
          </button>
        </div>
      )}

      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white border rounded-lg p-5">
          <div className="flex gap-4 items-start">
            <CategoryIcon category={product.category} className="w-16 h-16 sm:w-24 sm:h-24 text-4xl sm:text-5xl" />
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{product.name}</h1>
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
          <dl className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
            <div className="bg-gray-50 rounded p-2 sm:p-3 min-w-0">
              <dt className="text-xs text-gray-500">Today</dt>
              <dd className="text-base sm:text-xl font-bold">{formatMoney(product.currentPrice)}</dd>
            </div>
            <div className="bg-gray-50 rounded p-2 sm:p-3 min-w-0">
              <dt className="text-xs text-gray-500">All-time low</dt>
              <dd className="text-base sm:text-xl font-bold text-green-700">{formatMoney(product.allTimeLowPrice)}</dd>
            </div>
            <div className="bg-gray-50 rounded p-2 sm:p-3 min-w-0">
              <dt className="text-xs text-gray-500">30-day high</dt>
              <dd className="text-base sm:text-xl font-bold text-red-700">{formatMoney(product.thirtyDayHighPrice)}</dd>
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

      {!dataLoading && (
        <>
          <div className="mt-6">
            <PriceHistoryChart
              priceHistory={priceHistory}
              currentPrice={product.currentPrice}
              allTimeLowPrice={product.allTimeLowPrice}
              thirtyDayHighPrice={product.thirtyDayHighPrice}
            />
          </div>
          {reviews.length > 0 && <div className="mt-6"><RatingGraph reviews={reviews} /></div>}
        </>
      )}

      {/* Tags */}
      <div className="mt-6 bg-white border rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-gray-900">Customer tags</h2>
          {username ? (
            <button
              type="button"
              onClick={() => setShowTagForm(!showTagForm)}
              className="text-sm text-amazin-blue hover:underline"
              aria-expanded={showTagForm}
            >
              {showTagForm ? 'Cancel' : '+ Add tag'}
            </button>
          ) : (
            <a href={href.login(href.product(id))} className="text-sm text-amazin-blue hover:underline">
              Log in to add a tag
            </a>
          )}
        </div>
        {showTagForm && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            const input = e.target.elements.tagInput as HTMLInputElement;
            if (input.value.trim()) {
              await saveTag(input.value.trim());
              input.value = '';
              setShowTagForm(false);
              setNotice('Thanks! Your tag was added.');
            }
          }} className="mb-3">
            <div className="flex gap-2">
              <input
                name="tagInput"
                type="text"
                placeholder="Enter a tag"
                className="flex-1 text-sm border rounded px-3 py-1.5"
              />
              <button
                type="submit"
                className="text-sm bg-amazin-orange text-white px-3 py-1.5 rounded"
              >
                Add
              </button>
            </div>
          </form>
        )}
        {dataLoading ? (
          <p className="text-sm text-gray-600">Loading tags...</p>
        ) : tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <span
                key={index}
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
          {username ? (
            <button
              type="button"
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="text-sm text-amazin-blue hover:underline"
              aria-expanded={showReviewForm}
            >
              {showReviewForm ? 'Cancel' : '+ Write a review'}
            </button>
          ) : (
            <a href={href.login(href.product(id))} className="text-sm text-amazin-blue hover:underline">
              Log in to write a review
            </a>
          )}
        </div>

        {showReviewForm && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            const rating = Number(e.target.elements.rating.value);
            const title = (e.target.elements.title as HTMLInputElement).value;
            const reviewText = (e.target.elements.reviewText as HTMLTextAreaElement).value;
            
            await saveReview({ rating, title: title || undefined, reviewText: reviewText || undefined });
            setShowReviewForm(false);
            setNotice('Thanks! Your review was posted.');
          }} className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-gray-900 mb-3">Write a review</h3>
            <div className="mb-3">
              <label className="block text-sm text-gray-700 mb-1">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    name="rating"
                    value={star}
                    className="text-2xl text-gray-300 hover:text-amazin-orange"
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-sm text-gray-700 mb-1">Title (optional)</label>
              <input
                name="title"
                type="text"
                className="w-full text-sm border rounded px-3 py-1.5"
                placeholder="Summarize your review"
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm text-gray-700 mb-1">Review (optional)</label>
              <textarea
                name="reviewText"
                className="w-full text-sm border rounded px-3 py-1.5"
                rows={4}
                placeholder="Share your experience with this product"
              />
            </div>
            <button
              type="submit"
              className="text-sm bg-amazin-orange text-white px-4 py-2 rounded"
            >
              Submit review
            </button>
          </form>
        )}

        {dataLoading ? (
          <p className="text-sm text-gray-600">Loading reviews...</p>
        ) : reviews.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {reviews.map((review, index) => (
              <div
                key={index}
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