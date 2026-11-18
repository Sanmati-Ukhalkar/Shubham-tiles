import * as THREE from 'three';
import { BLOCK } from '../config';
import { blockEdges, EdgeSeg, shrinkSegs } from './trihex';

/**
 * 3D block geometry lying flat on the XZ plane, top face at y = thickness.
 * Tile centre (cx, cy) from the 2D layout maps to world (cx, 0, cy).
 * `segs` is the block outline (defaults to the trihex).
 */
export function makeBlockGeometry(thicknessM = 0.08, detail: 'low' | 'high' = 'low', segs?: EdgeSeg[]): THREE.BufferGeometry {
  const bevel = Math.min(0.008, thicknessM * 0.12);
  const edges = segs ? shrinkSegs(segs, BLOCK.joint + bevel) : blockEdges(BLOCK.radius, BLOCK.bulge, BLOCK.joint + bevel);
  const shape = new THREE.Shape();
  // y is negated so that, after rotating onto the ground, 2D y becomes world +z
  shape.moveTo(edges[0].from.x, -edges[0].from.y);
  for (const e of edges) {
    if (e.ctrl) shape.quadraticCurveTo(e.ctrl.x, -e.ctrl.y, e.to.x, -e.to.y);
    else shape.lineTo(e.to.x, -e.to.y);
  }
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thicknessM - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: detail === 'high' ? 3 : 1,
    curveSegments: detail === 'high' ? 10 : 4,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, bevel, 0);
  geo.computeVertexNormals();
  return geo;
}

let grainTex: THREE.Texture | null = null;
/** Small procedural concrete grain used as a bump map. */
export function concreteGrain(): THREE.Texture {
  if (grainTex) return grainTex;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + Math.random() * 110;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  grainTex = new THREE.CanvasTexture(c);
  grainTex.wrapS = grainTex.wrapT = THREE.RepeatWrapping;
  grainTex.repeat.set(3, 3);
  return grainTex;
}
