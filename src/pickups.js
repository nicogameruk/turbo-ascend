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

// Star shard: a chunky 5-point star.
function starGeometry() {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.28 : 0.7;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.25, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 1 });
  g.center();
  return g;
}

// Dragon scale: a flat, pointed hexagon.
function scaleGeometry() {
  const g = new THREE.CylinderGeometry(0.6, 0.6, 0.15, 6);
  g.scale(1, 1, 1.4);
  g.rotateX(Math.PI / 2);
  return g;
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
  8: { geo: starGeometry, color: 0xfff4b0, rough: 0.2, metal: 0.3, emissive: 0xffc840, halo: 0xffe27a },
  9: { geo: () => new THREE.SphereGeometry(0.5, 20, 14), color: 0x0a0610, rough: 0.1, metal: 0.9, emissive: 0x3a0a6a, halo: 0xb04aff },
  10: { geo: () => new THREE.BoxGeometry(0.7, 0.7, 0.7), color: 0x0a1a2a, rough: 0.2, metal: 0.6, emissive: 0x00d8ff, halo: 0xff2ad8 },
  11: { geo: () => new THREE.OctahedronGeometry(0.5, 0).scale(0.7, 1.6, 0.7), color: 0xffc860, rough: 0.05, metal: 0.2, emissive: 0xa86a10, halo: 0xffd890, flat: true, opacity: 0.85 },
  12: { geo: scaleGeometry, color: 0x2a8a3a, rough: 0.3, metal: 0.6, emissive: 0x6a1a0a, halo: 0xff6a2a, flat: true },
  13: { geo: () => new THREE.OctahedronGeometry(0.6, 0), color: 0xffffff, rough: 0.05, metal: 0.1, emissive: 0x888888, halo: 0xffffff, flat: true, rainbow: true },
  14: { geo: () => new THREE.IcosahedronGeometry(0.55, 1), color: 0xfff8e0, rough: 0.1, metal: 0.4, emissive: 0xffd060, halo: 0xfff0b0, flat: true },
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
  let rainbow = false;
  let pullT = 0; // Gravity Pull ability: drag everything in
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
      rainbow = !!look.rainbow;
    },

    // Pull every piece on screen toward the car for a moment.
    pullAll(seconds = 1.2) { pullT = seconds; },

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

      if (rainbow) {
        mat.color.setHSL((time * 0.3) % 1, 0.9, 0.6);
        haloMat.color.setHSL((time * 0.3 + 0.5) % 1, 1, 0.6);
      }
      pullT = Math.max(0, pullT - dt);
      let got = 0;
      for (const c of chunks) {
        if (!c.alive) continue;
        const p = c.group.position;
        p.z += speed * dt;
        if (pullT > 0) {
          const k = 1 - Math.exp(-5 * dt);
          p.x += (carPos.x - p.x) * k;
          c.baseY += (carPos.y - c.baseY) * k;
          p.z += (carPos.z - p.z) * k * 1.5;
        } else if (magnet && p.z > -magnet * 2.5 && p.z < 4) {
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
