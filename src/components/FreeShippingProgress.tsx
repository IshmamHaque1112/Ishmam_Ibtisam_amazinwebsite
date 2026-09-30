import React from 'react';
import { FREE_SHIPPING_THRESHOLD, formatMoney } from '../utils/cartPricing';

interface FreeShippingProgressProps {
  subtotal: number;
  amountToFreeShipping: number;
  progress: number; // 0 to 1
}

// Goal-Gradient Effect: people push harder the closer they are to a goal.
// Showing how close the shopper is to free shipping makes the goal feel reachable.
const FreeShippingProgress: React.FC<FreeShippingProgressProps> = ({
  subtotal,
  amountToFreeShipping,
  progress
}) => {
  if (subtotal <= 0) return null;

  const qualifies = amountToFreeShipping <= 0;
  const percent = Math.round(progress * 100);

  return (
    <div className="bg-white border rounded-lg p-4" data-testid="free-shipping-progress">
      <p className="text-sm font-medium text-gray-900 mb-2">
        {qualifies ? (
          <span className="text-green-700"><span aria-hidden="true">🎉 </span>Your order qualifies for FREE shipping</span>
        ) : (
          <>
            Add <span className="font-bold text-amber-800">{formatMoney(amountToFreeShipping)}</span> more to get FREE shipping
          </>
        )}
      </p>
      <div
        className="w-full h-3 bg-gray-200 rounded-full overflow-hidden"
        role="progressbar"
        aria-label="Progress toward free shipping"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${qualifies ? 'bg-green-600' : 'bg-amazin-orange'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-gray-600 mt-1">
        {formatMoney(subtotal)} of {formatMoney(FREE_SHIPPING_THRESHOLD)} (selected items)
      </p>
    </div>
  );
};

export default FreeShippingProgress;
