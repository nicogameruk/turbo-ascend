import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// A lumpy, natural-looking rock of about the given size (smooth, not faceted).
export function lumpyRock(size = 1, seed = 0) {
  const g = new THREE.IcosahedronGeometry(size, 2);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const a = v.x / size;
    const b = v.y / size;
    const c = v.z / size;
    const n = Math.sin(a * 3.1 + b * 1.7 + seed) * 0.12 + Math.sin(c * 2.3 - b * 2.9 + seed * 2) * 0.1 + Math.sin(a * 7 + c * 5) * 0.04;
    v.multiplyScalar(1 + n);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  // Join the corners up so the light falls smoothly across the surface (no facets).
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  const smooth = mergeVertices(g);
  smooth.computeVertexNormals();
  return smooth;
}

// A box with softly rounded edges and corners, so nothing in the game looks blocky.
// radius defaults to 30% of the box's thinnest side.
export function roundBox(w, h, d, radius) {
  const r = radius ?? Math.min(w, h, d) * 0.3;
  if (r < 0.012) return new THREE.BoxGeometry(w, h, d); // paper-thin: rounding wouldn't show
  return new RoundedBoxGeometry(w, h, d, 3, r);
}
