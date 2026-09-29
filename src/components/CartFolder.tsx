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
      {/* Folder Header */}
      <div
        className="bg-gray-50 px-4 py-3 flex items-center justify-between flex-wrap gap-2 cursor-pointer hover:bg-gray-100"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid={`folder-${folder.name}`}
      >
        <div className="flex items-center space-x-3">
          <span className="text-gray-500">
            {isExpanded ? '▼' : '▶'}
          </span>
          <h3 className="font-semibold text-gray-900">{folder.name}</h3>
          <span className="text-sm text-gray-500">({pluralizeItems(folderQuantity)})</span>
        </div>
        <div className="flex items-center flex-wrap gap-3">
          <span className="font-bold text-gray-900">
            Subtotal: {formatMoney(folderSubtotal)}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCheckoutFolder(folder.id);
            }}
            disabled={items.length === 0}
            className="text-sm font-semibold bg-amazin-yellow hover:bg-amazin-orange text-gray-900 px-3 py-1 rounded-md disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Check out this folder
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete folder "${folder.name}"? Items will be moved to general cart.`)) {
                deleteFolder(folder.id);
              }
            }}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Delete Folder
          </button>
        </div>
      </div>

      {/* Folder Items */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No items in this folder</p>
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
