import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadDatabase, StoreDatabase } from './database';

const DbContext = createContext<StoreDatabase | null>(null);

export const DbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<StoreDatabase | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDatabase()
      .then(setDb)
      .catch(err => {
        console.error('Failed to load the store database:', err);
        setError('The store could not be loaded. Please refresh the page.');
      });
  }, []);

  if (error) {
    return <div className="max-w-4xl mx-auto p-8 text-red-700">{error}</div>;
  }
  if (!db) {
    return <div className="max-w-4xl mx-auto p-8 text-gray-600">Loading store…</div>;
  }
  return <DbContext.Provider value={db}>{children}</DbContext.Provider>;
};

export const useDb = (): StoreDatabase => {
  const db = useContext(DbContext);
  if (!db) throw new Error('useDb must be used inside <DbProvider>');
  return db;
};
