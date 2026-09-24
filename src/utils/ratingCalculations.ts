import { Product, ProductRating, Seller, SellerRating } from '../types';

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

// How good today's price is: 100 = at the all-time low, 0 = at (or above) the
// 30-day high.
export const calculateDealScore = (product: Product): number => {
  const range = product.thirtyDayHighPrice - product.allTimeLowPrice;
  if (range <= 0) return 50;
  return Math.round(clamp(((product.thirtyDayHighPrice - product.currentPrice) / range) * 100));
};

// Seller Dynamic Rating (0-100) from the seller's price, quality and delivery ratings.
export const calculateSellerRating = (seller: Seller): SellerRating => {
  const price = Math.round(seller.priceRating * 20);
  const quality = Math.round(seller.qualityRating * 20);
  const delivery = Math.round(seller.deliveryTimeRating * 20);
  const score = Math.round(clamp(price * 0.35 + quality * 0.4 + delivery * 0.25));

  let badge: string;
  if (score >= 80) badge = '🔥 Top Value';
  else if (seller.priceRating >= 4 && seller.qualityRating < 3) badge = '⚠️ Cheap but Risky';
  else if (seller.qualityRating < 2.5) badge = '⚠️ Quality Concerns';
  else if (seller.deliveryTimeRating < 2.2) badge = '🐢 Slow Delivery';
  else if (score >= 70) badge = '👍 Good Choice';
  else badge = '📦 Standard Seller';

  return { score, badge, factors: { price, quality, delivery } };
};

// Product Dynamic Rating (0-100): customer rating, how good the current deal is,
// and the seller's own rating.
export const calculateProductRating = (product: Product, seller?: Seller): ProductRating => {
  const customerRating = Math.round(clamp(product.rating * 20));
  const dealScore = calculateDealScore(product);
  const sellerScore = seller ? calculateSellerRating(seller).score : 50;
  const score = Math.round(clamp(customerRating * 0.5 + dealScore * 0.3 + sellerScore * 0.2));

  let badge: string;
  if (product.rating >= 4.3 && dealScore >= 60) badge = '🔥 High Value & Top Quality';
  else if (dealScore >= 85) badge = '📉 Near All-Time Low';
  else if (dealScore <= 15) badge = '📈 Priced Near 30-Day High';
  else if (product.rating < 3) badge = '⚠️ Low Customer Rating';
  else if (score >= 65) badge = '✨ Good Value';
  else badge = '📦 Standard';

  return { score, badge, factors: { customerRating, dealScore, sellerScore } };
};

// Price lock (24 hours)
export const PRICE_LOCK_MS = 24 * 60 * 60 * 1000;

export const formatPriceLockCountdown = (lockedTimestamp: number): string => {
  const remaining = PRICE_LOCK_MS - (Date.now() - lockedTimestamp);
  if (remaining <= 0) return 'Expired';
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours}h ${minutes}m`;
};

export const isPriceLockValid = (lockedTimestamp: number): boolean =>
  Date.now() - lockedTimestamp < PRICE_LOCK_MS;
