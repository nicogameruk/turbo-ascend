import * as THREE from 'three';
import { BOUNDS } from './car.js';

const SPAWN_Z = -260;
const POOL = 30;
const COLLECT_DIST = 1.9;

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Halo feather: a flat leaf shape.
function featherGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.7);
  s.quadraticCurveTo(0.35, -0.1, 0, 0.7);
  s.quadraticCurveTo(-0.35, -0.1, 0, -0.7);
  return new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: false });
}

// What each level's material looks like.
const LOOKS = {
  1: { geo: () => new THREE.DodecahedronGeometry(0.55, 0), color: 0x6b4423, rough: 0.9, metal: 0, emissive: 0x3b200c, halo: 0xffb347, flat: true },
  2: { geo: () => new THREE.TorusKnotGeometry(0.35, 0.12, 48, 8), color: 0x3fae3a, rough: 0.7, metal: 0, emissive: 0x124a10, halo: 0x9dff6a },
  3: { geo: () => new THREE.BoxGeometry(0.9, 0.25, 0.7), color: 0x9a9ca0, rough: 1, metal: 0, emissive: 0x2a2c30, halo: 0xdfe6ff, flat: true },
  4: { geo: () => new THREE.DodecahedronGeometry(0.55, 1), color: 0x4a4a52, rough: 0.4, metal: 0.9, emissive: 0x6a2a08, halo: 0xff8a3a, flat: true },
  5: { geo: () => new THREE.IcosahedronGeometry(0.5, 1), color: 0xffcc33, rough: 0.15, metal: 1, emissive: 0x6a4a00, halo: 0xffe27a, flat: true },
  6: { geo: () => new THREE.OctahedronGeometry(0.6, 0), color: 0xd8fbff, rough: 0.02, metal: 0.1, emissive: 0x2a9ad0, halo: 0x9ff4ff, flat: true, opacity: 0.8 },
  7: { geo: featherGeometry, color: 0xffffff, rough: 0.5, metal: 0, emissive: 0xaa8833, halo: 0xffe27a },
};

// Floating material you fly into to collect. One look per level.
export function createMaterialField(scene) {
  const geos = {};
  const mat = new THREE.MeshStandardMaterial({ emissiveIntensity: 0.6 });
  const haloGeo = new THREE.SphereGeometry(1, 16, 12);
  const haloMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false });

  const chunks = [];
  for (let i = 0; i < POOL; i++) {
    const group = new THREE.Group();
    const rock = new THREE.Mesh(undefined, mat);
    rock.scale.set(rand(0.9, 1.25), rand(0.8, 1.1), rand(0.9, 1.2));
    rock.castShadow = true;
    group.add(rock, new THREE.Mesh(haloGeo, haloMat));
    group.visible = false;
    scene.add(group);
    chunks.push({ group, rock, alive: false, baseY: 0, phase: rand(0, 6) });
  }

  const kill = (c) => { c.alive = false; c.group.visible = false; };
  const spawn = (x, y, z) => {
    const c = chunks.find((c) => !c.alive);
    if (!c) return;
    c.alive = true;
    c.group.visible = true;
    c.group.position.set(x, y, z);
    c.baseY = y;
  };

  let timer = 0;
  const toCar = new THREE.Vector3();
  return {
    setLook(n) {
      const look = LOOKS[n] ?? LOOKS[1];
      geos[n] ??= look.geo();
      for (const c of chunks) c.rock.geometry = geos[n];
      mat.color.setHex(look.color);
      mat.roughness = look.rough;
      mat.metalness = look.metal;
      mat.emissive.setHex(look.emissive);
      mat.flatShading = !!look.flat;
      mat.transparent = look.opacity !== undefined;
      mat.opacity = look.opacity ?? 1;
      mat.side = n === 7 ? THREE.DoubleSide : THREE.FrontSide;
      mat.needsUpdate = true;
      haloMat.color.setHex(look.halo);
    },

    reset() {
      chunks.forEach(kill);
      timer = 0.5;
    },

    // Returns how many pieces the car collected this frame.
    // magnet: pull radius (0 = no magnet).
    update(dt, speed, carPos, spawning, time, magnet = 0) {
      if (spawning) {
        timer -= dt;
        if (timer <= 0) {
          timer = rand(1.0, 1.6);
          // A short trail of 1–3 pieces, so good steering is rewarded.
          const n = 1 + Math.floor(Math.random() * 3);
          const x = rand(-BOUNDS.x + 0.5, BOUNDS.x - 0.5);
          const y = rand(BOUNDS.yMin + 0.5, BOUNDS.yMax - 0.5);
          const dx = rand(-1.5, 1.5);
          const dy = rand(-1, 1);
          for (let k = 0; k < n; k++) {
            spawn(clamp(x + dx * k, -BOUNDS.x, BOUNDS.x), clamp(y + dy * k, BOUNDS.yMin, BOUNDS.yMax), SPAWN_Z - k * 5);
          }
        }
      }

      let got = 0;
      for (const c of chunks) {
        if (!c.alive) continue;
        const p = c.group.position;
        p.z += speed * dt;
        if (magnet && p.z > -magnet * 2.5 && p.z < 4) {
          toCar.subVectors(carPos, p);
          const d = toCar.length();
          if (d < magnet) {
            const pull = Math.min(1, (1 - Math.exp(-6 * dt)) * (1.5 - d / magnet));
            p.x += toCar.x * pull;
            c.baseY += toCar.y * pull;
            p.z += toCar.z * pull;
          }
        }
        p.y = c.baseY + Math.sin(time * 2 + c.phase) * 0.15;
        c.group.rotation.x += dt * 1.3;
        c.group.rotation.y += dt * 1.7;
        if (p.distanceTo(carPos) < COLLECT_DIST) { kill(c); got++; }
        else if (p.z > 20) kill(c);
      }
      return got;
    },
  };
}
