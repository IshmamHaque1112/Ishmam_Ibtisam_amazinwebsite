import React, { useState } from 'react';
import { useDb } from '../db/DbProvider';
import { useStore } from '../context/store';
import { href, navigate } from '../router';

// Username validation pattern
const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;
const normalizeUsername = (username: string) => username.trim().toLowerCase();

interface LoginPageProps {
  params: URLSearchParams;
}

// Only allow redirects back into this app (hash routes), never to other sites.
const safeNext = (next: string | null) => (next && next.startsWith('#/') && !next.startsWith('#/login') ? next : href.products());

const LoginPage: React.FC<LoginPageProps> = ({ params }) => {
  const db = useDb();
  const { username: current, login, logout } = useStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const next = safeNext(params.get('next'));
  const cartRedirect = next === href.cart();

  const finish = async (name: string, pwd?: string) => {
    setLoading(true);
    try {
      await login(name, pwd);
      navigate(next);
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const customer = await db.findCustomer(username);
      if (customer) {
        await finish(customer.username, password);
      } else {
        setError(`No account found for "${normalizeUsername(username)}". You can create one below.`);
        setMode('register');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const result = await db.registerCustomer(username, displayName);
      if (result.error || !result.customer) {
        setError(result.error ?? 'Something went wrong. Please try again.');
        return;
      }
      // Note: In a real app, you'd want to handle the generated password properly
      // For now, we'll just log in with the username
      await finish(result.customer.username);
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const input = 'w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-amazin-orange focus:border-transparent';
  const validUsername = USERNAME_PATTERN.test(normalizeUsername(username));

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <div className="bg-white border rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {mode === 'login' ? 'Log in' : 'Create an account'}
        </h1>
        <p className="text-sm text-gray-600 mb-4">
          {cartRedirect
            ? 'Log in to see your cart. You can keep browsing as a guest without an account.'
            : 'Log in with your username to add items to your cart. Browsing is open to everyone.'}
        </p>

        {current && (
          <div className="text-sm bg-blue-50 text-blue-900 rounded p-3 mb-4 flex items-center justify-between gap-2">
            <span>
              You're logged in as <strong>{current}</strong>. Log in below to switch accounts.
            </span>
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate(href.products());
              }}
              className="text-sm border border-blue-300 bg-white hover:bg-blue-100 rounded px-3 py-1 flex-shrink-0"
            >
              Log out
            </button>
          </div>
        )}

        {error && (
          <p className="text-sm bg-red-50 text-red-800 rounded p-2 mb-4" role="alert">{error}</p>
        )}

        <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Username
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className={`${input} mt-1`}
              placeholder="e.g. ava.nguyen"
              autoComplete="username"
              autoFocus
              maxLength={30}
            />
          </label>

          {mode === 'login' && (
            <label className="block text-sm font-medium text-gray-700">
              Password
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={`${input} mt-1`}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </label>
          )}

          {mode === 'register' && (
            <label className="block text-sm font-medium text-gray-700">
              Display name
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className={`${input} mt-1`}
                placeholder="e.g. Ava Nguyen"
                maxLength={60}
              />
            </label>
          )}

          <button
            type="submit"
            disabled={loading || (mode === 'login' ? !username.trim() : !validUsername || !displayName.trim())}
            className="w-full bg-amazin-orange hover:bg-amazin-yellow text-white font-semibold py-2 rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : (mode === 'login' ? 'Log in' : 'Create account')}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-4 text-center">
          {mode === 'login' ? (
            <>
              New to Amazin?{' '}
              <button type="button" className="text-amazin-blue hover:underline" onClick={() => { setMode('register'); setError(null); }}>
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button type="button" className="text-amazin-blue hover:underline" onClick={() => { setMode('login'); setError(null); }}>
                Log in
              </button>
            </>
          )}
        </p>
        {mode === 'register' && (
          <p className="text-xs text-gray-500 mt-2">
            Usernames are 3-30 characters: letters, numbers, dots, dashes or underscores. A password will be generated automatically.
          </p>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
