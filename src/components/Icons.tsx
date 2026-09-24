import React from 'react';

interface IconProps {
  className?: string;
}

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
  'aria-hidden': true
};

export const SearchIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg {...base} className={className}>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const KeyIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg {...base} className={className}>
    <circle cx="7.5" cy="15.5" r="4.5" />
    <path d="M10.7 12.3 21 2" />
    <path d="m16 7 3 3" />
    <path d="m19 4 2 2" />
  </svg>
);

export const CartIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg {...base} className={className}>
    <circle cx="9" cy="20" r="1.5" />
    <circle cx="18" cy="20" r="1.5" />
    <path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h8.1a2 2 0 0 0 2-1.5L22 7H6" />
  </svg>
);

const CATEGORY_EMOJI: Record<string, string> = {
  Groceries: '🛒',
  'School Supplies': '✏️',
  Medicine: '💊',
  Kitchenware: '🍳',
  Appliances: '🔌',
  'Outdoor & Garden': '🌿',
  'Tabletop Games': '🎲',
  Electronics: '🎧',
  'Home Decor': '🛋️',
  'Auto Parts': '🚗'
};

// The datasets have no product photos, so each product shows its category icon.
export const CategoryIcon: React.FC<{ category: string; className?: string }> = ({
  category,
  className = 'w-12 h-12 text-2xl'
}) => (
  <div
    className={`${className} bg-gray-100 rounded flex items-center justify-center flex-shrink-0`}
    role="img"
    aria-label={category}
  >
    {CATEGORY_EMOJI[category] ?? '📦'}
  </div>
);

export const Stars: React.FC<{ rating: number }> = ({ rating }) => (
  <span className="text-amazin-orange" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
    {'★'.repeat(Math.round(rating))}
    <span className="text-gray-300">{'★'.repeat(5 - Math.round(rating))}</span>
    <span className="text-gray-600 text-xs ml-1">{rating.toFixed(1)}</span>
  </span>
);
