import { create } from 'zustand';
import { CartItem, CartFolder, Product, Seller } from '../types';
import {
  getCurrentUsername,
  setCurrentUsername,
  clearCurrentUsername,
  getOrCreateUserData,
  saveUserData,
  getAllUsernames
} from '../utils/storage';
import { isPriceLockValid } from '../utils/ratingCalculations';

interface StoreState {
  username: string | null;
  cartItems: CartItem[];
  cartFolders: CartFolder[];
  currentView: 'products' | 'cart';
  loginModalOpen: boolean;

  // Actions
  setUsername: (username: string) => void;
  logout: () => void;
  switchUser: (username: string) => void;
  addToCart: (product: Product, seller: Seller, folderId?: string) => void;
  removeFromCart: (itemId: string) => void;
  updateCartItemQuantity: (itemId: string, quantity: number) => void;
  toggleCartItemSelection: (itemId: string) => void;
  setAllCartItemsSelected: (selected: boolean) => void;
  togglePriceLock: (itemId: string, currentPrice: number) => void;
  checkoutSelectedItems: () => CartItem[];
  createFolder: (name: string) => void;
  deleteFolder: (folderId: string) => void;
  moveItemToFolder: (itemId: string, folderId: string | undefined) => void;
  setCurrentView: (view: 'products' | 'cart') => void;
  setLoginModalOpen: (open: boolean) => void;
  loadUserData: (username: string) => void;
  saveCurrentState: () => void;
  getAvailableUsers: () => string[];
}

export const useStore = create<StoreState>((set, get) => ({
  username: getCurrentUsername(),
  cartItems: [],
  cartFolders: [],
  currentView: 'products',
  loginModalOpen: false,

  setUsername: (username: string) => {
    setCurrentUsername(username);
    const userData = getOrCreateUserData(username);
    set({
      username,
      cartItems: userData.cart.items,
      cartFolders: userData.cart.folders,
      loginModalOpen: false
    });
  },

  logout: () => {
    const { username } = get();
    if (username) {
      // Save current state before logging out
      get().saveCurrentState();
    }
    clearCurrentUsername();
    set({
      username: null,
      cartItems: [],
      cartFolders: [],
      loginModalOpen: true
    });
  },

  switchUser: (username: string) => {
    const { saveCurrentState } = get();
    saveCurrentState();
    get().setUsername(username);
  },

  addToCart: (product: Product, seller: Seller, folderId?: string) => {
    const { cartItems } = get();

    // Check if item already exists in cart
    const existingItem = cartItems.find(
      item => item.productId === product.id && item.sellerId === seller.id && item.folderId === folderId
    );

    if (existingItem) {
      set({
        cartItems: cartItems.map(item =>
          item.id === existingItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      });
    } else {
      const newItem: CartItem = {
        id: `${product.id}-${seller.id}-${Date.now()}`,
        productId: product.id,
        sellerId: seller.id,
        quantity: 1,
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
    const { cartItems } = get();
    set({
      cartItems: cartItems.filter(item => item.id !== itemId)
    });
    get().saveCurrentState();
  },

  updateCartItemQuantity: (itemId: string, quantity: number) => {
    const { cartItems } = get();
    if (quantity <= 0) {
      get().removeFromCart(itemId);
      return;
    }
    set({
      cartItems: cartItems.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      )
    });
    get().saveCurrentState();
  },

  toggleCartItemSelection: (itemId: string) => {
    const { cartItems } = get();
    set({
      cartItems: cartItems.map(item =>
        item.id === itemId ? { ...item, isSelected: !item.isSelected } : item
      )
    });
    get().saveCurrentState();
  },

  setAllCartItemsSelected: (selected: boolean) => {
    const { cartItems } = get();
    set({
      cartItems: cartItems.map(item => ({ ...item, isSelected: selected }))
    });
    get().saveCurrentState();
  },

  // Locks the item at the price the shopper sees right now. Previously the lock
  // only stored a timestamp and never the price, so locking had no effect.
  // An expired lock is refreshed instead of being turned off.
  togglePriceLock: (itemId: string, currentPrice: number) => {
    const { cartItems } = get();
    set({
      cartItems: cartItems.map(item => {
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

  // Split checkout: only the selected items are "purchased" and removed from
  // the cart. Unselected items stay in the cart for later.
  checkoutSelectedItems: () => {
    const { cartItems } = get();
    const purchased = cartItems.filter(item => item.isSelected);
    set({
      cartItems: cartItems.filter(item => !item.isSelected)
    });
    get().saveCurrentState();
    return purchased;
  },

  createFolder: (name: string) => {
    const { cartFolders } = get();
    const newFolder: CartFolder = {
      id: `folder-${Date.now()}`,
      name,
      createdAt: Date.now()
    };
    set({ cartFolders: [...cartFolders, newFolder] });
    get().saveCurrentState();
  },

  deleteFolder: (folderId: string) => {
    const { cartFolders, cartItems } = get();
    set({
      cartFolders: cartFolders.filter(folder => folder.id !== folderId),
      cartItems: cartItems.map(item =>
        item.folderId === folderId ? { ...item, folderId: undefined } : item
      )
    });
    get().saveCurrentState();
  },

  moveItemToFolder: (itemId: string, folderId: string | undefined) => {
    const { cartItems } = get();
    set({
      cartItems: cartItems.map(item =>
        item.id === itemId ? { ...item, folderId } : item
      )
    });
    get().saveCurrentState();
  },

  setCurrentView: (view: 'products' | 'cart') => {
    set({ currentView: view });
  },

  setLoginModalOpen: (open: boolean) => {
    set({ loginModalOpen: open });
  },

  loadUserData: (username: string) => {
    const userData = getOrCreateUserData(username);
    set({
      username,
      cartItems: userData.cart.items,
      cartFolders: userData.cart.folders
    });
  },

  saveCurrentState: () => {
    const { username, cartItems, cartFolders } = get();
    if (username) {
      saveUserData(username, {
        username,
        cart: {
          items: cartItems,
          folders: cartFolders
        }
      });
    }
  },

  getAvailableUsers: () => {
    return getAllUsernames();
  }
}));

// Initialize store on app load
export const initializeStore = () => {
  const username = getCurrentUsername();
  if (username) {
    const store = useStore.getState();
    store.loadUserData(username);
  } else {
    useStore.setState({ loginModalOpen: true });
  }
};
