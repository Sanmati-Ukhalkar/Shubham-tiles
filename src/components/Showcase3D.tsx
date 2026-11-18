// Full-screen 3D product showcase: the chosen block's floor builds itself in waves,
// and every design switch re-lays (new laying style) or ripples (new colours) the floor.
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { colourById } from '../config';
import { concreteGrain, makeBlockGeometry } from '../geometry/block3d';
import { blockById, colourOf, Design, layoutOf, Tile, tilesInRect } from '../geometry/trihex';

type Group = { mesh: THREE.InstancedMesh; list: Tile[]; dist: number[] };
type Floor = { key: string; groups: Group[]; born: number; dying: number | null; recolourAt: number | null; next: Design | null };

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export default function Showcase3D({ design }: { design: Design }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const api = useRef<{ setDesign: (d: Design) => void } | null>(null);

  useEffect(() => {
    const host = hostRef.current!;
    const mobile = window.matchMedia('(max-width: 760px)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.6 : 2));
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const bg = new THREE.Color('#1d1a17');
    scene.background = bg;
    scene.fog = new THREE.Fog(bg, 5, 11);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.35;
    pmrem.dispose();

    scene.add(new THREE.HemisphereLight('#fff4e6', '#3b3129', 1.0));
    const key = new THREE.DirectionalLight('#fff0dc', 2.6);
    key.position.set(-3, 5, 2.5);
    key.castShadow = true;
    key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
    const sc = key.shadow.camera as THREE.OrthographicCamera;
    sc.left = sc.bottom = -4.5;
    sc.right = sc.top = 4.5;
    sc.far = 15;
    key.shadow.bias = -0.0004;
    scene.add(key);
    // warm rim light from behind for a studio look
    const rim = new THREE.DirectionalLight('#ffb070', 0.9);
    rim.position.set(3, 2, -4);
    scene.add(rim);

    const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: '#3a322b', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.002;
    ground.receiveShadow = true;
    scene.add(ground);

    const camera = new THREE.PerspectiveCamera(mobile ? 55 : 42, 1, 0.05, 60);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 1.6;
    controls.maxDistance = 7;
    controls.maxPolarAngle = Math.PI * 0.44;
    controls.autoRotate = !reduced;
    controls.autoRotateSpeed = 0.5;
    controls.addEventListener('start', () => (controls.autoRotate = false));

    // intro: start almost overhead and close, then swing down to a 3/4 view
    const camFrom = new THREE.Vector3(0.01, 2.2, 0.4);
    const camTo = mobile ? new THREE.Vector3(0, 3.0, 3.6) : new THREE.Vector3(0, 2.6, 3.5);
    camera.position.copy(camFrom);
    const introStart = performance.now();
    const INTRO = reduced ? 0 : 1600;

    const RAD = mobile ? 2.7 : 3.4;
    const thick = 0.07;
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.85, bumpMap: concreteGrain(), bumpScale: 0.6 });
    const m4 = new THREE.Matrix4();
    const q4 = new THREE.Quaternion();
    const e3 = new THREE.Euler();
    const v3 = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    const col = new THREE.Color();

    const floors: Floor[] = [];
    const layoutKey = (d: Design) => `${d.blockId}|${layoutOf(d).id}`;

    const paint = (g: Group, d: Design) => {
      g.list.forEach((tl, i) => {
        const jitter = 0.93 + ((((tl.q * 31 + tl.r * 17 + tl.k * 7) % 13) + 13) % 13) / 100;
        col.set(colourById(colourOf(d, tl.q, tl.r, tl.k)).hex).multiplyScalar(jitter);
        g.mesh.setColorAt(i, col);
      });
      if (g.mesh.instanceColor) g.mesh.instanceColor.needsUpdate = true;
    };

    const build = (d: Design): Floor => {
      const l = layoutOf(d);
      const spec = blockById(d.blockId);
      const tiles = tilesInRect(l, -RAD, -RAD, RAD, RAD, 0).filter((t) => Math.hypot(t.cx, t.cy) < RAD);
      const detail = !mobile && tiles.length < 2200 ? 'high' : 'low';
      const groups: Group[] = [];
      l.protos.forEach((p, k) => {
        const list = tiles.filter((t) => t.k === k);
        if (!list.length) return;
        const mesh = new THREE.InstancedMesh(makeBlockGeometry(thick, detail, p.segs), mat, list.length);
        mesh.castShadow = !mobile;
        mesh.receiveShadow = true;
        const g = { mesh, list, dist: list.map((t) => Math.hypot(t.cx, t.cy) / RAD) };
        paint(g, d);
        scene.add(mesh);
        groups.push(g);
      });
      void spec;
      return { key: layoutKey(d), groups, born: performance.now(), dying: null, recolourAt: null, next: null };
    };

    let current = build(design);
    floors.push(current);

    api.current = {
      setDesign: (d) => {
        if (layoutKey(d) === current.key) {
          // same blocks, new colours: a ripple hops outward and each block lands in its new colour
          current.recolourAt = performance.now();
          current.next = d;
        } else {
          // new laying style: the old floor sinks away while the new one drops in
          current.dying = performance.now();
          current = build(d);
          current.born = performance.now() + 250;
          floors.push(current);
        }
      },
    };

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

    const DROP = reduced ? 1 : 520; // ms per block
    const WAVE = reduced ? 1 : 900; // ms for the wave to cross the floor
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();

      const ti = INTRO ? ease(clamp01((now - introStart) / INTRO)) : 1;
      if (ti < 1) {
        camera.position.lerpVectors(camFrom, camTo, ti);
        controls.target.set(0, 0, 0);
      }

      for (let f = floors.length - 1; f >= 0; f--) {
        const fl = floors[f];
        let alive = true;
        for (const g of fl.groups) {
          for (let i = 0; i < g.list.length; i++) {
            const t = g.list[i];
            let y = 0;
            let tilt = 0;
            // drop in from above, centre first
            const k = clamp01((now - fl.born - g.dist[i] * WAVE) / DROP);
            y += (1 - ease(k)) * 1.6;
            tilt += (1 - ease(k)) * 0.6 * ((i % 3) - 1);
            // sink away when replaced, edge first
            if (fl.dying !== null) {
              const s = clamp01((now - fl.dying - (1 - g.dist[i]) * 300) / 380);
              y -= ease(s) * 0.5;
              if (s >= 1) y = -5;
            }
            // colour ripple
            if (fl.recolourAt !== null && fl.next) {
              const s = clamp01((now - fl.recolourAt - g.dist[i] * WAVE) / 360);
              y += Math.sin(s * Math.PI) * 0.22;
              tilt += Math.sin(s * Math.PI) * 0.9 * (i % 2 ? 1 : -1);
            }
            v3.set(t.cx, y, t.cy);
            q4.setFromEuler(e3.set(tilt, 0, tilt * 0.4));
            m4.compose(v3, q4, one);
            g.mesh.setMatrixAt(i, m4);
          }
          g.mesh.instanceMatrix.needsUpdate = true;
        }
        // swap colours block by block as the ripple passes its peak
        if (fl.recolourAt !== null && fl.next) {
          const next = fl.next;
          for (const g of fl.groups) {
            g.list.forEach((tl, i) => {
              if (now - fl.recolourAt! - g.dist[i] * WAVE > 180) {
                const jitter = 0.93 + ((((tl.q * 31 + tl.r * 17 + tl.k * 7) % 13) + 13) % 13) / 100;
                col.set(colourById(colourOf(next, tl.q, tl.r, tl.k)).hex).multiplyScalar(jitter);
                g.mesh.setColorAt(i, col);
              }
            });
            if (g.mesh.instanceColor) g.mesh.instanceColor.needsUpdate = true;
          }
          if (now - fl.recolourAt > WAVE + 400) {
            fl.groups.forEach((g) => paint(g, next));
            fl.recolourAt = null;
            fl.next = null;
          }
        }
        if (fl.dying !== null && now - fl.dying > 800) alive = false;
        if (!alive) {
          fl.groups.forEach((g) => {
            scene.remove(g.mesh);
            g.mesh.geometry.dispose();
            g.mesh.dispose();
          });
          floors.splice(f, 1);
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      floors.forEach((fl) => fl.groups.forEach((g) => g.mesh.geometry.dispose()));
      mat.dispose();
      scene.environment?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      api.current = null;
    };
    // the scene is built once; later designs are animated in through api.setDesign
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    api.current?.setDesign(design);
  }, [design]);

  return <div className="showcase-stage" ref={hostRef} />;
}
