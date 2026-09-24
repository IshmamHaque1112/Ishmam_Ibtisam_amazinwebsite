// Rows loaded from the SQLite database (seeded from src/data/*.csv)

export interface Product {
  id: string;
  name: string;
  category: string;
  currentPrice: number;
  allTimeLowPrice: number;
  thirtyDayHighPrice: number;
  storeRecommended: boolean;
  rating: number; // 0-5 customer rating
  sellerId: string;
  sellerName: string;
}

export interface Seller {
  id: string;
  name: string;
  returnPolicy: string;
  sourceOfSupply: string;
  yearsActive: number;
  priceRating: number; // 0-5
  qualityRating: number; // 0-5
  deliveryTimeRating: number; // 0-5
  overallRating: number; // 0-5
  priceLockEligible: boolean;
}

export interface Customer {
  id: string;
  username: string;
  displayName: string;
  joinDate: string;
  accountType: string;
  favoriteCategory: string | null;
}

export interface ProductSearch {
  text?: string;
  minPrice?: number;
  maxPrice?: number;
  category?: string;
  sellerId?: string;
}

// Cart (kept per username in localStorage)

export interface CartItem {
  id: string;
  productId: string;
  sellerId: string;
  quantity: number;
  folderId?: string;
  isSelected: boolean;
  priceLocked: boolean;
  lockedPrice?: number;
  lockedTimestamp?: number;
  addedAt: number;
}

export interface CartFolder {
  id: string;
  name: string;
  createdAt: number;
}

export interface CartState {
  items: CartItem[];
  folders: CartFolder[];
}

export interface UserSession {
  username: string;
  cart: CartState;
}

// Ratings

export interface ProductRating {
  score: number; // 0-100
  badge: string;
  factors: {
    customerRating: number; // 0-100
    dealScore: number; // 0-100, how close today's price is to the all-time low
    sellerScore: number; // 0-100
  };
}

export interface SellerRating {
  score: number; // 0-100
  badge: string;
  factors: {
    price: number;
    quality: number;
    delivery: number;
  };
}
