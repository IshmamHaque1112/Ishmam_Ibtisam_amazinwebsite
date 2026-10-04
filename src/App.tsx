import React, { useEffect, useRef } from 'react';
import { DbProvider } from './db/DbProvider';
import { useStore } from './context/store';
import { href, useRoute, wasQuietNavigation } from './router';
import Header from './components/Header';
import CartView from './components/CartView';
import ProductsPage from './pages/ProductsPage';
import ProductPage from './pages/ProductPage';
import SellersPage from './pages/SellersPage';
import SellerPage from './pages/SellerPage';
import SearchPage from './pages/SearchPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import HomePage from './pages/HomePage';
import AccountPage from './pages/AccountPage';
import SellerDashboardPage from './pages/SellerDashboardPage';
import SellerInventoryPage from './pages/SellerInventoryPage';
import SellerFeedbackPage from './pages/SellerFeedbackPage';
import FeedbackChatPage from './pages/FeedbackChatPage';

function App() {
  const route = useRoute();
  const { username } = useStore();
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  // After in-app navigation, move keyboard and screen reader focus to the new
  // page content instead of leaving it on the link that was clicked.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (wasQuietNavigation()) return;
    mainRef.current?.focus({ preventScroll: true });
  }, [route]);

  const page = (() => {
    switch (route.name) {
      case 'home':
        return <HomePage />;
      case 'products':
        return <ProductsPage params={route.params} />;
      case 'product':
        return <ProductPage key={route.id} id={route.id} params={route.params} />;
      case 'sellers':
        return <SellersPage />;
      case 'seller':
        return <SellerPage key={route.id} id={route.id} params={route.params} />;
      case 'search':
        return <SearchPage params={route.params} />;
      case 'login':
        return <LoginPage key={route.params.toString()} params={route.params} />;
      case 'cart':
        // The cart belongs to a logged-in user; guests are sent to log in first.
        return username ? <CartView /> : <LoginPage params={new URLSearchParams({ next: href.cart() })} />;
      case 'account':
        return username ? <AccountPage /> : <LoginPage params={new URLSearchParams({ next: href.account() })} />;
      case 'sellerDashboard':
        return username ? <SellerDashboardPage /> : <LoginPage params={new URLSearchParams({ next: href.sellerDashboard() })} />;
      case 'sellerInventory':
        return username ? <SellerInventoryPage /> : <LoginPage params={new URLSearchParams({ next: href.sellerInventory() })} />;
      case 'sellerFeedback':
        return username ? <SellerFeedbackPage /> : <LoginPage params={new URLSearchParams({ next: href.sellerFeedback() })} />;
      case 'feedbackChat': {
        const nextFeedback = route.threadId
          ? href.feedbackChat(route.threadId)
          : route.params.get('seller')
            ? href.startFeedback(route.params.get('seller')!, route.params.get('product') ?? undefined)
            : href.feedbackChat();
        return username ? <FeedbackChatPage threadId={route.threadId} params={route.params} /> : <LoginPage params={new URLSearchParams({ next: nextFeedback })} />;
      }
      default:
        return <NotFoundPage />;
    }
  })();

  return (
    <DbProvider>
      <div className="min-h-screen bg-gray-100">
        <button
          type="button"
          onClick={() => mainRef.current?.focus()}
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-gray-900 focus:shadow"
        >
          Skip to main content
        </button>
        <Header route={route} />
        <main ref={mainRef} tabIndex={-1} className="focus:outline-none">
          {page}
        </main>
      </div>
    </DbProvider>
  );
}

export default App;
