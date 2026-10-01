import React from 'react';
import { Product, Seller } from '../types';
import { useStore } from '../context/store';
import { href } from '../router';
import { CategoryIcon } from './Icons';
import { formatMoney, isLockActive, pluralizeItems } from '../utils/cartPricing';

interface SavedForLaterProps {
  products: Product[];
  sellers: Seller[];
}

// Items the shopper set aside. They are listed with today's price, but they
// are not part of the cart: no totals, no free-shipping progress, no checkout.
const SavedForLater: React.FC<SavedForLaterProps> = ({ products, sellers }) => {
  const { savedItems, moveSavedToCart, removeSavedItem } = useStore();

  if (savedItems.length === 0) return null;

  return (
    <section className="border rounded-lg p-4 bg-white" aria-labelledby="saved-for-later-heading" data-testid="saved-for-later">
      <h3 id="saved-for-later-heading" className="font-semibold text-gray-900 mb-1">
        Saved for later ({pluralizeItems(savedItems.length)})
      </h3>
      <p className="text-xs text-gray-500 mb-4">Not included in your total or checkout.</p>

      <div className="space-y-3">
        {savedItems.map(item => {
          const product = products.find(p => p.id === item.productId);
          const seller = sellers.find(s => s.id === item.sellerId);
          if (!product || !seller) return null;

          const change = Math.round((product.currentPrice - item.savedPrice) * 100) / 100;

          return (
            <div key={item.id} className="border rounded-lg p-3 flex items-start gap-4" data-testid="saved-item">
              <CategoryIcon category={product.category} className="w-12 h-12 text-2xl" />

              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900">
                  <a href={href.product(product.id)} className="hover:underline">{product.name}</a>
                </h4>
                <p className="text-sm text-gray-600">
                  Sold by:{' '}
                  <a href={href.seller(seller.id)} className="text-amazin-blue hover:underline">{seller.name}</a>
                  {' · '}Qty {item.quantity}
                </p>

                {change < 0 && (
                  <p className="text-xs text-green-700">
                    Price dropped {formatMoney(-change)} since you saved it (was {formatMoney(item.savedPrice)})
                  </p>
                )}
                {change > 0 && (
                  <p className="text-xs text-red-700">
                    Price went up {formatMoney(change)} since you saved it (was {formatMoney(item.savedPrice)})
                  </p>
                )}
                {change === 0 && <p className="text-xs text-gray-500">Same price as when you saved it</p>}
                {isLockActive(item) && (
                  <p className="text-xs text-green-700"><span aria-hidden="true" className="mr-1">🔒</span>Price lock at {formatMoney(item.lockedPrice as number)} is still running</p>
                )}

                <div className="flex items-center gap-4 mt-2">
                  <button
                    onClick={() => moveSavedToCart(item.id)}
                    className="text-sm font-semibold bg-amazin-yellow hover:bg-amazin-orange text-gray-900 px-3 py-1 rounded-md"
                    aria-label={`Move ${product.name} to cart`}
                  >
                    Move to cart
                  </button>
                  <button
                    onClick={() => removeSavedItem(item.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                    aria-label={`Remove ${product.name} from saved items`}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">{formatMoney(product.currentPrice)}</div>
                <div className="text-xs text-gray-500">today's price</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default SavedForLater;
