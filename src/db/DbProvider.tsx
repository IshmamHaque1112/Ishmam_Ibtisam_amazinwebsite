import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadStoreData, StoreData } from './storeData';

// Loads the store data once (Supabase when configured, bundled CSV otherwise)
// and gives every page synchronous access to it through useDb().

const DbContext = createContext<StoreData | null>(null);

export const DbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<StoreData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadStoreData()
      .then(store => {
        if (cancelled) return;
        setDb(store);
      })
      .catch(err => {
        console.error('Failed to load the store data:', err);
        if (!cancelled) setError('The store could not be loaded. Please refresh the page.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <div className="max-w-4xl mx-auto p-8 text-red-700">{error}</div>;
  }
  if (!db) {
    return <div className="max-w-4xl mx-auto p-8 text-gray-600">Loading store…</div>;
  }
  return <DbContext.Provider value={db}>{children}</DbContext.Provider>;
};

export const useDb = (): StoreData => {
  const db = useContext(DbContext);
  if (!db) throw new Error('useDb must be used inside <DbProvider>');
  return db;
};
