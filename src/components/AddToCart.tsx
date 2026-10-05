import React, { useEffect, useState } from 'react';
import { Product } from '../types';
import { useStore } from '../context/store';
import { href } from '../router';
import { MAX_QUANTITY } from '../utils/cartPricing';

interface AddToCartProps {
  product: Product;
  showFolderPicker?: boolean;
  compact?: boolean;
}

// Guests can browse freely; adding to the cart needs a username login.
const AddToCart: React.FC<AddToCartProps> = ({ product, showFolderPicker = false, compact = false }) => {
  const { username, addToCart, cartFolders, createFolder } = useStore();
  const [folderId, setFolderId] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  // Short-lived feedback after a click: 'added', or 'max' when that line is
  // already at the per-item limit.
  const [feedback, setFeedback] = useState<'added' | 'max' | null>(null);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 2000);
    return () => clearTimeout(timer);
  }, [feedback]);

  if (!username) {
    return (
      <a
        href={href.login(window.location.hash)}
        className={`inline-flex min-h-11 items-center justify-center text-center border border-amber-600 text-amazin-dark hover:bg-amazin-yellow/30 rounded whitespace-nowrap ${
          compact ? 'text-sm px-3' : 'text-sm px-4 py-2'
        }`}
      >
        Log in to add to cart
      </a>
    );
  }

  const handleAdd = () => {
    // Check if product is out of stock
    if (product.stockQuantity === 0) {
      return; // Don't add if out of stock
    }
    const added = addToCart(product, folderId || undefined);
    setFeedback(added > 0 ? 'added' : 'max');
  };

  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    setFolderId(createFolder(name));
    setNewFolderName('');
  };

  return (
    <div className={compact ? '' : 'space-y-2'}>
      {showFolderPicker && (
        <div className="space-y-2">
          <label className="block text-xs text-gray-600">
            Cart folder (optional)
            <select
              value={folderId}
              onChange={e => setFolderId(e.target.value)}
              className="mt-1 w-full min-h-11 border border-gray-500 rounded px-2 py-1 text-sm"
            >
              <option value="">No folder</option>
              {cartFolders.map(folder => (
                <option key={folder.id} value={folder.id}>{folder.name}</option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateFolder();
                }
              }}
              placeholder="New folder name"
              aria-label="New cart folder name"
              maxLength={40}
              className="flex-1 min-h-11 border border-gray-500 rounded px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim()}
              className="min-h-11 text-sm bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 rounded disabled:text-gray-600"
            >
              Create
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={handleAdd}
        disabled={product.stockQuantity === 0}
        className={`${
          product.stockQuantity === 0
            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
            : 'bg-amazin-orange hover:bg-amazin-yellow text-gray-900'
        } font-semibold rounded transition-colors whitespace-nowrap ${
          compact ? 'min-h-11 text-sm px-4' : 'w-full min-h-11 text-sm px-4 py-2'
        }`}
        aria-label={`Add ${product.name} to cart`}
      >
        {product.stockQuantity === 0 ? 'Out of stock' : feedback === 'added' ? 'Added ✓' : 'Add to Cart'}
      </button>
      <span className={`block text-xs ${feedback === 'max' ? 'text-red-800 mt-1' : 'sr-only'}`} role="status">
        {feedback === 'added' && `${product.name} added to your cart.`}
        {feedback === 'max' && `Limit ${MAX_QUANTITY} per item in your cart.`}
      </span>
    </div>
  );
};

export default AddToCart;
