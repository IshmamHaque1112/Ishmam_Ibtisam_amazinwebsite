import React, { useState, useEffect } from 'react';
import { CartItem as CartItemType, Product, Seller } from '../types';
import { useStore } from '../context/store';
import { href } from '../router';
import { CategoryIcon } from './Icons';
import { formatPriceLockCountdown, isPriceLockValid } from '../utils/ratingCalculations';
import {
  formatMoney,
  getEffectivePrice,
  getLineTotal,
  getLockSavingsPerUnit,
  isLockActive
} from '../utils/cartPricing';

interface CartItemProps {
  item: CartItemType;
  product: Product;
  seller: Seller;
}

const CartItem: React.FC<CartItemProps> = ({ item, product, seller }) => {
  const {
    updateCartItemQuantity,
    removeFromCart,
    toggleCartItemSelection,
    togglePriceLock,
    cartFolders,
    moveItemToFolder
  } = useStore();

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

  return (
    <div className={`border rounded-lg p-4 ${!item.isSelected ? 'opacity-60 bg-gray-50' : 'bg-white'}`}>
      <div className="flex items-start space-x-4">
        {/* Selection Checkbox */}
        <div className="pt-2">
          <input
            type="checkbox"
            checked={item.isSelected}
            onChange={() => toggleCartItemSelection(item.id)}
            className="w-5 h-5 text-amazin-orange rounded focus:ring-amazin-orange"
            aria-label={`Include ${product.name} in checkout`}
          />
        </div>

        {/* Product icon (the datasets have no photos) */}
        <CategoryIcon category={product.category} className="w-16 h-16 text-3xl" />

        {/* Product Details */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 mb-1">
            <a href={href.product(product.id)} className="hover:underline">{product.name}</a>
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Sold by:{' '}
            <a href={href.seller(seller.id)} className="text-amazin-blue hover:underline">{seller.name}</a>
          </p>

          {/* Price Lock Status */}
          {item.priceLocked && item.lockedTimestamp && (
            <div className="mb-2">
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

          {/* Folder Selection */}
          <div className="mb-2">
            <select
              value={item.folderId || ''}
              onChange={(e) => moveItemToFolder(item.id, e.target.value || undefined)}
              className="text-xs border border-gray-300 rounded px-2 py-1"
              aria-label="Move to folder"
            >
              <option value="">No folder</option>
              {cartFolders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity and Actions (Hick's Law: only the few actions a shopper needs) */}
          <div className="flex items-center flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center font-bold"
                aria-label={item.quantity === 1 ? `Remove ${product.name}` : `Decrease quantity of ${product.name}`}
              >
                {item.quantity === 1 ? '🗑' : '-'}
              </button>
              <span className="w-8 text-center font-medium" aria-live="polite">{item.quantity}</span>
              <button
                onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center font-bold"
                aria-label={`Increase quantity of ${product.name}`}
              >
                +
              </button>
            </div>

            <button
              onClick={() => removeFromCart(item.id)}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Delete
            </button>

            {/* Price lock is only offered by eligible sellers (sellers.csv) */}
            {seller.priceLockEligible || item.priceLocked ? (
              <button
                onClick={() => togglePriceLock(item.id, product.currentPrice)}
                className={`text-sm px-3 py-1 rounded ${
                  lockActive
                    ? 'bg-red-100 text-red-800 hover:bg-red-200'
                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                }`}
              >
                {lockActive ? 'Unlock Price' : lockExpired ? 'Relock Price' : 'Lock Price'}
              </button>
            ) : (
              <span className="text-xs text-gray-500" title="This seller doesn't offer price locks">
                No price lock from this seller
              </span>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">{formatMoney(totalPrice)}</div>
          <div className="text-sm text-gray-600">{formatMoney(effectivePrice)} each</div>
          {priceDropSavings > 0 && (
            <div className="text-xs text-green-600">
              Price dropped! You save {formatMoney(priceDropSavings)}
            </div>
          )}
          {lockSavings > 0 && (
            <div className="text-xs text-green-600">
              Lock is saving you {formatMoney(lockSavings)} each
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartItem;
