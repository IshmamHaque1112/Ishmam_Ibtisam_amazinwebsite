import { create } from 'zustand';
import { CartItem, CartFolder, Product, SavedItem } from '../types';
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
  savedItems: SavedItem[];

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
  checkoutItems: (itemIds: string[]) => CartItem[];

  // Save for later
  saveForLater: (itemId: string, currentPrice: number) => string | null;
  moveSavedToCart: (savedId: string) => void;
  removeSavedItem: (savedId: string) => void;

  // Folders
  createFolder: (name: string) => string;
  deleteFolder: (folderId: string) => void;
  moveItemToFolder: (itemId: string, folderId: string | undefined) => void;
  moveItemToNewFolder: (itemId: string, name: string) => void;

  saveCurrentState: () => void;
}

const loadCart = (username: string | null) => {
  if (!username) return { cartItems: [], cartFolders: [], savedItems: [] };
  const data = getOrCreateUserData(username);
  return {
    cartItems: data.cart.items,
    cartFolders: data.cart.folders,
    savedItems: data.cart.saved ?? []
  };
};

const sameLine = (a: CartItem, b: CartItem) =>
  a.productId === b.productId && a.sellerId === b.sellerId && a.folderId === b.folderId;

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
    set({ username: null, cartItems: [], cartFolders: [], savedItems: [] });
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

  // Folder checkout: buys exactly these items (whether ticked or not) and
  // leaves the rest of the cart and the saved list alone.
  checkoutItems: (itemIds: string[]) => {
    const { cartItems } = get();
    const ids = new Set(itemIds);
    const purchased = cartItems.filter(item => ids.has(item.id));
    set({ cartItems: cartItems.filter(item => !ids.has(item.id)) });
    get().saveCurrentState();
    return purchased;
  },

  // Moves a cart line to the saved list. The price lock (and its 24h timer)
  // and the folder travel with it. Returns the saved item's id for Undo.
  saveForLater: (itemId: string, currentPrice: number) => {
    const { cartItems, savedItems } = get();
    const item = cartItems.find(i => i.id === itemId);
    if (!item) return null;
    const saved: SavedItem = { ...item, savedAt: Date.now(), savedPrice: currentPrice };
    set({
      cartItems: cartItems.filter(i => i.id !== itemId),
      savedItems: [saved, ...savedItems]
    });
    get().saveCurrentState();
    return saved.id;
  },

  // Brings a saved item back with the same quantity. It returns to its folder
  // if that folder still exists, and merges with a matching cart line instead
  // of creating a duplicate.
  moveSavedToCart: (savedId: string) => {
    const { cartItems, cartFolders, savedItems } = get();
    const saved = savedItems.find(i => i.id === savedId);
    if (!saved) return;
    const { savedAt: _savedAt, savedPrice: _savedPrice, ...line } = saved;
    const folderId = line.folderId && cartFolders.some(f => f.id === line.folderId) ? line.folderId : undefined;
    const restored: CartItem = { ...line, folderId, isSelected: true };
    const existing = cartItems.find(i => sameLine(i, restored));

    set({
      savedItems: savedItems.filter(i => i.id !== savedId),
      cartItems: existing
        ? cartItems.map(i => (i.id === existing.id ? { ...i, quantity: i.quantity + restored.quantity } : i))
        : [...cartItems, restored]
    });
    get().saveCurrentState();
  },

  removeSavedItem: (savedId: string) => {
    set({ savedItems: get().savedItems.filter(i => i.id !== savedId) });
    get().saveCurrentState();
  },

  createFolder: (name: string) => {
    const folder: CartFolder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      createdAt: Date.now()
    };
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

  // If the destination folder already has the same product from the same
  // seller, the quantities are combined so the folder doesn't show it twice.
  moveItemToFolder: (itemId: string, folderId: string | undefined) => {
    const { cartItems } = get();
    const item = cartItems.find(i => i.id === itemId);
    if (!item || item.folderId === folderId) return;
    const moved = { ...item, folderId };
    const existing = cartItems.find(i => i.id !== itemId && sameLine(i, moved));
    set({
      cartItems: existing
        ? cartItems
            .filter(i => i.id !== itemId)
            .map(i => (i.id === existing.id ? { ...i, quantity: i.quantity + item.quantity } : i))
        : cartItems.map(i => (i.id === itemId ? moved : i))
    });
    get().saveCurrentState();
  },

  moveItemToNewFolder: (itemId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const folderId = get().createFolder(trimmed);
    get().moveItemToFolder(itemId, folderId);
  },

  saveCurrentState: () => {
    const { username, cartItems, cartFolders, savedItems } = get();
    if (username) {
      saveUserData(username, {
        username,
        cart: { items: cartItems, folders: cartFolders, saved: savedItems }
      });
    }
  }
}));
