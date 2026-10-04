import React from 'react';
import { href } from '../router';

const SellerDashboardPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Seller Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <a
          href={href.sellerInventory()}
          className="block bg-white border rounded-lg p-8 hover:shadow-lg transition-shadow cursor-pointer"
        >
          <div className="text-4xl mb-4">📦</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Add or remove items and change prices</h2>
          <p className="text-sm text-gray-600">Manage your product inventory and pricing</p>
        </a>
        
        <a
          href={href.sellerFeedback()}
          className="block bg-white border rounded-lg p-8 hover:shadow-lg transition-shadow cursor-pointer"
        >
          <div className="text-4xl mb-4">💬</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Respond to feedback</h2>
          <p className="text-sm text-gray-600">View and respond to customer messages</p>
        </a>
      </div>
    </div>
  );
};

export default SellerDashboardPage;
