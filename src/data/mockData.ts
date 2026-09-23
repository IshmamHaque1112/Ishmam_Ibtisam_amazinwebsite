import { Product, Seller } from '../types';

// Helper function to generate 30-day price history
const generatePriceHistory = (basePrice: number, volatility: number = 0.1) => {
  const history = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Add some random volatility
    const randomChange = (Math.random() - 0.5) * 2 * volatility * basePrice;
    const price = Math.max(basePrice * 0.7, basePrice + randomChange);
    
    history.push({
      date: date.toISOString().split('T')[0],
      price: Math.round(price * 100) / 100
    });
  }
  
  return history;
};

export const mockProducts: Product[] = [
  {
    id: 'p1',
    name: 'Wireless Bluetooth Headphones',
    description: 'Premium noise-cancelling headphones with 30-hour battery life',
    basePrice: 79.99,
    currentPrice: 64.99,
    priceHistory: generatePriceHistory(79.99, 0.15),
    baseRating: 4.2,
    qualityScore: 85,
    returnRate: 8,
    image: 'https://via.placeholder.com/300x300/FF9900/FFFFFF?text=Headphones',
    category: 'Electronics'
  },
  {
    id: 'p2',
    name: 'Organic Coffee Beans (2lb)',
    description: 'Fair trade Arabica coffee beans, medium roast',
    basePrice: 24.99,
    currentPrice: 22.99,
    priceHistory: generatePriceHistory(24.99, 0.08),
    baseRating: 4.5,
    qualityScore: 92,
    returnRate: 3,
    image: 'https://via.placeholder.com/300x300/8B4513/FFFFFF?text=Coffee',
    category: 'Pantry'
  },
  {
    id: 'p3',
    name: 'Smart Home Security Camera',
    description: '1080p HD camera with night vision and motion detection',
    basePrice: 49.99,
    currentPrice: 39.99,
    priceHistory: generatePriceHistory(49.99, 0.2),
    baseRating: 3.8,
    qualityScore: 78,
    returnRate: 12,
    image: 'https://via.placeholder.com/300x300/232F3E/FFFFFF?text=Camera',
    category: 'Electronics'
  },
  {
    id: 'p4',
    name: 'Stainless Steel Water Bottle',
    description: 'Insulated 32oz water bottle, keeps drinks cold for 24 hours',
    basePrice: 19.99,
    currentPrice: 17.99,
    priceHistory: generatePriceHistory(19.99, 0.05),
    baseRating: 4.6,
    qualityScore: 95,
    returnRate: 2,
    image: 'https://via.placeholder.com/300x300/007185/FFFFFF?text=Bottle',
    category: 'Pantry'
  },
  {
    id: 'p5',
    name: 'Mechanical Gaming Keyboard',
    description: 'RGB backlit keyboard with Cherry MX switches',
    basePrice: 89.99,
    currentPrice: 79.99,
    priceHistory: generatePriceHistory(89.99, 0.12),
    baseRating: 4.3,
    qualityScore: 88,
    returnRate: 6,
    image: 'https://via.placeholder.com/300x300/FF9900/FFFFFF?text=Keyboard',
    category: 'Electronics'
  },
  {
    id: 'p6',
    name: 'Laundry Detergent (100oz)',
    description: 'Concentrated liquid detergent, 64 loads',
    basePrice: 14.99,
    currentPrice: 12.99,
    priceHistory: generatePriceHistory(14.99, 0.06),
    baseRating: 4.4,
    qualityScore: 90,
    returnRate: 4,
    image: 'https://via.placeholder.com/300x300/37475A/FFFFFF?text=Detergent',
    category: 'Pantry'
  },
  {
    id: 'p7',
    name: 'Wireless Mouse',
    description: 'Ergonomic mouse with adjustable DPI and silent clicks',
    basePrice: 29.99,
    currentPrice: 24.99,
    priceHistory: generatePriceHistory(29.99, 0.1),
    baseRating: 4.1,
    qualityScore: 82,
    returnRate: 7,
    image: 'https://via.placeholder.com/300x300/FF9900/FFFFFF?text=Mouse',
    category: 'Electronics'
  },
  {
    id: 'p8',
    name: 'Olive Oil (500ml)',
    description: 'Extra virgin cold-pressed olive oil from Italy',
    basePrice: 18.99,
    currentPrice: 16.99,
    priceHistory: generatePriceHistory(18.99, 0.07),
    baseRating: 4.7,
    qualityScore: 94,
    returnRate: 2,
    image: 'https://via.placeholder.com/300x300/F0C14B/FFFFFF?text=Olive+Oil',
    category: 'Pantry'
  },
  {
    id: 'p9',
    name: 'USB-C Hub Adapter',
    description: '7-in-1 hub with HDMI, USB 3.0, and SD card reader',
    basePrice: 34.99,
    currentPrice: 29.99,
    priceHistory: generatePriceHistory(34.99, 0.18),
    baseRating: 3.9,
    qualityScore: 76,
    returnRate: 11,
    image: 'https://via.placeholder.com/300x300/232F3E/FFFFFF?text=USB+Hub',
    category: 'Electronics'
  },
  {
    id: 'p10',
    name: 'Whole Grain Pasta (6-pack)',
    description: 'Organic whole wheat pasta, variety pack',
    basePrice: 15.99,
    currentPrice: 13.99,
    priceHistory: generatePriceHistory(15.99, 0.04),
    baseRating: 4.5,
    qualityScore: 91,
    returnRate: 3,
    image: 'https://via.placeholder.com/300x300/F0C14B/FFFFFF?text=Pasta',
    category: 'Pantry'
  },
  {
    id: 'p11',
    name: 'Portable Phone Charger',
    description: '10000mAh power bank with fast charging',
    basePrice: 24.99,
    currentPrice: 19.99,
    priceHistory: generatePriceHistory(24.99, 0.14),
    baseRating: 4.0,
    qualityScore: 80,
    returnRate: 9,
    image: 'https://via.placeholder.com/300x300/007185/FFFFFF?text=Power+Bank',
    category: 'Electronics'
  },
  {
    id: 'p12',
    name: 'Canned Tomatoes (12-pack)',
    description: 'Organic diced tomatoes, BPA-free cans',
    basePrice: 21.99,
    currentPrice: 18.99,
    priceHistory: generatePriceHistory(21.99, 0.05),
    baseRating: 4.6,
    qualityScore: 93,
    returnRate: 2,
    image: 'https://via.placeholder.com/300x300/FF6347/FFFFFF?text=Tomatoes',
    category: 'Pantry'
  }
];

export const mockSellers: Seller[] = [
  {
    id: 's1',
    name: 'Amazon',
    qualityScore: 95,
    deliverySpeed: 95,
    relativePrice: 1.0,
    isPrime: true
  },
  {
    id: 's2',
    name: 'TechDirect Inc',
    qualityScore: 82,
    deliverySpeed: 78,
    relativePrice: 0.85,
    isPrime: true
  },
  {
    id: 's3',
    name: 'ValueMart',
    qualityScore: 75,
    deliverySpeed: 65,
    relativePrice: 0.7,
    isPrime: false
  },
  {
    id: 's4',
    name: 'PrimeElectronics',
    qualityScore: 88,
    deliverySpeed: 90,
    relativePrice: 0.92,
    isPrime: true
  },
  {
    id: 's5',
    name: 'BudgetDeals',
    qualityScore: 68,
    deliverySpeed: 60,
    relativePrice: 0.65,
    isPrime: false
  },
  {
    id: 's6',
    name: 'OrganicFoods Co',
    qualityScore: 92,
    deliverySpeed: 85,
    relativePrice: 1.05,
    isPrime: true
  }
];

// Helper to get seller for a product
export const getSellersForProduct = (productId: string): Seller[] => {
  // Assign different sellers to different products
  const sellerMap: Record<string, string[]> = {
    'p1': ['s1', 's2', 's4'],
    'p2': ['s1', 's6'],
    'p3': ['s1', 's2', 's5'],
    'p4': ['s1', 's3'],
    'p5': ['s1', 's2', 's4'],
    'p6': ['s1', 's3'],
    'p7': ['s1', 's2', 's5'],
    'p8': ['s1', 's6'],
    'p9': ['s1', 's2', 's5'],
    'p10': ['s1', 's6'],
    'p11': ['s1', 's2', 's4'],
    'p12': ['s1', 's6']
  };
  
  const sellerIds = sellerMap[productId] || ['s1'];
  return sellerIds.map(id => mockSellers.find(s => s.id === id)!).filter(Boolean);
};
