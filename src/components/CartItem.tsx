import React, { useState, useEffect } from 'react';
import { CartItem, Product, Seller } from '../types';
import { useStore } from '../context/store';
import { formatPriceLockCountdown, isPriceLockValid } from '../utils/ratingCalculations';

interface CartItemComponentProps {
  item: CartItem;
  product: Product;
  seller: Seller;
}

const CartItem: React.FC<CartItemComponentProps> = ({ item, product, seller }) => {
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

  const effectivePrice = item.priceLocked && item.lockedPrice && isPriceLockValid(item.lockedTimestamp!)
    ? Math.min(item.lockedPrice, product.currentPrice)
    : product.currentPrice;

  const totalPrice = effectivePrice * item.quantity;

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
          />
        </div>

        {/* Product Image */}
        <div className="w-24 h-24 bg-gray-100 rounded flex-shrink-0">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover rounded"
          />
        </div>

        {/* Product Details */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
          <p className="text-sm text-gray-600 mb-2">Sold by: {seller.name}</p>
          
          {/* Price Lock Status */}
          {item.priceLocked && item.lockedTimestamp && (
            <div className="mb-2">
              {isPriceLockValid(item.lockedTimestamp) ? (
                <div className="bg-green-50 text-green-800 text-xs px-2 py-1 rounded-full inline-flex items-center">
                  🔒 Price locked: {countdown}
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
            >
              <option value="">No folder</option>
              {cartFolders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity and Actions */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center font-bold"
              >
                -
              </button>
              <span className="w-8 text-center font-medium">{item.quantity}</span>
              <button
                onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center font-bold"
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

            <button
              onClick={() => togglePriceLock(item.id)}
              className={`text-sm px-3 py-1 rounded ${
                item.priceLocked
                  ? 'bg-red-100 text-red-800 hover:bg-red-200'
                  : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
              }`}
            >
              {item.priceLocked ? 'Unlock Price' : 'Lock Price'}
            </button>
          </div>
        </div>

        {/* Price */}
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">${totalPrice.toFixed(2)}</div>
          <div className="text-sm text-gray-600">${effectivePrice.toFixed(2)} each</div>
          {item.priceLocked && item.lockedPrice && item.lockedPrice !== effectivePrice && (
            <div className="text-xs text-green-600">
              Price dropped! You save ${(item.lockedPrice - effectivePrice).toFixed(2)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartItem;
