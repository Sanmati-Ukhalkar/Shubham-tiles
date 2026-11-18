// Trihex block geometry + layout maths.
//
// How the block tessellates: start from a regular honeycomb (pointy-top hexagons).
// Every hexagon gets its 6 straight edges replaced by curves that alternate
// bulging OUT and bulging IN. Across any shared edge, one block's "out" curve is
// exactly its neighbour's "in" curve, so identical blocks (same orientation, no
// rotation) fill the plane with no gaps. The result is the familiar rounded
// three-lobed "trihex" paver.

import { BLOCK } from '../config';

export type Pt = { x: number; y: number };
export type Tile = { q: number; r: number; cx: number; cy: number; key: string };

const SQ3 = Math.sqrt(3);

/** Hexagon corner k (0..5), relative to the tile centre. */
function corner(k: number, R: number): Pt {
  const a = ((60 * k + 30) * Math.PI) / 180;
  return { x: R * Math.cos(a), y: R * Math.sin(a) };
}

export type EdgeSeg = { from: Pt; ctrl: Pt; to: Pt };

/** The 6 curved edges of one block, as quadratic Bézier segments around (0,0). */
export function blockEdges(R = BLOCK.radius, bulge = BLOCK.bulge, shrink = 0): EdgeSeg[] {
  const s = 1 - shrink / R;
  const segs: EdgeSeg[] = [];
  for (let k = 0; k < 6; k++) {
    const a = corner(k, R);
    const b = corner(k + 1, R);
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const len = Math.hypot(mx, my); // outward normal direction = midpoint direction
    const nx = mx / len;
    const ny = my / len;
    const dir = k % 2 === 0 ? 1 : -1; // even edges bulge out, odd edges bulge in
    const off = 2 * bulge * R * dir; // control point offset (apex = half of this)
    segs.push({
      from: { x: a.x * s, y: a.y * s },
      ctrl: { x: (mx + nx * off) * s, y: (my + ny * off) * s },
      to: { x: b.x * s, y: b.y * s },
    });
  }
  return segs;
}

/** Block outline sampled as a polygon (for hit tests and coverage). */
export function blockOutline(R = BLOCK.radius, steps = 6): Pt[] {
  const pts: Pt[] = [];
  for (const e of blockEdges(R)) {
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      pts.push({
        x: u * u * e.from.x + 2 * u * t * e.ctrl.x + t * t * e.to.x,
        y: u * u * e.from.y + 2 * u * t * e.ctrl.y + t * t * e.to.y,
      });
    }
  }
  return pts;
}

/** Area covered by one block (bulges in and out cancel, so it equals the hexagon). */
export const blockArea = (R = BLOCK.radius) => ((3 * SQ3) / 2) * R * R;

export function tileCentre(q: number, r: number, R = BLOCK.radius): Pt {
  const d = SQ3 * R;
  return { x: d * (q + r / 2), y: d * r * (SQ3 / 2) };
}

/** Fractional lattice coordinates of a point. */
function toLattice(x: number, y: number, R = BLOCK.radius) {
  const d = SQ3 * R;
  const r = y / (d * (SQ3 / 2));
  const q = x / d - r / 2;
  return { q, r };
}

// ───────── polygons ─────────

export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export function polygonArea(poly: Pt[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

export function bbox(poly: Pt[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of poly) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

/** Does any edge of the polygon cross the segment a-b? */
function segmentsCross(a: Pt, b: Pt, c: Pt, d: Pt) {
  const o = (p: Pt, q: Pt, r: Pt) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}

/** All blocks that touch the polygon (edge blocks are cut on site, so they count as whole blocks). */
export function tilesInPolygon(poly: Pt[], R = BLOCK.radius): Tile[] {
  if (poly.length < 3) return [];
  const bb = bbox(poly);
  const outline = blockOutline(R, 3);
  const pad = R * 1.5;
  const corners = [
    toLattice(bb.minX - pad, bb.minY - pad, R),
    toLattice(bb.maxX + pad, bb.minY - pad, R),
    toLattice(bb.minX - pad, bb.maxY + pad, R),
    toLattice(bb.maxX + pad, bb.maxY + pad, R),
  ];
  const qMin = Math.floor(Math.min(...corners.map((c) => c.q))) - 1;
  const qMax = Math.ceil(Math.max(...corners.map((c) => c.q))) + 1;
  const rMin = Math.floor(Math.min(...corners.map((c) => c.r))) - 1;
  const rMax = Math.ceil(Math.max(...corners.map((c) => c.r))) + 1;

  const tiles: Tile[] = [];
  for (let r = rMin; r <= rMax; r++) {
    for (let q = qMin; q <= qMax; q++) {
      const c = tileCentre(q, r, R);
      if (c.x < bb.minX - pad || c.x > bb.maxX + pad || c.y < bb.minY - pad || c.y > bb.maxY + pad) continue;
      const pts = outline.map((p) => ({ x: p.x + c.x, y: p.y + c.y }));
      let hit = pointInPolygon(c, poly) || pts.some((p) => pointInPolygon(p, poly));
      if (!hit) {
        // thin corners of the plot poking into a block
        hit = poly.some((v) => pointInPolygon(v, pts));
        if (!hit) {
          for (let i = 0; i < poly.length && !hit; i++) {
            const a = poly[i];
            const b = poly[(i + 1) % poly.length];
            for (let j = 0; j < pts.length && !hit; j++) hit = segmentsCross(a, b, pts[j], pts[(j + 1) % pts.length]);
          }
        }
      }
      if (hit) tiles.push({ q, r, cx: c.x, cy: c.y, key: `${q},${r}` });
    }
  }
  return tiles;
}

/** Which block is under a point (used for the paint brush). */
export function tileAt(p: Pt, R = BLOCK.radius): { q: number; r: number } | null {
  const f = toLattice(p.x, p.y, R);
  const outline = blockOutline(R, 6);
  const q0 = Math.round(f.q);
  const r0 = Math.round(f.r);
  for (let dr = -1; dr <= 1; dr++) {
    for (let dq = -1; dq <= 1; dq++) {
      const q = q0 + dq;
      const r = r0 + dr;
      const c = tileCentre(q, r, R);
      if (pointInPolygon({ x: p.x - c.x, y: p.y - c.y }, outline)) return { q, r };
    }
  }
  return { q: q0, r: r0 };
}

// ───────── colour patterns ─────────

export type PatternId = 'solid' | 'stripes' | 'bands' | 'diagonal' | 'dots' | 'triad' | 'mix';
export const PATTERNS: PatternId[] = ['stripes', 'diagonal', 'dots', 'triad', 'bands', 'mix', 'solid'];

const mod = (a: number, n: number) => ((a % n) + n) % n;

function hash(q: number, r: number) {
  let h = (q * 374761393 + r * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Colour index (into the chosen palette) for block (q, r). */
export function patternIndex(pattern: PatternId, q: number, r: number, n: number): number {
  if (n <= 1) return 0;
  switch (pattern) {
    case 'solid':
      return 0;
    case 'stripes':
      return mod(r, n);
    case 'bands':
      return mod(Math.floor(r / 3), n);
    case 'diagonal':
      return mod(q, n);
    case 'dots':
      return mod(q - r, 3) === 0 ? 1 : n > 2 && mod(r, 2) === 0 ? 2 : 0;
    case 'triad':
      return mod(q - r, 3) % n;
    case 'mix':
      return Math.min(n - 1, Math.floor(hash(q, r) * n));
  }
}

export type Design = {
  pattern: PatternId;
  palette: string[]; // colour ids, 1–3
  overrides: Record<string, string>; // "q,r" -> colour id (painted blocks)
};

export function colourOf(d: Design, q: number, r: number): string {
  return d.overrides[`${q},${r}`] ?? d.palette[patternIndex(d.pattern, q, r, d.palette.length)] ?? d.palette[0];
}
