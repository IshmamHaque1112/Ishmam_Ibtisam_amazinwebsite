import { create } from 'zustand';
import { CartItem, CartFolder, Order, Product, SavedItem, Seller } from '../types';
import {
  getCurrentUsername,
  setCurrentUsername,
  clearCurrentUsername,
  getOrCreateUserData,
  saveUserData,
  userStorageKey
} from '../utils/storage';
import { isPriceLockValid } from '../utils/ratingCalculations';
import { clampQuantity, MAX_QUANTITY } from '../utils/cartPricing';
import { buildOrder, newOrderId, splitReorderable } from '../utils/orders';
import {
  findFolderByName,
  moveItem,
  newFolderId,
  organizeByCategory as organizeItemsByCategory,
  sameLine,
  selectOnlyFolder as selectOnly,
  setFolderSelection
} from '../utils/cartFolders';

interface StoreState {
  username: string | null;
  cartItems: CartItem[];
  cartFolders: CartFolder[];
  savedItems: SavedItem[];
  orders: Order[];
  // When on, items added without a folder go into a folder named after
  // their category.
  autoCategoryFolders: boolean;
  // Set when the browser refused to save (storage full or blocked).
  storageError: boolean;

  // Session. Password verification happens before this is called (see
  // LoginPage) - by the time login() runs, the password has already been
  // checked via db.verifyPassword(). This only sets the local session state.
  login: (username: string) => Promise<void>;
  logout: () => Promise<void>;

  // Cart. addToCart returns how many units were actually added (0 when the
  // line is already at MAX_QUANTITY).
  addToCart: (product: Product, folderId?: string, quantity?: number) => number;
  removeFromCart: (itemId: string) => void;
  updateCartItemQuantity: (itemId: string, quantity: number) => void;
  toggleCartItemSelection: (itemId: string) => void;
  setAllCartItemsSelected: (selected: boolean) => void;
  // Folder selection (folderId undefined = Unassigned items)
  setFolderSelected: (folderId: string | undefined, selected: boolean) => void;
  selectOnlyFolder: (folderId: string | undefined) => void;
  togglePriceLock: (itemId: string, currentPrice: number) => void;
  checkoutSelectedItems: () => CartItem[];
  checkoutItems: (itemIds: string[]) => CartItem[];

  // Orders (demo checkout, no payment)
  placeOrder: (itemIds: string[], products: Product[], sellers: Seller[], folderName?: string) => Order | null;
  buyAgain: (orderId: string, products: Product[]) => { added: number; unavailable: number };

  // Save for later
  saveForLater: (itemId: string, currentPrice: number) => string | null;
  moveSavedToCart: (savedId: string) => void;
  removeSavedItem: (savedId: string) => void;

  // Folders
  createFolder: (name: string) => string;
  deleteFolder: (folderId: string) => void;
  moveItemToFolder: (itemId: string, folderId: string | undefined) => void;
  moveItemToNewFolder: (itemId: string, name: string) => void;
  organizeByCategory: (products: Product[]) => number;
  setAutoCategoryFolders: (on: boolean) => void;

  saveCurrentState: () => void;
}

const loadCart = (username: string | null) => {
  if (!username) return { cartItems: [], cartFolders: [], savedItems: [], orders: [], autoCategoryFolders: false };
  const data = getOrCreateUserData(username);
  return {
    cartItems: data.cart.items,
    cartFolders: data.cart.folders,
    savedItems: data.cart.saved ?? [],
    orders: data.orders ?? [],
    autoCategoryFolders: data.settings?.autoCategoryFolders ?? false
  };
};

const initialUsername = typeof window !== 'undefined' ? getCurrentUsername() : null;

export const useStore = create<StoreState>((set, get) => ({
  username: initialUsername,
  ...loadCart(initialUsername),
  storageError: false,

  // By the time this runs, LoginPage has already called db.verifyPassword()
  // and only calls this on success. This just records the session locally.
  login: async (username: string) => {
    setCurrentUsername(username);
    set({ username, ...loadCart(username) });
  },

  logout: async () => {
    get().saveCurrentState();
    clearCurrentUsername();
    set({ username: null, cartItems: [], cartFolders: [], savedItems: [], orders: [], autoCategoryFolders: false });
  },

  // Guests can browse, but the cart belongs to a logged-in user.
  addToCart: (product: Product, requestedFolderId?: string, quantity = 1) => {
    const { cartItems, username, autoCategoryFolders, cartFolders } = get();
    if (!username) return 0;

    // With auto category folders on, an item added without a folder goes to
    // the folder named after its category (created if needed).
    let folderId = requestedFolderId;
    if (!folderId && autoCategoryFolders) {
      const existingFolder = findFolderByName(cartFolders, product.category);
      folderId = existingFolder ? existingFolder.id : get().createFolder(product.category);
    }

    const existingItem = cartItems.find(
      item => item.productId === product.id && item.sellerId === product.sellerId && item.folderId === folderId
    );

    let added: number;
    if (existingItem) {
      const nextQuantity = Math.min(MAX_QUANTITY, existingItem.quantity + quantity);
      added = Math.max(0, nextQuantity - existingItem.quantity);
      if (added === 0) return 0;
      set({
        cartItems: cartItems.map(item =>
          item.id === existingItem.id ? { ...item, quantity: nextQuantity } : item
        )
      });
    } else {
      added = clampQuantity(quantity);
      const newItem: CartItem = {
        id: `${product.id}-${product.sellerId}-${Date.now()}`,
        productId: product.id,
        sellerId: product.sellerId,
        quantity: added,
        folderId,
        isSelected: true,
        priceLocked: false,
        addedAt: Date.now()
      };
      set({ cartItems: [...cartItems, newItem] });
    }
    get().saveCurrentState();
    return added;
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
      cartItems: get().cartItems.map(item =>
        item.id === itemId ? { ...item, quantity: Math.min(MAX_QUANTITY, Math.floor(quantity)) } : item
      )
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

  setFolderSelected: (folderId: string | undefined, selected: boolean) => {
    set({ cartItems: setFolderSelection(get().cartItems, folderId, selected) });
    get().saveCurrentState();
  },

  selectOnlyFolder: (folderId: string | undefined) => {
    set({ cartItems: selectOnly(get().cartItems, folderId) });
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

  // Records a demo order for these cart lines, then removes them from the
  // cart. No payment is taken. Returns null if none of the lines could be
  // priced (for example, the products were removed from the catalog).
  placeOrder: (itemIds: string[], products: Product[], sellers: Seller[], folderName?: string) => {
    const { cartItems, orders } = get();
    const ids = new Set(itemIds);
    const lines = cartItems.filter(item => ids.has(item.id));
    const now = Date.now();
    const order = buildOrder(lines, products, sellers, { id: newOrderId(now), placedAt: now, folderName });
    if (!order) return null;
    set({
      cartItems: cartItems.filter(item => !ids.has(item.id)),
      orders: [order, ...orders]
    });
    get().saveCurrentState();
    return order;
  },

  // Adds the lines of a past order back to the cart at today's prices.
  buyAgain: (orderId: string, products: Product[]) => {
    const order = get().orders.find(o => o.id === orderId);
    if (!order) return { added: 0, unavailable: 0 };
    const { available, unavailable } = splitReorderable(order, products);
    let added = 0;
    for (const { line, product } of available) {
      added += get().addToCart(product, undefined, line.quantity);
    }
    return { added, unavailable: unavailable.length };
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
        ? cartItems.map(i =>
            i.id === existing.id ? { ...i, quantity: clampQuantity(i.quantity + restored.quantity) } : i
          )
        : [...cartItems, restored]
    });
    get().saveCurrentState();
  },

  removeSavedItem: (savedId: string) => {
    set({ savedItems: get().savedItems.filter(i => i.id !== savedId) });
    get().saveCurrentState();
  },

  // Creating a folder with a name that already exists returns the existing
  // folder instead of making a duplicate.
  createFolder: (name: string) => {
    const trimmed = name.trim().slice(0, 40);
    const existing = findFolderByName(get().cartFolders, trimmed);
    if (existing) return existing.id;
    const folder: CartFolder = { id: newFolderId(), name: trimmed, createdAt: Date.now() };
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
    set({ cartItems: moveItem(get().cartItems, itemId, folderId) });
    get().saveCurrentState();
  },

  moveItemToNewFolder: (itemId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const folderId = get().createFolder(trimmed);
    get().moveItemToFolder(itemId, folderId);
  },

  // Files every unassigned item into a folder named after its category.
  // Returns how many items moved.
  organizeByCategory: (products: Product[]) => {
    const { cartItems, cartFolders } = get();
    const result = organizeItemsByCategory(cartItems, cartFolders, products);
    if (result.moved === 0) return 0;
    set({ cartItems: result.items, cartFolders: result.folders });
    get().saveCurrentState();
    return result.moved;
  },

  setAutoCategoryFolders: (on: boolean) => {
    set({ autoCategoryFolders: on });
    get().saveCurrentState();
  },

  saveCurrentState: () => {
    const { username, cartItems, cartFolders, savedItems, orders, autoCategoryFolders, storageError } = get();
    if (username) {
      const saved = saveUserData(username, {
        username,
        cart: { items: cartItems, folders: cartFolders, saved: savedItems },
        orders,
        settings: { autoCategoryFolders }
      });
      if (saved === storageError) set({ storageError: !saved });
    }
  }
}));

// Keep the cart in step when the same account changes it in another tab.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    const { username } = useStore.getState();
    if (username && event.key === userStorageKey(username)) {
      useStore.setState(loadCart(username));
    }
  });
}
