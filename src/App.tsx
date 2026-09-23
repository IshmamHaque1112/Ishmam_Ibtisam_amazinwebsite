import React, { useEffect } from 'react';
import { useStore } from './context/store';
import { initializeStore } from './context/store';
import Header from './components/Header';
import LoginModal from './components/LoginModal';
import ProductList from './components/ProductList';
import CartView from './components/CartView';

function App() {
  const { currentView, username } = useStore();

  useEffect(() => {
    // Only initialize in browser environment
    if (typeof window !== 'undefined') {
      initializeStore();
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <LoginModal />
      {username && <Header />}
      
      <main className={username ? '' : 'pt-8'}>
        {username ? (
          currentView === 'products' ? (
            <ProductList />
          ) : (
            <CartView />
          )
        ) : (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <div className="text-6xl mb-4">🛒</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Amazin</h2>
              <p className="text-gray-600">Please log in to start shopping</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
