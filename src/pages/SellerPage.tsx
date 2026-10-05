import React, { useEffect, useState } from 'react';
import { useDb } from '../db/DbProvider';
import { useStore } from '../context/store';
import { href, useDocumentTitle } from '../router';
import { calculateSellerRating } from '../utils/ratingCalculations';
import { SellerLogo, Stars } from '../components/Icons';
import ProductRow from '../components/ProductRow';
import RatingGraph from '../components/RatingGraph';
import NotFoundPage from './NotFoundPage';
import { ReviewForm, TagForm } from '../components/FeedbackForms';
import { SellerResponsivenessPanel } from '../components/TrustSignals';

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
  const { username, orders } = useStore();
  const seller = db.getSeller(id);
  // Set when a review excerpt elsewhere links here with ?review=<id>, so the
  // matching review can be scrolled to and highlighted once it's rendered.
  const highlightReviewId = params?.get('review') ?? null;

  // Hooks must run unconditionally on every render, so these are declared
  // before the early "not found" return below rather than after it.
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showTagForm, setShowTagForm] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [reviewAverage, setReviewAverage] = useState<number | null>(null);
  const [productTags, setProductTags] = useState<Map<string, any[]>>(new Map());
  const [productReviews, setProductReviews] = useState<Map<string, any[]>>(new Map());
  const [dataLoading, setDataLoading] = useState(true);
  useDocumentTitle(seller ? seller.name : 'Seller not found');

  // Load async data when seller is available
  useEffect(() => {
    const loadData = async () => {
      if (!seller) return;
      
      try {
        setDataLoading(true);
        const [reviewsData, tagsData, reviewAvgData] = await Promise.all([
          db.getSellerReviews(id),
          db.getSellerTags(id),
          db.getSellerReviewAverage(id)
        ]);
        setReviews(reviewsData);
        setTags(tagsData);
        setReviewAverage(reviewAvgData);

        // Load tags and reviews for seller's products
        const products = db.getProductsBySeller(seller.id);
        const tagPromises = products.map(p => db.getProductTags(p.id));
        const reviewPromises = products.map(p => db.getProductReviews(p.id));
        
        const tagsResults = await Promise.all(tagPromises);
        const reviewsResults = await Promise.all(reviewPromises);
        
        const tagsMap = new Map(products.map((p, i) => [p.id, tagsResults[i]]));
        const reviewsMap = new Map(products.map((p, i) => [p.id, reviewsResults[i]]));
        
        setProductTags(tagsMap);
        setProductReviews(reviewsMap);
      } catch (error) {
        console.error('Failed to load seller data:', error);
      } finally {
        setDataLoading(false);
      }
    };
    
    loadData();
  }, [id, seller, db]);

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

  // Seller ratings are for verified buyers: accounts with at least one
  // order from this seller. (Orders are kept in this browser, so the check
  // happens here too; a shared backend would need to enforce it as well.)
  const isVerifiedBuyer = orders.some(order => order.lines.some(line => line.sellerId === id));

  const saveReview = async (review: { rating: number; title?: string; reviewText?: string }) => {
    if (!username || !isVerifiedBuyer) throw new Error('Only verified buyers can rate a seller');
    await db.addSellerReview({
      sellerId: id,
      username,
      ...review,
      reviewDate: new Date().toISOString().slice(0, 10),
      helpfulVotes: 0,
      verifiedBuyer: true
    });
    // Reload reviews after adding
    const reviewsData = await db.getSellerReviews(id);
    setReviews(reviewsData);
  };

  const saveTag = async (tagName: string) => {
    if (!username) throw new Error('Not logged in');
    await db.addSellerTag({
      sellerId: id,
      tagName,
      addedByUsername: username,
      dateAdded: new Date().toISOString().slice(0, 10)
    });
    // Reload tags after adding
    const tagsData = await db.getSellerTags(id);
    setTags(tagsData);
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <a href={href.sellers()} className="text-sm text-amazin-blue hover:underline">← All sellers</a>

      {notice && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-900" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-green-900 hover:underline" aria-label="Dismiss message">
            Dismiss
          </button>
        </div>
      )}

      <div className="mt-3 bg-white border rounded-lg p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center gap-3">
            <SellerLogo sellerId={seller.id} className="w-14 h-14" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{seller.name}</h1>
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
          <a href={username ? href.startFeedback(seller.id) : href.login(href.startFeedback(seller.id))} className="mt-4 inline-flex rounded bg-amazin-orange px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-amazin-yellow">
            Message this seller
          </a>
        </div>
        <div className="space-y-3">
          <RatingBar label="Price" value={seller.priceRating} />
          <RatingBar label="Quality" value={seller.qualityRating} />
          <RatingBar label="Delivery time" value={seller.deliveryTimeRating} />
          <RatingBar label="Overall" value={seller.overallRating} />
        </div>
      </div>

      <SellerResponsivenessPanel
        threads={db.getFeedbackThreadsForSeller(seller.id)}
        messagesForThread={threadId => db.getFeedbackMessages(threadId)}
        messageHref={username ? href.startFeedback(seller.id) : href.login(href.startFeedback(seller.id))}
      />

      {!dataLoading && reviews.length > 0 && <div className="mt-6"><RatingGraph reviews={reviews} /></div>}

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
            <a href={href.login(href.seller(id))} className="text-sm text-amazin-blue hover:underline">
              Log in to add a tag
            </a>
          )}
        </div>
        {showTagForm && (
          <TagForm
            existing={tags.map(t => t.tagName)}
            onSubmit={saveTag}
            onDone={() => {
              setShowTagForm(false);
              setNotice('Thanks! Your tag was added.');
            }}
          />
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
          <p className="text-sm text-gray-600">No tags yet. Be the first to tag this seller!</p>
        )}
      </div>

      {/* Reviews */}
      <div className="mt-6 bg-white border rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-gray-900">Seller ratings from buyers ({reviews.length})</h2>
          {username && isVerifiedBuyer ? (
            <button
              type="button"
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="text-sm text-amazin-blue hover:underline"
              aria-expanded={showReviewForm}
            >
              {showReviewForm ? 'Cancel' : '+ Rate this seller'}
            </button>
          ) : !username ? (
            <a href={href.login(href.seller(id))} className="text-sm text-amazin-blue hover:underline">
              Log in to rate this seller
            </a>
          ) : null}
        </div>

        <p className="text-xs text-gray-600 -mt-2 mb-3">
          Rates the seller (shipping, packaging, service), separate from product reviews.
          {username && !isVerifiedBuyer && ` Only verified buyers can rate a seller: place an order with ${seller.name} first.`}
        </p>
        {showReviewForm && (
          <ReviewForm
            subject="seller"
            onSubmit={saveReview}
            onDone={() => {
              setShowReviewForm(false);
              setNotice('Thanks! Your review was posted.');
            }}
          />
        )}

        {dataLoading ? (
          <p className="text-sm text-gray-600">Loading reviews...</p>
        ) : reviews.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {reviews.map((review, index) => (
              <div
                key={index}
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
                    {review.verifiedBuyer && (
                      <span className="ml-2 text-xs font-semibold text-green-800 bg-green-50 rounded px-1.5 py-0.5">
                        Verified buyer
                      </span>
                    )}
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
