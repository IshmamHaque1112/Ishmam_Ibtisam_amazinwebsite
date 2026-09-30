import React, { useState, useEffect } from 'react';
import { CartItem as CartItemType, Product, Seller } from '../types';
import { useStore } from '../context/store';
import { href } from '../router';
import { CategoryIcon } from './Icons';
import MoveToMenu from './MoveToMenu';
import { formatPriceLockCountdown, isPriceLockValid } from '../utils/ratingCalculations';
import {
  formatMoney,
  getEffectivePrice,
  getLineTotal,
  getLockSavingsPerUnit,
  isLockActive,
  MAX_QUANTITY
} from '../utils/cartPricing';

interface CartItemProps {
  item: CartItemType;
  product: Product;
  seller: Seller;
  onSavedForLater?: (savedId: string, productName: string) => void;
}

const CartItem: React.FC<CartItemProps> = ({ item, product, seller, onSavedForLater }) => {
  const {
    updateCartItemQuantity,
    removeFromCart,
    toggleCartItemSelection,
    togglePriceLock,
    saveForLater
  } = useStore();

  const handleSaveForLater = () => {
    const savedId = saveForLater(item.id, product.currentPrice);
    if (savedId && onSavedForLater) onSavedForLater(savedId, product.name);
  };

  const [countdown, setCountdown] = useState(() => {
    // Initialize countdown only in browser
    if (typeof window !== 'undefined' && item.priceLocked && item.lockedTimestamp) {
      return formatPriceLockCountdown(item.lockedTimestamp);
    }
    return '';
  });

  // Update countdown every minute
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (item.priceLocked && item.lockedTimestamp) {
      setCountdown(formatPriceLockCountdown(item.lockedTimestamp));

      const interval = setInterval(() => {
        setCountdown(formatPriceLockCountdown(item.lockedTimestamp!));
      }, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [item.priceLocked, item.lockedTimestamp]);

  const lockActive = isLockActive(item);
  const lockExpired = item.priceLocked && item.lockedTimestamp !== undefined && !isPriceLockValid(item.lockedTimestamp);
  const effectivePrice = getEffectivePrice(item, product);
  const totalPrice = getLineTotal(item, product);
  const lockSavings = getLockSavingsPerUnit(item, product);
  const priceDropSavings =
    lockActive && item.lockedPrice !== undefined && product.currentPrice < item.lockedPrice
      ? item.lockedPrice - product.currentPrice
      : 0;

  const atMax = item.quantity >= MAX_QUANTITY;

  return (
    <div className={`border rounded-lg p-3 sm:p-4 ${!item.isSelected ? 'bg-gray-50' : 'bg-white'}`}>
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Selection Checkbox */}
        <div className="pt-1 sm:pt-2">
          <input
            type="checkbox"
            checked={item.isSelected}
            onChange={() => toggleCartItemSelection(item.id)}
            className="w-5 h-5 text-amazin-orange rounded focus:ring-amazin-orange"
            aria-label={`Include ${product.name} in checkout`}
          />
        </div>

        {/* Product icon (the datasets have no photos) */}
        <CategoryIcon category={product.category} className="w-12 h-12 sm:w-16 sm:h-16 text-2xl sm:text-3xl" />

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4">
            {/* Product Details */}
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 mb-1 break-words">
                <a href={href.product(product.id)} className="hover:underline">{product.name}</a>
              </h3>
              <p className="text-sm text-gray-600">
                Sold by:{' '}
                <a href={href.seller(seller.id)} className="text-amazin-blue hover:underline">{seller.name}</a>
              </p>
              {!item.isSelected && (
                <p className="text-xs text-gray-600 mt-0.5">Not included in this checkout</p>
              )}
            </div>

            {/* Price */}
            <div className="sm:text-right flex-shrink-0">
              <div className="text-lg font-bold text-gray-900">{formatMoney(totalPrice)}</div>
              <div className="text-sm text-gray-600">{formatMoney(effectivePrice)} each</div>
              {priceDropSavings > 0 && (
                <div className="text-xs text-green-700">
                  Price dropped! You save {formatMoney(priceDropSavings)}
                </div>
              )}
              {lockSavings > 0 && (
                <div className="text-xs text-green-700">
                  Lock is saving you {formatMoney(lockSavings)} each
                </div>
              )}
            </div>
          </div>

          {/* Price Lock Status */}
          {item.priceLocked && item.lockedTimestamp && (
            <div className="mt-2">
              {lockActive ? (
                <div className="bg-green-50 text-green-800 text-xs px-2 py-1 rounded-full inline-flex items-center">
                  🔒 Locked at {formatMoney(item.lockedPrice as number)} · {countdown} left
                </div>
              ) : (
                <div className="bg-red-50 text-red-800 text-xs px-2 py-1 rounded-full inline-flex items-center">
                  🔓 Price lock expired
                </div>
              )}
            </div>
          )}

          {/* Quantity and Actions (Hick's Law: only the few actions a shopper needs) */}
          <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mt-3">
            <div className="flex items-center gap-2" role="group" aria-label={`Quantity of ${product.name}`}>
              <button
                type="button"
                onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                className="w-9 h-9 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center font-bold"
                aria-label={item.quantity === 1 ? `Remove ${product.name}` : `Decrease quantity of ${product.name}`}
              >
                <span aria-hidden="true">{item.quantity === 1 ? '🗑' : '−'}</span>
              </button>
              <span className="w-8 text-center font-medium" aria-live="polite">{item.quantity}</span>
              <button
                type="button"
                onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                disabled={atMax}
                className="w-9 h-9 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label={atMax ? `Maximum of ${MAX_QUANTITY} reached for ${product.name}` : `Increase quantity of ${product.name}`}
              >
                <span aria-hidden="true">+</span>
              </button>
            </div>
            {atMax && <span className="text-xs text-gray-600">Limit {MAX_QUANTITY} per item</span>}

            <button
              type="button"
              onClick={() => removeFromCart(item.id)}
              className="text-sm text-red-700 hover:text-red-900 whitespace-nowrap"
              aria-label={`Delete ${product.name} from cart`}
            >
              Delete
            </button>

            <button
              type="button"
              onClick={handleSaveForLater}
              className="text-sm text-amazin-blue hover:underline whitespace-nowrap"
              aria-label={`Save ${product.name} for later`}
            >
              Save for later
            </button>

            <MoveToMenu itemId={item.id} currentFolderId={item.folderId} productName={product.name} />

            {/* Price lock is only offered by eligible sellers (sellers.csv) */}
            {seller.priceLockEligible || item.priceLocked ? (
              <button
                type="button"
                onClick={() => togglePriceLock(item.id, product.currentPrice)}
                className={`text-sm px-3 py-1 rounded whitespace-nowrap ${
                  lockActive
                    ? 'bg-red-100 text-red-800 hover:bg-red-200'
                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                }`}
              >
                {lockActive ? 'Unlock price' : lockExpired ? 'Relock price' : 'Lock price for 24h'}
              </button>
            ) : (
              <span className="text-xs text-gray-600">No price lock from this seller</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartItem;
