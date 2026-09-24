import React, { useEffect, useState } from 'react';
import { Product } from '../types';
import { useStore } from '../context/store';
import { href } from '../router';

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
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 1500);
    return () => clearTimeout(timer);
  }, [added]);

  if (!username) {
    return (
      <a
        href={href.login(window.location.hash)}
        className={`inline-block text-center border border-amazin-orange text-amazin-dark hover:bg-amazin-yellow/30 rounded ${
          compact ? 'text-xs px-2 py-1' : 'text-sm px-4 py-2'
        }`}
      >
        Log in to add to cart
      </a>
    );
  }

  const handleAdd = () => {
    addToCart(product, folderId || undefined);
    setAdded(true);
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
              className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-sm"
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
              placeholder="New folder name"
              maxLength={40}
              className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim()}
              className="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={handleAdd}
        className={`bg-amazin-orange hover:bg-amazin-yellow text-white font-semibold rounded transition-colors ${
          compact ? 'text-xs px-3 py-1' : 'w-full text-sm px-4 py-2'
        }`}
        aria-live="polite"
      >
        {added ? 'Added ✓' : 'Add to Cart'}
      </button>
    </div>
  );
};

export default AddToCart;
