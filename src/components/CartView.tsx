import React, { useEffect, useState } from 'react';
import { useStore } from '../context/store';
import { useDb } from '../db/DbProvider';
import { href, useDocumentTitle } from '../router';
import CartItem from './CartItem';
import CartFolder from './CartFolder';
import FreeShippingProgress from './FreeShippingProgress';
import SavedForLater from './SavedForLater';
import {
  TAX_RATE,
  FREE_SHIPPING_THRESHOLD,
  calculateCartTotals,
  calculateGroupTotals,
  formatMoney,
  pluralizeItems
} from '../utils/cartPricing';

interface OrderConfirmation {
  orderId: string;
  itemCount: number;
  grandTotal: number;
  folderName?: string;
}

interface UndoSave {
  savedId: string;
  productName: string;
}

const CartView: React.FC = () => {
  const {
    cartItems,
    cartFolders,
    savedItems,
    createFolder,
    setAllCartItemsSelected,
    placeOrder,
    moveSavedToCart,
    storageError
  } = useStore();
  useDocumentTitle('Your cart');
  const db = useDb();
  const products = db.getProducts();
  const sellers = db.getSellers();
  const [newFolderName, setNewFolderName] = useState('');
  const [confirmation, setConfirmation] = useState<OrderConfirmation | null>(null);
  // When set, the order summary checks out only this folder.
  const [checkoutFolderId, setCheckoutFolderId] = useState<string | null>(null);
  const [undoSave, setUndoSave] = useState<UndoSave | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // The Undo offer disappears after a few seconds.
  useEffect(() => {
    if (!undoSave) return;
    const timer = setTimeout(() => setUndoSave(null), 8000);
    return () => clearTimeout(timer);
  }, [undoSave]);

  // Separate items into folders and unassigned
  const itemsByFolder = cartFolders.map(folder => ({
    folder,
    items: cartItems.filter(item => item.folderId === folder.id)
  }));

  const unassignedItems = cartItems.filter(item => !item.folderId);

  // Folder checkout reuses the order summary with only that folder's items.
  // If the folder was deleted or emptied, fall back to the whole cart.
  const checkoutFolder = cartFolders.find(folder => folder.id === checkoutFolderId);
  const folderItems = checkoutFolder ? cartItems.filter(item => item.folderId === checkoutFolder.id) : [];
  const folderMode = !!checkoutFolder && folderItems.length > 0;

  const totals = folderMode ? calculateGroupTotals(folderItems, products) : calculateCartTotals(cartItems, products);
  const allSelected = cartItems.length > 0 && cartItems.every(item => item.isSelected);
  const canCheckout = totals.subtotal > 0;
  const checkoutLabel = folderMode
    ? `Place order for ${checkoutFolder!.name} (${pluralizeItems(totals.selectedQuantity)})`
    : `Proceed to checkout (${pluralizeItems(totals.selectedQuantity)})`;

  const handleSavedForLater = (savedId: string, productName: string) => {
    setUndoSave({ savedId, productName });
  };

  const handleUndoSave = () => {
    if (undoSave) moveSavedToCart(undoSave.savedId);
    setUndoSave(null);
  };

  const handleCheckoutFolder = (folderId: string) => {
    setConfirmation(null);
    setCheckoutFolderId(folderId);
    document.getElementById('order-summary')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createFolder(newFolderName.trim());
      setNewFolderName('');
    }
  };

  // Demo checkout: records the order in the shopper's order history and
  // removes those lines from the cart. No payment is taken.
  const handleCheckout = () => {
    if (!canCheckout) return;
    const lineIds = folderMode
      ? folderItems.map(item => item.id)
      : cartItems.filter(item => item.isSelected).map(item => item.id);
    const order = placeOrder(lineIds, products, sellers, folderMode ? checkoutFolder!.name : undefined);
    if (!order) {
      setCheckoutError('These items are no longer available, so the order could not be placed.');
      return;
    }
    setCheckoutError(null);
    setConfirmation({
      orderId: order.id,
      itemCount: order.itemCount,
      grandTotal: order.grandTotal,
      folderName: order.folderName
    });
    setCheckoutFolderId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmationBanner = confirmation && (
    <div
      className="bg-green-50 border border-green-200 text-green-900 rounded-lg p-4 flex items-start justify-between"
      role="status"
      data-testid="order-confirmation"
    >
      <div>
        <p className="font-bold">
          ✅ Order placed! #{confirmation.orderId}
          {confirmation.folderName && <span className="font-normal"> · folder “{confirmation.folderName}”</span>}
        </p>
        <p className="text-sm">
          {pluralizeItems(confirmation.itemCount)} · Order total {formatMoney(confirmation.grandTotal)} (demo order, no payment was taken)
        </p>
        <a href={href.account()} className="text-sm font-semibold text-green-900 underline">
          View your order history
        </a>
      </div>
      <button
        onClick={() => setConfirmation(null)}
        className="text-green-800 hover:text-green-950 text-sm ml-4"
        aria-label="Dismiss order confirmation"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </div>
  );

  const undoBanner = undoSave && (
    <div
      className="bg-gray-900 text-white rounded-lg px-4 py-3 flex items-center justify-between gap-4"
      role="status"
      data-testid="undo-save"
    >
      <span className="text-sm">Saved “{undoSave.productName}” for later.</span>
      <button type="button" onClick={handleUndoSave} className="text-sm font-bold text-amazin-yellow hover:underline">
        Undo
      </button>
    </div>
  );

  const storageBanner = storageError && (
    <p className="bg-amber-50 border border-amber-300 text-amber-900 rounded-lg p-3 text-sm" role="alert">
      Your browser isn't letting Amazin save data, so cart changes will be lost when you close this tab.
    </p>
  );

  if (cartItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        {confirmationBanner}
        {undoBanner}
        {storageBanner}
        <div className="text-center py-16">
          <div className="text-6xl mb-4" aria-hidden="true">🛒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
          <p className="text-gray-600 mb-6">Add some products to get started!</p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href={href.products()}
              className="inline-block bg-amazin-yellow hover:bg-amazin-orange text-gray-900 font-semibold px-6 py-2 rounded-md transition-colors"
            >
              Continue shopping
            </a>
            <a href={href.account()} className="inline-block border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-semibold px-6 py-2 rounded-md">
              Order history
            </a>
          </div>
        </div>
        <SavedForLater products={products} sellers={sellers} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 pb-28 lg:pb-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          {confirmationBanner}
          {undoBanner}
          {storageBanner}

          <div className="flex items-end justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Shopping Cart ({pluralizeItems(cartItems.reduce((sum, item) => sum + item.quantity, 0))})
              </h1>
              {savedItems.length > 0 && (
                <a href="#saved-for-later-heading" onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('saved-for-later-heading')?.scrollIntoView({ behavior: 'smooth' });
                }} className="text-sm text-amazin-blue hover:underline">
                  {pluralizeItems(savedItems.length)} saved for later
                </a>
              )}
            </div>
            <label className="flex items-center space-x-2 text-sm text-amazin-blue cursor-pointer select-none">
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
            <h2 className="font-semibold text-gray-900 mb-2">
              <label htmlFor="new-cart-folder">Create new folder</label>
            </h2>
            <div className="flex gap-2">
              <input
                id="new-cart-folder"
                type="text"
                maxLength={40}
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                }}
                placeholder="Folder name (e.g., Pantry, School Supplies)"
                className="flex-1 min-w-0 px-3 sm:px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amazin-orange focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="bg-amazin-orange hover:bg-amazin-yellow text-gray-900 font-semibold px-4 sm:px-6 py-2 rounded-md transition-colors disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed"
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
              products={products}
              sellers={sellers}
              onCheckoutFolder={handleCheckoutFolder}
              onSavedForLater={handleSavedForLater}
            />
          ))}

          {/* Unassigned Items */}
          {unassignedItems.length > 0 && (
            <div className="border rounded-lg p-4">
              <h2 className="font-semibold text-gray-900 mb-4">Unassigned items</h2>
              <div className="space-y-3">
                {unassignedItems.map((item) => {
                  const product = products.find(p => p.id === item.productId);
                  const seller = sellers.find(s => s.id === item.sellerId);
                  if (!product || !seller) return null;

                  return (
                    <CartItem
                      key={item.id}
                      item={item}
                      product={product}
                      seller={seller}
                      onSavedForLater={handleSavedForLater}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Saved for later: outside the cart and its totals */}
          <SavedForLater products={products} sellers={sellers} />
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div
            id="order-summary"
            className={`bg-white rounded-lg shadow-md p-6 sticky top-20 ${folderMode ? 'ring-2 ring-amazin-orange' : ''}`}
            data-testid="order-summary"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {folderMode ? `Checking out: ${checkoutFolder!.name}` : 'Order Summary'}
            </h2>

            {/* Selected Items Info */}
            <div className="mb-4 pb-4 border-b">
              {folderMode ? (
                <>
                  <p className="text-sm text-gray-600">
                    Only the {pluralizeItems(totals.selectedQuantity)} in this folder. The rest of your cart and your saved items stay put.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCheckoutFolderId(null)}
                    className="text-sm text-amazin-blue hover:underline mt-1"
                  >
                    ← Back to whole cart
                  </button>
                </>
              ) : (
                <p className="text-sm text-gray-600">
                  {totals.selectedLineCount} of {cartItems.length} products selected ({pluralizeItems(totals.selectedQuantity)})
                </p>
              )}
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
                    <span className="text-green-700">FREE</span>
                  ) : (
                    formatMoney(totals.shipping)
                  )}
                </span>
              </div>

              {totals.shipping > 0 && (
                <div className="text-xs text-gray-600">
                  Free shipping on orders of {formatMoney(FREE_SHIPPING_THRESHOLD)} or more
                </div>
              )}

              <div className="border-t pt-3 flex justify-between">
                <span className="text-lg font-bold text-gray-900">Grand Total</span>
                <span className="text-lg font-bold text-gray-900" data-testid="grand-total">
                  {formatMoney(totals.grandTotal)}
                </span>
              </div>
            </div>

            {/* Checkout Button (Fitts's Law: large, always in view) */}
            {checkoutError && (
              <p className="text-sm bg-red-50 text-red-800 rounded p-2 mb-3" role="alert">{checkoutError}</p>
            )}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={!canCheckout}
              className="w-full bg-amazin-orange hover:bg-amazin-yellow text-gray-900 font-bold py-3 px-4 rounded-md transition-colors disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed"
            >
              {canCheckout ? checkoutLabel : 'Select items to check out'}
            </button>

            <p className="text-xs text-gray-600 text-center mt-4">
              Demo checkout: no payment is taken. Orders are saved to your order history.
            </p>
          </div>
        </div>
      </div>

      {/* Mobile sticky checkout bar: keeps the main action within thumb reach */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t shadow-lg p-3 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-gray-600">Grand Total</div>
            <div className="text-lg font-bold text-gray-900">{formatMoney(totals.grandTotal)}</div>
          </div>
          <button
            type="button"
            onClick={handleCheckout}
            disabled={!canCheckout}
            className="flex-1 bg-amazin-orange hover:bg-amazin-yellow text-gray-900 font-bold py-3 px-4 rounded-md transition-colors disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed"
          >
            {canCheckout ? checkoutLabel : 'Select items'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartView;
