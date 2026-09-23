import { create } from 'zustand';
import { CartItem, CartFolder, Product, Seller } from '../types';
import { 
  getCurrentUsername, 
  setCurrentUsername, 
  clearCurrentUsername,
  getOrCreateUserData,
  saveUserData,
  getAllUsernames,
  deleteUserData
} from '../utils/storage';

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
  togglePriceLock: (itemId: string) => void;
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
  loginModalOpen: getCurrentUsername() === null,

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

  togglePriceLock: (itemId: string) => {
    const { cartItems } = get();
    set({
      cartItems: cartItems.map(item => {
        if (item.id === itemId) {
          if (item.priceLocked) {
            return { ...item, priceLocked: false, lockedPrice: undefined, lockedTimestamp: undefined };
          } else {
            return { ...item, priceLocked: true, lockedTimestamp: Date.now() };
          }
        }
        return item;
      })
    });
    get().saveCurrentState();
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
  // Only initialize in browser environment
  if (typeof window === 'undefined') return;
  
  const username = getCurrentUsername();
  if (username) {
    const store = useStore.getState();
    store.loadUserData(username);
  } else {
    useStore.setState({ loginModalOpen: true });
  }
};
