import * as THREE from 'three';
import { BOUNDS } from './car.js';

// Obstacles that aren't enemies. Each one warns you before it can hurt you.
// ctx: { carPos, speed, hit(), sound(name), boom(pos, color, size) }

const rand = (a, b) => a + Math.random() * (b - a);
const glow = (color, opacity = 0.8) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

// ---------- Meteor: falls onto a spot marked by a red ring ----------
const FALL_TIME = 2.2;
function createMeteor(scene) {
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1.1, 0),
    new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.9, flatShading: true, emissive: 0xff4a10, emissiveIntensity: 0.6 }),
  );
  const fire = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 12), glow(0xff7a20, 0.45));
  const tailGeo = new THREE.ConeGeometry(1.1, 5, 12, 1, true);
  tailGeo.translate(0, 2.5, 0);
  const tail = new THREE.Mesh(tailGeo, glow(0xffa040, 0.35));
  const meteor = new THREE.Group();
  meteor.add(rock, fire, tail);
  const marker = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.6, 32), glow(0xff3030, 0.7));
  scene.add(meteor, marker);

  const from = new THREE.Vector3();
  const to = new THREE.Vector3();
  const dir = new THREE.Vector3();
  let t = 0;
  return {
    group: meteor,
    start({ carPos }) {
      // Aim near where the car is now, so you have to move.
      to.set(THREE.MathUtils.clamp(carPos.x + rand(-2, 2), -BOUNDS.x, BOUNDS.x), THREE.MathUtils.clamp(carPos.y + rand(-1.5, 1.5), BOUNDS.yMin, BOUNDS.yMax), 0);
      from.set(to.x + rand(-10, 10), to.y + 34, -70);
      dir.subVectors(to, from);
      meteor.position.copy(from);
      tail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize().negate());
      marker.position.copy(to);
      marker.visible = true;
      meteor.visible = true;
      t = 0;
    },
    hide() { meteor.visible = false; marker.visible = false; },
    update(dt, { carPos, hit, boom, sound }) {
      t += dt;
      meteor.position.copy(from).addScaledVector(dir, t / FALL_TIME);
      rock.rotation.x += dt * 3;
      rock.rotation.y += dt * 2;
      marker.material.opacity = 0.4 + 0.4 * Math.abs(Math.sin(t * (4 + t * 5)));
      marker.scale.setScalar(1 + (1 - Math.min(1, t / FALL_TIME)) * 0.8);
      if (t >= FALL_TIME - 0.15 && t < FALL_TIME + 0.2 && meteor.position.distanceTo(carPos) < 2.1 && hit()) {
        boom(meteor.position, 0xff8a30, 1.5);
        return false;
      }
      if (t >= FALL_TIME) marker.visible = false;
      if (t > FALL_TIME + 0.4) {
        boom(meteor.position, 0xff8a30, 1.2);
        sound('boom');
        return false;
      }
      return true;
    },
  };
}

// ---------- Lightning: a flickering line, then a strike down that column ----------
const WARN_TIME = 1.1;
const STRIKE_TIME = 0.3;
function createLightning(scene) {
  const group = new THREE.Group();
  const warnMat = glow(0xbfd8ff, 0.3);
  const warn = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 40, 6, 1, true), warnMat);
  const boltMat = glow(0xe8f0ff, 1);
  // Zig-zag bolt made of short segments.
  const bolt = new THREE.Group();
  const segGeo = new THREE.BoxGeometry(0.35, 1, 0.35);
  const segs = [];
  for (let i = 0; i < 20; i++) {
    const s = new THREE.Mesh(segGeo, boltMat);
    bolt.add(s);
    segs.push(s);
  }
  const halo = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 40, 12, 1, true), glow(0x7aa8ff, 0.35));
  bolt.add(halo);
  group.add(warn, bolt);
  scene.add(group);

  let t = 0;
  let struck = false;
  const layout = () => {
    let x = 0;
    segs.forEach((s, i) => {
      const nx = rand(-0.6, 0.6);
      s.position.set((x + nx) / 2, 18 - i * 2, 0);
      s.scale.y = 2.3;
      s.rotation.z = Math.atan2(nx - x, 2);
      x = nx;
    });
  };
  return {
    group,
    start({ carPos }) {
      group.position.set(THREE.MathUtils.clamp(carPos.x + rand(-1.5, 1.5), -BOUNDS.x, BOUNDS.x), 0, -2);
      warn.visible = true;
      bolt.visible = false;
      group.visible = true;
      t = 0;
      struck = false;
    },
    hide() { group.visible = false; },
    update(dt, { carPos, hit, sound, flash }) {
      t += dt;
      if (t < WARN_TIME) {
        warnMat.opacity = Math.floor(t * (10 + t * 20)) % 2 ? 0.55 : 0.15;
        return true;
      }
      if (!struck) {
        struck = true;
        warn.visible = false;
        bolt.visible = true;
        layout();
        sound('thunder');
        flash?.();
      }
      if (Math.random() < 0.3) layout();
      boltMat.opacity = Math.random() < 0.5 ? 1 : 0.6;
      if (Math.abs(carPos.x - group.position.x) < 1.4) hit();
      return t < WARN_TIME + STRIKE_TIME;
    },
  };
}

// ---------- Lava wall: rises from below and scrolls at you; fly over it ----------
function createLava(scene) {
  const group = new THREE.Group();
  const lavaMat = new THREE.MeshStandardMaterial({ color: 0xff4a10, emissive: 0xff3a00, emissiveIntensity: 1.4, roughness: 0.6 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(18, 1, 2.5), lavaMat);
  const top = new THREE.Mesh(new THREE.BoxGeometry(18.4, 0.6, 3), glow(0xffc040, 0.7));
  const blobs = [];
  for (let i = 0; i < 8; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), lavaMat);
    blobs.push(b);
    group.add(b);
  }
  group.add(wall, top);
  scene.add(group);

  let height = 3;
  let t = 0;
  let done = false;
  return {
    group,
    start() {
      height = rand(2.6, 4.6);
      wall.scale.y = height + 2;
      wall.position.y = (height - 2) / 2;
      top.position.y = height;
      group.position.set(0, 0, -230);
      group.visible = true;
      t = 0;
      done = false;
    },
    hide() { group.visible = false; },
    update(dt, { carPos, speed, hit }) {
      t += dt;
      group.position.z += speed * dt;
      blobs.forEach((b, i) => {
        const ph = (t * 1.6 + i * 0.37) % 1;
        b.position.set(-8 + i * 2.3, height + ph * 2.5, 0);
        b.scale.setScalar(1 - ph);
      });
      top.material.opacity = 0.5 + Math.sin(t * 8) * 0.2;
      const z = group.position.z;
      if (!done && z > -1.6 && z < 1.6 && carPos.y < height + 0.6) {
        if (hit()) done = true;
      }
      return z < 20;
    },
  };
}

const FACTORIES = { meteor: createMeteor, lightning: createLightning, lava: createLava };
export const HAZARD_WARNINGS = { lava: 'LAVA WALL — fly over it!' };

export function createHazards(scene) {
  const pools = {};
  let timers = [];

  const allSlots = () => Object.values(pools).flat();
  const kill = (slot) => { slot.alive = false; slot.h.hide(); };

  return {
    setLevel(level) {
      timers = (level.hazards ?? []).filter((h) => FACTORIES[h.type]).map((cfg) => ({ cfg, timer: rand(...cfg.every) + 3 }));
    },
    reset() { allSlots().forEach(kill); timers.forEach((w) => { w.timer = rand(...w.cfg.every) + 3; }); },
    hide() { allSlots().forEach(kill); },
    // Returns the name of any hazard that just started (for a warning banner).
    update(dt, ctx, spawning = true) {
      let started = null;
      if (spawning) {
        for (const w of timers) {
          w.timer -= dt;
          if (w.timer > 0) continue;
          w.timer = rand(...w.cfg.every);
          const type = w.cfg.type;
          pools[type] ??= [];
          let slot = pools[type].find((s) => !s.alive);
          if (!slot) { slot = { h: FACTORIES[type](scene), alive: false }; pools[type].push(slot); }
          slot.alive = true;
          slot.h.start(ctx);
          started = type;
        }
      }
      for (const slot of allSlots()) {
        if (slot.alive && !slot.h.update(dt, ctx)) kill(slot);
      }
      return started;
    },
    get count() { return allSlots().filter((s) => s.alive).length; },
  };
}
