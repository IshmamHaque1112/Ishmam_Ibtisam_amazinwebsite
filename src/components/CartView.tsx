import React, { useState } from 'react';
import { useStore } from '../context/store';
import { mockProducts, mockSellers } from '../data/mockData';
import CartItem from './CartItem';
import CartFolder from './CartFolder';
import FreeShippingProgress from './FreeShippingProgress';
import {
  TAX_RATE,
  FREE_SHIPPING_THRESHOLD,
  calculateCartTotals,
  formatMoney,
  pluralizeItems
} from '../utils/cartPricing';

interface OrderConfirmation {
  orderId: string;
  itemCount: number;
  grandTotal: number;
}

const CartView: React.FC = () => {
  const {
    cartItems,
    cartFolders,
    createFolder,
    setAllCartItemsSelected,
    checkoutSelectedItems,
    setCurrentView
  } = useStore();
  const [newFolderName, setNewFolderName] = useState('');
  const [confirmation, setConfirmation] = useState<OrderConfirmation | null>(null);

  // Separate items into folders and unassigned
  const itemsByFolder = cartFolders.map(folder => ({
    folder,
    items: cartItems.filter(item => item.folderId === folder.id)
  }));

  const unassignedItems = cartItems.filter(item => !item.folderId);

  const totals = calculateCartTotals(cartItems, mockProducts);
  const allSelected = cartItems.length > 0 && cartItems.every(item => item.isSelected);
  const canCheckout = totals.subtotal > 0;
  const checkoutLabel = `Proceed to checkout (${pluralizeItems(totals.selectedQuantity)})`;

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createFolder(newFolderName.trim());
      setNewFolderName('');
    }
  };

  const handleCheckout = () => {
    if (!canCheckout) return;
    const orderTotals = totals;
    checkoutSelectedItems();
    setConfirmation({
      orderId: `AMZ-${Date.now().toString().slice(-8)}`,
      itemCount: orderTotals.selectedQuantity,
      grandTotal: orderTotals.grandTotal
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmationBanner = confirmation && (
    <div
      className="bg-green-50 border border-green-200 text-green-900 rounded-lg p-4 flex items-start justify-between"
      role="status"
      data-testid="order-confirmation"
    >
      <div>
        <p className="font-bold">✅ Order placed! #{confirmation.orderId}</p>
        <p className="text-sm">
          {pluralizeItems(confirmation.itemCount)} · Total charged {formatMoney(confirmation.grandTotal)} (demo order, no real payment)
        </p>
      </div>
      <button
        onClick={() => setConfirmation(null)}
        className="text-green-800 hover:text-green-950 text-sm ml-4"
        aria-label="Dismiss order confirmation"
      >
        ✕
      </button>
    </div>
  );

  if (cartItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        {confirmationBanner}
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">Add some products to get started!</p>
          <button
            onClick={() => setCurrentView('products')}
            className="bg-amazon-yellow hover:bg-amazon-orange text-gray-900 font-semibold px-6 py-2 rounded-md transition-colors"
          >
            Continue shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 pb-28 lg:pb-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          {confirmationBanner}

          <div className="flex items-end justify-between flex-wrap gap-2">
            <h2 className="text-2xl font-bold text-gray-900">
              Shopping Cart ({pluralizeItems(totals.totalQuantity)})
            </h2>
            <label className="flex items-center space-x-2 text-sm text-amazon-blue cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => setAllCartItemsSelected(!allSelected)}
                className="w-4 h-4"
                aria-label={allSelected ? 'Deselect all items' : 'Select all items'}
              />
              <span>{allSelected ? 'Deselect all items' : 'Select all items'}</span>
            </label>
          </div>

          {/* Goal-Gradient: free shipping progress */}
          <FreeShippingProgress
            subtotal={totals.subtotal}
            amountToFreeShipping={totals.amountToFreeShipping}
            progress={totals.freeShippingProgress}
          />

          {/* Create New Folder */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Create New Folder</h3>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                }}
                placeholder="Folder name (e.g., Pantry, School Supplies)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amazon-orange focus:border-transparent"
              />
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="bg-amazon-orange hover:bg-amazon-yellow text-white font-semibold px-6 py-2 rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>

          {/* Folder Groups */}
          {itemsByFolder.map(({ folder, items }) => (
            <CartFolder
              key={folder.id}
              folder={folder}
              items={items}
              products={mockProducts}
              sellers={mockSellers}
            />
          ))}

          {/* Unassigned Items */}
          {unassignedItems.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Unassigned Items</h3>
              <div className="space-y-3">
                {unassignedItems.map((item) => {
                  const product = mockProducts.find(p => p.id === item.productId);
                  const seller = mockSellers.find(s => s.id === item.sellerId);
                  if (!product || !seller) return null;

                  return (
                    <CartItem
                      key={item.id}
                      item={item}
                      product={product}
                      seller={seller}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>

            {/* Selected Items Info */}
            <div className="mb-4 pb-4 border-b">
              <p className="text-sm text-gray-600">
                {totals.selectedLineCount} of {cartItems.length} products selected ({pluralizeItems(totals.selectedQuantity)})
              </p>
            </div>

            {/* Itemized Charges */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Active Subtotal</span>
                <span className="font-semibold">{formatMoney(totals.subtotal)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Est. Tax ({(TAX_RATE * 100).toFixed(3)}%)</span>
                <span className="font-semibold">{formatMoney(totals.tax)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Est. Shipping</span>
                <span className="font-semibold">
                  {totals.shipping === 0 ? (
                    <span className="text-green-600">FREE</span>
                  ) : (
                    formatMoney(totals.shipping)
                  )}
                </span>
              </div>

              {totals.shipping > 0 && (
                <div className="text-xs text-gray-500">
                  Free shipping on orders of {formatMoney(FREE_SHIPPING_THRESHOLD)} or more
                </div>
              )}

              <div className="border-t pt-3 flex justify-between">
                <span className="text-lg font-bold text-gray-900">Grand Total</span>
                <span className="text-lg font-bold text-amazon-orange" data-testid="grand-total">
                  {formatMoney(totals.grandTotal)}
                </span>
              </div>
            </div>

            {/* Checkout Button (Fitts's Law: large, always in view) */}
            <button
              onClick={handleCheckout}
              disabled={!canCheckout}
              className="w-full bg-amazon-orange hover:bg-amazon-yellow text-white font-bold py-3 px-4 rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {canCheckout ? checkoutLabel : 'Select items to check out'}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              🔒 Secure checkout powered by Amazon
            </p>
          </div>
        </div>
      </div>

      {/* Mobile sticky checkout bar: keeps the main action within thumb reach */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t shadow-lg p-3 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-gray-500">Grand Total</div>
            <div className="text-lg font-bold text-gray-900">{formatMoney(totals.grandTotal)}</div>
          </div>
          <button
            onClick={handleCheckout}
            disabled={!canCheckout}
            className="flex-1 bg-amazon-orange hover:bg-amazon-yellow text-white font-bold py-3 px-4 rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {canCheckout ? checkoutLabel : 'Select items'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartView;
