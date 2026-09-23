export interface PriceHistoryPoint {
  date: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  currentPrice: number;
  priceHistory: PriceHistoryPoint[];
  baseRating: number;
  qualityScore: number;
  returnRate: number;
  image: string;
  category: string;
}

export interface Seller {
  id: string;
  name: string;
  qualityScore: number;
  deliverySpeed: number;
  relativePrice: number;
  isPrime: boolean;
}

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

export interface ProductRating {
  score: number;
  badge: string;
  factors: {
    priceStability: number;
    qualityInput: number;
    returnRateImpact: number;
  };
}

export interface SellerRating {
  score: number;
  badge: string;
  factors: {
    priceCompetitiveness: number;
    qualityScore: number;
    deliverySpeed: number;
  };
}
