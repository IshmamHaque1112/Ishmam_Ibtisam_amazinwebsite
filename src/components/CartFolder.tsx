import React, { useState } from 'react';
import { CartFolder as CartFolderType, CartItem as CartItemType, Product, Seller } from '../types';
import { useStore } from '../context/store';
import CartItem from './CartItem';
import { formatMoney, getLineTotal, pluralizeItems } from '../utils/cartPricing';

interface CartFolderProps {
  folder: CartFolderType;
  items: CartItemType[];
  products: Product[];
  sellers: Seller[];
  onCheckoutFolder: (folderId: string) => void;
  onSavedForLater?: (savedId: string, productName: string) => void;
}

const CartFolder: React.FC<CartFolderProps> = ({
  folder,
  items,
  products,
  sellers,
  onCheckoutFolder,
  onSavedForLater
}) => {
  const { deleteFolder } = useStore();
  const [isExpanded, setIsExpanded] = useState(true);

  // Uses the shared cart pricing so folder subtotals match the order summary
  // (including price lock expiry). The header shows the whole folder, which is
  // what "Check out this folder" buys.
  const folderSubtotal = items.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    if (!product) return sum;
    return sum + getLineTotal(item, product);
  }, 0);

  const folderQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="border rounded-lg mb-4 overflow-hidden">
      {/* Folder Header: the name toggles the folder open and closed. */}
      <div
        className="bg-gray-50 px-4 py-3 flex items-center justify-between flex-wrap gap-2"
        data-testid={`folder-${folder.name}`}
      >
        <h3>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            aria-controls={`folder-items-${folder.id}`}
            className="flex items-center gap-3 text-left rounded hover:bg-gray-100 -mx-1 px-1"
          >
            <span className="text-gray-600" aria-hidden="true">
              {isExpanded ? '▼' : '▶'}
            </span>
            <span className="font-semibold text-gray-900">{folder.name}</span>
            <span className="text-sm text-gray-600">({pluralizeItems(folderQuantity)})</span>
          </button>
        </h3>
        <div className="flex items-center flex-wrap gap-3">
          <span className="font-bold text-gray-900">
            Subtotal: {formatMoney(folderSubtotal)}
          </span>
          <button
            type="button"
            onClick={() => onCheckoutFolder(folder.id)}
            disabled={items.length === 0}
            className="text-sm font-semibold bg-amazin-yellow hover:bg-amazin-orange text-gray-900 px-3 py-1 rounded-md disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            Check out this folder
          </button>
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
        </div>
      </div>

      {/* Folder Items */}
      {isExpanded && (
        <div className="p-4 space-y-3" id={`folder-items-${folder.id}`}>
          {items.length === 0 ? (
            <p className="text-gray-600 text-center py-4">No items in this folder</p>
          ) : (
            items.map((item) => {
              const product = products.find(p => p.id === item.productId);
              const seller = sellers.find(s => s.id === item.sellerId);
              if (!product || !seller) return null;

              return (
                <CartItem
                  key={item.id}
                  item={item}
                  product={product}
                  seller={seller}
                  onSavedForLater={onSavedForLater}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default CartFolder;
