// Procedural scenery for the 3D preview: cars, two-wheelers, trees, lamps and the
// four settings (factory, petrol pump, housing society, shop). Everything is built
// from code, so no model files need to be downloaded.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { bbox, pointInPolygon, Pt } from '../geometry/trihex';
import type { Env } from './Designer';

type V2 = [number, number];

export const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });

const glow = (color: string, on: boolean, strong = 2) =>
  std('#ffffff', { color, emissive: color, emissiveIntensity: on ? strong : 0.15, roughness: 0.4 });

function shadowed<T extends THREE.Object3D>(o: T): T {
  o.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  return o;
}

export function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return shadowed(m);
}

function rbox(w: number, h: number, d: number, r: number, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)), mat);
  m.position.set(x, y, z);
  return shadowed(m);
}

function cyl(r: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
  m.position.set(x, y, z);
  return shadowed(m);
}

/** Extrude a side profile (x along length, y up) to a given width, centred on z = 0. */
function profile(points: V2[], width: number, mat: THREE.Material, bevel = 0.05) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, width - bevel * 2),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 6,
  });
  geo.translate(0, 0, -(width - bevel * 2) / 2);
  geo.computeVertexNormals();
  return shadowed(new THREE.Mesh(geo, mat));
}

// ───────── textures ─────────

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

/** Facade with framed windows. One texture tile = one bay × one floor. */
function facadeTex(wall: string, lit: boolean, cols: number, rows: number, seed = 1) {
  return canvasTex(
    256,
    256,
    (g) => {
      g.fillStyle = wall;
      g.fillRect(0, 0, 256, 256);
      // floor band
      g.fillStyle = 'rgba(0,0,0,0.08)';
      g.fillRect(0, 236, 256, 20);
      // window frame + glass
      g.fillStyle = '#f6f3ee';
      g.fillRect(44, 56, 168, 140);
      const on = lit && seed % 3 !== 0;
      const grad = g.createLinearGradient(0, 64, 0, 188);
      if (on) {
        grad.addColorStop(0, '#ffe2a6');
        grad.addColorStop(1, '#f6b964');
      } else {
        grad.addColorStop(0, '#9fb7c9');
        grad.addColorStop(1, '#3d5163');
      }
      g.fillStyle = grad;
      g.fillRect(52, 64, 152, 124);
      g.fillStyle = '#f6f3ee';
      g.fillRect(124, 64, 8, 124);
      g.fillRect(52, 120, 152, 6);
      // sill
      g.fillStyle = 'rgba(0,0,0,0.18)';
      g.fillRect(40, 196, 176, 8);
    },
    [cols, rows],
  );
}

/** Vertical metal ribs (sheds, shutters). 1 tile = 1 m when used on world-UV geometry. */
function ribTex(base: string, rib: string, horizontal = false, repeat: [number, number] = [1, 1]) {
  return canvasTex(
    128,
    128,
    (g) => {
      g.fillStyle = base;
      g.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 6; i++) {
        const p = (i * 128) / 6;
        const grad = horizontal ? g.createLinearGradient(0, p, 0, p + 21) : g.createLinearGradient(p, 0, p + 21, 0);
        grad.addColorStop(0, rib);
        grad.addColorStop(0.5, base);
        grad.addColorStop(1, rib);
        g.fillStyle = grad;
        if (horizontal) g.fillRect(0, p, 128, 21);
        else g.fillRect(p, 0, 21, 128);
      }
    },
    repeat,
  );
}

function stripeTex(a: string, b: string, n: number) {
  return canvasTex(256, 64, (g) => {
    for (let i = 0; i < n; i++) {
      g.fillStyle = i % 2 ? a : b;
      g.fillRect((i * 256) / n, 0, 256 / n + 1, 64);
    }
  });
}

function signTex(text: string, bg: string, fg: string) {
  return canvasTex(512, 96, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, 512, 96);
    g.fillStyle = fg;
    g.font = '700 54px Poppins, Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 256, 50);
  });
}

// ───────── vehicles ─────────

type CarKind = 'sedan' | 'hatch' | 'suv';
const CARS: Record<CarKind, { L: number; W: number; wr: number; body: V2[]; glass: V2[] }> = {
  sedan: {
    L: 4.4,
    W: 1.74,
    wr: 0.31,
    body: [[-2.2, 0.3], [2.15, 0.3], [2.24, 0.48], [2.2, 0.76], [1.15, 0.92], [-1.55, 0.96], [-2.16, 0.9], [-2.26, 0.6]],
    glass: [[1.1, 0.9], [0.36, 1.37], [-0.92, 1.39], [-1.48, 0.95]],
  },
  hatch: {
    L: 3.85,
    W: 1.68,
    wr: 0.3,
    body: [[-1.85, 0.3], [1.85, 0.3], [1.94, 0.48], [1.9, 0.76], [0.95, 0.9], [-1.78, 0.96], [-1.94, 0.82], [-1.96, 0.52]],
    glass: [[0.92, 0.89], [0.2, 1.38], [-1.5, 1.4], [-1.76, 0.95]],
  },
  suv: {
    L: 4.5,
    W: 1.86,
    wr: 0.37,
    body: [[-2.25, 0.4], [2.2, 0.4], [2.3, 0.62], [2.26, 0.98], [1.25, 1.1], [-2.15, 1.12], [-2.3, 1.0], [-2.32, 0.68]],
    glass: [[1.22, 1.09], [0.55, 1.62], [-1.98, 1.64], [-2.14, 1.11]],
  },
};

export function car(kind: CarKind, color: string, night: boolean) {
  const spec = CARS[kind];
  const g = new THREE.Group();
  const paint = std(color, { roughness: 0.28, metalness: 0.55 });
  const glass = std('#1a232c', { roughness: 0.06, metalness: 0.9 });
  const trim = std('#16181b', { roughness: 0.6 });
  const chrome = std('#d8dde2', { roughness: 0.2, metalness: 1 });

  g.add(profile(spec.body, spec.W, paint, 0.08));
  g.add(profile(spec.glass, spec.W - 0.12, glass, 0.05));
  // roof over the glasshouse
  const [, a, b] = spec.glass;
  g.add(profile([[a[0] - 0.02, a[1] - 0.01], [b[0] + 0.02, b[1] - 0.01], [b[0] + 0.04, b[1] + 0.05], [a[0] - 0.04, a[1] + 0.04]], spec.W - 0.18, paint, 0.03));

  // wheels: dark arch, tyre, alloy
  const wx = spec.L / 2 - 0.85;
  for (const x of [wx, -wx]) {
    const arch = new THREE.Mesh(new THREE.CylinderGeometry(spec.wr + 0.06, spec.wr + 0.06, spec.W + 0.005, 24, 1, false, 0, Math.PI), trim);
    arch.rotation.set(Math.PI / 2, 0, -Math.PI / 2);
    arch.position.set(x, spec.wr, 0);
    g.add(arch);
    for (const s of [-1, 1]) {
      const z = s * (spec.W / 2 - 0.1);
      const tyre = cyl(spec.wr, 0.22, std('#141414', { roughness: 0.9 }), x, spec.wr, z, 22);
      tyre.rotation.x = Math.PI / 2;
      g.add(tyre);
      const rim = cyl(spec.wr * 0.62, 0.225, chrome, x, spec.wr, z, 14);
      rim.rotation.x = Math.PI / 2;
      g.add(rim);
    }
  }

  // lights, grille, plates, mirrors
  const front = spec.body[2][0];
  const rear = spec.body[7][0];
  const lampY = (spec.body[2][1] + spec.body[3][1]) / 2 + 0.06;
  for (const s of [-1, 1]) {
    g.add(box(0.06, 0.12, 0.34, glow('#fff3d6', night, 3), front - 0.02, lampY, s * (spec.W / 2 - 0.3)));
    g.add(box(0.06, 0.12, 0.34, glow('#d0202a', night, 2.5), rear + 0.02, lampY, s * (spec.W / 2 - 0.3)));
    g.add(box(0.22, 0.1, 0.12, paint, spec.glass[0][0] - 0.1, spec.glass[0][1] + 0.05, s * (spec.W / 2 + 0.05)));
  }
  g.add(box(0.05, 0.16, 0.7, trim, front + 0.01, lampY - 0.12, 0));
  g.add(box(0.03, 0.12, 0.5, std('#f4f4f2'), front + 0.03, lampY - 0.32, 0));
  g.add(box(0.03, 0.12, 0.5, std('#f4f4f2'), rear - 0.03, lampY - 0.18, 0));
  // soft contact shadow
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(spec.L * 1.05, spec.W * 1.1),
    new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.25, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  g.add(shadow);
  if (night) {
    const l = new THREE.SpotLight('#fff1d0', 12, 14, 0.5, 0.6, 1.5);
    l.position.set(front, lampY, 0);
    l.target.position.set(front + 6, 0, 0);
    g.add(l, l.target);
  }
  return g;
}

export function scooter() {
  const g = new THREE.Group();
  const body = std('#2c3e66', { roughness: 0.3, metalness: 0.5 });
  const dark = std('#1a1a1a', { roughness: 0.7 });
  for (const x of [0.62, -0.58]) {
    const w = cyl(0.25, 0.1, dark, x, 0.25, 0, 18);
    w.rotation.x = Math.PI / 2;
    g.add(w);
  }
  g.add(rbox(0.9, 0.42, 0.42, 0.15, body, -0.25, 0.55, 0)); // rear body
  g.add(rbox(0.75, 0.12, 0.34, 0.05, dark, -0.25, 0.82, 0)); // seat
  g.add(rbox(0.6, 0.12, 0.34, 0.05, dark, 0.25, 0.32, 0)); // floorboard
  const apron = rbox(0.22, 0.8, 0.4, 0.08, body, 0.58, 0.72, 0);
  apron.rotation.z = -0.25;
  g.add(apron);
  g.add(box(0.06, 0.06, 0.62, dark, 0.72, 1.14, 0)); // handlebar
  g.add(box(0.05, 0.1, 0.16, glow('#fff3d6', false), 0.75, 1.02, 0));
  return g;
}

// ───────── greenery & street furniture ─────────

export function tree(scale = 1, seed = 0) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 2.4, 8), std('#6b4a32'));
  trunk.position.y = 1.2;
  g.add(trunk);
  const greens = ['#4d7a35', '#5b8a3c', '#43702f'];
  const blobs: [number, number, number, number][] = [
    [0, 3.1, 0, 1.3],
    [0.75, 2.7, 0.35, 0.95],
    [-0.7, 2.8, -0.3, 1.0],
    [0.15, 3.85, 0.15, 0.9],
    [-0.3, 3.3, 0.7, 0.85],
  ];
  blobs.forEach(([x, y, z, r], i) => {
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), std(greens[(i + seed) % 3], { roughness: 0.95, flatShading: true }));
    s.position.set(x, y, z);
    g.add(s);
  });
  g.scale.setScalar(scale);
  return shadowed(g);
}

export function palm(scale = 1) {
  const g = new THREE.Group();
  const bark = std('#8a6c4c', { roughness: 1 });
  let y = 0;
  let x = 0;
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.15 - i * 0.008, 0.17 - i * 0.008, 1.05, 8), bark);
    seg.position.set(x, y + 0.5, 0);
    seg.rotation.z = -0.03 * i;
    g.add(seg);
    y += 1.0;
    x += 0.04 * i;
  }
  const leaf = std('#4f8a38', { roughness: 0.9, side: THREE.DoubleSide });
  for (let i = 0; i < 9; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.28, 2.6, 4), leaf);
    f.scale.set(1, 1, 0.18);
    f.position.set(x, y, 0);
    f.rotation.set(0, (i / 9) * Math.PI * 2, 0);
    f.rotateZ(Math.PI / 2 + 0.55);
    f.translateY(1.2);
    g.add(f);
  }
  g.scale.setScalar(scale);
  return shadowed(g);
}

export function lampPost(night: boolean, lights: THREE.Object3D[]) {
  const g = new THREE.Group();
  const metal = std('#3a3d40', { metalness: 0.6, roughness: 0.4 });
  g.add(cyl(0.08, 5.2, metal, 0, 2.6, 0, 10));
  g.add(cyl(0.16, 0.5, metal, 0, 0.25, 0, 10));
  g.add(box(1.0, 0.08, 0.12, metal, 0.45, 5.1, 0));
  g.add(rbox(0.6, 0.12, 0.28, 0.05, metal, 0.85, 5.05, 0));
  g.add(box(0.5, 0.03, 0.22, glow('#ffe7b8', night, 4), 0.85, 4.98, 0));
  if (night) {
    const l = new THREE.PointLight('#ffd9a0', 34, 18, 1.6);
    l.position.set(0.85, 4.8, 0);
    g.add(l);
    lights.push(l);
  }
  return shadowed(g);
}

function bollard(x: number, z: number) {
  const m = cyl(0.12, 1.0, std('#ffffff', { map: stripeTex('#f2c200', '#1c1c1c', 6) }), x, 0.5, z, 12);
  m.rotation.y = Math.PI / 2;
  return m;
}

// ───────── buildings ─────────

function factory(w: number, back: number, night: boolean, root: THREE.Group, lights: THREE.Object3D[]) {
  const W = Math.max(w + 6, 18);
  const D = 16;
  const H = 7.5;
  const ridge = 2.4;
  const front = back - 1.2;
  const shell = new THREE.Shape([
    new THREE.Vector2(-W / 2, 0),
    new THREE.Vector2(W / 2, 0),
    new THREE.Vector2(W / 2, H),
    new THREE.Vector2(0, H + ridge),
    new THREE.Vector2(-W / 2, H),
  ]);
  const shellGeo = new THREE.ExtrudeGeometry(shell, { depth: D, bevelEnabled: false });
  const walls = shadowed(new THREE.Mesh(shellGeo, std('#ffffff', { map: ribTex('#c3cad1', '#9aa3ac'), roughness: 0.55, metalness: 0.3 })));
  walls.position.z = front - D;
  root.add(walls);

  // blue PEB roof sheets with overhang
  const roofMat = std('#ffffff', { map: ribTex('#3d6390', '#2b4a70', false, [W / 2, 1]), roughness: 0.5, metalness: 0.4 });
  const slope = Math.hypot(W / 2, ridge) + 0.5;
  for (const s of [-1, 1]) {
    const r = box(slope, 0.12, D + 0.8, roofMat, (s * W) / 4, H + ridge / 2 + 0.08, front - D / 2);
    r.rotation.z = -s * Math.atan2(ridge, W / 2);
    root.add(r);
  }
  // fascia band, clerestory windows
  root.add(box(W + 0.1, 0.55, 0.12, std('#2b4a70', { roughness: 0.5 }), 0, H - 0.3, front + 0.05));
  root.add(box(W * 0.8, 0.9, 0.08, std('#ffffff', { map: facadeTex('#c3cad1', night, Math.round(W / 2), 1, 2), roughness: 0.3 }), 0, H - 1.3, front + 0.05));

  // loading bay: dark opening with half-raised rolling shutter
  const bw = Math.min(6, W * 0.32);
  root.add(box(bw, 4.6, 0.1, std('#20242a', { emissive: '#ffd89a', emissiveIntensity: night ? 0.25 : 0 }), 0, 2.3, front + 0.06));
  root.add(box(bw, 1.6, 0.14, std('#ffffff', { map: ribTex('#d6d9dc', '#a9adb2', true, [1, 3]), metalness: 0.4, roughness: 0.4 }), 0, 3.8, front + 0.1));
  root.add(box(bw + 0.4, 0.3, 0.4, std('#5b6168', { metalness: 0.5 }), 0, 4.75, front + 0.2));
  // side door
  root.add(box(1.2, 2.3, 0.08, std('#2b4a70'), -W * 0.32, 1.15, front + 0.05));
  root.add(bollard(-bw / 2 - 0.6, front + 0.6));
  root.add(bollard(bw / 2 + 0.6, front + 0.6));
  if (night) {
    const l = new THREE.PointLight('#ffe2b0', 25, 14, 1.6);
    l.position.set(0, 5.6, front + 1.5);
    root.add(l);
    lights.push(l);
  }
  root.add(box(0.6, 0.25, 0.4, glow('#fff1d0', night, 3), 0, 5.4, front + 0.3));

  // two-storey office annex
  const ow = 8;
  const ox = W / 2 + ow / 2 + 0.5;
  root.add(box(ow, 7, 7, std('#ffffff', { map: facadeTex('#e9edf0', night, 3, 2, 4), roughness: 0.5 }), ox, 3.5, front - 3.5));
  root.add(box(ow + 0.3, 0.4, 7.3, std('#2b4a70'), ox, 7.2, front - 3.5));
  root.add(box(2.2, 2.4, 0.1, std('#1d2630', { metalness: 0.8, roughness: 0.1 }), ox, 1.2, front + 0.01));
}

function petrolPump(w: number, h: number, back: number, night: boolean, root: THREE.Group, lights: THREE.Object3D[]) {
  const cw = Math.min(Math.max(w * 0.55, 9), 16);
  const cd = Math.min(Math.max(h * 0.45, 7), 11);
  const cz = -h * 0.06;
  const canopy = new THREE.Group();
  canopy.add(rbox(cw, 0.9, cd, 0.12, std('#f5f5f5', { roughness: 0.5 }), 0, 5.5, 0));
  canopy.add(box(cw + 0.06, 0.5, cd + 0.06, glow('#f26a1b', night, 0.8), 0, 5.5, 0));
  canopy.add(box(cw + 0.08, 0.14, cd + 0.08, std('#1e3a8a'), 0, 5.85, 0));
  // downlights on the underside
  const dl = glow('#ffffff', true, night ? 3 : 0.8);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 3; j++) {
      const c = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), dl);
      c.rotation.x = Math.PI / 2;
      c.position.set(-cw / 2 + ((i + 0.5) * cw) / 4, 5.04, -cd / 2 + ((j + 0.5) * cd) / 3);
      canopy.add(c);
    }
  for (const x of [-cw / 3, cw / 3]) {
    canopy.add(rbox(0.5, 5.1, 0.5, 0.1, std('#eeeeee', { roughness: 0.4 }), x, 2.55, 0));
    // island + two dispensers
    canopy.add(rbox(3.2, 0.25, 1.1, 0.08, std('#d9d4cc'), x, 0.12, 0));
    canopy.add(box(3.22, 0.08, 1.12, std('#f2c200'), x, 0.04, 0));
    for (const dx of [-0.9, 0.9]) {
      const px = x + dx;
      canopy.add(rbox(0.75, 1.9, 0.55, 0.08, std('#fbfbfb', { roughness: 0.35 }), px, 1.2, 0));
      canopy.add(rbox(0.77, 0.4, 0.57, 0.08, glow('#f26a1b', night, 0.6), px, 2.0, 0));
      canopy.add(box(0.45, 0.32, 0.02, glow('#0f1a2a', true, 0.4), px, 1.55, 0.29));
      canopy.add(box(0.45, 0.32, 0.02, glow('#0f1a2a', true, 0.4), px, 1.55, -0.29));
      canopy.add(box(0.1, 0.35, 0.1, std('#111'), px + 0.28, 1.05, 0.31));
      canopy.add(box(0.1, 0.35, 0.1, std('#111'), px - 0.28, 1.05, -0.31));
    }
  }
  canopy.position.set(0, 0, cz);
  root.add(shadowed(canopy));
  if (night) {
    for (const x of [-cw / 4, cw / 4]) {
      const l = new THREE.PointLight('#ffffff', 45, 16, 1.5);
      l.position.set(x, 4.6, cz);
      root.add(l);
      lights.push(l);
    }
  }

  // convenience store
  const sw = Math.min(Math.max(w * 0.5, 9), 14);
  const sx = -w / 2 + sw / 2;
  root.add(box(sw, 3.8, 6, std('#efe9df'), sx, 1.9, back - 3.6));
  root.add(box(sw * 0.8, 2.4, 0.08, std('#2a3742', { emissive: '#ffe2b0', emissiveIntensity: night ? 0.7 : 0.08, metalness: 0.6, roughness: 0.1 }), sx, 1.3, back - 0.58));
  root.add(box(sw + 0.2, 0.7, 0.3, std('#ffffff', { map: signTex('MART', '#1e3a8a', '#ffffff'), emissive: '#ffffff', emissiveIntensity: night ? 0.4 : 0 }), sx, 3.5, back - 0.5));

  // price totem by the road
  const tx = w / 2 + 1.2;
  const tz = h / 2 + 2.2;
  root.add(rbox(1.3, 6, 0.4, 0.1, std('#ffffff', { roughness: 0.4 }), tx, 3, tz));
  root.add(rbox(1.32, 1.4, 0.42, 0.1, glow('#f26a1b', night, 0.8), tx, 5.3, tz));
  root.add(box(1.0, 2.4, 0.44, glow('#14202e', true, 0.5), tx, 3.2, tz));
}

function apartment(bw: number, floors: number, colour: string, night: boolean, seed: number) {
  const g = new THREE.Group();
  const D = 11;
  const fh = 3;
  const bays = Math.max(3, Math.round(bw / 3.4));
  const concrete = std('#d8d2c8', { roughness: 0.9 });
  // stilt floor: columns + slab (typical Indian society parking)
  for (let i = 0; i <= bays; i++)
    for (const z of [-D / 2 + 0.4, D / 2 - 0.4]) g.add(box(0.45, fh, 0.45, concrete, -bw / 2 + 0.3 + (i * (bw - 0.6)) / bays, fh / 2, z));
  g.add(box(bw, fh * 0.5, D * 0.5, std('#b9b2a7'), 0, fh * 0.25 + 0.01, -D / 4)); // lift / staircase core
  const upperH = floors * fh;
  g.add(box(bw, upperH, D, std('#ffffff', { map: facadeTex(colour, night, bays, floors, seed) }), 0, fh + upperH / 2, 0));
  g.add(box(bw + 0.3, 0.3, D + 0.3, concrete, 0, fh, 0));
  // balconies on the front face
  const rail = std('#5a6470', { metalness: 0.6, roughness: 0.4 });
  const bayW = bw / bays;
  for (let f = 0; f < floors; f++) {
    const y = fh + f * fh + 0.1;
    for (let i = 0; i < bays; i += 2) {
      const x = -bw / 2 + (i + 0.5) * bayW;
      g.add(box(bayW * 0.9, 0.16, 1.2, concrete, x, y, D / 2 + 0.6));
      g.add(box(bayW * 0.9, 0.95, 0.05, rail, x, y + 0.55, D / 2 + 1.18));
    }
  }
  // parapet, water tanks, lift room
  const top = fh + upperH;
  g.add(box(bw + 0.2, 0.9, D + 0.2, std(colour), 0, top + 0.45, 0));
  g.add(box(3, 2.4, 3, std(colour), bw / 4, top + 1.2, -1));
  for (const x of [-bw / 4, -bw / 4 + 1.6]) g.add(cyl(0.65, 1.3, std('#1c1c1c', { roughness: 0.6 }), x, top + 0.65 + 0.9, 1.5, 18));
  return shadowed(g);
}

function society(w: number, back: number, night: boolean, root: THREE.Group) {
  const bw = Math.max(12, Math.min(w * 0.5, 20));
  const a = apartment(bw, 6, '#efe3cf', night, 1);
  a.position.set(-bw * 0.6, 0, back - 8);
  root.add(a);
  const b = apartment(bw, 7, '#e2dcea', night, 2);
  b.position.set(bw * 0.6, 0, back - 9);
  root.add(b);
  // compound wall with a gap for the entrance
  const wall = std('#e8e1d6', { roughness: 0.95 });
  root.add(box(w + 10, 1.4, 0.25, wall, 0, 0.7, back - 0.6));
}

function shop(w: number, back: number, night: boolean, root: THREE.Group) {
  const sw = Math.max(Math.min(w * 0.7, 16), 8);
  const z = back - 3.6;
  const g = new THREE.Group();
  // two-storey shophouse
  g.add(box(sw, 3.6, 6, std('#f3eee5'), 0, 1.8, 0));
  g.add(box(sw, 3.2, 6, std('#ffffff', { map: facadeTex('#f3e6d3', night, Math.max(2, Math.round(sw / 3.5)), 1, 3) }), 0, 5.2, 0));
  g.add(box(sw + 0.2, 0.25, 6.2, std('#d8cfc2'), 0, 3.6, 0));
  g.add(box(sw + 0.2, 0.6, 6.2, std('#d8cfc2'), 0, 7.0, 0));
  // glass shopfront with lit interior and mullions
  g.add(box(sw * 0.86, 2.7, 0.08, std('#2b3640', { emissive: '#ffe6bd', emissiveIntensity: night ? 0.9 : 0.12, metalness: 0.5, roughness: 0.08 }), 0, 1.45, 3.02));
  const mull = std('#2c2c2c', { metalness: 0.6 });
  for (let i = 0; i <= 4; i++) g.add(box(0.06, 2.7, 0.1, mull, -sw * 0.43 + (i * sw * 0.86) / 4, 1.45, 3.05));
  // signboard + awning
  g.add(box(sw * 0.9, 0.8, 0.18, std('#ffffff', { map: signTex('STORE', '#f26a1b', '#ffffff'), emissive: '#ffffff', emissiveIntensity: night ? 0.35 : 0 }), 0, 3.25, 3.1));
  const awn = box(sw * 0.9, 0.08, 1.7, std('#ffffff', { map: stripeTex('#f26a1b', '#ffffff', 18) }), 0, 2.85, 3.85);
  awn.rotation.x = 0.28;
  g.add(awn);
  // potted plants
  for (const x of [-sw * 0.47, sw * 0.47]) {
    g.add(cyl(0.3, 0.55, std('#a0522d'), x, 0.28, 3.4, 12));
    const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), std('#4d7a35', { flatShading: true }));
    p.position.set(x, 0.85, 3.4);
    g.add(p);
  }
  g.position.z = z;
  root.add(shadowed(g));
  // neighbouring shop with closed shutter
  const n = new THREE.Group();
  n.add(box(sw * 0.7, 4.0, 6, std('#e6dccd'), 0, 2.0, 0));
  n.add(box(sw * 0.55, 2.6, 0.1, std('#ffffff', { map: ribTex('#c9ccd0', '#9da1a6', true, [1, 6]), metalness: 0.4 }), 0, 1.3, 3.02));
  n.position.set(sw * 0.85 + 0.2, 0, z);
  root.add(shadowed(n));
}

export function buildEnv(env: Env, w: number, h: number, night: boolean, root: THREE.Group, lights: THREE.Object3D[]) {
  const back = -h / 2;
  if (env === 'factory') factory(w, back, night, root, lights);
  else if (env === 'petrol') petrolPump(w, h, back, night, root, lights);
  else if (env === 'society') society(w, back, night, root);
  else shop(w, back, night, root);

  // trees (palms near pumps and shops) and lamps along the sides
  const n = Math.max(2, Math.round(h / 7));
  for (let i = 0; i < n; i++) {
    const z = -h / 2 + ((i + 0.5) * h) / n;
    for (const side of [-1, 1]) {
      const usePalm = (env === 'petrol' || env === 'shop') && (i + (side > 0 ? 1 : 0)) % 2 === 0;
      const tr = usePalm ? palm(0.9 + (i % 2) * 0.15) : tree(0.9 + ((i * 3 + side) % 3) * 0.15, i);
      tr.position.set(side * (w / 2 + 2.4), 0, z);
      tr.rotation.y = i * 1.7;
      root.add(tr);
    }
  }
  for (const [x, z] of [[-w / 2 - 1, h / 2 + 1], [w / 2 + 1, h / 2 + 1]]) {
    const lp = lampPost(night, lights);
    lp.position.set(x, 0, z);
    lp.rotation.y = x < 0 ? Math.PI : 0;
    root.add(lp);
  }
}

/** Park a few vehicles inside the paved area where they fit. */
export function placeVehicles(env: Env, polyM: Pt[], cx: number, cz: number, root: THREE.Group, night: boolean) {
  const b = bbox(polyM);
  const spots: { x: number; z: number }[] = [];
  const fits = (x: number, z: number, hw: number, hd: number) =>
    [
      [x - hw, z - hd],
      [x + hw, z - hd],
      [x - hw, z + hd],
      [x + hw, z + hd],
      [x, z],
    ].every(([px, pz]) => pointInPolygon({ x: px, y: pz }, polyM));
  const colors = ['#e8e8e6', '#2f3a48', '#9b1c1c', '#5b6066', '#1f4e79'];
  const kinds: CarKind[] = ['suv', 'sedan', 'hatch', 'sedan', 'suv'];
  const maxCars = env === 'petrol' ? 2 : 4;
  for (let z = b.minY + 2.2; z < b.maxY - 1.4 && spots.length < maxCars; z += 3.4) {
    for (let x = b.minX + 2.9; x < b.maxX - 2.4 && spots.length < maxCars; x += 5.4) {
      if (env === 'petrol' && Math.abs(x - cx) < 5 && Math.abs(z - cz) < 4) continue;
      if (fits(x, z, 2.45, 1.15)) spots.push({ x, z });
    }
  }
  spots.forEach((s, i) => {
    const c = car(kinds[i % kinds.length], colors[i % colors.length], night);
    c.position.set(s.x - cx, 0.005, s.z - cz);
    c.rotation.y = i % 2 ? Math.PI : 0;
    root.add(c);
  });
  if (env !== 'petrol') {
    for (let k = 0; k < 3; k++) {
      const x = b.maxX - 1.0 - k * 0.85;
      const z = b.minY + 1.3;
      if (fits(x, z, 0.3, 0.95)) {
        const s = scooter();
        s.rotation.y = Math.PI / 2;
        s.position.set(x - cx, 0.005, z - cz);
        root.add(s);
      }
    }
  }
}
