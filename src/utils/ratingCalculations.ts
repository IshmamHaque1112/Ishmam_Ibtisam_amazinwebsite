import { Product, Seller, ProductRating, SellerRating } from '../types';

// Calculate price stability from 30-day history
const calculatePriceStability = (priceHistory: { price: number }[]): number => {
  if (priceHistory.length < 2) return 50;
  
  const prices = priceHistory.map(p => p.price);
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);
  
  // Lower standard deviation = higher stability
  // Convert to 0-100 scale (assuming reasonable price volatility)
  const stabilityScore = Math.max(0, Math.min(100, 100 - (stdDev / mean) * 100));
  return Math.round(stabilityScore);
};

// Calculate if price recently spiked
const hasPriceSpike = (priceHistory: { price: number; date: string }[]): boolean => {
  if (priceHistory.length < 7) return false;
  
  const recent = priceHistory.slice(-7);
  const earlier = priceHistory.slice(-14, -7);
  
  const recentAvg = recent.reduce((a, b) => a + b.price, 0) / recent.length;
  const earlierAvg = earlier.reduce((a, b) => a + b.price, 0) / earlier.length;
  
  return recentAvg > earlierAvg * 1.1; // 10% increase considered a spike
};

// Calculate Product Dynamic Rating (0-100)
export const calculateProductRating = (product: Product): ProductRating => {
  const priceStability = calculatePriceStability(product.priceHistory);
  const qualityInput = product.qualityScore;
  const returnRateImpact = Math.max(0, 100 - product.returnRate * 5); // Lower return rate = higher score
  
  // Weighted average
  const score = Math.round(
    (product.baseRating * 20) + // Base rating (0-5 stars converted to 0-100)
    (priceStability * 0.25) +
    (qualityInput * 0.3) +
    (returnRateImpact * 0.25)
  );
  
  const finalScore = Math.max(0, Math.min(100, score));
  
  // Determine badge
  let badge = '';
  if (finalScore >= 85 && priceStability >= 70 && qualityInput >= 85) {
    badge = '🔥 High Value & Top Quality';
  } else if (hasPriceSpike(product.priceHistory)) {
    badge = '📈 Price Spiked';
  } else if (finalScore >= 75) {
    badge = '✨ Good Value';
  } else if (returnRateImpact < 60) {
    badge = '⚠️ High Return Rate';
  } else if (priceStability < 50) {
    badge = '📊 Unstable Pricing';
  } else {
    badge = '📦 Standard Quality';
  }
  
  return {
    score: finalScore,
    badge,
    factors: {
      priceStability,
      qualityInput,
      returnRateImpact
    }
  };
};

// Calculate Seller Dynamic Rating (0-100)
export const calculateSellerRating = (seller: Seller, catalogAveragePrice: number): SellerRating => {
  const priceCompetitiveness = Math.max(0, Math.min(100, 100 - (seller.relativePrice - 1) * 50));
  const qualityScore = seller.qualityScore;
  const deliverySpeed = seller.deliverySpeed;
  
  // Weighted average
  const score = Math.round(
    (priceCompetitiveness * 0.35) +
    (qualityScore * 0.4) +
    (deliverySpeed * 0.25)
  );
  
  const finalScore = Math.max(0, Math.min(100, score));
  
  // Determine badge
  let badge = '';
  if (finalScore >= 85 && seller.isPrime) {
    badge = '🔥 Top Value';
  } else if (finalScore >= 85 && !seller.isPrime) {
    badge = '✨ Great Value (Non-Prime)';
  } else if (seller.relativePrice < 0.75 && qualityScore < 70) {
    badge = '⚠️ Cheap but Risky';
  } else if (finalScore >= 70) {
    badge = '👍 Good Choice';
  } else if (qualityScore < 70) {
    badge = '⚠️ Quality Concerns';
  } else {
    badge = '📦 Standard Seller';
  }
  
  return {
    score: finalScore,
    badge,
    factors: {
      priceCompetitiveness,
      qualityScore,
      deliverySpeed
    }
  };
};

// Format price countdown
export const formatPriceLockCountdown = (lockedTimestamp: number): string => {
  const now = Date.now();
  const elapsed = now - lockedTimestamp;
  const remaining = 24 * 60 * 60 * 1000 - elapsed; // 24 hours in milliseconds
  
  if (remaining <= 0) return 'Expired';
  
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  
  return `${hours}h ${minutes}m`;
};

// Check if price lock is still valid
export const isPriceLockValid = (lockedTimestamp: number): boolean => {
  const now = Date.now();
  const elapsed = now - lockedTimestamp;
  return elapsed < 24 * 60 * 60 * 1000;
};
