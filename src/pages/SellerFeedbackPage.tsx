import React from 'react';
import { href } from '../router';

const SellerFeedbackPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Customer Feedback</h1>
      <p className="text-gray-600 mb-4">View and respond to customer messages here.</p>
      <a href={href.sellerDashboard()} className="text-amazin-blue hover:underline">
        ← Back to dashboard
      </a>
    </div>
  );
};

export default SellerFeedbackPage;
