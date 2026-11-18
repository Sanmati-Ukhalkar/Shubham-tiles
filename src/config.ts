// ─────────────────────────────────────────────────────────────
//  SHUBHA site settings — change real business values here.
//  Every number in the designer, estimate and WhatsApp message
//  comes from this file.
// ─────────────────────────────────────────────────────────────

export const BRAND = {
  name: 'SHUBHA',
  tagline: 'Concrete Pavers',
  // Country code + number, digits only. PLACEHOLDER — replace with the real number.
  whatsapp: '919999999999',
  phone: '+91 99999 99999',
  email: 'hello@shubha.in',
  address: 'Maharashtra, India',
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

export type BlockColour = { id: string; hex: string; dark: string };

export const COLOURS: BlockColour[] = [
  { id: 'grey', hex: '#a9a7a2', dark: '#8b8984' },
  { id: 'charcoal', hex: '#4a4a4c', dark: '#353537' },
  { id: 'terracotta', hex: '#c0583a', dark: '#9e452b' },
  { id: 'sandstone', hex: '#d9b26a', dark: '#bb9450' },
];

export const colourById = (id: string) => COLOURS.find((c) => c.id === id) ?? COLOURS[0];

export const FT = 0.3048; // metres per foot
export const SQFT_PER_M2 = 10.7639;
