import React from 'react';
import { href } from '../router';

const NotFoundPage: React.FC<{ message?: string }> = ({ message = "We couldn't find that page." }) => (
  <div className="max-w-3xl mx-auto py-16 px-4 text-center">
    <p className="text-gray-700 mb-4">{message}</p>
    <a href={href.products()} className="text-amazin-blue hover:underline">Browse all products</a>
  </div>
);

export default NotFoundPage;
