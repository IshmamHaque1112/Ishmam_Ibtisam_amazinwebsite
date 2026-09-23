import React, { useState } from 'react';
import { useStore } from '../context/store';
import { mockProducts, mockSellers } from '../data/mockData';
import CartItem from './CartItem';
import CartFolder from './CartFolder';
import { CartItem as CartItemType } from '../types';

const CartView: React.FC = () => {
  const { cartItems, cartFolders, createFolder } = useStore();
  const [newFolderName, setNewFolderName] = useState('');

  // Separate items into folders and unassigned
  const itemsByFolder = cartFolders.map(folder => ({
    folder,
    items: cartItems.filter(item => item.folderId === folder.id)
  }));

  const unassignedItems = cartItems.filter(item => !item.folderId);

  // Calculate totals
  const activeSubtotal = cartItems.reduce((sum, item) => {
    if (!item.isSelected) return sum;
    const product = mockProducts.find(p => p.id === item.productId);
    if (!product) return sum;
    
    const effectivePrice = item.priceLocked && item.lockedPrice
      ? Math.min(item.lockedPrice, product.currentPrice)
      : product.currentPrice;
    
    return sum + (effectivePrice * item.quantity);
  }, 0);

  const taxRate = 0.08875; // 8.875%
  const estimatedTax = activeSubtotal * taxRate;
  const freeShippingThreshold = 35;
  const shippingCost = activeSubtotal >= freeShippingThreshold ? 0 : 5.99;
  const grandTotal = activeSubtotal + estimatedTax + shippingCost;

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createFolder(newFolderName.trim());
      setNewFolderName('');
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-600">Add some products to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Shopping Cart ({cartItems.length} items)</h2>

          {/* Create New Folder */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Create New Folder</h3>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name (e.g., Pantry, School Supplies)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amazin-orange focus:border-transparent"
              />
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="bg-amazin-orange hover:bg-amazin-yellow text-white font-semibold px-6 py-2 rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
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
                {cartItems.filter(item => item.isSelected).length} of {cartItems.length} items selected
              </p>
            </div>

            {/* Itemized Charges */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Active Subtotal</span>
                <span className="font-semibold">${activeSubtotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Est. Tax (8.875%)</span>
                <span className="font-semibold">${estimatedTax.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Est. Shipping</span>
                <span className="font-semibold">
                  {shippingCost === 0 ? (
                    <span className="text-green-600">FREE</span>
                  ) : (
                    `$${shippingCost.toFixed(2)}`
                  )}
                </span>
              </div>

              {shippingCost > 0 && (
                <div className="text-xs text-gray-500">
                  Add ${(freeShippingThreshold - activeSubtotal).toFixed(2)} more for FREE shipping
                </div>
              )}

              <div className="border-t pt-3 flex justify-between">
                <span className="text-lg font-bold text-gray-900">Grand Total</span>
                <span className="text-lg font-bold text-amazin-orange">${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              disabled={activeSubtotal === 0}
              className="w-full bg-amazin-orange hover:bg-amazin-yellow text-white font-bold py-3 px-4 rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Proceed to Checkout
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              🔒 Secure checkout powered by Amazin
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartView;
