import React, { useState } from 'react';
import { Product, Seller } from '../types';
import { calculateProductRating, calculateSellerRating } from '../utils/ratingCalculations';
import { useStore } from '../context/store';

interface ProductCardProps {
  product: Product;
  sellers: Seller[];
}

const ProductCard: React.FC<ProductCardProps> = ({ product, sellers }) => {
  const { addToCart, cartFolders, createFolder } = useStore();
  const [selectedSeller, setSelectedSeller] = useState<Seller>(sellers[0]);
  const [selectedFolder, setSelectedFolder] = useState<string | undefined>();
  const [showFolderSelect, setShowFolderSelect] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const productRating = calculateProductRating(product);
  const sellerRating = calculateSellerRating(selectedSeller, product.basePrice);

  const handleAddToCart = () => {
    addToCart(product, selectedSeller, selectedFolder);
    setShowFolderSelect(false);
    setSelectedFolder(undefined);
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createFolder(newFolderName.trim());
      const newFolder = cartFolders[cartFolders.length - 1];
      setSelectedFolder(newFolder.id);
      setNewFolderName('');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-4">
      {/* Product Image */}
      <div className="aspect-square bg-gray-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Product Info */}
      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{product.name}</h3>
      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{product.description}</p>

      {/* Product Rating Badge */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-500">Product Score</span>
          <span className="text-xs font-bold text-gray-900">{productRating.score}/100</span>
        </div>
        <div className="bg-blue-50 text-blue-800 text-xs px-2 py-1 rounded-full inline-block">
          {productRating.badge}
        </div>
      </div>

      {/* Price */}
      <div className="mb-3">
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-gray-900">${product.currentPrice.toFixed(2)}</span>
          {product.currentPrice < product.basePrice && (
            <span className="text-sm text-gray-500 line-through">${product.basePrice.toFixed(2)}</span>
          )}
        </div>
        {product.currentPrice < product.basePrice && (
          <span className="text-xs text-green-600 font-medium">
            Save {Math.round((1 - product.currentPrice / product.basePrice) * 100)}%
          </span>
        )}
      </div>

      {/* Seller Selection */}
      <div className="mb-3">
        <label className="text-xs font-medium text-gray-700 mb-1 block">Seller:</label>
        <select
          value={selectedSeller.id}
          onChange={(e) => setSelectedSeller(sellers.find(s => s.id === e.target.value)!)}
          className="w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-amazon-orange focus:border-transparent"
        >
          {sellers.map((seller) => (
            <option key={seller.id} value={seller.id}>
              {seller.name} {seller.isPrime && '✓ Prime'}
            </option>
          ))}
        </select>

        {/* Seller Rating Badge */}
        <div className="mt-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500">Seller Score</span>
            <span className="text-xs font-bold text-gray-900">{sellerRating.score}/100</span>
          </div>
          <div className="bg-green-50 text-green-800 text-xs px-2 py-1 rounded-full inline-block">
            {sellerRating.badge}
          </div>
        </div>
      </div>

      {/* Folder Selection */}
      <div className="mb-3">
        <button
          onClick={() => setShowFolderSelect(!showFolderSelect)}
          className="text-xs text-amazon-blue hover:underline"
        >
          {showFolderSelect ? 'Hide folder options' : 'Add to folder'}
        </button>
        
        {showFolderSelect && (
          <div className="mt-2 space-y-2">
            <select
              value={selectedFolder || ''}
              onChange={(e) => setSelectedFolder(e.target.value || undefined)}
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-1"
            >
              <option value="">No folder</option>
              {cartFolders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
            
            <div className="flex space-x-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="New folder name"
                className="flex-1 text-sm border border-gray-300 rounded-md px-2 py-1"
              />
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded-md disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add to Cart Button */}
      <button
        onClick={handleAddToCart}
        className="w-full bg-amazon-orange hover:bg-amazon-yellow text-white font-semibold py-2 px-4 rounded-md transition-colors"
      >
        Add to Cart
      </button>
    </div>
  );
};

export default ProductCard;
