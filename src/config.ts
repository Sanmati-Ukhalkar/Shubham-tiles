// ─────────────────────────────────────────────────────────────
//  Mahesh Cement Articles — site settings. Change real business values here.
//  Every number in the designer, estimate and WhatsApp message
//  comes from this file.
// ─────────────────────────────────────────────────────────────

export const BRAND = {
  name: 'MAHESH',
  tagline: 'Cement Articles',
  fullName: 'Mahesh Cement Articles',
  // Country code + number, digits only.
  whatsapp: '917057219950',
  phone: '+91 70572 19950',
  phone2: '+91 99704 65050',
  email: 'maheshcementarticles@gmail.com',
  address: 'Near Ichchapurti Ganpati Mandir, Vadbare Road, Chandwad, Tal. Chandwad, Dist. Nashik, Maharashtra',
  city: 'Chandwad, Nashik',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Mahesh+Cement+Articles+Vadbare+Road+Chandwad+Nashik',
  established: 2019,
  projects: '1000+',
};

/** Trihex interlocking block. Placeholder values from typical Indian listings (see block-spec.md). */
export const BLOCK = {
  name: 'Trihex',
  /** Hexagon circumradius in metres. 0.11 m ≈ a block about 220 mm across, ~3 blocks per sq ft. */
  radius: 0.11,
  /** How far each curved edge bulges, as a fraction of the edge length. */
  bulge: 0.2,
  /** Joint gap between blocks, metres. */
  joint: 0.003,
  /** Spare blocks added on top of the count (breakage, cutting). */
  wastage: 0.05,
};

export type Thickness = { id: string; mm: number; label: string; use: string; pricePerSqft: number };

export const THICKNESSES: Thickness[] = [
  { id: 't60', mm: 60, label: '60 mm', use: 'light', pricePerSqft: 40 },
  { id: 't80', mm: 80, label: '80 mm', use: 'heavy', pricePerSqft: 55 },
];

/**
 * Product range. Sizes and prices are PLACEHOLDERS until the client confirms them.
 * length/width in metres: trihex = across, split-hex = long side of the half-hexagon.
 */
export type BlockSpec = {
  id: string;
  shape: 'trihex' | 'square' | 'rect' | 'split-hex';
  length: number;
  width: number;
  thicknesses: Thickness[];
  colours: string[];
  texture: 'plain' | 'stone';
  photo?: string; // file in /public/products
  grade?: string; // concrete grade
  perBrass?: number; // blocks per brass (100 sq ft)
  brassPrice?: number; // ₹ per brass
  confirmed?: boolean; // size/price confirmed by the client
};

/** 1 brass = 100 sq ft (local trade unit). */
export const SQFT_PER_BRASS = 100;

// Colorado + 8×10 rectangle: confirmed by the client (18 Nov 2026). Others: estimated from photos.
export const BLOCKS: BlockSpec[] = [
  {
    id: 'hexsplit',
    shape: 'split-hex',
    length: 0.3,
    width: 0.13,
    thicknesses: THICKNESSES,
    colours: ['white', 'charcoal', 'grey', 'terracotta', 'sandstone'],
    texture: 'plain',
    photo: 'gallery/hexsplit-star.webp',
  },
  {
    // "Colorado design": 0.446 sq ft per block → 252.6 mm across; 224 blocks per brass; ₹4,400 per brass
    id: 'trihex',
    shape: 'trihex',
    length: 0.2526,
    width: 0.2526,
    thicknesses: [{ id: 't60', mm: 60, label: '60 mm', use: 'light', pricePerSqft: 44 }],
    colours: ['terracotta', 'sandstone', 'grey', 'charcoal', 'white'],
    texture: 'stone',
    photo: 'products/trihex.webp',
    grade: 'M25',
    perBrass: 224,
    brassPrice: 4400,
    confirmed: true,
  },
  {
    // 8 × 10 inch crack-stone rectangle (size confirmed; thickness/price still to confirm)
    id: 'chequer',
    shape: 'rect',
    length: 0.254,
    width: 0.2032,
    thicknesses: [
      { id: 't40', mm: 40, label: '40 mm', use: 'foot', pricePerSqft: 38 },
      { id: 't60', mm: 60, label: '60 mm', use: 'light', pricePerSqft: 45 },
    ],
    colours: ['terracotta', 'charcoal', 'sandstone', 'white', 'grey'],
    texture: 'stone',
    photo: 'products/chequer.webp',
  },
  {
    id: 'stonebrick',
    shape: 'rect',
    length: 0.23,
    width: 0.115,
    thicknesses: THICKNESSES,
    colours: ['terracotta', 'sandstone', 'white', 'grey', 'charcoal'],
    texture: 'stone',
    photo: 'products/stonebrick.webp',
  },
  {
    id: 'brick',
    shape: 'rect',
    length: 0.2,
    width: 0.1,
    thicknesses: THICKNESSES,
    colours: ['grey', 'charcoal', 'white', 'sandstone', 'terracotta'],
    texture: 'plain',
    photo: 'products/brick.webp',
  },
];

export type BlockColour = { id: string; hex: string; dark: string };

export const COLOURS: BlockColour[] = [
  { id: 'grey', hex: '#b9b6b0', dark: '#94918b' },
  { id: 'charcoal', hex: '#45464a', dark: '#2f3033' },
  { id: 'terracotta', hex: '#c9512c', dark: '#a03f22' },
  { id: 'sandstone', hex: '#e2b257', dark: '#c2923d' },
  { id: 'silver', hex: '#c9cdd0', dark: '#a5aaae' },
  { id: 'white', hex: '#eeece6', dark: '#cfccc4' },
];

export const colourById = (id: string) => COLOURS.find((c) => c.id === id) ?? COLOURS[0];

export const FT = 0.3048; // metres per foot
export const SQFT_PER_M2 = 10.7639;
