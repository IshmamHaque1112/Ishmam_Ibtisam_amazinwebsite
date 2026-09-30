import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadStoreData, StoreData } from './storeData';

// Loads the store data once (Supabase when configured, bundled CSV otherwise)
// and gives every page synchronous access to it through useDb().

const DbContext = createContext<StoreData | null>(null);
// Bumped after every write (new review, tag or account). useDb() reads it, so
// pages re-render with the new data instead of reloading the whole site.
const DbVersionContext = createContext(0);

export const DbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<StoreData | null>(null);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadStoreData()
      .then(store => {
        if (cancelled) return;
        store.setOnChange(() => setVersion(v => v + 1));
        setDb(store);
      })
      .catch(err => {
        console.error('Failed to load the store data:', err);
        if (!cancelled) setError('The store could not be loaded.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-red-800" role="alert">
        <p>{error}</p>
        {/* The failed load is cached, so a full reload is the real retry. */}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-3 rounded bg-amazin-orange px-4 py-2 font-semibold text-gray-900 hover:bg-amazin-yellow"
        >
          Try again
        </button>
      </div>
    );
  }
  if (!db) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-gray-700" role="status">
        Loading store…
      </div>
    );
  }
  return (
    <DbContext.Provider value={db}>
      <DbVersionContext.Provider value={version}>{children}</DbVersionContext.Provider>
    </DbContext.Provider>
  );
};

export const useDb = (): StoreData => {
  const db = useContext(DbContext);
  useContext(DbVersionContext);
  if (!db) throw new Error('useDb must be used inside <DbProvider>');
  return db;
};
