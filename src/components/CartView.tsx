import React, { useEffect, useState } from 'react';
import { useStore } from '../context/store';
import { useDb } from '../db/DbProvider';
import { href, useDocumentTitle } from '../router';
import CartFolder from './CartFolder';
import FreeShippingProgress from './FreeShippingProgress';
import SavedForLater from './SavedForLater';
import {
  TAX_RATE,
  FREE_SHIPPING_THRESHOLD,
  calculateCartTotals,
  formatMoney,
  pluralizeItems
} from '../utils/cartPricing';
import { itemsInFolder, selectedGroups } from '../utils/cartFolders';

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

// The cart is split into groups: one per folder plus "Unassigned items".
// Ticking items (or a whole folder) decides what the single checkout button
// buys, so shoppers can buy one folder, several folders, or everything.
const CartView: React.FC = () => {
  const {
    cartItems,
    cartFolders,
    savedItems,
    createFolder,
    setAllCartItemsSelected,
    placeOrder,
    moveSavedToCart,
    organizeByCategory,
    autoCategoryFolders,
    setAutoCategoryFolders,
    storageError
  } = useStore();
  useDocumentTitle('Your cart');
  const db = useDb();
  const products = db.getProducts();
  const sellers = db.getSellers();
  const [newFolderName, setNewFolderName] = useState('');
  const [confirmation, setConfirmation] = useState<OrderConfirmation | null>(null);
  const [undoSave, setUndoSave] = useState<UndoSave | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [organizeMessage, setOrganizeMessage] = useState<string | null>(null);

  // The Undo offer disappears after a few seconds.
  useEffect(() => {
    if (!undoSave) return;
    const timer = setTimeout(() => setUndoSave(null), 8000);
    return () => clearTimeout(timer);
  }, [undoSave]);

  useEffect(() => {
    if (!organizeMessage) return;
    const timer = setTimeout(() => setOrganizeMessage(null), 6000);
    return () => clearTimeout(timer);
  }, [organizeMessage]);

  const knownFolders = new Set(cartFolders.map(folder => folder.id));
  const unassignedItems = cartItems.filter(item => !item.folderId || !knownFolders.has(item.folderId));
  const totals = calculateCartTotals(cartItems, products);
  const groups = selectedGroups(cartItems, cartFolders);
  const allSelected = cartItems.length > 0 && cartItems.every(item => item.isSelected);
  const canCheckout = totals.subtotal > 0;
  const checkoutLabel = `Place order (${pluralizeItems(totals.selectedQuantity)})`;

  const handleSavedForLater = (savedId: string, productName: string) => {
    setUndoSave({ savedId, productName });
  };

  const handleUndoSave = () => {
    if (undoSave) moveSavedToCart(undoSave.savedId);
    setUndoSave(null);
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createFolder(newFolderName.trim());
      setNewFolderName('');
    }
  };

  const handleOrganize = () => {
    const moved = organizeByCategory(products);
    setOrganizeMessage(
      moved > 0
        ? `Moved ${pluralizeItems(moved)} into category folders.`
        : 'There are no unassigned items to sort.'
    );
  };

  // Demo checkout: records the order in the shopper's order history and
  // removes those lines from the cart. No payment is taken.
  const handleCheckout = () => {
    if (!canCheckout) return;
    const lineIds = cartItems.filter(item => item.isSelected).map(item => item.id);
    const folderNames = groups.filter(g => g.folderId !== undefined).map(g => g.name);
    const order = placeOrder(
      lineIds,
      products,
      sellers,
      folderNames.length > 0 && folderNames.length === groups.length ? folderNames.join(', ') : undefined
    );
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
          <span aria-hidden="true">✅ </span>Order placed! #{confirmation.orderId}
          {confirmation.folderName && <span className="font-normal"> · {confirmation.folderName}</span>}
        </p>
        <p className="text-sm">
          {pluralizeItems(confirmation.itemCount)} · Order total {formatMoney(confirmation.grandTotal)} (demo order, no
          payment was taken)
        </p>
        <a href={href.account()} className="text-sm font-semibold text-green-900 underline">
          View your order history
        </a>
      </div>
      <button
        type="button"
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
            <a
              href={href.account()}
              className="inline-block border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-semibold px-6 py-2 rounded-md"
            >
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
                Shopping Cart ({pluralizeItems(totals.totalQuantity)})
              </h1>
              {savedItems.length > 0 && (
                <a
                  href="#saved-for-later-heading"
                  onClick={e => {
                    e.preventDefault();
                    document.getElementById('saved-for-later-heading')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-sm text-amazin-blue hover:underline"
                >
                  {pluralizeItems(savedItems.length)} saved for later
                </a>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-900 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => setAllCartItemsSelected(!allSelected)}
                className="w-4 h-4"
              />
              <span>Select everything</span>
            </label>
          </div>

          {/* Goal-Gradient: free shipping progress */}
          <FreeShippingProgress
            subtotal={totals.subtotal}
            amountToFreeShipping={totals.amountToFreeShipping}
            progress={totals.freeShippingProgress}
          />

          {/* Organize: new folder, sort by category */}
          <section className="bg-white border rounded-lg p-4 space-y-3" aria-labelledby="organize-heading">
            <h2 id="organize-heading" className="font-semibold text-gray-900">
              Organize your cart
            </h2>
            <p className="text-sm text-gray-600">
              Tick a folder to buy everything in it. Move an item with its Folder menu, or drag it onto a folder.
            </p>
            <div className="flex flex-wrap gap-2">
              <label htmlFor="new-cart-folder" className="sr-only">
                New folder name
              </label>
              <input
                id="new-cart-folder"
                type="text"
                maxLength={40}
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateFolder();
                }}
                placeholder="New folder name (e.g. Pantry)"
                className="flex-1 min-w-[10rem] px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amazin-orange focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="bg-amazin-orange hover:bg-amazin-yellow text-gray-900 font-semibold px-4 py-2 rounded-md transition-colors disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed"
              >
                Create folder
              </button>
              <button
                type="button"
                onClick={handleOrganize}
                className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-semibold px-4 py-2 rounded-md"
              >
                Organize by category
              </button>
            </div>
            <label className="flex items-start gap-2 text-sm text-gray-800 cursor-pointer">
              <input
                type="checkbox"
                checked={autoCategoryFolders}
                onChange={e => setAutoCategoryFolders(e.target.checked)}
                className="w-4 h-4 mt-0.5"
              />
              <span>Put new items in a folder for their category automatically</span>
            </label>
            {organizeMessage && (
              <p className="text-sm text-green-800" role="status">
                {organizeMessage}
              </p>
            )}
          </section>

          {/* Folder Groups, then Unassigned items */}
          <div>
            {cartFolders.map(folder => (
              <CartFolder
                key={folder.id}
                folder={folder}
                items={itemsInFolder(cartItems, folder.id)}
                products={products}
                sellers={sellers}
                onSavedForLater={handleSavedForLater}
              />
            ))}
            {(unassignedItems.length > 0 || cartFolders.length > 0) && (
              <CartFolder
                items={unassignedItems}
                products={products}
                sellers={sellers}
                onSavedForLater={handleSavedForLater}
              />
            )}
          </div>

          {/* Saved for later: outside the cart and its totals */}
          <SavedForLater products={products} sellers={sellers} />
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div id="order-summary" className="bg-white rounded-lg shadow-md p-6 sticky top-20" data-testid="order-summary">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>

            {/* What this order contains */}
            <div className="mb-4 pb-4 border-b">
              {groups.length === 0 ? (
                <p className="text-sm text-gray-600">Nothing selected yet. Tick items or a whole folder to buy them.</p>
              ) : (
                <>
                  <p className="text-sm text-gray-700 font-medium">This order includes:</p>
                  <ul className="mt-1 text-sm text-gray-700 space-y-0.5" data-testid="order-groups">
                    {groups.map(group => (
                      <li key={group.folderId ?? 'unassigned'} className="flex justify-between gap-2">
                        <span className="break-words">{group.name}</span>
                        <span className="text-gray-600 whitespace-nowrap">{pluralizeItems(group.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-gray-600">
                    {totals.selectedLineCount} of {cartItems.length} products selected. Unticked items stay in your cart.
                  </p>
                </>
              )}
            </div>

            {/* Itemized Charges */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">{formatMoney(totals.subtotal)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Est. Tax ({(TAX_RATE * 100).toFixed(3)}%)</span>
                <span className="font-semibold">{formatMoney(totals.tax)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Est. Shipping</span>
                <span className="font-semibold">
                  {totals.shipping === 0 ? <span className="text-green-700">FREE</span> : formatMoney(totals.shipping)}
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

            {checkoutError && (
              <p className="text-sm bg-red-50 text-red-800 rounded p-2 mb-3" role="alert">
                {checkoutError}
              </p>
            )}

            {/* Checkout Button (Fitts's Law: large, always in view) */}
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
