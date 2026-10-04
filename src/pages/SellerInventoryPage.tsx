import React, { useState, useEffect } from 'react';
import { useDb } from '../db/DbProvider';
import { useStore } from '../context/store';
import { href } from '../router';
import { formatMoney } from '../utils/cartPricing';

interface ProductEdit {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  newStock: number;
  currentPrice: number;
  newPrice: number;
}

const SellerInventoryPage: React.FC = () => {
  const db = useDb();
  const { username } = useStore();
  const [products, setProducts] = useState<ProductEdit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [sellerId, setSellerId] = useState<string | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      if (!username) return;
      
      try {
        const customer = await db.findCustomer(username);
        if (!customer?.managedSellerId) {
          setNotice('No seller account found');
          setLoading(false);
          return;
        }
        
        setSellerId(customer.managedSellerId);
        const sellerProducts = db.getProductsBySeller(customer.managedSellerId);
        
        setProducts(sellerProducts.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          currentStock: p.stockQuantity,
          newStock: p.stockQuantity,
          currentPrice: p.currentPrice,
          newPrice: p.currentPrice
        })));
      } catch (error) {
        console.error('Failed to load products:', error);
        setNotice('Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    
    loadProducts();
  }, [username, db]);

  const updateStock = (productId: string, delta: number) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        const newStock = Math.max(0, p.newStock + delta);
        const updated = { ...p, newStock };
        return updated;
      }
      return p;
    }));
    setHasChanges(true);
  };

  const setStockDirect = (productId: string, value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0) {
      setProducts(prev => prev.map(p => {
        if (p.id === productId) {
          return { ...p, newStock: num };
        }
        return p;
      }));
      setHasChanges(true);
    }
  };

  const updatePrice = (productId: string, delta: number) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        const newPrice = Math.max(0.01, Math.round((p.newPrice + delta) * 100) / 100);
        return { ...p, newPrice };
      }
      return p;
    }));
    setHasChanges(true);
  };

  const setPriceDirect = (productId: string, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0.01) {
      setProducts(prev => prev.map(p => {
        if (p.id === productId) {
          return { ...p, newPrice: Math.round(num * 100) / 100 };
        }
        return p;
      }));
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    if (!sellerId) return;
    
    setSaving(true);
    try {
      // Update products in the database
      for (const product of products) {
        if (product.newStock !== product.currentStock) {
          await db.updateProductStock(product.id, product.newStock);
        }
        if (product.newPrice !== product.currentPrice) {
          await db.updateProductPrice(product.id, product.newPrice);
        }
      }
      
      // Update local state
      setProducts(prev => prev.map(p => ({
        ...p,
        currentStock: p.newStock,
        currentPrice: p.newPrice
      })));
      
      setHasChanges(false);
      setNotice('Changes saved successfully');
    } catch (error) {
      console.error('Failed to save changes:', error);
      setNotice('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setProducts(prev => prev.map(p => ({
      ...p,
      newStock: p.currentStock,
      newPrice: p.currentPrice
    })));
    setHasChanges(false);
    setNotice('Changes canceled');
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4">
        <p className="text-gray-600">Loading inventory...</p>
      </div>
    );
  }

  if (!sellerId) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4">
        <p className="text-red-600">Error: No seller account found</p>
        <a href={href.products()} className="text-amazin-blue hover:underline mt-4 inline-block">
          ← Back to products
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory & Pricing</h1>
          <p className="text-sm text-gray-600">Manage your product stock and prices</p>
        </div>
        <a href={href.sellerDashboard()} className="text-amazin-blue hover:underline">
          ← Back to dashboard
        </a>
      </div>

      {notice && (
        <div className={`mb-4 p-3 rounded ${
          notice.includes('Failed') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
        }`}>
          {notice}
        </div>
      )}

      {hasChanges && (
        <div className="mb-4 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-amazin-orange hover:bg-amazin-yellow text-gray-900 font-semibold py-2 px-4 rounded disabled:bg-gray-300 disabled:text-gray-600"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded disabled:bg-gray-100 disabled:text-gray-400"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Product</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Category</th>
              <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Stock</th>
              <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Price</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.id} className="border-t">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{product.name}</div>
                  <div className="text-xs text-gray-500">{product.id}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{product.category}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => updateStock(product.id, -1)}
                      className="w-8 h-8 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={product.newStock}
                      onChange={(e) => setStockDirect(product.id, e.target.value)}
                      className="w-16 text-center border rounded py-1"
                    />
                    <button
                      onClick={() => updateStock(product.id, 1)}
                      className="w-8 h-8 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold"
                    >
                      +
                    </button>
                  </div>
                  {product.newStock !== product.currentStock && (
                    <div className="text-xs text-orange-600 text-center mt-1">
                      Was {product.currentStock}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => updatePrice(product.id, -0.01)}
                      className="w-8 h-8 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={product.newPrice}
                      onChange={(e) => setPriceDirect(product.id, e.target.value)}
                      className="w-24 text-center border rounded py-1"
                    />
                    <button
                      onClick={() => updatePrice(product.id, 0.01)}
                      className="w-8 h-8 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold"
                    >
                      +
                    </button>
                  </div>
                  {product.newPrice !== product.currentPrice && (
                    <div className="text-xs text-orange-600 text-center mt-1">
                      Was {formatMoney(product.currentPrice)}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SellerInventoryPage;
