// Draws blocks onto a 2D canvas (designer plan, pattern swatches, 3D textures).
import { BLOCK, colourById } from '../config';
import { blockEdges, colourOf, Design, Pt, Tile, tileCentre } from './trihex';

export type View = { scale: number; ox: number; oy: number }; // px per metre + offset

export function blockPath(R = BLOCK.radius, shrink = BLOCK.joint): Path2D {
  const p = new Path2D();
  const edges = blockEdges(R, BLOCK.bulge, shrink);
  p.moveTo(edges[0].from.x, edges[0].from.y);
  for (const e of edges) p.quadraticCurveTo(e.ctrl.x, e.ctrl.y, e.to.x, e.to.y);
  p.closePath();
  return p;
}

/** Paint one block with a light concrete look. ctx is already in metre units at the block centre. */
function paintBlock(ctx: CanvasRenderingContext2D, path: Path2D, colourId: string, seed: number, pxPerM: number) {
  const c = colourById(colourId);
  ctx.fillStyle = c.hex;
  ctx.fill(path);
  // subtle per-block tone variation, like real concrete batches
  const v = ((seed * 9301 + 49297) % 233280) / 233280;
  ctx.fillStyle = v > 0.5 ? `rgba(255,255,255,${(v - 0.5) * 0.12})` : `rgba(0,0,0,${(0.5 - v) * 0.12})`;
  ctx.fill(path);
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
  const path = blockPath();
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
    paintBlock(ctx, path, colourOf(design, t.q, t.r), t.q * 31 + t.r * 17, view.scale);
    ctx.restore();
  }
  ctx.restore();
}

/** Fill a whole canvas with the pattern (swatches, hero cards). */
export function drawSwatch(canvas: HTMLCanvasElement, design: Design, blocksAcross = 5) {
  const ctx = canvas.getContext('2d')!;
  const R = BLOCK.radius;
  const scale = canvas.width / (blocksAcross * Math.sqrt(3) * R);
  ctx.fillStyle = '#6f6a62';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const tiles: Tile[] = [];
  const rows = Math.ceil(canvas.height / scale / (1.5 * R)) + 2;
  for (let r = -1; r < rows; r++) {
    for (let q = -Math.ceil(rows / 2) - 1; q < blocksAcross + 2; q++) {
      const c = tileCentre(q, r);
      tiles.push({ q, r, cx: c.x, cy: c.y, key: `${q},${r}` });
    }
  }
  drawTiles(ctx, tiles, design, { scale, ox: 0, oy: 0 });
}
