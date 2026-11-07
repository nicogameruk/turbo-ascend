import * as THREE from 'three';
import { BOUNDS } from './car.js';

// All the regular (non-boss) enemies, and the manager that spawns them per level.
//
// Every enemy has: group, start(ctx), update(dt, ctx) -> false when it should go away,
// and optional radius (for ramming the car) and blastable (light blast destroys it).
// ctx: { carPos, speed, elapsed, time, diff, shots, hit() }

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = (k, dt) => 1 - Math.exp(-k * dt);

const std = (color, rough = 0.4, metal = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
const basic = (color) => new THREE.MeshBasicMaterial({ color });
const glowMat = (color, opacity = 0.8) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

function mesh(parent, geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

// Red/blue police lights that flash.
function sirens(parent, x, y, z, gap = 0.25) {
  const red = basic(0xff2030);
  const blue = basic(0x2a60ff);
  const geo = new THREE.BoxGeometry(0.22, 0.14, 0.22);
  mesh(parent, geo, red, x - gap, y, z);
  mesh(parent, geo, blue, x + gap, y, z);
  return (time, fast = false) => {
    const on = Math.floor(time * (fast ? 16 : 7)) % 2 === 0;
    red.color.setHex(on ? 0xff2030 : 0x401014);
    blue.color.setHex(on ? 0x101840 : 0x2a60ff);
  };
}

// ---------- Drone: chases from behind (Level 1 enemy) ----------
const DRONE_SPAWN_Z = 24;
function createDrone() {
  const group = new THREE.Group();
  const metal = std(0x8d96a3, 0.3, 0.85);
  const dark = std(0x2a2f38, 0.5, 0.6);
  const red = basic(0xff2a3a);
  const core = mesh(group, new THREE.SphereGeometry(0.7, 24, 16), metal);
  const band = mesh(group, new THREE.TorusGeometry(0.72, 0.07, 8, 32), red);
  band.rotation.x = Math.PI / 2;
  mesh(group, new THREE.SphereGeometry(0.22, 16, 12), red, 0, 0, -0.62);
  const rotors = [];
  const armGeo = new THREE.BoxGeometry(1.1, 0.08, 0.12);
  const rotorGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.03, 16);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const arm = mesh(group, armGeo, dark, Math.cos(a) * 0.9, 0.25, Math.sin(a) * 0.9);
    arm.rotation.y = -a;
    rotors.push(mesh(group, rotorGeo, dark, Math.cos(a) * 1.4, 0.32, Math.sin(a) * 1.4));
  }

  let offset = 0;
  return {
    group,
    radius: 1.8,
    chaser: true,
    start(ctx, index = 0) {
      offset = index === 0 ? 0 : (index % 2 ? 1 : -1) * 2.2;
      group.position.set(0, 3, DRONE_SPAWN_Z + index * 18);
    },
    knockBack() { group.position.z = DRONE_SPAWN_Z; },
    update(dt, { carPos, speed, elapsed, time, diff }) {
      const own = 47 + diff * 1.2 + Math.min(elapsed * 0.15, 12);
      const p = group.position;
      p.z += (speed - own) * dt; // boosting makes it fall back
      p.z = Math.min(40 + Math.abs(offset) * 8, Math.max(-1.5, p.z));
      const k = ease(1.6 + diff * 0.08, dt);
      const vx = (carPos.x + offset - p.x) * k;
      p.x += vx;
      p.y += (carPos.y - p.y) * k;
      group.rotation.z = -vx * 3;
      for (const r of rotors) r.rotation.y += dt * 40;
      core.position.y = Math.sin(time * 5) * 0.08;
      return true;
    },
  };
}

// ---------- Police hover-bike: pulls up beside you, then swerves into you ----------
function createBike() {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const white = std(0xe8edf5, 0.35, 0.4);
  const navy = std(0x1c2a5a, 0.4, 0.5);
  mesh(body, new THREE.BoxGeometry(0.7, 0.45, 2.4), navy);
  mesh(body, new THREE.BoxGeometry(0.75, 0.2, 1.2), white, 0, 0.25, -0.3);
  mesh(body, new THREE.BoxGeometry(0.5, 0.35, 0.6), std(0x1a2c40, 0.08, 0.9), 0, 0.4, -0.9);
  mesh(body, new THREE.CylinderGeometry(0.45, 0.45, 0.1, 16), glowMat(0x5fe4ff, 0.9), 0, -0.3, -0.7);
  mesh(body, new THREE.CylinderGeometry(0.45, 0.45, 0.1, 16), glowMat(0x5fe4ff, 0.9), 0, -0.3, 0.8);
  const flash = sirens(body, 0, 0.55, 0.7);

  let phase, t, side, vx;
  return {
    group,
    radius: 1.7,
    blastable: true,
    get warning() { return phase === 'approach' && group.position.z > 8; },
    start({ carPos }) {
      side = Math.random() < 0.5 ? -1 : 1;
      group.position.set(clamp(carPos.x + side * 4.5, -BOUNDS.x - 2, BOUNDS.x + 2), carPos.y, 24);
      phase = 'approach';
      t = 0;
    },
    onRam() { phase = 'leave'; },
    update(dt, { carPos, time, diff }) {
      const p = group.position;
      t += dt;
      if (phase === 'approach' || phase === 'warn') {
        if (phase === 'approach') {
          p.z -= (18 + diff) * dt;
          if (p.z <= 0.3) { phase = 'warn'; t = 0; }
        }
        p.x += (clamp(carPos.x + side * 4.5, -BOUNDS.x - 2, BOUNDS.x + 2) - p.x) * ease(4, dt);
        p.y += (carPos.y - p.y) * ease(4, dt);
        if (phase === 'warn' && t > 0.75 - diff * 0.04) { phase = 'swerve'; t = 0; vx = -side * (15 + diff); }
        body.rotation.z = phase === 'warn' ? Math.sin(t * 30) * 0.08 : 0;
      } else if (phase === 'swerve') {
        p.x += vx * dt;
        p.z -= 3 * dt;
        body.rotation.z = side * 0.5;
        if (t > 0.8) phase = 'leave';
      } else {
        p.z -= 40 * dt;
        body.rotation.z *= 0.9;
        if (p.z < -200) return false;
      }
      flash(time, phase === 'warn');
      return true;
    },
  };
}

// ---------- Police jet: overtakes, then fires back at you from ahead ----------
function createJet() {
  const group = new THREE.Group();
  const navy = std(0x24345e, 0.35, 0.6);
  const white = std(0xe8edf5, 0.35, 0.4);
  const nose = mesh(group, new THREE.ConeGeometry(0.5, 1.6, 12), white, 0, 0, -2);
  nose.rotation.x = -Math.PI / 2;
  mesh(group, new THREE.BoxGeometry(1, 0.7, 3), navy);
  mesh(group, new THREE.BoxGeometry(4.2, 0.1, 1.2), navy, 0, 0, 0.4);
  mesh(group, new THREE.BoxGeometry(0.1, 0.9, 0.8), navy, 0, 0.6, 1.2);
  mesh(group, new THREE.BoxGeometry(0.55, 0.3, 0.9), std(0x1a2c40, 0.08, 0.9), 0, 0.45, -0.6);
  const burn = mesh(group, new THREE.ConeGeometry(0.3, 1.2, 12, 1, true), glowMat(0x7ad8ff));
  burn.rotation.x = Math.PI / 2;
  burn.position.z = 2.1;
  const flash = sirens(group, 0, 0.55, 0.2, 0.35);

  let phase, t, fireT, tx, ty;
  return {
    group,
    radius: 1.8,
    blastable: true,
    start() {
      group.position.set(rand(-5, 5), BOUNDS.yMax + 5, 32);
      tx = rand(-5, 5);
      ty = rand(3, 8);
      phase = 'overtake';
      t = 0;
    },
    onRam() { phase = 'leave'; },
    update(dt, { carPos, time, diff, shots }) {
      const p = group.position;
      t += dt;
      if (phase === 'overtake') {
        p.z -= 45 * dt;
        if (p.z < 0) { p.x += (tx - p.x) * ease(1.5, dt); p.y += (ty - p.y) * ease(1.5, dt); }
        if (p.z <= -38) { phase = 'attack'; t = 0; fireT = 0.6; }
      } else if (phase === 'attack') {
        p.x += (carPos.x + Math.sin(t * 1.2) * 3 - p.x) * ease(0.8, dt);
        p.y += (ty - p.y) * ease(1, dt);
        fireT -= dt;
        if (fireT <= 0) {
          fireT = 1.5 - diff * 0.08;
          shots.spawn('red', p, carPos, 30 + diff * 1.5);
        }
        if (t > 5) phase = 'leave';
      } else {
        p.y += 10 * dt;
        p.z -= 30 * dt;
        if (p.z < -220) return false;
      }
      group.rotation.z = Math.sin(t * 2) * 0.12;
      flash(time);
      return true;
    },
  };
}

// ---------- Alien scout UFO: hovers ahead and fires green shots ----------
function createUfo() {
  const group = new THREE.Group();
  const hullMat = std(0x9aa6b4, 0.25, 0.9);
  const saucer = mesh(group, new THREE.SphereGeometry(1.8, 28, 12), hullMat);
  saucer.scale.y = 0.3;
  mesh(group, new THREE.SphereGeometry(0.8, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(0x6dff9a, 0.05, 0.2, { transparent: true, opacity: 0.7, emissive: 0x1a7a3a }), 0, 0.3, 0);
  const lights = [];
  const lightGeo = new THREE.SphereGeometry(0.14, 8, 6);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    lights.push(mesh(group, lightGeo, basic(0x8dff9a), Math.cos(a) * 1.6, -0.05, Math.sin(a) * 1.6));
  }
  mesh(group, new THREE.CylinderGeometry(0.6, 0.9, 0.2, 20), glowMat(0x6dff9a, 0.6), 0, -0.55, 0);

  let phase, t, fireT, baseX;
  return {
    group,
    radius: 2,
    blastable: true,
    start() {
      baseX = rand(-5, 5);
      group.position.set(baseX, rand(3, 8), -230);
      phase = 'enter';
      t = 0;
    },
    onRam() { phase = 'leave'; },
    update(dt, { carPos, time, diff, shots }) {
      const p = group.position;
      t += dt;
      group.rotation.y += dt * 2;
      lights.forEach((l, i) => l.material.color.setHex((Math.floor(time * 8) + i) % 2 ? 0x8dff9a : 0x1a5a2a));
      if (phase === 'enter') {
        p.z += 70 * dt;
        if (p.z >= -32) { phase = 'hover'; t = 0; fireT = 0.8; }
      } else if (phase === 'hover') {
        p.x = baseX + Math.sin(t * 1.3) * 4;
        p.y += Math.sin(time * 3) * 0.02;
        fireT -= dt;
        if (fireT <= 0) {
          fireT = 1.7 - diff * 0.08;
          shots.spawn('green', p, carPos, 26 + diff * 1.5);
        }
        if (t > 6) phase = 'leave';
      } else {
        p.y += 14 * dt;
        p.z -= 25 * dt;
        if (p.y > 40) return false;
      }
      return true;
    },
  };
}

// ---------- Alien warship: big, fires wide volleys ----------
function createWarship() {
  const group = new THREE.Group();
  const hull = std(0x3b2a5a, 0.35, 0.7);
  const dark = std(0x1c1530, 0.5, 0.6);
  mesh(group, new THREE.BoxGeometry(9, 1.8, 6), hull);
  mesh(group, new THREE.BoxGeometry(4, 1.4, 4), dark, 0, 1.4, 0);
  const winGeo = new THREE.BoxGeometry(0.5, 0.3, 0.1);
  const win = basic(0x9dff6a);
  for (let i = -3; i <= 3; i++) mesh(group, winGeo, win, i * 1.2, 0.2, 3.02);
  const cannons = [];
  for (const x of [-3.5, -1.2, 1.2, 3.5]) {
    const c = mesh(group, new THREE.CylinderGeometry(0.3, 0.3, 1.4, 12), dark, x, -1.1, 3);
    c.rotation.x = Math.PI / 2;
    cannons.push(c);
  }
  mesh(group, new THREE.CylinderGeometry(1, 1.4, 0.4, 20), glowMat(0x9dff6a, 0.6), -3, -1, 0);
  mesh(group, new THREE.CylinderGeometry(1, 1.4, 0.4, 20), glowMat(0x9dff6a, 0.6), 3, -1, 0);

  let phase, t, fireT;
  const from = new THREE.Vector3();
  const target = new THREE.Vector3();
  return {
    group,
    blastable: true,
    start() {
      group.position.set(0, 12, -280);
      phase = 'enter';
      t = 0;
    },
    update(dt, { carPos, diff, shots }) {
      const p = group.position;
      t += dt;
      if (phase === 'enter') {
        p.z += 60 * dt;
        if (p.z >= -75) { phase = 'attack'; t = 0; fireT = 1; }
      } else if (phase === 'attack') {
        p.x = Math.sin(t * 0.5) * 4;
        fireT -= dt;
        if (fireT <= 0) {
          fireT = 2.6 - diff * 0.1;
          // A fan of shots across your lane, with a gap to slip through.
          const gap = Math.floor(rand(0, 5));
          for (let i = 0; i < 5; i++) {
            if (i === gap) continue;
            from.set(p.x + (i - 2) * 1.8, p.y - 1, p.z + 3);
            target.set(carPos.x + (i - 2) * 2.6, carPos.y, 0);
            shots.spawn('green', from, target, 34);
          }
        }
        if (t > 11) phase = 'leave';
      } else {
        p.y += 8 * dt;
        p.z -= 30 * dt;
        if (p.z < -320) return false;
      }
      return true;
    },
  };
}

// ---------- Robot sniper: aims a laser sight, then fires a fast shot ----------
function createSniper() {
  const group = new THREE.Group();
  const metal = std(0x50565f, 0.35, 0.85);
  mesh(group, new THREE.BoxGeometry(1, 1.3, 0.8), metal);
  mesh(group, new THREE.SphereGeometry(0.4, 16, 12), metal, 0, 1, 0);
  const eye = mesh(group, new THREE.SphereGeometry(0.14, 10, 8), basic(0xff2050), 0, 1.05, 0.36);
  const rifle = mesh(group, new THREE.CylinderGeometry(0.1, 0.12, 2.2, 10), std(0x1c1f24, 0.5, 0.7), 0.6, 0.3, 0.9);
  rifle.rotation.x = Math.PI / 2;
  mesh(group, new THREE.CylinderGeometry(0.5, 0.6, 0.15, 16), glowMat(0xff5a7a, 0.6), 0, -0.8, 0);

  const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const lineMat = new THREE.LineBasicMaterial({ color: 0xff2050, transparent: true, opacity: 0.4 });
  const sight = new THREE.Line(lineGeo, lineMat);
  sight.frustumCulled = false;

  let phase, t, fired, side;
  const aim = new THREE.Vector3();
  const muzzle = new THREE.Vector3();
  return {
    group,
    blastable: true,
    start() {
      side = Math.random() < 0.5 ? -1 : 1;
      group.position.set(side * rand(4, 7), rand(2, 7), -220);
      if (!sight.parent) group.parent?.add(sight);
      sight.visible = false;
      phase = 'enter';
      t = 0;
      fired = 0;
    },
    stop() { sight.visible = false; },
    update(dt, { carPos, time, diff, shots }) {
      const p = group.position;
      t += dt;
      group.lookAt(carPos.x, carPos.y, carPos.z + 30);
      muzzle.set(p.x, p.y + 0.3, p.z + 2);
      if (phase === 'enter') {
        p.z += 70 * dt;
        if (p.z >= -55) { phase = 'aim'; t = 0; }
      } else if (phase === 'aim' || phase === 'lock') {
        p.y += Math.sin(time * 2) * 0.01;
        if (phase === 'aim') aim.copy(carPos);
        const pos = lineGeo.attributes.position;
        pos.setXYZ(0, muzzle.x, muzzle.y, muzzle.z);
        pos.setXYZ(1, aim.x, aim.y, aim.z + 6);
        pos.needsUpdate = true;
        sight.visible = true;
        lineMat.opacity = phase === 'lock' ? (Math.floor(time * 20) % 2 ? 1 : 0.6) : 0.25 + Math.sin(time * 10) * 0.1;
        eye.material.color.setHex(phase === 'lock' ? 0xffffff : 0xff2050);
        if (phase === 'aim' && t > 1.4 - diff * 0.05) { phase = 'lock'; t = 0; }
        if (phase === 'lock' && t > 0.4) {
          shots.spawn('laser', muzzle, aim, 80);
          fired++;
          phase = fired >= 3 ? 'leave' : 'aim';
          t = 0;
          sight.visible = false;
        }
      } else {
        sight.visible = false;
        p.y += 12 * dt;
        p.z -= 20 * dt;
        if (p.y > 40) return false;
      }
      return true;
    },
  };
}

// ---------- Demon with fire wings: dives at you and throws a fireball ----------
function createDemon() {
  const group = new THREE.Group();
  const skin = std(0x8a1a12, 0.5, 0.2, { emissive: 0x3a0500, emissiveIntensity: 0.6 });
  const horn = std(0x1a1010, 0.4, 0.3);
  const body = mesh(group, new THREE.SphereGeometry(0.75, 18, 14), skin);
  body.scale.set(1, 1.15, 0.9);
  mesh(group, new THREE.SphereGeometry(0.45, 16, 12), skin, 0, 0.95, -0.1);
  for (const x of [-0.25, 0.25]) {
    const h = mesh(group, new THREE.ConeGeometry(0.1, 0.5, 8), horn, x, 1.35, -0.1);
    h.rotation.z = -x * 1.6;
  }
  for (const x of [-0.16, 0.16]) mesh(group, new THREE.SphereGeometry(0.07, 8, 6), basic(0xffe040), x, 1, 0.33);
  // Fire wings: flat flame shapes that flap.
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.quadraticCurveTo(1.2, 1.4, 2.6, 1.2);
  wingShape.quadraticCurveTo(2, 0.4, 2.4, -0.2);
  wingShape.quadraticCurveTo(1.4, 0, 1.6, -0.8);
  wingShape.quadraticCurveTo(0.8, -0.3, 0, 0);
  const wingGeo = new THREE.ShapeGeometry(wingShape);
  const wingMat = glowMat(0xff6a1a, 0.85);
  const wings = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.4, 0.4, 0.2);
    pivot.scale.x = s;
    const w = new THREE.Mesh(wingGeo, wingMat);
    pivot.add(w);
    group.add(pivot);
    return pivot;
  });

  let threw, speed, phase;
  return {
    group,
    radius: 1.8,
    blastable: true,
    start({ diff }) {
      group.position.set(rand(-6, 6), rand(1.5, 7), -230);
      threw = false;
      speed = 26 + diff * 2 + rand(0, 8);
      phase = rand(0, 6);
    },
    onRam() { group.position.z = 30; },
    update(dt, { carPos, time, shots }) {
      const p = group.position;
      p.z += speed * dt;
      if (p.z < -12) {
        const k = ease(0.9, dt);
        p.x += (carPos.x - p.x) * k;
        p.y += (carPos.y - p.y) * k;
      }
      p.y += Math.sin(time * 4 + phase) * 0.04;
      const flap = Math.sin(time * 12 + phase) * 0.6;
      wings.forEach((w) => { w.rotation.y = flap; });
      group.lookAt(carPos.x, p.y, 40);
      if (!threw && p.z > -70) {
        threw = true;
        shots.spawn('fire', p, carPos, 34);
      }
      return p.z < 25;
    },
  };
}

const FACTORIES = { bike: createBike, jet: createJet, ufo: createUfo, warship: createWarship, sniper: createSniper, demon: createDemon };

export function createEnemies(scene, booms) {
  const drones = [createDrone(), createDrone()];
  drones.forEach((d) => { d.group.visible = false; scene.add(d.group); });
  const pools = {}; // type -> [{ enemy, alive }]
  let level = null;
  let waves = []; // { cfg, timer }

  const take = (type, ctx) => {
    pools[type] ??= [];
    let slot = pools[type].find((s) => !s.alive);
    if (!slot) {
      slot = { enemy: FACTORIES[type](), alive: false };
      scene.add(slot.enemy.group);
      pools[type].push(slot);
    }
    slot.alive = true;
    slot.enemy.group.visible = true;
    slot.enemy.start(ctx);
    return slot;
  };
  const kill = (slot) => {
    slot.alive = false;
    slot.enemy.group.visible = false;
    slot.enemy.stop?.();
  };
  const allSlots = () => Object.values(pools).flat();
  const chasers = () => drones.slice(0, level?.enemies.chasers ?? 0);

  return {
    setLevel(l) { level = l; },

    // Start of a run (or the end of the flying part): clear everyone away.
    reset(ctx) {
      allSlots().forEach(kill);
      drones.forEach((d) => { d.group.visible = false; });
      chasers().forEach((d, i) => { d.group.visible = true; d.start(ctx, i); });
      waves = level.enemies.waves.map((cfg) => ({ cfg, timer: rand(...cfg.every) * 0.6 }));
    },

    hide() {
      allSlots().forEach(kill);
      drones.forEach((d) => { d.group.visible = false; });
    },

    update(dt, ctx) {
      for (const w of waves) {
        w.timer -= dt;
        if (w.timer <= 0) {
          w.timer = rand(...w.cfg.every) * (1 - ctx.diff * 0.04);
          const alive = (pools[w.cfg.type] ?? []).filter((s) => s.alive).length;
          if (alive < w.cfg.max) take(w.cfg.type, ctx);
        }
      }

      for (const d of chasers()) {
        d.update(dt, ctx);
        if (d.group.position.distanceTo(ctx.carPos) < d.radius && ctx.hit()) d.knockBack();
      }
      for (const slot of allSlots()) {
        if (!slot.alive) continue;
        const e = slot.enemy;
        if (!e.update(dt, ctx)) { kill(slot); continue; }
        if (e.radius && e.group.position.distanceTo(ctx.carPos) < e.radius && ctx.hit()) {
          if (e.onRam) e.onRam(); else { booms.spawn(e.group.position); kill(slot); }
        }
      }
    },

    // Light blast: destroy enemies close enough, knock drones back.
    blast(carPos, range = 70) {
      let n = 0;
      for (const d of chasers()) if (d.group.position.distanceTo(carPos) < range) d.knockBack();
      for (const slot of allSlots()) {
        if (!slot.alive || !slot.enemy.blastable) continue;
        if (slot.enemy.group.position.distanceTo(carPos) < range) {
          booms.spawn(slot.enemy.group.position, 0xfff0b0, 1.6);
          kill(slot);
          n++;
        }
      }
      return n;
    },

    // True when something dangerous is right behind you (off screen).
    get warning() {
      const behind = chasers().some((d) => d.group.position.z > 12 && d.group.position.z < 26);
      return behind || allSlots().some((s) => s.alive && s.enemy.warning);
    },
    get count() { return allSlots().filter((s) => s.alive).length + chasers().length; },
    drones,
  };
}
