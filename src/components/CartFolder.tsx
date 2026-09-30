import React, { useEffect, useRef, useState } from 'react';
import { CartFolder as CartFolderType, CartItem as CartItemType, Product, Seller } from '../types';
import { useStore } from '../context/store';
import CartItem, { CART_ITEM_DRAG_TYPE } from './CartItem';
import { formatMoney, getLineTotal, pluralizeItems } from '../utils/cartPricing';
import { selectionState } from '../utils/cartFolders';

interface CartFolderProps {
  // Leave out for the "Unassigned items" group.
  folder?: CartFolderType;
  items: CartItemType[];
  products: Product[];
  sellers: Seller[];
  onSavedForLater?: (savedId: string, productName: string) => void;
}

// One group in the cart: a folder, or the Unassigned items. The checkbox in
// the header ticks every item in the group for checkout, so shoppers can buy
// one folder, several folders, or everything. Items can be dropped here from
// another group.
const CartFolder: React.FC<CartFolderProps> = ({ folder, items, products, sellers, onSavedForLater }) => {
  const { deleteFolder, setFolderSelected, selectOnlyFolder, moveItemToFolder, cartItems } = useStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [dropActive, setDropActive] = useState(false);
  const checkboxRef = useRef<HTMLInputElement>(null);
  const folderId = folder?.id;
  const name = folder ? folder.name : 'Unassigned items';
  const groupKey = folderId ?? 'unassigned';

  // Uses the shared cart pricing so group subtotals match the order summary.
  const subtotal = items.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return product ? sum + getLineTotal(item, product) : sum;
  }, 0);
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const state = selectionState(items);
  const otherItemsSelected = cartItems.some(item => item.isSelected && (item.folderId ?? undefined) !== folderId);

  useEffect(() => {
    if (checkboxRef.current) checkboxRef.current.indeterminate = state === 'some';
  }, [state]);

  const acceptsDrop = (e: React.DragEvent) => e.dataTransfer.types.includes(CART_ITEM_DRAG_TYPE);

  return (
    <section
      className={`border rounded-lg mb-4 overflow-hidden bg-white ${dropActive ? 'ring-2 ring-amazin-orange' : ''}`}
      aria-labelledby={`group-${groupKey}-name`}
      data-testid={`folder-${name}`}
      onDragOver={e => {
        if (!acceptsDrop(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDropActive(true);
      }}
      onDragLeave={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropActive(false);
      }}
      onDrop={e => {
        setDropActive(false);
        const itemId = e.dataTransfer.getData(CART_ITEM_DRAG_TYPE);
        if (!itemId) return;
        e.preventDefault();
        moveItemToFolder(itemId, folderId);
      }}
    >
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between flex-wrap gap-2 border-b">
        <div className="flex items-center gap-3 min-w-0">
          <input
            ref={checkboxRef}
            type="checkbox"
            checked={state === 'all'}
            disabled={items.length === 0}
            onChange={() => setFolderSelected(folderId, state !== 'all')}
            className="w-5 h-5 flex-shrink-0"
            aria-label={`Include everything in ${name} in checkout`}
          />
          <h2 id={`group-${groupKey}-name`} className="min-w-0">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-expanded={isExpanded}
              aria-controls={`group-${groupKey}-items`}
              className="flex items-center gap-2 text-left rounded hover:bg-gray-100 -mx-1 px-1"
            >
              <span className="text-gray-600 text-sm" aria-hidden="true">
                {isExpanded ? '▼' : '▶'}
              </span>
              <span className="font-semibold text-gray-900 break-words">
                {folder ? <span aria-hidden="true">📁 </span> : null}
                {name}
              </span>
              <span className="text-sm text-gray-600 whitespace-nowrap">({pluralizeItems(quantity)})</span>
            </button>
          </h2>
        </div>
        <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
          <span className="font-semibold text-gray-900">{formatMoney(subtotal)}</span>
          {items.length > 0 && (state !== 'all' || otherItemsSelected) && (
            <button
              type="button"
              onClick={() => selectOnlyFolder(folderId)}
              className="text-sm font-semibold bg-amazin-yellow hover:bg-amazin-orange text-gray-900 px-3 py-1 rounded-md"
            >
              Buy only this {folder ? 'folder' : 'group'}
            </button>
          )}
          {folder && (
            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete folder "${folder.name}"? Its items move to Unassigned items.`)) {
                  deleteFolder(folder.id);
                }
              }}
              className="text-sm text-red-700 hover:text-red-900"
            >
              Delete folder
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 sm:p-4 space-y-3" id={`group-${groupKey}-items`}>
          {items.length === 0 ? (
            <p className="text-gray-600 text-center py-4 text-sm border-2 border-dashed border-gray-200 rounded-lg">
              {folder
                ? 'This folder is empty. Use an item’s Folder menu, or drag an item here.'
                : 'No unassigned items. Drag an item here, or choose “Unassigned items” in its Folder menu.'}
            </p>
          ) : (
            items.map(item => {
              const product = products.find(p => p.id === item.productId);
              const seller = sellers.find(s => s.id === item.sellerId);
              if (!product || !seller) return null;
              return (
                <CartItem key={item.id} item={item} product={product} seller={seller} onSavedForLater={onSavedForLater} />
              );
            })
          )}
        </div>
      )}
    </section>
  );
};

export default CartFolder;
