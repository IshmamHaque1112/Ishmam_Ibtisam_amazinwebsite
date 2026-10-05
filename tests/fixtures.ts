import { CartItem, Product, Seller } from '../src/types';

export const product = (overrides: Partial<Product> = {}): Product => ({
  id: 'P001',
  name: 'Test Product',
  category: 'Groceries',
  currentPrice: 10,
  allTimeLowPrice: 8,
  thirtyDayHighPrice: 12,
  storeRecommended: false,
  rating: 4,
  sellerId: 'S001',
  sellerName: 'Test Seller',
  stockQuantity: 20,
  ...overrides
});

export const seller = (overrides: Partial<Seller> = {}): Seller => ({
  id: 'S001',
  name: 'Test Seller',
  returnPolicy: '30-day free returns',
  sourceOfSupply: 'Domestic manufacturer (USA)',
  yearsActive: 5,
  priceRating: 4,
  qualityRating: 4,
  deliveryTimeRating: 4,
  overallRating: 4,
  priceLockEligible: true,
  ...overrides
});

export const cartItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  id: 'line-1',
  productId: 'P001',
  sellerId: 'S001',
  quantity: 1,
  isSelected: true,
  priceLocked: false,
  addedAt: 0,
  ...overrides
});
