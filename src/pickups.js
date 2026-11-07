import * as THREE from 'three';
import { BOUNDS } from './car.js';

const SPAWN_Z = -260;
const POOL = 30;
const COLLECT_DIST = 1.9;

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Level 1 material: floating mud chunks you fly into to collect.
export function createMudField(scene) {
  const geo = new THREE.DodecahedronGeometry(0.55, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9, flatShading: true, emissive: 0x3b200c, emissiveIntensity: 0.6 });
  const haloGeo = new THREE.SphereGeometry(1, 16, 12);
  const haloMat = new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false });

  const chunks = [];
  for (let i = 0; i < POOL; i++) {
    const group = new THREE.Group();
    const rock = new THREE.Mesh(geo, mat);
    rock.scale.set(rand(0.9, 1.25), rand(0.8, 1.1), rand(0.9, 1.2));
    rock.castShadow = true;
    group.add(rock, new THREE.Mesh(haloGeo, haloMat));
    group.visible = false;
    scene.add(group);
    chunks.push({ group, alive: false, baseY: 0, phase: rand(0, 6) });
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
  return {
    reset() {
      chunks.forEach(kill);
      timer = 0.5;
    },

    // Returns how many chunks the car collected this frame.
    update(dt, speed, carPos, spawning, time) {
      if (spawning) {
        timer -= dt;
        if (timer <= 0) {
          timer = rand(1.0, 1.6);
          // A short trail of 1–3 chunks, so good steering is rewarded.
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
