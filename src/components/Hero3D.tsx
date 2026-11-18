import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { colourById } from '../config';
import { concreteGrain, makeBlockGeometry } from '../geometry/block3d';
import { colourOf, Design, tileCentre } from '../geometry/trihex';
import { useI18n } from '../i18n';

const DESIGN_A: Design = { pattern: 'stripes', palette: ['grey', 'grey', 'charcoal'], overrides: {} };
const DESIGN_B: Design = { pattern: 'triad', palette: ['terracotta', 'sandstone', 'grey'], overrides: {} };

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// camera keyframes: [progress, position, lookAt]
const KEYS: [number, THREE.Vector3, THREE.Vector3][] = [
  [0.0, new THREE.Vector3(0.6, 6.2, 4.2), new THREE.Vector3(0, 0, -0.4)],
  [0.3, new THREE.Vector3(0.2, 1.3, 3.0), new THREE.Vector3(0, 0.45, 0)],
  [0.58, new THREE.Vector3(-0.4, 1.0, 2.4), new THREE.Vector3(0, 0.55, 0)],
  [1.0, new THREE.Vector3(2.6, 3.6, 3.4), new THREE.Vector3(0, 0, 0)],
];

function cameraAt(p: number, pos: THREE.Vector3, look: THREE.Vector3) {
  for (let i = 0; i < KEYS.length - 1; i++) {
    const [pa, a, la] = KEYS[i];
    const [pb, b, lb] = KEYS[i + 1];
    if (p <= pb || i === KEYS.length - 2) {
      const t = smooth(pa, pb, p);
      pos.lerpVectors(a, b, t);
      look.lerpVectors(la, lb, t);
      return;
    }
  }
}

export default function Hero3D({ onDesign }: { onDesign: () => void }) {
  const { t } = useI18n();
  const wrapRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const p1 = useRef<HTMLDivElement>(null);
  const p2 = useRef<HTMLDivElement>(null);
  const p3 = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const mobile = window.matchMedia('(max-width: 760px)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.6 : 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    const skyTop = new THREE.Color('#3b4a6b');
    const horizon = new THREE.Color('#efc39a');
    scene.fog = new THREE.Fog(horizon, 4.5, 10.5);

    // gradient sky dome
    const skyGeo = new THREE.SphereGeometry(40, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { top: { value: skyTop }, bottom: { value: horizon } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader:
        'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(vP.y*1.8+0.15,0.0,1.0); gl_FragColor = vec4(mix(bottom, top, h),1.0); }',
    });
    scene.add(new THREE.Mesh(skyGeo, skyMat));

    const camera = new THREE.PerspectiveCamera(mobile ? 58 : 45, 1, 0.05, 80);

    scene.add(new THREE.HemisphereLight('#ffe8cf', '#6b5845', 1.1));
    const sun = new THREE.DirectionalLight('#ffe0bd', 2.6);
    sun.position.set(-4, 3.2, -3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
    const sc = sun.shadow.camera as THREE.OrthographicCamera;
    sc.left = sc.bottom = -5;
    sc.right = sc.top = 5;
    sc.near = 0.5;
    sc.far = 15;
    sun.shadow.bias = -0.0005;
    scene.add(sun);

    // sand bed under the blocks (shows in the joints)
    const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshStandardMaterial({ color: '#75695a', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // field of blocks
    const RAD = mobile ? 5 : 6;
    const tiles: { q: number; r: number; x: number; z: number; d: number }[] = [];
    for (let r = -40; r <= 40; r++)
      for (let q = -40; q <= 40; q++) {
        const c = tileCentre(q, r);
        const d = Math.hypot(c.x, c.y);
        if (d < RAD) tiles.push({ q, r, x: c.x, z: c.y, d });
      }
    const geo = makeBlockGeometry(0.08, 'low');
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0, bumpMap: concreteGrain(), bumpScale: 0.6 });
    const field = new THREE.InstancedMesh(geo, mat, tiles.length);
    field.receiveShadow = true;
    field.castShadow = !mobile;
    const colA = tiles.map((tl) => new THREE.Color(colourById(colourOf(DESIGN_A, tl.q, tl.r)).hex));
    const colB = tiles.map((tl) => new THREE.Color(colourById(colourOf(DESIGN_B, tl.q, tl.r)).hex));
    const jitter = tiles.map((_, i) => 0.92 + ((i * 7919) % 100) / 1250);
    const m = new THREE.Matrix4();
    const qn = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    const v = new THREE.Vector3();
    const tmpC = new THREE.Color();
    scene.add(field);

    // hero block
    const heroGeo = makeBlockGeometry(0.08, 'high');
    heroGeo.translate(0, -0.04, 0);
    const hero = new THREE.Mesh(heroGeo, new THREE.MeshStandardMaterial({ color: '#b3b0aa', roughness: 0.85, bumpMap: concreteGrain(), bumpScale: 0.8 }));
    hero.castShadow = true;
    hero.scale.setScalar(2.2);
    scene.add(hero);

    const pos = new THREE.Vector3();
    const look = new THREE.Vector3();
    let progress = 0;
    let shown = -1;
    let raf = 0;
    let running = true;
    const clock = new THREE.Clock();

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    const fade = (el: HTMLElement | null, o: number) => {
      if (!el) return;
      el.style.opacity = String(o);
      el.style.transform = `translateY(${(1 - o) * 24}px)`;
      el.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const rect = wrap.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return; // off-screen: skip work
      const target = Math.min(1, Math.max(0, -rect.top / (rect.height - window.innerHeight)));
      progress += (target - progress) * (reduced ? 1 : 0.12);
      const p = progress;
      const time = clock.getElapsedTime();

      cameraAt(p, pos, look);
      if (!reduced) pos.x += Math.sin(time * 0.25) * 0.08;
      camera.position.copy(pos);
      camera.lookAt(look);

      // phase 2: hero block lifts and turns
      const lift = smooth(0.22, 0.36, p) * (1 - smooth(0.58, 0.68, p));
      hero.visible = lift > 0.001;
      hero.position.set(0, 0.04 + lift * (mobile ? 0.62 : 0.5), 0);
      hero.rotation.set(lift * 0.5, time * 0.4 * lift + lift * 1.2, lift * 0.25);

      // phase 3: blocks fly up and land in the new pattern
      const t3 = smooth(0.62, 0.98, p);
      for (let i = 0; i < tiles.length; i++) {
        const tl = tiles[i];
        const delay = (tl.d / RAD) * 0.55;
        const s = Math.min(1, Math.max(0, (t3 - delay) / 0.45));
        const arc = Math.sin(s * Math.PI);
        const y = arc * (0.9 + (i % 7) * 0.08);
        const spin = arc * ((i % 5) - 2) * 0.35;
        qn.setFromEuler(new THREE.Euler(spin * 0.6, spin, spin * 0.4));
        v.set(tl.x, y, tl.z);
        m.compose(v, qn, one);
        field.setMatrixAt(i, m);
        tmpC.copy(s > 0.5 ? colB[i] : colA[i]).multiplyScalar(jitter[i]);
        field.setColorAt(i, tmpC);
      }
      field.instanceMatrix.needsUpdate = true;
      if (field.instanceColor) field.instanceColor.needsUpdate = true;

      // text panels
      fade(p1.current, 1 - smooth(0.08, 0.2, p));
      fade(hint.current, 1 - smooth(0.02, 0.08, p));
      fade(p2.current, smooth(0.3, 0.38, p) * (1 - smooth(0.54, 0.6, p)));
      fade(p3.current, smooth(0.8, 0.92, p));

      if (shown !== 1) {
        shown = 1;
        canvas.style.opacity = '1';
      }
      if (running) renderer.render(scene, camera);
    };
    frame();

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      renderer.dispose();
      geo.dispose();
      heroGeo.dispose();
    };
  }, []);

  return (
    <section ref={wrapRef} className="hero" id="home">
      <div className="hero-sticky">
        <canvas ref={canvasRef} className="hero-canvas" />
        <div className="hero-shade" />
        <div ref={p1} className="hero-panel hero-panel-1">
          <h1>
            {t('hero_title_1')}
            <br />
            <span className="accent">{t('hero_title_2')}</span>
          </h1>
          <p>{t('hero_sub')}</p>
          <button className="btn btn-primary" onClick={onDesign}>
            {t('hero_cta')} <span aria-hidden>→</span>
          </button>
        </div>
        <div ref={hint} className="scroll-hint">
          {t('scroll')}
          <span className="chev" />
        </div>
        <div ref={p2} className="hero-panel hero-panel-2">
          <h2>
            {t('s2_title')}
            <br />
            <span className="accent">{t('s2_title2')}</span>
          </h2>
          <ul className="feature-chips">
            <li>{t('s2_f1')}</li>
            <li>{t('s2_f2')}</li>
            <li>{t('s2_f3')}</li>
          </ul>
        </div>
        <div ref={p3} className="hero-panel hero-panel-3">
          <h2>
            {t('s3_title')}
            <br />
            <span className="accent">{t('s3_title2')}</span>
          </h2>
          <p>{t('s3_sub')}</p>
          <button className="btn btn-primary" onClick={onDesign}>
            {t('design_own')} <span aria-hidden>→</span>
          </button>
        </div>
      </div>
    </section>
  );
}
