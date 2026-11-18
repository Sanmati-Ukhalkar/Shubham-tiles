// Draws blocks onto a 2D canvas (designer plan, pattern swatches, 3D textures).
import { BLOCK, colourById } from '../config';
import { blockById, blockEdges, colourOf, Design, EdgeSeg, Layout, layoutOf, Pt, shrinkSegs, Tile, tilesInRect } from './trihex';

export type View = { scale: number; ox: number; oy: number }; // px per metre + offset

export function segsPath(segs: EdgeSeg[]): Path2D {
  const p = new Path2D();
  p.moveTo(segs[0].from.x, segs[0].from.y);
  for (const e of segs) {
    if (e.ctrl) p.quadraticCurveTo(e.ctrl.x, e.ctrl.y, e.to.x, e.to.y);
    else p.lineTo(e.to.x, e.to.y);
  }
  p.closePath();
  return p;
}

/** Trihex path (kept for older callers). */
export function blockPath(R = BLOCK.radius, shrink = BLOCK.joint): Path2D {
  return segsPath(blockEdges(R, BLOCK.bulge, shrink));
}

const pathCache = new Map<Layout, Path2D[]>();
export function layoutPaths(l: Layout): Path2D[] {
  let ps = pathCache.get(l);
  if (!ps) {
    ps = l.protos.map((p) => segsPath(shrinkSegs(p.segs, BLOCK.joint)));
    pathCache.set(l, ps);
  }
  return ps;
}

const rnd = (s: number) => {
  const x = Math.sin(s * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Paint one block with a light concrete look. ctx is already in metre units at the block centre. */
function paintBlock(ctx: CanvasRenderingContext2D, path: Path2D, colourId: string, seed: number, pxPerM: number, stone: boolean, size: number) {
  const c = colourById(colourId);
  ctx.fillStyle = c.hex;
  ctx.fill(path);
  // subtle per-block tone variation, like real concrete batches
  const v = rnd(seed);
  ctx.fillStyle = v > 0.5 ? `rgba(255,255,255,${(v - 0.5) * 0.14})` : `rgba(0,0,0,${(0.5 - v) * 0.14})`;
  ctx.fill(path);
  if (stone && pxPerM > 160) {
    // "crack stone" surface texture seen on the real tiles
    ctx.save();
    ctx.clip(path);
    ctx.strokeStyle = 'rgba(0,0,0,0.16)';
    ctx.lineWidth = 1 / pxPerM;
    for (let i = 0; i < 6; i++) {
      let x = (rnd(seed + i * 3.1) - 0.5) * size;
      let y = (rnd(seed + i * 7.7) - 0.5) * size;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let j = 0; j < 4; j++) {
        x += (rnd(seed + i * 13 + j) - 0.5) * size * 0.45;
        y += (rnd(seed + i * 17 + j * 5) - 0.5) * size * 0.45;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  if (pxPerM > 120) {
    ctx.lineWidth = 1.2 / pxPerM;
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.stroke(path);
  }
}

export function drawTiles(
  ctx: CanvasRenderingContext2D,
  tiles: Tile[],
  design: Design,
  view: View,
  clip?: Pt[],
  jointColour = '#6f6a62',
) {
  const l = layoutOf(design);
  const spec = blockById(design.blockId);
  const paths = layoutPaths(l);
  const size = Math.max(spec.length, spec.width);
  ctx.save();
  ctx.translate(view.ox, view.oy);
  ctx.scale(view.scale, view.scale);
  if (clip && clip.length > 2) {
    ctx.beginPath();
    ctx.moveTo(clip[0].x, clip[0].y);
    for (const p of clip.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fillStyle = jointColour;
    ctx.fill();
    ctx.clip();
  }
  for (const t of tiles) {
    ctx.save();
    ctx.translate(t.cx, t.cy);
    paintBlock(ctx, paths[t.k] ?? paths[0], colourOf(design, t.q, t.r, t.k), t.q * 31 + t.r * 17 + t.k * 7, view.scale, spec.texture === 'stone', size);
    ctx.restore();
  }
  ctx.restore();
}

/** Fill a whole canvas with the pattern (swatches, cards). blocksAcross = how many blocks fit the width. */
export function drawSwatch(canvas: HTMLCanvasElement, design: Design, blocksAcross = 5) {
  const ctx = canvas.getContext('2d')!;
  const spec = blockById(design.blockId);
  const unit = spec.shape === 'trihex' ? Math.sqrt(3) * (spec.length / 2) : spec.length;
  const scale = canvas.width / (blocksAcross * unit);
  ctx.fillStyle = '#6f6a62';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const tiles = tilesInRect(layoutOf(design), 0, 0, canvas.width / scale, canvas.height / scale, Math.max(spec.length, spec.width));
  drawTiles(ctx, tiles, design, { scale, ox: 0, oy: 0 });
}
