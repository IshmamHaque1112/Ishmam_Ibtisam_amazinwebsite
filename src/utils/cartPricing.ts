import { CartItem, Product } from '../types';
import { isPriceLockValid } from './ratingCalculations';

// Single source of truth for cart math, so the cart page, the folder
// subtotals, and each cart line always agree with one another.
export const TAX_RATE = 0.08875; // NYC sales tax, 8.875%
export const FREE_SHIPPING_THRESHOLD = 35;
export const STANDARD_SHIPPING = 5.99;

const roundCents = (value: number): number => Math.round(value * 100) / 100;

export const isLockActive = (item: CartItem): boolean =>
  item.priceLocked &&
  item.lockedPrice !== undefined &&
  item.lockedTimestamp !== undefined &&
  isPriceLockValid(item.lockedTimestamp);

// A valid price lock never charges more than the locked price, and if the
// catalog price has dropped since locking, the shopper gets the lower price.
export const getEffectivePrice = (item: CartItem, product: Product): number => {
  if (isLockActive(item)) {
    return Math.min(item.lockedPrice as number, product.currentPrice);
  }
  return product.currentPrice;
};

// How much the lock is saving right now (catalog price went UP after locking).
export const getLockSavingsPerUnit = (item: CartItem, product: Product): number => {
  if (!isLockActive(item)) return 0;
  return Math.max(0, roundCents(product.currentPrice - (item.lockedPrice as number)));
};

export const getLineTotal = (item: CartItem, product: Product): number =>
  roundCents(getEffectivePrice(item, product) * item.quantity);

export interface CartTotals {
  selectedLineCount: number;
  selectedQuantity: number;
  totalQuantity: number;
  subtotal: number;
  tax: number;
  shipping: number;
  grandTotal: number;
  amountToFreeShipping: number;
  freeShippingProgress: number; // 0 to 1
}

export const calculateCartTotals = (items: CartItem[], products: Product[]): CartTotals => {
  let subtotal = 0;
  let selectedQuantity = 0;
  let selectedLineCount = 0;
  let totalQuantity = 0;

  for (const item of items) {
    totalQuantity += item.quantity;
    if (!item.isSelected) continue;
    const product = products.find(p => p.id === item.productId);
    if (!product) continue;
    selectedLineCount += 1;
    selectedQuantity += item.quantity;
    subtotal += getEffectivePrice(item, product) * item.quantity;
  }

  subtotal = roundCents(subtotal);
  const tax = roundCents(subtotal * TAX_RATE);
  // Nothing selected means nothing to ship.
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
  const grandTotal = roundCents(subtotal + tax + shipping);
  const amountToFreeShipping = roundCents(Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal));
  const freeShippingProgress = Math.min(1, subtotal / FREE_SHIPPING_THRESHOLD);

  return {
    selectedLineCount,
    selectedQuantity,
    totalQuantity,
    subtotal,
    tax,
    shipping,
    grandTotal,
    amountToFreeShipping,
    freeShippingProgress,
  };
};

// Totals for checking out a single folder: every item in it is bought,
// whether or not it's ticked in the main cart.
export const calculateGroupTotals = (items: CartItem[], products: Product[]): CartTotals =>
  calculateCartTotals(items.map(item => ({ ...item, isSelected: true })), products);

export const formatMoney = (value: number): string => `$${value.toFixed(2)}`;

export const pluralizeItems = (count: number): string => `${count} ${count === 1 ? 'item' : 'items'}`;
