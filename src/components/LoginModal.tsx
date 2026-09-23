import React, { useState } from 'react';
import { useStore } from '../context/store';

const LoginModal: React.FC = () => {
  const { loginModalOpen, setLoginModalOpen, setUsername, getAvailableUsers } = useStore();
  const [username, setUsernameInput] = useState('');
  const [availableUsers, setAvailableUsers] = useState<string[]>([]);

  React.useEffect(() => {
    if (loginModalOpen) {
      setAvailableUsers(getAvailableUsers());
    }
  }, [loginModalOpen, getAvailableUsers]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      setUsername(username.trim());
      setUsernameInput('');
    }
  };

  const handleUserSelect = (selectedUsername: string) => {
    setUsername(selectedUsername);
  };

  if (!loginModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Amazin</h2>
        <p className="text-gray-600 mb-6">Enter Username to Start Shopping</p>
        
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="mb-4">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsernameInput(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amazin-orange focus:border-transparent"
              placeholder="Enter your username"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!username.trim()}
            className="w-full bg-amazin-orange hover:bg-amazin-yellow text-white font-semibold py-2 px-4 rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Start Shopping
          </button>
        </form>

        {availableUsers.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Existing Users:</p>
            <div className="space-y-2">
              {availableUsers.map((user) => (
                <button
                  key={user}
                  onClick={() => handleUserSelect(user)}
                  className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors text-sm"
                >
                  {user}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginModal;
