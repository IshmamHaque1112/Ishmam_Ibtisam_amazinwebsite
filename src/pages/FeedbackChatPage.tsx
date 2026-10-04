import React from 'react';
import { href } from '../router';

const FeedbackChatPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Messages</h1>
      <p className="text-gray-600 mb-4">Your conversations with sellers will appear here.</p>
      <a href={href.products()} className="text-amazin-blue hover:underline">
        ← Back to products
      </a>
    </div>
  );
};

export default FeedbackChatPage;
