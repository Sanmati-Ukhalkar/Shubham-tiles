import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { BLOCK, colourById } from '../config';
import { concreteGrain, makeBlockGeometry } from '../geometry/block3d';
import { blockPath, drawTiles } from '../geometry/render2d';
import { bbox, blockOutline, colourOf, Design, pointInPolygon, Pt, Tile } from '../geometry/trihex';
import { Key, useI18n } from '../i18n';
import type { Env } from './Designer';
import { buildEnv, placeVehicles, std } from './props3d';

type Props = {
  polyM: Pt[];
  tiles: Tile[];
  design: Design;
  env: Env;
  night: boolean;
  thicknessMm: number;
  onSnapshot: (dataUrl: string) => void;
};

// ───────── textures ─────────

function pavingTextures(polyM: Pt[], tiles: Tile[], design: Design, maxPx: number) {
  const b = bbox(polyM);
  const scale = Math.min(maxPx / b.w, maxPx / b.h, 260);
  const w = Math.max(2, Math.ceil(b.w * scale));
  const h = Math.max(2, Math.ceil(b.h * scale));
  const view = { scale, ox: -b.minX * scale, oy: -b.minY * scale };

  const col = document.createElement('canvas');
  col.width = w;
  col.height = h;
  const cctx = col.getContext('2d')!;
  cctx.fillStyle = '#6f6a62';
  cctx.fillRect(0, 0, w, h);
  drawTiles(cctx, tiles, design, view, polyM, '#4f4941');

  const bump = document.createElement('canvas');
  bump.width = w;
  bump.height = h;
  const bctx = bump.getContext('2d')!;
  bctx.fillStyle = '#000';
  bctx.fillRect(0, 0, w, h);
  const path = blockPath();
  bctx.translate(view.ox, view.oy);
  bctx.scale(scale, scale);
  bctx.fillStyle = '#fff';
  bctx.shadowColor = '#000';
  bctx.shadowBlur = 0;
  for (const tl of tiles) {
    bctx.save();
    bctx.translate(tl.cx, tl.cy);
    bctx.fill(path);
    bctx.restore();
  }
  const ct = new THREE.CanvasTexture(col);
  ct.colorSpace = THREE.SRGBColorSpace;
  ct.anisotropy = 8;
  const bt = new THREE.CanvasTexture(bump);
  return { ct, bt, b };
}

export default function Preview3D({ polyM, tiles, design, env, night, thicknessMm, onSnapshot }: Props) {
  const { t } = useI18n();
  const hostRef = useRef<HTMLDivElement>(null);
  const ctx = useRef<{
    renderer: THREE.WebGLRenderer;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    scene: THREE.Scene;
    envMap: THREE.Texture;
  } | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const snapRef = useRef(onSnapshot);
  snapRef.current = onSnapshot;
  const camAnim = useRef<((now: number) => boolean) | null>(null);
  const blockAnim = useRef<((now: number) => boolean) | null>(null);

  // renderer, camera, controls — once
  useEffect(() => {
    const host = hostRef.current!;
    const mobile = window.matchMedia('(max-width: 760px)').matches;
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.6 : 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    host.appendChild(renderer.domElement);
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.autoRotateSpeed = 0.6;
    const scene = new THREE.Scene();
    // soft studio-style reflections so concrete, paint and glass read as real materials
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    ctx.current = { renderer, camera, controls, scene, envMap };
    frameRef.current.key = ''; // new camera → frame it again on the next scene build
    // stop auto-rotate as soon as the user grabs the view
    controls.addEventListener('start', () => setAutoRotate(false));

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      if (camAnim.current && !camAnim.current(now)) camAnim.current = null;
      if (blockAnim.current && !blockAnim.current(now)) blockAnim.current = null;
      controls.update();
      renderer.render(ctx.current!.scene, camera);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      try {
        snapRef.current(renderer.domElement.toDataURL('image/jpeg', 0.85));
      } catch {
        /* ignore */
      }
      controls.dispose();
      envMap.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  useEffect(() => {
    if (ctx.current) ctx.current.controls.autoRotate = autoRotate;
  }, [autoRotate]);

  const frameRef = useRef<{ d: number; w: number; h: number; key: string }>({ d: 10, w: 10, h: 10, key: '' });
  const lastLayout = useRef<{ tiles: Tile[] | null; design: Design | null; thick: number }>({ tiles: null, design: null, thick: 0 });

  /** Smoothly move the camera to a preset. */
  const goTo = (view: CamView, instant = false) => {
    const c = ctx.current;
    if (!c) return;
    const { d, w, h } = frameRef.current;
    const to = new THREE.Vector3();
    const look = new THREE.Vector3();
    if (view === 'aerial') to.set(d * 0.45, d * 0.6, d * 0.8);
    else if (view === 'top') to.set(0, d * 1.25, 0.01);
    else {
      to.set(w * 0.18, 1.6, h / 2 + 4.5);
      look.set(0, 0.6, 0);
    }
    if (instant) {
      c.camera.position.copy(to);
      c.controls.target.copy(look);
      return;
    }
    if (view !== 'aerial') setAutoRotate(false);
    const from = c.camera.position.clone();
    const fromT = c.controls.target.clone();
    const t0 = performance.now();
    camAnim.current = (now) => {
      const k = Math.min(1, (now - t0) / 900);
      const e = 1 - Math.pow(1 - k, 3);
      c.camera.position.lerpVectors(from, to, e);
      c.controls.target.lerpVectors(fromT, look, e);
      return k < 1;
    };
  };

  // scene — rebuilt when the design or setting changes
  useEffect(() => {
    const c = ctx.current!;
    const mobile = window.matchMedia('(max-width: 760px)').matches;
    const scene = new THREE.Scene();
    const lights: THREE.Object3D[] = [];
    const disposables: { dispose: () => void }[] = [];

    const b = bbox(polyM);
    const cx = b.minX + b.w / 2;
    const cz = b.minY + b.h / 2;
    const size = Math.max(b.w, b.h);
    const toLocal = (p: Pt) => new THREE.Vector2(p.x - cx, -(p.y - cz)); // shape space (rotated onto the ground later)

    // sky
    const skyTop = new THREE.Color(night ? '#060a14' : '#7fb0dd');
    const skyLow = new THREE.Color(night ? '#1c2640' : '#eef1ee');
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(450, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: skyTop }, low: { value: skyLow } },
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 top; uniform vec3 low; varying vec3 vP; void main(){ float h = clamp(vP.y*2.2,0.0,1.0); gl_FragColor = vec4(mix(low, top, pow(h,0.8)),1.0); }',
      }),
    );
    scene.add(sky);
    scene.fog = new THREE.Fog(skyLow, size + 30, size * 4 + 160);
    scene.environment = c.envMap;
    scene.environmentIntensity = night ? 0.06 : 0.45;

    // lighting
    if (night) {
      scene.add(new THREE.HemisphereLight('#3a4a75', '#0b0e14', 0.45));
      const moon = new THREE.DirectionalLight('#9fb4ff', 0.45);
      moon.position.set(-10, 20, 8);
      scene.add(moon);
    } else {
      scene.add(new THREE.HemisphereLight('#fff6ea', '#7d7466', 0.9));
      const sun = new THREE.DirectionalLight('#fff0dc', 2.8);
      sun.position.set(-size * 0.6 - 8, size * 0.8 + 14, size * 0.5 + 6);
      sun.castShadow = true;
      sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
      const sc = sun.shadow.camera as THREE.OrthographicCamera;
      const e = size * 0.75 + 16;
      sc.left = sc.bottom = -e;
      sc.right = sc.top = e;
      sc.far = size * 3 + 80;
      sun.shadow.bias = -0.0003;
      sun.shadow.normalBias = 0.02;
      scene.add(sun);
    }

    // ground: concrete apron with the plot cut out of it
    const apronShape = new THREE.Shape([new THREE.Vector2(-200, -200), new THREE.Vector2(200, -200), new THREE.Vector2(200, 200), new THREE.Vector2(-200, 200)]);
    apronShape.holes.push(new THREE.Path(polyM.map(toLocal)));
    const apronGeo = new THREE.ShapeGeometry(apronShape);
    apronGeo.rotateX(-Math.PI / 2);
    const apronTex = concreteGrain().clone();
    apronTex.repeat.set(60, 60);
    apronTex.needsUpdate = true;
    disposables.push(apronTex);
    const apron = new THREE.Mesh(apronGeo, std(night ? '#57554f' : '#aaa59c', { roughness: 1, bumpMap: apronTex, bumpScale: 0.4 }));
    apron.receiveShadow = true;
    scene.add(apron);

    // sand bed under the plot (visible deep in the joints)
    const bedGeo = new THREE.ShapeGeometry(new THREE.Shape(polyM.map(toLocal)));
    bedGeo.rotateX(-Math.PI / 2);
    const bed = new THREE.Mesh(bedGeo, std('#4a443c', { roughness: 1 }));
    bed.position.y = -0.03;
    scene.add(bed);

    // road with lane markings
    const roadZ = b.h / 2 + 6.5;
    const road = new THREE.Mesh(new THREE.PlaneGeometry(400, 7), std('#3a3b3e', { roughness: 0.95 }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.003, roadZ);
    road.receiveShadow = true;
    scene.add(road);
    const dashMat = std('#f2f2ee', { roughness: 0.7, emissive: night ? '#555' : '#000' });
    for (let x = -120; x < 120; x += 6) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.15), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x, 0.005, roadZ);
      scene.add(dash);
    }
    const grass = std('#6a8c45', { roughness: 1 });
    for (const side of [-1, 1]) {
      const g = new THREE.Mesh(new THREE.PlaneGeometry(3.6, b.h + 4), grass);
      g.rotation.x = -Math.PI / 2;
      g.position.set(side * (b.w / 2 + 2.4), 0.004, 0);
      g.receiveShadow = true;
      scene.add(g);
    }

    // ── the paving ──
    // Whole blocks are real 3D blocks; blocks cut at the boundary come from an exact top-down texture.
    const thick = thicknessMm / 1000;
    const outline = blockOutline(BLOCK.radius, 4);
    const limit = mobile ? 7000 : 20000;
    const inside: Tile[] = [];
    const edge: Tile[] = [];
    for (const tl of tiles) {
      const whole = outline.every((p) => pointInPolygon({ x: p.x + tl.cx, y: p.y + tl.cy }, polyM));
      (whole ? inside : edge).push(tl);
    }
    const use3D = inside.length <= limit;
    const texTiles = use3D ? edge : tiles;

    const { ct, bt } = pavingTextures(polyM, texTiles, design, mobile ? 2048 : 4096);
    disposables.push(ct, bt);
    const topGeo = new THREE.ShapeGeometry(new THREE.Shape(polyM.map(toLocal)));
    topGeo.rotateX(-Math.PI / 2);
    const pos = topGeo.attributes.position;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = (pos.getX(i) + cx - b.minX) / b.w;
      uv[i * 2 + 1] = 1 - (pos.getZ(i) + cz - b.minY) / b.h;
    }
    topGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const top = new THREE.Mesh(topGeo, new THREE.MeshStandardMaterial({ map: ct, bumpMap: bt, bumpScale: 2, roughness: 0.9 }));
    top.position.y = use3D ? -0.004 : 0.002;
    top.receiveShadow = true;
    scene.add(top);

    let blocks: THREE.InstancedMesh | null = null;
    const layoutChanged =
      lastLayout.current.tiles !== tiles || lastLayout.current.design !== design || lastLayout.current.thick !== thicknessMm;
    lastLayout.current = { tiles, design, thick: thicknessMm };

    if (use3D && inside.length) {
      const geo = makeBlockGeometry(thick, !mobile && inside.length < 2500 ? 'high' : 'low');
      const mat = new THREE.MeshStandardMaterial({ roughness: 0.88, bumpMap: concreteGrain(), bumpScale: 0.5 });
      blocks = new THREE.InstancedMesh(geo, mat, inside.length);
      blocks.receiveShadow = true;
      blocks.castShadow = !mobile && !night;
      const m4 = new THREE.Matrix4();
      const col = new THREE.Color();
      const baseY = -thick + 0.002;
      inside.forEach((tl, i) => {
        m4.makeTranslation(tl.cx - cx, baseY, tl.cy - cz);
        blocks!.setMatrixAt(i, m4);
        const jitter = 0.93 + (((tl.q * 31 + tl.r * 17) % 13) + 13) % 13 / 100;
        col.set(colourById(colourOf(design, tl.q, tl.r)).hex).multiplyScalar(jitter);
        blocks!.setColorAt(i, col);
      });
      scene.add(blocks);

      // blocks drop into place when the layout changes
      if (layoutChanged && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const delays = inside.map((tl) => (Math.hypot(tl.cx - b.minX, tl.cy - b.minY) / Math.hypot(b.w, b.h)) * 900);
        const t0 = performance.now();
        const inst = blocks;
        blockAnim.current = (now) => {
          let busy = false;
          for (let i = 0; i < inside.length; i++) {
            const k = Math.min(1, Math.max(0, (now - t0 - delays[i]) / 420));
            if (k < 1) busy = true;
            const e = 1 - Math.pow(1 - k, 3);
            m4.makeTranslation(inside[i].cx - cx, baseY + (1 - e) * 1.4, inside[i].cy - cz);
            inst.setMatrixAt(i, m4);
          }
          inst.instanceMatrix.needsUpdate = true;
          return busy;
        };
      }
    }

    const root = new THREE.Group();
    buildEnv(env, b.w, b.h, night, root, lights);
    placeVehicles(env, polyM, cx, cz, root, night);
    scene.add(root);

    // camera framing only when the plot itself changes, so toggles keep your view
    const key = polyM.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join('|');
    const d = size * 0.8 + 4;
    frameRef.current = { d, w: b.w, h: b.h, key: frameRef.current.key };
    c.controls.minDistance = 2;
    c.controls.maxDistance = d * 2.5;
    c.camera.far = d * 10 + 600;
    c.camera.updateProjectionMatrix();
    if (frameRef.current.key !== key) {
      frameRef.current.key = key;
      goTo('aerial', true);
    }
    c.renderer.toneMappingExposure = night ? 1.3 : 1.0;

    c.scene = scene;
    return () => {
      blockAnim.current = null;
      disposables.forEach((x) => x.dispose());
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polyM, tiles, design, env, night, thicknessMm]);

  return (
    <div className="preview3d" ref={hostRef}>
      <button className={`chip chip-float ${autoRotate ? 'chip-on' : ''}`} onClick={() => setAutoRotate(!autoRotate)}>
        ⟳ {t('rotate')}
      </button>
      <div className="view-btns">
        {(['aerial', 'eye', 'top'] as CamView[]).map((v) => (
          <button key={v} className="chip" onClick={() => goTo(v)}>
            {t(`view_${v}` as Key)}
          </button>
        ))}
      </div>
    </div>
  );
}

type CamView = 'aerial' | 'eye' | 'top';
