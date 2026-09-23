import { UserSession, CartState } from '../types';

const STORAGE_KEY_PREFIX = 'amazin_';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';

// Get current username from session
export const getCurrentUsername = (): string | null => {
  if (!isBrowser) return null;
  return sessionStorage.getItem('currentUsername');
};

// Set current username
export const setCurrentUsername = (username: string): void => {
  if (!isBrowser) return;
  sessionStorage.setItem('currentUsername', username);
};

// Clear current username
export const clearCurrentUsername = (): void => {
  if (!isBrowser) return;
  sessionStorage.removeItem('currentUsername');
};

// Get user data from localStorage
export const getUserData = (username: string): UserSession | null => {
  if (!isBrowser) return null;
  try {
    const data = localStorage.getItem(`${STORAGE_KEY_PREFIX}${username}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error reading user data:', error);
    return null;
  }
};

// Save user data to localStorage
export const saveUserData = (username: string, data: UserSession): void => {
  if (!isBrowser) return;
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${username}`, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving user data:', error);
  }
};

// Initialize new user data
export const initializeUserData = (username: string): UserSession => {
  const newData: UserSession = {
    username,
    cart: {
      items: [],
      folders: []
    }
  };
  saveUserData(username, newData);
  return newData;
};

// Get or create user data
export const getOrCreateUserData = (username: string): UserSession => {
  const existingData = getUserData(username);
  if (existingData) {
    return existingData;
  }
  return initializeUserData(username);
};

// Delete user data
export const deleteUserData = (username: string): void => {
  if (!isBrowser) return;
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${username}`);
  } catch (error) {
    console.error('Error deleting user data:', error);
  }
};

// Get all usernames (for user switching)
export const getAllUsernames = (): string[] => {
  if (!isBrowser) return [];
  try {
    const keys = Object.keys(localStorage);
    const usernames = keys
      .filter(key => key.startsWith(STORAGE_KEY_PREFIX))
      .map(key => key.replace(STORAGE_KEY_PREFIX, ''));
    return usernames;
  } catch (error) {
    console.error('Error getting usernames:', error);
    return [];
  }
};
