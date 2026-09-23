import React, { useState } from 'react';
import { useStore } from '../context/store';

const Header: React.FC = () => {
  const { username, logout, switchUser, currentView, setCurrentView, cartItems, getAvailableUsers } = useStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSwitchUser, setShowSwitchUser] = useState(false);

  const selectedItemsCount = cartItems.filter(item => item.isSelected).length;
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleSwitchUser = (selectedUsername: string) => {
    switchUser(selectedUsername);
    setShowSwitchUser(false);
    setShowUserMenu(false);
  };

  return (
    <header className="bg-amazin-dark text-white">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="text-2xl font-bold text-amazin-orange">amazin</div>
          </div>

          {/* Navigation */}
          <nav className="flex items-center space-x-6">
            <button
              onClick={() => setCurrentView('products')}
              className={`text-sm hover:text-amazin-orange transition-colors ${
                currentView === 'products' ? 'text-amazin-orange font-semibold' : 'text-gray-300'
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setCurrentView('cart')}
              className={`text-sm hover:text-amazin-orange transition-colors flex items-center ${
                currentView === 'cart' ? 'text-amazin-orange font-semibold' : 'text-gray-300'
              }`}
            >
              Cart
              {selectedItemsCount > 0 && (
                <span className="ml-2 bg-amazin-orange text-white text-xs px-2 py-1 rounded-full">
                  {selectedItemsCount}
                </span>
              )}
            </button>
          </nav>

          {/* User Section */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 text-sm hover:text-amazin-orange transition-colors"
            >
              <div className="text-right">
                <div className="text-xs text-gray-400">Hello, {username || 'Guest'}</div>
                <div className="font-semibold">Account & Lists</div>
              </div>
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-lg">👤</span>
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl text-gray-900 z-50">
                <div className="p-4 border-b">
                  <div className="font-semibold">Logged in as {username}</div>
                  <div className="text-sm text-gray-500">{totalItems} items in cart</div>
                </div>
                <div className="p-2">
                  <button
                    onClick={() => {
                      setShowSwitchUser(!showSwitchUser);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-md transition-colors text-sm"
                  >
                    Switch User
                  </button>
                  {showSwitchUser && (
                    <div className="mt-2 pl-4 border-l-2 border-gray-200">
                      {getAvailableUsers().filter(u => u !== username).map((user) => (
                        <button
                          key={user}
                          onClick={() => handleSwitchUser(user)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-md transition-colors text-sm text-gray-600"
                        >
                          {user}
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-md transition-colors text-sm text-red-600"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
