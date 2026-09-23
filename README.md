# Amazon Marketplace - Transparent Shopping Platform

A modern, transparent Amazon-style marketplace web app with advanced cart management, dynamic pricing, and quality ratings.

## 🚀 Features

### 🔐 Username-Only Authentication
- Simple username-based login system (no password required)
- All cart data, custom folders, and price locks are scoped to username
- Session-based authentication with localStorage persistence
- Easy user switching between multiple accounts

### 📁 Custom Cart Folders
- Create custom-named cart folders (e.g., "Pantry", "School Supplies")
- Organize cart items into collapsible folder groups
- Folder-level subtotals for better budget management
- Move items between folders or remove folder organization

### 🛒 Split Checkout System
- Select individual cart items with checkboxes
- Dynamic "Active Subtotal" based on selected items only
- Itemized charges breakdown:
  - Active Subtotal
  - Est. Tax (8.875%)
  - Est. Shipping (FREE for orders ≥$35, otherwise $5.99)
  - Grand Total calculation

### 📊 Dual Dynamic Rating Systems

#### Product Dynamic Rating (0-100)
- **Factors:**
  - Base customer rating (0-5 stars)
  - 30-day price stability analysis
  - Quality score from recent user feedback
  - Return rate impact
- **Badges:** "🔥 High Value & Top Quality", "📈 Price Spiked", "✨ Good Value", etc.

#### Seller Dynamic Rating (0-100)
- **Factors:**
  - Price competitiveness vs. catalog average
  - Seller quality score
  - Delivery speed rating
- **Badges:** "🔥 Top Value", "⚠️ Cheap but Risky", "👍 Good Choice", etc.

### 🔒 24-Hour Price Lock
- Lock current unit price for 24 hours with one click
- Live countdown timer showing remaining lock time
- Automatic price adjustment if catalog price drops
- Visual indicators for locked vs. unlocked items

## 🛠️ Tech Stack

- **Framework:** React 18+ with TypeScript
- **Styling:** Tailwind CSS
- **State Management:** Zustand with localStorage persistence
- **Build Tool:** Vite
- **Hosting:** Vercel-ready

## 📦 Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🚀 Deployment to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Vercel will automatically detect the Vite configuration
4. Deploy with default settings

The `vercel.json` configuration file is included for optimal Vercel deployment.

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── CartItem.tsx    # Individual cart item with price lock
│   ├── CartFolder.tsx  # Collapsible folder groups
│   ├── CartView.tsx    # Main cart with split checkout
│   ├── Header.tsx      # Navigation and user menu
│   ├── LoginModal.tsx  # Username-only authentication
│   ├── ProductCard.tsx # Product display with ratings
│   └── ProductList.tsx # Product grid with filters
├── context/            # State management
│   └── store.ts        # Zustand store with localStorage
├── data/               # Mock data
│   └── mockData.ts     # Products, sellers, price history
├── types/              # TypeScript types
│   └── index.ts        # All type definitions
├── utils/              # Utility functions
│   ├── ratingCalculations.ts  # Rating algorithms
│   └── storage.ts             # localStorage helpers
├── App.tsx             # Main application component
├── main.tsx            # Application entry point
└── index.css           # Global styles
```

## 🎨 Key Features Explained

### Username Scoping
All user data is stored in localStorage with the pattern:
```
amazon_marketplace_{username} → {
  username: string,
  cart: {
    items: CartItem[],
    folders: CartFolder[]
  }
}
```

### Price Lock Mechanism
- Locks current price with timestamp
- Countdown updates every minute
- Automatically adjusts to lower catalog prices
- Expires after 24 hours

### Rating Calculations

**Product Score Formula:**
```
Score = (BaseRating × 20) + (PriceStability × 0.25) + (QualityScore × 0.3) + (ReturnRateImpact × 0.25)
```

**Seller Score Formula:**
```
Score = (PriceCompetitiveness × 0.35) + (QualityScore × 0.4) + (DeliverySpeed × 0.25)
```

## 🧪 Mock Data

The app includes 12 products with:
- 30-day price history arrays
- Quality ratings (0-100)
- Return rates
- Multiple 3rd-party sellers per product

## 📱 Responsive Design

Fully responsive layout that works on:
- Desktop (4-column product grid)
- Tablet (2-3 columns)
- Mobile (1-2 columns)

## 🔒 Security Notes

- No sensitive data stored (username only)
- Client-side only architecture
- No API keys required
- localStorage for persistence (not for sensitive data)

## 📄 License

This is a prototype project for educational purposes.

## 🤝 Contributing

This is a prototype project. Feel free to fork and modify for your own use cases.
