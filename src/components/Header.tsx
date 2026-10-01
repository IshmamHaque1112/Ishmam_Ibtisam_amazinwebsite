import React, { useState } from 'react';
import { useStore } from '../context/store';
import { href, Route } from '../router';
import { CartIcon, KeyIcon, SearchIcon } from './Icons';
import SearchBar from './SearchBar';
import logoMark from '../assets/logo-mark.png';

interface HeaderProps {
  route: Route;
}

const Header: React.FC<HeaderProps> = ({ route }) => {
  const { username, cartItems } = useStore();
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

  const iconButton = 'p-2.5 rounded hover:bg-white/10 hover:text-amazin-orange relative inline-flex';

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-amazin-dark text-white">
        <div className="max-w-7xl mx-auto px-4 py-2 md:h-16 flex flex-wrap md:grid md:grid-cols-[1fr_auto_1fr] items-center justify-between gap-x-2 gap-y-1">
          {/* Left: logo + brand */}
          <a href={href.home()} className="flex items-center gap-2 justify-self-start" aria-label="Amazin home">
            <span className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden">
              <img src={logoMark} alt="" className="w-[120px] h-[80px] max-w-none object-contain" />
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

            {/* Logged in: opens the account page (orders, log out).
                Previously this icon logged the shopper out with one click. */}
            <a
              href={username ? href.account() : href.login()}
              className={`${iconButton} flex items-center gap-1 ${route.name === 'account' ? 'text-amazin-orange' : ''}`}
              aria-label={username ? `Your account and orders (${username})` : 'Log in'}
              aria-current={route.name === 'account' ? 'page' : undefined}
              title={username ? `Logged in as ${username}` : 'Log in'}
            >
              <KeyIcon />
              {username && (
                <span className="hidden sm:inline text-xs text-gray-200 max-w-[120px] truncate">{username}</span>
              )}
            </a>

            <a
              href={username ? href.cart() : href.login(href.cart())}
              className={`${iconButton} ${route.name === 'cart' ? 'text-amazin-orange' : ''}`}
              aria-label={username ? `Cart, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}` : 'Cart (log in to view)'}
              aria-current={route.name === 'cart' ? 'page' : undefined}
              title="Cart"
            >
              <CartIcon />
              {cartCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -top-0.5 -right-0.5 bg-amazin-orange text-amazin-dark text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center"
                >
                  {cartCount}
                </span>
              )}
            </a>
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
