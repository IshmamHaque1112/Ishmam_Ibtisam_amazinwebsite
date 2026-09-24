import { create } from 'zustand';
import { CartItem, CartFolder, Product } from '../types';
import {
  getCurrentUsername,
  setCurrentUsername,
  clearCurrentUsername,
  getOrCreateUserData,
  saveUserData
} from '../utils/storage';
import { isPriceLockValid } from '../utils/ratingCalculations';

interface StoreState {
  username: string | null;
  cartItems: CartItem[];
  cartFolders: CartFolder[];

  // Session
  login: (username: string) => void;
  logout: () => void;

  // Cart
  addToCart: (product: Product, folderId?: string, quantity?: number) => void;
  removeFromCart: (itemId: string) => void;
  updateCartItemQuantity: (itemId: string, quantity: number) => void;
  toggleCartItemSelection: (itemId: string) => void;
  setAllCartItemsSelected: (selected: boolean) => void;
  togglePriceLock: (itemId: string, currentPrice: number) => void;
  checkoutSelectedItems: () => CartItem[];

  // Folders
  createFolder: (name: string) => string;
  deleteFolder: (folderId: string) => void;
  moveItemToFolder: (itemId: string, folderId: string | undefined) => void;

  saveCurrentState: () => void;
}

const loadCart = (username: string | null) => {
  if (!username) return { cartItems: [], cartFolders: [] };
  const data = getOrCreateUserData(username);
  return { cartItems: data.cart.items, cartFolders: data.cart.folders };
};

const initialUsername = typeof window !== 'undefined' ? getCurrentUsername() : null;

export const useStore = create<StoreState>((set, get) => ({
  username: initialUsername,
  ...loadCart(initialUsername),

  login: (username: string) => {
    setCurrentUsername(username);
    set({ username, ...loadCart(username) });
  },

  logout: () => {
    get().saveCurrentState();
    clearCurrentUsername();
    set({ username: null, cartItems: [], cartFolders: [] });
  },

  // Guests can browse, but the cart belongs to a logged-in user.
  addToCart: (product: Product, folderId?: string, quantity = 1) => {
    const { cartItems, username } = get();
    if (!username) return;

    const existingItem = cartItems.find(
      item => item.productId === product.id && item.sellerId === product.sellerId && item.folderId === folderId
    );

    if (existingItem) {
      set({
        cartItems: cartItems.map(item =>
          item.id === existingItem.id ? { ...item, quantity: item.quantity + quantity } : item
        )
      });
    } else {
      const newItem: CartItem = {
        id: `${product.id}-${product.sellerId}-${Date.now()}`,
        productId: product.id,
        sellerId: product.sellerId,
        quantity,
        folderId,
        isSelected: true,
        priceLocked: false,
        addedAt: Date.now()
      };
      set({ cartItems: [...cartItems, newItem] });
    }
    get().saveCurrentState();
  },

  removeFromCart: (itemId: string) => {
    set({ cartItems: get().cartItems.filter(item => item.id !== itemId) });
    get().saveCurrentState();
  },

  updateCartItemQuantity: (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeFromCart(itemId);
      return;
    }
    set({
      cartItems: get().cartItems.map(item => (item.id === itemId ? { ...item, quantity } : item))
    });
    get().saveCurrentState();
  },

  toggleCartItemSelection: (itemId: string) => {
    set({
      cartItems: get().cartItems.map(item =>
        item.id === itemId ? { ...item, isSelected: !item.isSelected } : item
      )
    });
    get().saveCurrentState();
  },

  setAllCartItemsSelected: (selected: boolean) => {
    set({ cartItems: get().cartItems.map(item => ({ ...item, isSelected: selected })) });
    get().saveCurrentState();
  },

  // Locks the item at the price the shopper sees right now. An expired lock is
  // refreshed instead of being turned off.
  togglePriceLock: (itemId: string, currentPrice: number) => {
    set({
      cartItems: get().cartItems.map(item => {
        if (item.id !== itemId) return item;
        const lockStillValid =
          item.priceLocked && item.lockedTimestamp !== undefined && isPriceLockValid(item.lockedTimestamp);
        if (lockStillValid) {
          return { ...item, priceLocked: false, lockedPrice: undefined, lockedTimestamp: undefined };
        }
        return { ...item, priceLocked: true, lockedPrice: currentPrice, lockedTimestamp: Date.now() };
      })
    });
    get().saveCurrentState();
  },

  // Split checkout: only the selected items are purchased and removed.
  checkoutSelectedItems: () => {
    const { cartItems } = get();
    const purchased = cartItems.filter(item => item.isSelected);
    set({ cartItems: cartItems.filter(item => !item.isSelected) });
    get().saveCurrentState();
    return purchased;
  },

  createFolder: (name: string) => {
    const folder: CartFolder = { id: `folder-${Date.now()}`, name, createdAt: Date.now() };
    set({ cartFolders: [...get().cartFolders, folder] });
    get().saveCurrentState();
    return folder.id;
  },

  deleteFolder: (folderId: string) => {
    const { cartFolders, cartItems } = get();
    set({
      cartFolders: cartFolders.filter(folder => folder.id !== folderId),
      cartItems: cartItems.map(item => (item.folderId === folderId ? { ...item, folderId: undefined } : item))
    });
    get().saveCurrentState();
  },

  moveItemToFolder: (itemId: string, folderId: string | undefined) => {
    set({
      cartItems: get().cartItems.map(item => (item.id === itemId ? { ...item, folderId } : item))
    });
    get().saveCurrentState();
  },

  saveCurrentState: () => {
    const { username, cartItems, cartFolders } = get();
    if (username) {
      saveUserData(username, { username, cart: { items: cartItems, folders: cartFolders } });
    }
  }
}));
