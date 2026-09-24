import React from 'react';
import { DbProvider } from './db/DbProvider';
import { useStore } from './context/store';
import { href, useRoute } from './router';
import Header from './components/Header';
import CartView from './components/CartView';
import ProductsPage from './pages/ProductsPage';
import ProductPage from './pages/ProductPage';
import SellersPage from './pages/SellersPage';
import SellerPage from './pages/SellerPage';
import SearchPage from './pages/SearchPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  const route = useRoute();
  const { username } = useStore();

  const page = (() => {
    switch (route.name) {
      case 'products':
        return <ProductsPage />;
      case 'product':
        return <ProductPage key={route.id} id={route.id} />;
      case 'sellers':
        return <SellersPage />;
      case 'seller':
        return <SellerPage key={route.id} id={route.id} />;
      case 'search':
        return <SearchPage params={route.params} />;
      case 'login':
        return <LoginPage key={route.params.toString()} params={route.params} />;
      case 'cart':
        // The cart belongs to a logged-in user; guests are sent to log in first.
        return username ? <CartView /> : <LoginPage params={new URLSearchParams({ next: href.cart() })} />;
      default:
        return <NotFoundPage />;
    }
  })();

  return (
    <DbProvider>
      <div className="min-h-screen bg-gray-100">
        <Header route={route} />
        <main>{page}</main>
      </div>
    </DbProvider>
  );
}

export default App;
