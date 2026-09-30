import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSupabaseDatabase, SupabaseDatabase } from './supabaseDatabase';

// Database interface for type safety
interface DatabaseInterface {
  getProducts(): Promise<any[]>;
  getProduct(id: string): Promise<any>;
  getProductsBySeller(sellerId: string): Promise<any[]>;
  searchProducts(search: any): Promise<any[]>;
  getCategories(): Promise<string[]>;
  getSellers(): Promise<any[]>;
  getSeller(id: string): Promise<any>;
  getSellerProductCounts(): Promise<Record<string, number>>;
  findCustomer(username: string): Promise<any>;
  registerCustomer(username: string, displayName: string): Promise<{ customer?: any; error?: string }>;
  getProductReviews(productId: string): Promise<any[]>;
  getProductTags(productId: string): Promise<any[]>;
  getProductPriceHistory(productId: string): Promise<any[]>;
  getSellerReviews(sellerId: string): Promise<any[]>;
  getSellerTags(sellerId: string): Promise<any[]>;
  getSellerReviewAverage(sellerId: string): Promise<number | null>;
  addProductReview(review: any): Promise<void>;
  addProductTag(tag: any): Promise<void>;
  addSellerReview(review: any): Promise<void>;
  addSellerTag(tag: any): Promise<void>;
}

const DbContext = createContext<DatabaseInterface | null>(null);

export const DbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<DatabaseInterface | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Use Supabase database
    try {
      const supabaseDb = getSupabaseDatabase();
      setDb(supabaseDb);
    } catch (err) {
      console.error('Failed to initialize Supabase database:', err);
      setError('The store could not be loaded. Please check your Supabase configuration.');
    }
  }, []);

  if (error) {
    return <div className="max-w-4xl mx-auto p-8 text-red-700">{error}</div>;
  }
  if (!db) {
    return <div className="max-w-4xl mx-auto p-8 text-gray-600">Loading store…</div>;
  }
  return <DbContext.Provider value={db}>{children}</DbContext.Provider>;
};

export const useDb = (): DatabaseInterface => {
  const db = useContext(DbContext);
  if (!db) throw new Error('useDb must be used inside <DbProvider>');
  return db;
};
