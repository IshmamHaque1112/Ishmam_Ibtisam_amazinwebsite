import React, { useState } from 'react';
import { useDb } from '../db/DbProvider';
import { USERNAME_PATTERN, normalizeUsername, validatePassword, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from '../db/storeData';
import { useStore } from '../context/store';
import { href, navigate, safeNext, useDocumentTitle } from '../router';

interface LoginPageProps {
  params: URLSearchParams;
}

type Mode = 'login' | 'register' | 'setup';
type LoginType = 'shopper' | 'seller';

const LoginPage: React.FC<LoginPageProps> = ({ params }) => {
  const db = useDb();
  const { username: current, login, logout } = useStore();
  const [mode, setMode] = useState<Mode>('login');
  const [loginType, setLoginType] = useState<LoginType>('shopper');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const next = safeNext(params.get('next'));
  const cartRedirect = next === href.cart();
  useDocumentTitle(mode === 'login' ? 'Log in' : mode === 'setup' ? 'Set a password' : 'Create an account');

  const finish = async (name: string) => {
    await login(name);
    // Route sellers to their dashboard, shoppers to the normal next or products
    const customer = await db.findCustomer(name);
    if (customer?.role === 'seller') {
      navigate(href.sellerDashboard());
    } else {
      navigate(next);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const customer = await db.findCustomer(username);
      if (!customer) {
        setError(`No account found for "${normalizeUsername(username)}". You can create one below.`);
        setMode('register');
        return;
      }
      
      // Check role matches login type
      if (loginType === 'seller' && customer.role !== 'seller') {
        setError(`"${normalizeUsername(username)}" is not a seller account. Try the "I'm shopping" tab.`);
        return;
      }
      if (loginType === 'shopper' && customer.role === 'seller') {
        setError(`"${normalizeUsername(username)}" is a seller account. Try the "I'm a seller" tab.`);
        return;
      }
      
      // Demo catalog accounts created before passwords existed won't have
      // one set in this browser/data source yet - see db.needsPasswordSetup.
      if (db.needsPasswordSetup(customer.username)) {
        setMode('setup');
        return;
      }
      const result = await db.verifyPassword(customer.username, password);
      if (!result.ok) {
        setError(result.error ?? 'Incorrect username or password.');
        return;
      }
      await finish(customer.username);
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
      const result = await db.registerCustomer(username, displayName, password);
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

  // Only reachable for a username that already exists as a customer and has
  // no password in this data source yet (see db.needsPasswordSetup) - not a
  // general "forgot password" bypass.
  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await db.setPassword(username, password);
      if (!result.ok) {
        setError(result.error ?? 'Could not set a password. Please try again.');
        return;
      }
      await finish(normalizeUsername(username));
    } catch {
      setError('Could not set a password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (to: Mode) => {
    setMode(to);
    setError(null);
    setPassword('');
  };

  const input = 'w-full min-h-11 px-3 py-2 border border-gray-500 rounded';
  const normalized = normalizeUsername(username);
  const validUsername = USERNAME_PATTERN.test(normalized);
  const showUsernameHint = mode === 'register' && username.trim() !== '' && !validUsername;
  const passwordError = password.trim() !== '' ? validatePassword(password) : null;
  const showPasswordHint = mode !== 'login' && password.trim() !== '' && passwordError;
  const validPassword = password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH;

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <div className="bg-white border rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {mode === 'login' ? 'Log in' : mode === 'setup' ? 'Set a password' : 'Create an account'}
        </h1>
        
        {mode === 'login' && (
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setLoginType('shopper')}
              className={`flex-1 py-2 px-4 rounded font-medium ${
                loginType === 'shopper'
                  ? 'bg-amazin-orange text-gray-900'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              I'm shopping
            </button>
            <button
              type="button"
              onClick={() => setLoginType('seller')}
              className={`flex-1 py-2 px-4 rounded font-medium ${
                loginType === 'seller'
                  ? 'bg-amazin-orange text-gray-900'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              I'm a seller
            </button>
          </div>
        )}
        
        <p className="text-sm text-gray-600 mb-4">
          {mode === 'setup' ? (
            <>This account doesn't have a password set yet. Choose one to finish logging in as <strong>{normalized}</strong>.</>
          ) : cartRedirect ? (
            'Log in to see your cart. You can keep browsing as a guest without an account.'
          ) : loginType === 'seller' ? (
            'Log in as a seller to manage your inventory and respond to customer feedback.'
          ) : (
            'Log in with your username and password to use the cart, see your orders and post reviews. Browsing is open to everyone.'
          )}
        </p>

        {current && (
          <div className="text-sm bg-blue-50 text-blue-900 rounded p-3 mb-4 flex items-center justify-between gap-2">
            <span>
              You're logged in as <strong>{current}</strong>. Log in below to switch accounts.
            </span>
            <button
              type="button"
              onClick={async () => {
                await db.signOut();
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

        <form
          onSubmit={mode === 'login' ? handleLogin : mode === 'setup' ? handleSetup : handleRegister}
          className="space-y-4"
          noValidate
        >
          {mode === 'setup' ? (
            // Username is already confirmed to exist by this point (see
            // handleLogin) - shown read-only rather than re-editable.
            <div>
              <span className="block text-sm font-medium text-gray-700">Username</span>
              <p className="mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-gray-700">{normalized}</p>
            </div>
          ) : (
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
          )}

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

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={`${input} mt-1`}
              placeholder={mode === 'login' ? 'Your password' : `${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters`}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              autoFocus={mode === 'setup'}
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              aria-invalid={Boolean(showPasswordHint)}
              aria-describedby="login-password-hint"
            />
            {mode !== 'login' && (
              <p id="login-password-hint" className={`text-xs mt-1 ${showPasswordHint ? 'text-red-800' : 'text-gray-600'}`}>
                {PASSWORD_MIN_LENGTH}-{PASSWORD_MAX_LENGTH} characters.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={
              loading ||
              (mode === 'login'
                ? !username.trim() || !password
                : mode === 'setup'
                ? !validPassword
                : !validUsername || !displayName.trim() || !validPassword)
            }
            className="w-full bg-amazin-orange hover:bg-amazin-yellow text-gray-900 font-semibold py-2 rounded disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : mode === 'setup' ? 'Set password & log in' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-4 text-center">
          {mode === 'login' && loginType === 'shopper' && (
            <>
              New to Amazin?{' '}
              <button type="button" className="text-amazin-blue hover:underline" onClick={() => switchMode('register')}>
                Create an account
              </button>
            </>
          )}
          {mode === 'login' && loginType === 'seller' && (
            <span className="text-gray-500">
              Seller accounts are pre-provisioned. Contact your administrator if you need access.
            </span>
          )}
          {mode === 'register' && (
            <>
              Already have an account?{' '}
              <button type="button" className="text-amazin-blue hover:underline" onClick={() => switchMode('login')}>
                Log in
              </button>
            </>
          )}
          {mode === 'setup' && (
            <button type="button" className="text-amazin-blue hover:underline" onClick={() => switchMode('login')}>
              Not {normalized}? Go back
            </button>
          )}
        </p>
        {mode !== 'setup' && (
          <p className="text-xs text-gray-600 mt-3 border-t pt-3">
            This is a demo store - please don't reuse a password from somewhere else.
            {' '}Try <strong>ava.nguyen</strong> to look around (ask the site owner for the demo password).
          </p>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
