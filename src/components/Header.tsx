import React, { useState } from 'react';
import { useStore } from '../context/store';
import { href, Route } from '../router';
import { CartIcon, KeyIcon, SearchIcon } from './Icons';
import SearchBar from './SearchBar';

interface HeaderProps {
  route: Route;
}

const Header: React.FC<HeaderProps> = ({ route }) => {
  const { username, cartItems, logout } = useStore();
  const [searchOpen, setSearchOpen] = useState(route.name === 'search');

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const navLink = (label: string, to: string, active: boolean) => (
    <a
      href={to}
      className={`px-3 py-2 rounded text-sm font-medium hover:text-amazin-orange ${
        active ? 'text-amazin-orange' : 'text-gray-200'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      {label}
    </a>
  );

  const iconButton = 'p-2 rounded hover:bg-white/10 hover:text-amazin-orange relative';

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-amazin-dark text-white">
        <div className="max-w-7xl mx-auto px-4 py-2 md:h-16 flex flex-wrap md:grid md:grid-cols-[1fr_auto_1fr] items-center justify-between gap-x-2 gap-y-1">
          {/* Left: logo + brand */}
          <a href={href.products()} className="flex items-center gap-2 justify-self-start" aria-label="Amazin home">
            <span className="w-9 h-9 rounded-full bg-amazin-orange text-amazin-dark font-bold flex items-center justify-center">
              a
            </span>
            <span className="brand-cursive text-2xl text-white">Amazin</span>
          </a>

          {/* Middle: main sections */}
          <nav className="order-last md:order-none w-full md:w-auto flex items-center justify-center gap-1" aria-label="Main">
            {navLink('Products', href.products(), route.name === 'products' || route.name === 'product')}
            {navLink('3rd party sellers', href.sellers(), route.name === 'sellers' || route.name === 'seller')}
          </nav>

          {/* Right: search, login, cart */}
          <div className="flex items-center gap-1 justify-self-end">
            <button
              type="button"
              className={`${iconButton} ${searchOpen ? 'text-amazin-orange' : ''}`}
              onClick={() => setSearchOpen(open => !open)}
              aria-label={searchOpen ? 'Hide search' : 'Search products'}
              aria-expanded={searchOpen}
              title="Search"
            >
              <SearchIcon />
            </button>

            <button
              type="button"
              onClick={async () => {
                if (username) {
                  await logout();
                  window.location.hash = href.products();
                } else {
                  window.location.hash = href.login();
                }
              }}
              className={`${iconButton} flex items-center gap-1`}
              aria-label={username ? `Account: ${username}` : 'Log in'}
              title={username ? `Logged in as ${username} - click to logout` : 'Log in'}
            >
              <KeyIcon />
              {username && (
                <span className="hidden sm:inline text-xs text-gray-300 max-w-[120px] truncate">{username}</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (username) {
                  window.location.hash = href.cart();
                } else {
                  window.location.hash = href.login(href.cart());
                }
              }}
              className={iconButton}
              aria-label={`Cart, ${cartCount} items`}
              title="Cart"
            >
              <CartIcon />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-amazin-orange text-amazin-dark text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {searchOpen && (
        <SearchBar
          initial={route.name === 'search' ? route.params : undefined}
        />
      )}
    </header>
  );
};

export default Header;
