// Shared drawing of the top-down plan (designer canvas, PDF/PNG export, 3D texture).
import { FT } from '../config';
import { drawTiles, View } from '../geometry/render2d';
import { bbox, Design, Pt, Tile } from '../geometry/trihex';

export type PlanOpts = {
  polyFt: Pt[];
  closed: boolean;
  tiles?: Tile[];
  design?: Design;
  extentFt?: { w: number; h: number }; // fixed world area (drawing mode); otherwise fit the shape
  photo?: HTMLImageElement | null;
  photoOpacity?: number;
  showGrid?: boolean;
  showDims?: boolean;
  dpr?: number;
  pad?: number; // css px
};

export const toM = (p: Pt): Pt => ({ x: p.x * FT, y: p.y * FT });

/** Pixel view (px per metre + offset) for a canvas of css size w×h. */
export function planView(o: PlanOpts, w: number, h: number): View {
  const pad = o.pad ?? 44;
  let minX = 0, minY = 0, ew: number, eh: number;
  if (o.extentFt) {
    ew = o.extentFt.w * FT;
    eh = o.extentFt.h * FT;
  } else {
    const b = bbox(o.polyFt.map(toM));
    minX = b.minX;
    minY = b.minY;
    ew = Math.max(b.w, 1);
    eh = Math.max(b.h, 1);
  }
  const scale = Math.min((w - pad * 2) / ew, (h - pad * 2) / eh);
  return { scale, ox: (w - ew * scale) / 2 - minX * scale, oy: (h - eh * scale) / 2 - minY * scale };
}

export function drawPlan(ctx: CanvasRenderingContext2D, o: PlanOpts, w: number, h: number) {
  const dpr = o.dpr ?? 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#fbfaf8';
  ctx.fillRect(0, 0, w, h);
  const v = planView(o, w, h);
  const X = (xm: number) => v.ox + xm * v.scale;
  const Y = (ym: number) => v.oy + ym * v.scale;

  if (o.photo && o.extentFt) {
    ctx.globalAlpha = o.photoOpacity ?? 0.5;
    ctx.drawImage(o.photo, X(0), Y(0), o.extentFt.w * FT * v.scale, o.extentFt.h * FT * v.scale);
    ctx.globalAlpha = 1;
  }

  if (o.showGrid !== false) {
    const pxPerFt = v.scale * FT;
    const step = pxPerFt < 6 ? 5 : 1;
    const x0 = Math.floor(-v.ox / pxPerFt) - 1;
    const x1 = Math.ceil((w - v.ox) / pxPerFt) + 1;
    const y0 = Math.floor(-v.oy / pxPerFt) - 1;
    const y1 = Math.ceil((h - v.oy) / pxPerFt) + 1;
    for (let i = x0; i <= x1; i++) {
      if (i % step) continue;
      ctx.strokeStyle = i % 5 === 0 ? 'rgba(0,0,0,0.09)' : 'rgba(0,0,0,0.04)';
      ctx.beginPath();
      ctx.moveTo(v.ox + i * pxPerFt + 0.5, 0);
      ctx.lineTo(v.ox + i * pxPerFt + 0.5, h);
      ctx.stroke();
    }
    for (let j = y0; j <= y1; j++) {
      if (j % step) continue;
      ctx.strokeStyle = j % 5 === 0 ? 'rgba(0,0,0,0.09)' : 'rgba(0,0,0,0.04)';
      ctx.beginPath();
      ctx.moveTo(0, v.oy + j * pxPerFt + 0.5);
      ctx.lineTo(w, v.oy + j * pxPerFt + 0.5);
      ctx.stroke();
    }
  }

  const poly = o.polyFt.map(toM);
  if (o.closed && poly.length > 2 && o.tiles && o.design) {
    drawTiles(ctx, o.tiles, o.design, v, poly);
  } else if (o.closed && poly.length > 2) {
    ctx.beginPath();
    poly.forEach((p, i) => (i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y))));
    ctx.closePath();
    ctx.fillStyle = 'rgba(242,106,27,0.14)';
    ctx.fill();
  }

  if (poly.length) {
    ctx.beginPath();
    poly.forEach((p, i) => (i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y))));
    if (o.closed) ctx.closePath();
    ctx.lineWidth = o.design ? 2 : 3;
    ctx.strokeStyle = o.design ? '#2b2b2b' : '#f26a1b';
    ctx.lineJoin = 'round';
    ctx.stroke();
    if (!o.design) {
      poly.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(X(p.x), Y(p.y), i === 0 && !o.closed ? 8 : 6, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#f26a1b';
        ctx.stroke();
      });
    }
  }

  if (o.showDims !== false && o.polyFt.length > 1) {
    const n = o.polyFt.length;
    const segs = o.closed ? n : n - 1;
    // centroid to push labels outward
    const cx = poly.reduce((s, p) => s + p.x, 0) / n;
    const cy = poly.reduce((s, p) => s + p.y, 0) / n;
    ctx.font = '600 13px Poppins, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < segs; i++) {
      const a = o.polyFt[i];
      const b = o.polyFt[(i + 1) % n];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 0.5) continue;
      const am = poly[i];
      const bm = poly[(i + 1) % n];
      let mx = X((am.x + bm.x) / 2);
      let my = Y((am.y + bm.y) / 2);
      // offset away from the shape
      let nx = -(bm.y - am.y);
      let ny = bm.x - am.x;
      const l = Math.hypot(nx, ny) || 1;
      nx /= l;
      ny /= l;
      const toC = (X(cx) - mx) * nx + (Y(cy) - my) * ny;
      if (toC > 0) {
        nx = -nx;
        ny = -ny;
      }
      mx += nx * 20;
      my += ny * 20;
      const label = `${Number.isInteger(len) ? len : len.toFixed(1)} ft`;
      const tw = ctx.measureText(label).width + 16;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(mx - tw / 2, my - 12, tw, 24, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#222';
      ctx.fillText(label, mx, my + 0.5);
    }
  }
  return v;
}

/** Render the finished plan to a standalone canvas (exports). */
export function planImage(o: PlanOpts, w = 1200, h = 900): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  drawPlan(c.getContext('2d')!, { ...o, dpr: 1, showGrid: false, pad: 60 }, w, h);
  return c;
}
