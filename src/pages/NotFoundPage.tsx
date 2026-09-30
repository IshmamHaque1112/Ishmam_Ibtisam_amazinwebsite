import React from 'react';
import { href, useDocumentTitle } from '../router';

const NotFoundPage: React.FC<{ message?: string }> = ({ message = "We couldn't find that page." }) => {
  useDocumentTitle('Page not found');
  return (
    <div className="max-w-3xl mx-auto py-16 px-4 text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
      <p className="text-gray-700 mb-4">{message}</p>
      <div className="flex flex-wrap justify-center gap-4">
        <a href={href.products()} className="text-amazin-blue hover:underline">Browse all products</a>
        <a href={href.home()} className="text-amazin-blue hover:underline">Go to the home page</a>
      </div>
    </div>
  );
};

export default NotFoundPage;
