import { UserSession } from '../types';

const STORAGE_KEY_PREFIX = 'amazon_marketplace_';

// localStorage key holding one user's cart, saved items and orders.
export const userStorageKey = (username: string): string => `${STORAGE_KEY_PREFIX}${username}`;

// Browser storage can be unavailable (private mode, blocked site data), so
// every access is guarded.

export const getCurrentUsername = (): string | null => {
  try {
    return sessionStorage.getItem('currentUsername');
  } catch {
    return null;
  }
};

export const setCurrentUsername = (username: string): void => {
  try {
    sessionStorage.setItem('currentUsername', username);
  } catch (error) {
    console.error('Error saving session:', error);
  }
};

export const clearCurrentUsername = (): void => {
  try {
    sessionStorage.removeItem('currentUsername');
  } catch (error) {
    console.error('Error clearing session:', error);
  }
};

export const getUserData = (username: string): UserSession | null => {
  try {
    const data = localStorage.getItem(userStorageKey(username));
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error reading user data:', error);
    return null;
  }
};

// Returns false when the browser refused the write (storage full or blocked),
// so callers can tell the shopper their changes won't survive a reload.
export const saveUserData = (username: string, data: UserSession): boolean => {
  try {
    localStorage.setItem(userStorageKey(username), JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving user data:', error);
    return false;
  }
};

export const getOrCreateUserData = (username: string): UserSession => {
  const existing = getUserData(username);
  if (existing) return existing;
  const fresh: UserSession = { username, cart: { items: [], folders: [] } };
  saveUserData(username, fresh);
  return fresh;
};
