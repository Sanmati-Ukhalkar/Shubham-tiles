import { BLOCK, SQFT_PER_M2, Thickness } from '../config';
import { colourOf, Design, polygonArea, Pt, Tile } from './trihex';

export type Estimate = {
  areaSqft: number;
  blocksNet: number; // blocks that touch the area (edge blocks counted whole)
  blocksOrder: number; // + spare
  byColour: { id: string; count: number }[];
  cost: number;
  rate: number;
};

export function estimate(poly: Pt[], tiles: Tile[], design: Design, thickness: Thickness): Estimate {
  const areaSqft = polygonArea(poly) * SQFT_PER_M2;
  const counts: Record<string, number> = {};
  for (const t of tiles) {
    const c = colourOf(design, t.q, t.r);
    counts[c] = (counts[c] ?? 0) + 1;
  }
  const k = 1 + BLOCK.wastage;
  const byColour = Object.entries(counts)
    .map(([id, n]) => ({ id, count: Math.ceil(n * k) }))
    .sort((a, b) => b.count - a.count);
  const blocksOrder = byColour.reduce((s, c) => s + c.count, 0);
  return {
    areaSqft,
    blocksNet: tiles.length,
    blocksOrder,
    byColour,
    rate: thickness.pricePerSqft,
    cost: Math.round(areaSqft * thickness.pricePerSqft),
  };
}

export const inr = (n: number) => '₹ ' + Math.round(n).toLocaleString('en-IN');
export const num = (n: number) => Math.round(n).toLocaleString('en-IN');
