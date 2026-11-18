// Block geometry + layout maths for every block shape.
//
// A "layout" is a lattice (two step vectors a, b) plus one or more prototiles placed
// inside each lattice cell. Repeating the cell over the lattice fills the plane with
// no gaps. Every shape and laying style (trihex, square tiles, split hexagon,
// rectangles in stretcher / herringbone / basket weave…) is described this way, so the
// designer, estimate, 2D plan and 3D preview all work with any of them.
//
// Trihex: start from a honeycomb; replace the 6 straight edges of each hexagon by curves
// that alternate bulging out and in. Across a shared edge one block's "out" curve is its
// neighbour's "in" curve, so identical blocks fill the plane: the rounded 3-lobed paver.

import { BLOCK, BLOCKS, BlockSpec } from '../config';

export type Pt = { x: number; y: number };
/** q, r = lattice cell, k = which prototile in the cell. (cx, cy) = block centre in metres. */
export type Tile = { q: number; r: number; k: number; cx: number; cy: number; key: string };

/** One edge of a block outline; a straight line when ctrl is missing. */
export type EdgeSeg = { from: Pt; ctrl?: Pt; to: Pt };
/** A prototile: outline around its own centre + offset of that centre inside the cell. */
export type Proto = { segs: EdgeSeg[]; ox: number; oy: number };
export type Layout = { id: string; a: Pt; b: Pt; protos: Proto[] };

const SQ3 = Math.sqrt(3);

// ───────── outlines ─────────

/** Trihex outline (6 curved edges) around (0,0). */
export function blockEdges(R = BLOCK.radius, bulge = BLOCK.bulge, shrink = 0): EdgeSeg[] {
  const s = 1 - shrink / R;
  const corner = (k: number): Pt => {
    const a = ((60 * k + 30) * Math.PI) / 180;
    return { x: R * Math.cos(a), y: R * Math.sin(a) };
  };
  const segs: EdgeSeg[] = [];
  for (let k = 0; k < 6; k++) {
    const a = corner(k);
    const b = corner(k + 1);
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const len = Math.hypot(mx, my);
    const dir = k % 2 === 0 ? 1 : -1; // even edges bulge out, odd edges bulge in
    const off = 2 * bulge * R * dir;
    segs.push({
      from: { x: a.x * s, y: a.y * s },
      ctrl: { x: (mx + (mx / len) * off) * s, y: (my + (my / len) * off) * s },
      to: { x: b.x * s, y: b.y * s },
    });
  }
  return segs;
}

function polySegs(pts: Pt[]): EdgeSeg[] {
  return pts.map((p, i) => ({ from: p, to: pts[(i + 1) % pts.length] }));
}

function centred(pts: Pt[]): { pts: Pt[]; c: Pt } {
  const c = { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length };
  return { pts: pts.map((p) => ({ x: p.x - c.x, y: p.y - c.y })), c };
}

/** Axis-aligned rectangle prototile occupying [x0,x1]×[y0,y1] of the cell. */
function rectProto(x0: number, y0: number, x1: number, y1: number): Proto {
  const { pts, c } = centred([
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ]);
  return { segs: polySegs(pts), ox: c.x, oy: c.y };
}

/** Polygon prototile from absolute cell coordinates. */
function polyProto(abs: Pt[]): Proto {
  const { pts, c } = centred(abs);
  return { segs: polySegs(pts), ox: c.x, oy: c.y };
}

// ───────── layouts for each block ─────────

function buildLayouts(spec: BlockSpec): Layout[] {
  const L = spec.length;
  const W = spec.width;
  switch (spec.shape) {
    case 'trihex': {
      const R = spec.length / 2;
      const d = SQ3 * R;
      return [{ id: 'standard', a: { x: d, y: 0 }, b: { x: d / 2, y: 1.5 * R }, protos: [{ segs: blockEdges(R), ox: 0, oy: 0 }] }];
    }
    case 'square':
      return [
        { id: 'grid', a: { x: L, y: 0 }, b: { x: 0, y: L }, protos: [rectProto(0, 0, L, L)] },
        { id: 'offset', a: { x: L, y: 0 }, b: { x: L / 2, y: L }, protos: [rectProto(0, 0, L, L)] },
      ];
    case 'rect': {
      const out: Layout[] = [
        { id: 'stretcher', a: { x: L, y: 0 }, b: { x: L / 2, y: W }, protos: [rectProto(0, 0, L, W)] },
        { id: 'stack', a: { x: L, y: 0 }, b: { x: 0, y: W }, protos: [rectProto(0, 0, L, W)] },
      ];
      if (Math.abs(L - 2 * W) < 1e-6) {
        // herringbone 90°: H brick + V brick per cell
        out.push({
          id: 'herringbone',
          a: { x: W, y: W },
          b: { x: 2 * W, y: -2 * W },
          protos: [rectProto(0, 0, 2 * W, W), rectProto(2 * W, -W, 3 * W, W)],
        });
        // basket weave: a horizontal pair next to a vertical pair, chequered
        out.push({
          id: 'basket',
          a: { x: 4 * W, y: 0 },
          b: { x: 2 * W, y: 2 * W },
          protos: [rectProto(0, 0, 2 * W, W), rectProto(0, W, 2 * W, 2 * W), rectProto(2 * W, 0, 3 * W, 2 * W), rectProto(3 * W, 0, 4 * W, 2 * W)],
        });
      }
      return out;
    }
    case 'split-hex': {
      // half-hexagon trapezoid: long side 2s, short side s, height h
      const s = spec.length / 2;
      const h = (s * SQ3) / 2;
      const up = polyProto([
        { x: -s, y: h },
        { x: s, y: h },
        { x: s / 2, y: 0 },
        { x: -s / 2, y: 0 },
      ]);
      const down = polyProto([
        { x: s, y: h },
        { x: 2 * s, y: h },
        { x: 2.5 * s, y: 0 },
        { x: 0.5 * s, y: 0 },
      ]);
      // "tumbling triangles": 3 trapezoids in a pinwheel make an equilateral triangle
      // of side 3s; up and down triangles then tile the plane (6 blocks per cell).
      const H = 3 * h;
      const cen = { x: 1.5 * s, y: H - h }; // centroid of the up triangle (apex at top)
      const baseTrap: Pt[] = [
        { x: 0, y: H },
        { x: 2 * s, y: H },
        { x: 1.5 * s, y: H - h },
        { x: 0.5 * s, y: H - h },
      ];
      const rot = (p: Pt, ang: number): Pt => {
        const c = Math.cos(ang);
        const si = Math.sin(ang);
        const dx = p.x - cen.x;
        const dy = p.y - cen.y;
        return { x: cen.x + dx * c - dy * si, y: cen.y + dx * si + dy * c };
      };
      const upTri = [0, 1, 2].map((i) => baseTrap.map((p) => rot(p, (i * 2 * Math.PI) / 3)));
      const M = { x: 2.25 * s, y: H / 2 }; // midpoint of the shared edge → point-reflect for the down triangle
      const downTri = upTri.map((poly) => poly.map((p) => ({ x: 2 * M.x - p.x, y: 2 * M.y - p.y })));
      return [
        { id: 'hex', a: { x: 3 * s, y: 0 }, b: { x: 1.5 * s, y: h }, protos: [up, down] },
        { id: 'triangles', a: { x: 3 * s, y: 0 }, b: { x: 1.5 * s, y: -H }, protos: [...upTri, ...downTri].map(polyProto) },
        { id: 'rows', a: { x: 3 * s, y: 0 }, b: { x: 0, y: h }, protos: [up, down] },
      ];
    }
  }
}

const layoutCache = new Map<string, Layout[]>();
export function layoutsFor(blockId: string): Layout[] {
  let l = layoutCache.get(blockId);
  if (!l) {
    l = buildLayouts(blockById(blockId));
    layoutCache.set(blockId, l);
  }
  return l;
}
export const blockById = (id?: string) => BLOCKS.find((b) => b.id === (id ?? 'trihex')) ?? BLOCKS[0];

export function layoutOf(d: { blockId?: string; layoutId?: string }): Layout {
  const ls = layoutsFor(d.blockId ?? 'trihex');
  return ls.find((l) => l.id === d.layoutId) ?? ls[0];
}

/** Shrunk copy of an outline (for the joint gap). */
export function shrinkSegs(segs: EdgeSeg[], by: number): EdgeSeg[] {
  let minR = Infinity;
  for (const s of segs) {
    // distance from centre to the edge midpoint ≈ inradius
    minR = Math.min(minR, Math.hypot((s.from.x + s.to.x) / 2, (s.from.y + s.to.y) / 2));
  }
  const k = Math.max(0.5, 1 - by / Math.max(minR, 1e-6));
  const f = (p: Pt) => ({ x: p.x * k, y: p.y * k });
  return segs.map((s) => ({ from: f(s.from), ctrl: s.ctrl && f(s.ctrl), to: f(s.to) }));
}

/** Outline sampled as a polygon. */
export function sampleSegs(segs: EdgeSeg[], steps = 6): Pt[] {
  const pts: Pt[] = [];
  for (const e of segs) {
    if (!e.ctrl) {
      pts.push(e.from);
      continue;
    }
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

/** Trihex outline polygon (kept for older callers). */
export function blockOutline(R = BLOCK.radius, steps = 6): Pt[] {
  return sampleSegs(blockEdges(R), steps);
}

/** Area of one block of a layout. */
export function layoutBlockArea(l: Layout): number {
  return Math.abs(l.a.x * l.b.y - l.a.y * l.b.x) / l.protos.length;
}
export const blockArea = (R = BLOCK.radius) => ((3 * SQ3) / 2) * R * R;

/** Trihex lattice centre (hero scene). */
export function tileCentre(q: number, r: number, R = BLOCK.radius): Pt {
  const d = SQ3 * R;
  return { x: d * (q + r / 2), y: d * r * (SQ3 / 2) };
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

function segmentsCross(a: Pt, b: Pt, c: Pt, d: Pt) {
  const o = (p: Pt, q: Pt, r: Pt) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}

/** Lattice coordinates (fractional) of a point. */
function toLattice(l: Layout, x: number, y: number) {
  const det = l.a.x * l.b.y - l.a.y * l.b.x;
  return { q: (x * l.b.y - y * l.b.x) / det, r: (l.a.x * y - l.a.y * x) / det };
}

function cellRange(l: Layout, minX: number, minY: number, maxX: number, maxY: number) {
  const cs = [toLattice(l, minX, minY), toLattice(l, maxX, minY), toLattice(l, minX, maxY), toLattice(l, maxX, maxY)];
  return {
    qMin: Math.floor(Math.min(...cs.map((c) => c.q))) - 2,
    qMax: Math.ceil(Math.max(...cs.map((c) => c.q))) + 2,
    rMin: Math.floor(Math.min(...cs.map((c) => c.r))) - 2,
    rMax: Math.ceil(Math.max(...cs.map((c) => c.r))) + 2,
  };
}

/** Every block whose centre falls inside a rectangle (swatches, textures). */
export function tilesInRect(l: Layout, minX: number, minY: number, maxX: number, maxY: number, pad = 0.4): Tile[] {
  const out: Tile[] = [];
  const rg = cellRange(l, minX - pad, minY - pad, maxX + pad, maxY + pad);
  for (let r = rg.rMin; r <= rg.rMax; r++)
    for (let q = rg.qMin; q <= rg.qMax; q++)
      l.protos.forEach((p, k) => {
        const cx = q * l.a.x + r * l.b.x + p.ox;
        const cy = q * l.a.y + r * l.b.y + p.oy;
        if (cx > minX - pad && cx < maxX + pad && cy > minY - pad && cy < maxY + pad) out.push({ q, r, k, cx, cy, key: `${q},${r},${k}` });
      });
  return out;
}

/** All blocks that touch the polygon (edge blocks are cut on site, so they count as whole blocks). */
export function tilesInPolygon(poly: Pt[], l: Layout = layoutsFor('trihex')[0]): Tile[] {
  if (poly.length < 3) return [];
  const bb = bbox(poly);
  const outlines = l.protos.map((p) => sampleSegs(p.segs, 3));
  const tiles: Tile[] = [];
  for (const t of tilesInRect(l, bb.minX, bb.minY, bb.maxX, bb.maxY, 0.5)) {
    const c = { x: t.cx, y: t.cy };
    const pts = outlines[t.k].map((p) => ({ x: p.x + t.cx, y: p.y + t.cy }));
    let hit = pointInPolygon(c, poly) || pts.some((p) => pointInPolygon(p, poly));
    if (!hit) {
      hit = poly.some((v) => pointInPolygon(v, pts));
      for (let i = 0; i < poly.length && !hit; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        for (let j = 0; j < pts.length && !hit; j++) hit = segmentsCross(a, b, pts[j], pts[(j + 1) % pts.length]);
      }
    }
    if (hit) tiles.push(t);
  }
  return tiles;
}

/** Which block is under a point (paint brush). */
export function tileAt(p: Pt, l: Layout = layoutsFor('trihex')[0]): { q: number; r: number; k: number } | null {
  const f = toLattice(l, p.x, p.y);
  const outlines = l.protos.map((pr) => sampleSegs(pr.segs, 6));
  const q0 = Math.floor(f.q);
  const r0 = Math.floor(f.r);
  for (let dr = -2; dr <= 2; dr++)
    for (let dq = -2; dq <= 2; dq++)
      for (let k = 0; k < l.protos.length; k++) {
        const q = q0 + dq;
        const r = r0 + dr;
        const cx = q * l.a.x + r * l.b.x + l.protos[k].ox;
        const cy = q * l.a.y + r * l.b.y + l.protos[k].oy;
        if (pointInPolygon({ x: p.x - cx, y: p.y - cy }, outlines[k])) return { q, r, k };
      }
  return null;
}

// ───────── colour patterns ─────────

export type PatternId = 'solid' | 'stripes' | 'bands' | 'diagonal' | 'checker' | 'halves' | 'dots' | 'triad' | 'rings' | 'mix';
export const PATTERNS: PatternId[] = ['stripes', 'checker', 'diagonal', 'halves', 'rings', 'dots', 'triad', 'bands', 'mix', 'solid'];

const mod = (a: number, n: number) => ((a % n) + n) % n;

function hash(q: number, r: number, k: number) {
  let h = (q * 374761393 + r * 668265263 + k * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Colour index (into the chosen palette) for block (q, r, k). */
export function patternIndex(pattern: PatternId, q: number, r: number, n: number, k = 0, protos = 1): number {
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
    case 'checker':
      return mod(q + r + (protos > 1 ? k : 0), n);
    case 'halves':
      return protos > 1 ? mod(k, n) : mod(q + 2 * r, n);
    case 'dots':
      return mod(q - r, 3) === 0 ? 1 : n > 2 && mod(r, 2) === 0 ? 2 : 0;
    case 'triad':
      return mod(q - r + k, 3) % n;
    case 'rings': {
      // repeating medallions: rings around centres every 7 cells
      const dq = mod(q + 3, 7) - 3;
      const dr = mod(r + 3, 7) - 3;
      const dist = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
      return dist <= 2 ? (dist + 1) % n : 0;
    }
    case 'mix':
      return Math.min(n - 1, Math.floor(hash(q, r, k) * n));
  }
}

export type Design = {
  blockId?: string;
  layoutId?: string;
  pattern: PatternId;
  palette: string[]; // colour ids, 1–3
  overrides: Record<string, string>; // "q,r,k" -> colour id (painted blocks)
};

export function colourOf(d: Design, q: number, r: number, k = 0): string {
  const painted = d.overrides[`${q},${r},${k}`];
  if (painted) return painted;
  const l = layoutOf(d);
  let protos = l.protos.length;
  // tumbling triangles: the 3 trapezoids of each triangle share a colour (unless "two-tone")
  if (l.id === 'triangles') {
    if (d.pattern === 'halves') return d.palette[mod(k, d.palette.length)];
    const tri = k < 3 ? 0 : 1;
    if (d.pattern === 'checker' || d.pattern === 'stripes') return d.palette[mod(tri + (d.pattern === 'stripes' ? r : 0), d.palette.length)];
    k = tri;
    protos = 2;
  }
  // split hexagon: colour the two halves of each full hexagon as one block
  if (l.id === 'hex' && d.pattern !== 'halves') {
    if (k === 1) {
      q += 1;
      r -= 1;
    }
    k = 0;
    protos = 1;
  }
  return d.palette[patternIndex(d.pattern, q, r, d.palette.length, k, protos)] ?? d.palette[0];
}

export { BLOCKS };
