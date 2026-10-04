import React from 'react';
import logoVelvetAndThread from '../assets/seller-logos/velvet_and_thread.png';
import logoWonderbox from '../assets/seller-logos/wonderbox.png';
import logoPetHaven from '../assets/seller-logos/pet_haven.png';
import logoLuminaJewelry from '../assets/seller-logos/lumina_jewelry.png';
import logoChronoTimepieces from '../assets/seller-logos/chrono_timepieces.png';
import logoTerraGardens from '../assets/seller-logos/terra_gardens.png';
import logoGearAndGadgets from '../assets/seller-logos/gear_and_gadgets.png';
import logoVoyageLuggage from '../assets/seller-logos/voyage_luggage.png';
import logoModernWorkspace from '../assets/seller-logos/modern_workspace.png';
import logoPixelGear from '../assets/seller-logos/pixel_gear.png';
import logoBabyNest from '../assets/seller-logos/baby_nest.png';
import logoAudioCore from '../assets/seller-logos/audio_core.png';
import logoSolarOptics from '../assets/seller-logos/solar_optics.png';
import logoInkAndPagePress from '../assets/seller-logos/ink_and_page_press.png';
import logoUrbanPantry from '../assets/seller-logos/urban_pantry.png';
import logoVanguardAthletics from '../assets/seller-logos/vanguard_athletics.png';
import logoNestAndHaven from '../assets/seller-logos/nest_and_haven.png';
import logoNutritionPlus from '../assets/seller-logos/nutrition_plus.png';
import logoVitalityLabs from '../assets/seller-logos/vitality_labs.png';
import logoApexTech from '../assets/seller-logos/apex_tech.png';
import logoCraftAndCreation from '../assets/seller-logos/craft_and_creation.png';
import logoLumenOutdoors from '../assets/seller-logos/lumen_outdoors.png';
import logoAuraBotanicals from '../assets/seller-logos/aura_botanicals.png';
import logoTorqueMotors from '../assets/seller-logos/torque_motors.png';
import logoArtisanHarvest from '../assets/seller-logos/artisan_harvest.png';
import categoryElectronics from '../assets/categories/electronics.png';
import categoryKitchenware from '../assets/categories/kitchenware.png';
import categoryAppliances from '../assets/categories/appliances.png';
import categoryOutdoorGarden from '../assets/categories/outdoor-garden.png';
import categoryTabletopGames from '../assets/categories/tabletop-games.png';
import categoryMedicine from '../assets/categories/medicine.png';
import categoryAutoParts from '../assets/categories/auto-parts.png';
import categoryGroceries from '../assets/categories/groceries.png';
import categorySchoolSupplies from '../assets/categories/school-supplies.png';

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

export const ChatIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg {...base} className={className}>
    <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
  </svg>
);

// Real stock photos for 9 of the 10 catalog categories. "Home Decor" has no
// matching photo yet (the provided set had no home-decor-specific image) and
// falls back to an initials tile below. "Appliances" reuses the Home & Kitchen
// photo since it's the closest conceptual match and no distinct art exists
// for it.
const CATEGORY_IMAGE: Record<string, string> = {
  Electronics: categoryElectronics,
  Kitchenware: categoryKitchenware,
  Appliances: categoryAppliances,
  'Outdoor & Garden': categoryOutdoorGarden,
  'Tabletop Games': categoryTabletopGames,
  Medicine: categoryMedicine,
  'Auto Parts': categoryAutoParts,
  Groceries: categoryGroceries,
  'School Supplies': categorySchoolSupplies
};

// The datasets have no per-product photos, so each product shows art for its
// category instead, falling back to an initials tile (never an emoji) where no
// photo exists yet. The art is decorative: the product name and category are
// always written right next to it, so screen readers skip the image
// (WCAG 1.1.1) instead of announcing the category twice.
const initials = (category: string) =>
  category
    .split(/[\s&]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0].toUpperCase())
    .join('');

export const CategoryIcon: React.FC<{ category: string; className?: string }> = ({
  category,
  className = 'w-12 h-12'
}) => {
  const image = CATEGORY_IMAGE[category];
  if (image) {
    return (
      <div className={`${className} rounded overflow-hidden flex-shrink-0`} aria-hidden="true">
        <img src={image} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div
      className={`${className} bg-blue-50 text-blue-800 text-sm font-semibold rounded flex items-center justify-center flex-shrink-0`}
      aria-hidden="true"
    >
      {initials(category) || '?'}
    </div>
  );
};

// Decorative badge art for each of the 25 sellers. The source logos each had
// a specific brand name baked in that didn't match any real seller name, so
// these were cropped down to just the icon glyph (no text) — that sidesteps
// any "logo says one company, page says another" mismatch entirely.
const SELLER_LOGO: Record<string, string> = {
  S001: logoVelvetAndThread,
  S002: logoWonderbox,
  S003: logoPetHaven,
  S004: logoLuminaJewelry,
  S005: logoChronoTimepieces,
  S006: logoTerraGardens,
  S007: logoGearAndGadgets,
  S008: logoVoyageLuggage,
  S009: logoModernWorkspace,
  S010: logoPixelGear,
  S011: logoBabyNest,
  S012: logoAudioCore,
  S013: logoSolarOptics,
  S014: logoInkAndPagePress,
  S015: logoUrbanPantry,
  S016: logoVanguardAthletics,
  S017: logoNestAndHaven,
  S018: logoNutritionPlus,
  S019: logoVitalityLabs,
  S020: logoApexTech,
  S021: logoCraftAndCreation,
  S022: logoLumenOutdoors,
  S023: logoAuraBotanicals,
  S024: logoTorqueMotors,
  S025: logoArtisanHarvest
};

export const SellerLogo: React.FC<{ sellerId: string; className?: string }> = ({
  sellerId,
  className = 'w-10 h-10'
}) => {
  const logo = SELLER_LOGO[sellerId];
  if (!logo) return null;
  return (
    <div className={`${className} rounded-full overflow-hidden flex-shrink-0 border border-gray-200 bg-white`}>
      <img src={logo} alt="" className="w-full h-full object-cover" />
    </div>
  );
};

const RATING_LABELS: Record<number, string> = {
  1: 'Horrid',
  2: 'Bad',
  3: 'Fine',
  4: 'Good',
  5: 'Great'
};

export const Stars: React.FC<{ rating: number; interactive?: false }> = ({ rating, interactive = false }) => {
  const roundedRating = Math.round(rating);
  const label = RATING_LABELS[roundedRating] || '';
  
  return (
    // aria-label on a plain <span> is ignored by some screen readers, so the
    // visible stars are hidden and one sentence is given as real text instead.
    <span className="text-amazin-orange" title={label}>
      <span aria-hidden="true">
        {'★'.repeat(roundedRating)}
        <span className="text-gray-300">{'★'.repeat(5 - roundedRating)}</span>
        <span className="text-gray-600 text-xs ml-1">{rating.toFixed(1)}</span>
        {label && <span className="text-gray-600 text-xs ml-1">({label})</span>}
      </span>
      <span className="sr-only">{`Rated ${rating.toFixed(1)} out of 5${label ? `, ${label}` : ''}`}</span>
    </span>
  );
};
