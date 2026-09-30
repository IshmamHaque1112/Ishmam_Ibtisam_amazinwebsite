import React, { useState } from 'react';
import { useDb } from '../db/DbProvider';
import { USERNAME_PATTERN, normalizeUsername } from '../db/storeData';
import { useStore } from '../context/store';
import { href, navigate, safeNext, useDocumentTitle } from '../router';

interface LoginPageProps {
  params: URLSearchParams;
}

// Prototype sign-in: a username is all that's needed. There are no
// passwords yet, so the page says so plainly instead of showing a password
// box that doesn't check anything.
const LoginPage: React.FC<LoginPageProps> = ({ params }) => {
  const db = useDb();
  const { username: current, login, logout } = useStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const next = safeNext(params.get('next'));
  const cartRedirect = next === href.cart();
  useDocumentTitle(mode === 'login' ? 'Log in' : 'Create an account');

  const finish = async (name: string) => {
    await login(name);
    navigate(next);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const customer = await db.findCustomer(username);
      if (customer) {
        await finish(customer.username);
      } else {
        setError(`No account found for "${normalizeUsername(username)}". You can create one below.`);
        setMode('register');
      }
    } catch {
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
      await finish(result.customer.username);
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (to: 'login' | 'register') => {
    setMode(to);
    setError(null);
  };

  const input = 'w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-amazin-orange focus:border-transparent';
  const normalized = normalizeUsername(username);
  const validUsername = USERNAME_PATTERN.test(normalized);
  const showUsernameHint = mode === 'register' && username.trim() !== '' && !validUsername;

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <div className="bg-white border rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {mode === 'login' ? 'Log in' : 'Create an account'}
        </h1>
        <p className="text-sm text-gray-600 mb-4">
          {cartRedirect
            ? 'Log in to see your cart. You can keep browsing as a guest without an account.'
            : 'Log in with your username to use the cart, see your orders and post reviews. Browsing is open to everyone.'}
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

        <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4" noValidate>
          <div>
            <label htmlFor="login-username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className={`${input} mt-1`}
              placeholder="e.g. ava.nguyen"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
              maxLength={30}
              aria-invalid={showUsernameHint}
              aria-describedby="login-username-hint"
            />
            <p id="login-username-hint" className={`text-xs mt-1 ${showUsernameHint ? 'text-red-800' : 'text-gray-600'}`}>
              3-30 characters: letters, numbers, dots, dashes or underscores.
            </p>
          </div>

          {mode === 'register' && (
            <div>
              <label htmlFor="login-display-name" className="block text-sm font-medium text-gray-700">
                Display name
              </label>
              <input
                id="login-display-name"
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className={`${input} mt-1`}
                placeholder="e.g. Ava Nguyen"
                autoComplete="name"
                maxLength={60}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (mode === 'login' ? !username.trim() : !validUsername || !displayName.trim())}
            className="w-full bg-amazin-orange hover:bg-amazin-yellow text-gray-900 font-semibold py-2 rounded disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-4 text-center">
          {mode === 'login' ? (
            <>
              New to Amazin?{' '}
              <button type="button" className="text-amazin-blue hover:underline" onClick={() => switchMode('register')}>
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button type="button" className="text-amazin-blue hover:underline" onClick={() => switchMode('login')}>
                Log in
              </button>
            </>
          )}
        </p>
        <p className="text-xs text-gray-600 mt-3 border-t pt-3">
          Demo accounts use a username only. There are no passwords yet, so don't use this site for anything
          private. Try <strong>ava.nguyen</strong> to look around.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
