// Interactive 3D product shot of a single block: slowly turns, drag to spin, pick a colour.
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { COLOURS, colourById } from '../config';
import { concreteGrain, makeBlockGeometry } from '../geometry/block3d';
import { Key, useI18n } from '../i18n';

export default function BlockViewer() {
  const { t } = useI18n();
  const hostRef = useRef<HTMLDivElement>(null);
  const matRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const [colour, setColour] = useState('terracotta');

  useEffect(() => {
    const host = hostRef.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 0.82;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.35;
    pmrem.dispose();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 1.55, 2.5);
    camera.lookAt(0, 0.12, 0);

    scene.add(new THREE.HemisphereLight('#ffffff', '#c9b9a6', 0.6));
    const key = new THREE.DirectionalLight('#fff3e2', 1.7);
    key.position.set(-1.5, 3, 1.2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.radius = 6;
    const sc = key.shadow.camera as THREE.OrthographicCamera;
    sc.left = sc.bottom = -1;
    sc.right = sc.top = 1;
    scene.add(key);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShadowMaterial({ opacity: 0.18 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const geo = makeBlockGeometry(0.08, 'high');
    geo.translate(0, -0.04, 0);
    const mat = new THREE.MeshStandardMaterial({ color: colourById('terracotta').hex, roughness: 0.82, bumpMap: concreteGrain(), bumpScale: 0.9 });
    matRef.current = mat;
    const block = new THREE.Mesh(geo, mat);
    block.castShadow = true;
    block.scale.setScalar(2.7);
    block.position.y = 0.32;
    block.rotation.x = 0.55;
    scene.add(block);

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

    // drag to spin, with a little inertia
    let vel = 0.006;
    let dragging = false;
    let lastX = 0;
    const el = renderer.domElement;
    el.style.touchAction = 'pan-y';
    const down = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      block.rotation.y += dx * 0.012;
      vel = dx * 0.002;
    };
    const up = () => (dragging = false);
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);

    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(host);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const clock = new THREE.Clock();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!visible) return;
      const tt = clock.getElapsedTime();
      if (!dragging) {
        vel += (0.006 - vel) * 0.02;
        if (!reduced) block.rotation.y += vel;
      }
      if (!reduced) block.position.y = 0.32 + Math.sin(tt * 1.2) * 0.02;
      renderer.render(scene, camera);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      geo.dispose();
      mat.dispose();
      scene.environment?.dispose();
      renderer.dispose();
      el.remove();
    };
  }, []);

  useEffect(() => {
    matRef.current?.color.set(colourById(colour).hex);
  }, [colour]);

  return (
    <div className="block-viewer">
      <div className="block-viewer-stage" ref={hostRef} />
      <div className="block-viewer-colours" role="radiogroup" aria-label={t('colours_title')}>
        {COLOURS.map((c) => (
          <button
            key={c.id}
            role="radio"
            aria-checked={colour === c.id}
            className={colour === c.id ? 'on' : ''}
            onClick={() => setColour(c.id)}
            title={t(`colour_${c.id}` as Key)}
          >
            <span style={{ background: `radial-gradient(circle at 35% 30%, ${c.hex}, ${c.dark})` }} />
          </button>
        ))}
      </div>
    </div>
  );
}
