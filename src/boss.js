import * as THREE from 'three';
import { BOUNDS } from './car.js';

const HOME_Z = -45; // where the boss hovers, ahead of the car
const ENTER_Z = -160;
const RED_SPEED = 30;
const BLUE_SPEED = 24;
const BOLT_SPEED = 110;

const rand = (a, b) => a + Math.random() * (b - a);

// The boss at the end of each level. It fires red shots (dodge them) and
// releases blue power cores (catch them to fire a bolt back at it).
// Each level's boss (levels.js) changes its colour, extras, health and fire rate.
export function createBoss(scene) {
  const group = new THREE.Group();
  const body = new THREE.Group(); // spins and shrinks when destroyed
  group.add(body);
  group.visible = false;
  scene.add(group);

  const hullMat = new THREE.MeshStandardMaterial({ color: 0x6d5a48, roughness: 0.6, metalness: 0.5, emissive: 0xff2020, emissiveIntensity: 0 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.5, metalness: 0.6 });
  const red = new THREE.MeshBasicMaterial({ color: 0xff2a3a });

  const add = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    body.add(m);
    return m;
  };
  add(new THREE.BoxGeometry(7, 2.2, 4), hullMat, 0, 0, 0);
  add(new THREE.BoxGeometry(4, 1.2, 2.6), hullMat, 0, 1.5, -0.3);
  add(new THREE.BoxGeometry(5, 0.8, 1), dark, 0, -1.3, 1.6);
  add(new THREE.SphereGeometry(0.8, 24, 16), red, 0, 0.3, 2.05);
  add(new THREE.TorusGeometry(0.95, 0.15, 10, 32), dark, 0, 0.3, 2.05);

  const rotors = [];
  const pods = []; // hidden for the mothership and the demon
  const podGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.6, 20);
  const rotorGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.04, 20);
  for (const x of [-4.6, 4.6]) {
    for (const z of [-1.2, 1.2]) {
      pods.push(add(podGeo, dark, x, 0.4, z));
      rotors.push(add(rotorGeo, dark, x, 0.8, z));
    }
  }
  // Level extras.
  const extras = {};
  const extra = (name) => {
    const g = new THREE.Group();
    g.visible = false;
    body.add(g);
    extras[name] = g;
    return g;
  };
  const put = (g, geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  { // Thorn Harvester: vines and thorns
    const g = extra('vines');
    const vine = new THREE.MeshStandardMaterial({ color: 0x2f7a2a, roughness: 0.8 });
    for (const x of [-2.5, 0, 2.5]) put(g, new THREE.TorusGeometry(1.5, 0.18, 8, 24), vine, x, 0, 0).rotation.y = Math.PI / 2;
    const thorn = new THREE.ConeGeometry(0.2, 0.8, 6);
    for (let i = 0; i < 8; i++) put(g, thorn, vine, -3 + i * 0.85, 1.4, 1.2 * (i % 2 ? 1 : -1));
  }
  const sirenMats = [new THREE.MeshBasicMaterial({ color: 0xff2030 }), new THREE.MeshBasicMaterial({ color: 0x2a60ff })];
  { // Police Gunship: light bar and stripes
    const g = extra('sirens');
    for (let i = 0; i < 6; i++) put(g, new THREE.BoxGeometry(0.55, 0.3, 0.5), sirenMats[i % 2], -1.4 + i * 0.56, 2.25, -0.3);
    const white = new THREE.MeshStandardMaterial({ color: 0xeef2f8, roughness: 0.4 });
    put(g, new THREE.BoxGeometry(7.05, 0.4, 4.05), white, 0, 0.2, 0);
  }
  { // Alien Mothership: saucer ring with lights
    const g = extra('saucer');
    const ring = put(g, new THREE.CylinderGeometry(6, 6.5, 0.5, 40), new THREE.MeshStandardMaterial({ color: 0x8a96a6, roughness: 0.25, metalness: 0.9 }), 0, -0.2, 0);
    ring.castShadow = true;
    const light = new THREE.MeshBasicMaterial({ color: 0x8dff9a });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      put(g, new THREE.SphereGeometry(0.2, 8, 6), light, Math.cos(a) * 6.3, -0.2, Math.sin(a) * 6.3);
    }
    put(g, new THREE.SphereGeometry(2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x6dff9a, transparent: true, opacity: 0.6, emissive: 0x1a7a3a }), 0, 2, -0.3);
  }
  { // Gold Colossus: crown spikes
    const g = extra('gold');
    const gold = new THREE.MeshStandardMaterial({ color: 0xffd84a, roughness: 0.1, metalness: 1, emissive: 0x4a3000 });
    for (let i = 0; i < 5; i++) put(g, new THREE.ConeGeometry(0.35, 1.4, 6), gold, -1.6 + i * 0.8, 2.7, -0.3);
    put(g, new THREE.BoxGeometry(4.2, 0.3, 2.8), gold, 0, 2.1, -0.3);
  }
  { // Crystal Dreadnought: big crystal spikes
    const g = extra('crystal');
    const crystal = new THREE.MeshStandardMaterial({ color: 0xdffaff, roughness: 0.05, transparent: true, opacity: 0.75, emissive: 0x44bbee, emissiveIntensity: 0.7 });
    const spike = new THREE.OctahedronGeometry(0.8, 0);
    for (const [x, y, z, sy] of [[-3, 1.6, 0, 2.2], [3, 1.6, 0, 2.2], [0, 2.8, -0.3, 2.6], [-1.6, 2.2, 0.8, 1.6], [1.6, 2.2, 0.8, 1.6], [-4.4, -0.4, 0, 1.4], [4.4, -0.4, 0, 1.4]]) {
      put(g, spike, crystal, x, y, z).scale.set(0.6, sy, 0.6);
    }
  }
  const demonWings = [];
  { // Demon King: horns, crown and fire wings
    const g = extra('demon');
    const horn = new THREE.MeshStandardMaterial({ color: 0x1a1010, roughness: 0.4 });
    for (const s of [-1, 1]) {
      const h = put(g, new THREE.ConeGeometry(0.45, 2.4, 10), horn, s * 1.6, 3, -0.3);
      h.rotation.z = -s * 0.5;
    }
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.quadraticCurveTo(3, 4, 7, 3.4);
    wingShape.quadraticCurveTo(5.5, 1.2, 6.5, -0.6);
    wingShape.quadraticCurveTo(4, 0, 4.5, -2.2);
    wingShape.quadraticCurveTo(2, -0.8, 0, 0);
    const wingMat = new THREE.MeshBasicMaterial({ color: 0xff5a10, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * 3.2, 0.8, -0.5);
      pivot.scale.x = s;
      pivot.add(new THREE.Mesh(new THREE.ShapeGeometry(wingShape), wingMat));
      g.add(pivot);
      demonWings.push(pivot);
    }
    put(g, new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe040 }), -0.9, 1.7, 1.0);
    put(g, new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe040 }), 0.9, 1.7, 1.0);
  }

  const cannonGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.6, 16);
  cannonGeo.rotateX(Math.PI / 2);
  const muzzles = [];
  for (const x of [-2.2, 2.2]) {
    add(cannonGeo, dark, x, -1.2, 2.4);
    muzzles.push(new THREE.Vector3(x, -1.2, 3.3));
  }

  // --- Projectiles, bolts and explosion bits (pooled) ---
  const orbGeo = new THREE.SphereGeometry(0.5, 16, 12);
  const haloGeo = new THREE.SphereGeometry(1, 16, 12);
  const looks = {
    red: { core: new THREE.MeshBasicMaterial({ color: 0xff3344 }), halo: new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }) },
    blue: { core: new THREE.MeshBasicMaterial({ color: 0x9ff4ff }), halo: new THREE.MeshBasicMaterial({ color: 0x2bd9ff, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }) },
  };
  const makeOrb = (kind, haloSize) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(orbGeo, looks[kind].core));
    const h = new THREE.Mesh(haloGeo, looks[kind].halo);
    h.scale.setScalar(haloSize);
    g.add(h);
    scene.add(g);
    return g;
  };

  const shots = []; // { kind, mesh, vel, alive }
  const bolts = []; // { mesh, alive }
  const booms = []; // { mesh, mat, age, alive }

  const take = (list, make) => {
    let item = list.find((i) => !i.alive);
    if (!item) { item = make(); list.push(item); }
    item.alive = true;
    item.mesh.visible = true;
    return item;
  };
  const kill = (item) => { item.alive = false; item.mesh.visible = false; };

  // Pools are per kind so a red orb never gets reused as a blue one.
  const pools = { red: [], blue: [] };
  const spawnOfKind = (kind, from, target, speed) => {
    const s = take(pools[kind], () => {
      const item = { kind, mesh: makeOrb(kind, kind === 'blue' ? 1.3 : 0.9), vel: new THREE.Vector3() };
      shots.push(item);
      return item;
    });
    s.mesh.position.copy(from);
    s.vel.subVectors(target, from).normalize().multiplyScalar(speed);
  };

  const boltGeo = new THREE.SphereGeometry(0.35, 12, 8);
  const boltMat = new THREE.MeshBasicMaterial({ color: 0xbff8ff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const fireBolt = (from) => {
    const b = take(bolts, () => {
      const mesh = new THREE.Mesh(boltGeo, boltMat);
      mesh.scale.set(1, 1, 5);
      scene.add(mesh);
      return { mesh };
    });
    b.mesh.position.copy(from);
  };

  const boomGeo = new THREE.SphereGeometry(1, 16, 12);
  const spawnBoom = (pos) => {
    const b = take(booms, () => {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
      const mesh = new THREE.Mesh(boomGeo, mat);
      scene.add(mesh);
      return { mesh, mat };
    });
    b.age = 0;
    b.mesh.position.copy(pos);
  };

  const clearAll = () => { shots.forEach(kill); bolts.forEach(kill); booms.forEach(kill); };

  let cfg = { name: 'SCRAP HAULER', hp: 6, hull: 0x6d5a48, fireEvery: 1.4, extra: null };
  let level = 1;
  let maxHp = 6;
  let hp = maxHp;
  let t = 0;
  let entering = false;
  let dying = -1; // < 0: alive; >= 0: seconds since destroyed
  let done = false;
  let fireT = 0;
  let coreT = 0;
  let muzzleIndex = 0;
  const tmp = new THREE.Vector3();

  return {
    group,
    get maxHp() { return maxHp; },
    get hp() { return hp; },
    get name() { return cfg.name; },

    // Set up the boss for a level (see levels.js).
    configure(levelCfg) {
      level = levelCfg.n;
      cfg = levelCfg.boss;
      maxHp = cfg.hp;
      hullMat.color.setHex(cfg.hull);
      hullMat.metalness = cfg.metal ? 1 : 0.5;
      hullMat.roughness = cfg.metal ? 0.15 : 0.6;
      for (const [name, g] of Object.entries(extras)) g.visible = name === cfg.extra;
      const noPods = cfg.extra === 'saucer' || cfg.extra === 'demon';
      pods.forEach((m) => { m.visible = !noPods; });
      rotors.forEach((m) => { m.visible = !noPods; });
    },

    // Hit by something other than a bolt (light blast).
    hurt(n = 1) {
      if (dying >= 0 || entering || !group.visible) return;
      hp -= n;
      hullMat.emissiveIntensity = 1.5;
      spawnBoom(group.position);
      if (hp <= 0) { dying = 0; shots.forEach(kill); bolts.forEach(kill); }
    },

    clearShots() { shots.forEach((s) => { if (s.kind === 'red') kill(s); }); },

    start() {
      hp = maxHp;
      t = 0;
      entering = true;
      dying = -1;
      done = false;
      fireT = 1.5;
      coreT = 2.5;
      clearAll();
      group.visible = true;
      group.position.set(0, 5, ENTER_Z);
      group.rotation.set(0, 0, 0);
      body.rotation.set(0, 0, 0);
      body.scale.setScalar(1);
      hullMat.emissiveIntensity = 0;
    },

    stop() {
      group.visible = false;
      clearAll();
    },

    // damage(): asks the game to hurt the player; returns true if it landed.
    update(dt, carPos, damage) {
      const ev = { defeated: false };
      if (!group.visible && done) return ev;
      t += dt;
      for (const r of rotors) r.rotation.y += dt * 30;
      demonWings.forEach((w) => { w.rotation.y = Math.sin(t * 5) * 0.4; });
      if (cfg.extra === 'sirens') {
        const on = Math.floor(t * 8) % 2 === 0;
        sirenMats[0].color.setHex(on ? 0xff2030 : 0x401014);
        sirenMats[1].color.setHex(on ? 0x101840 : 0x2a60ff);
      }
      if (cfg.extra === 'saucer') extras.saucer.rotation.y += dt * 0.8;

      // Explosion bits
      for (const b of booms) {
        if (!b.alive) continue;
        b.age += dt;
        b.mesh.scale.setScalar(0.5 + b.age * 9);
        b.mat.opacity = Math.max(0, 1 - b.age * 2);
        if (b.age > 0.5) kill(b);
      }

      if (dying >= 0) {
        dying += dt;
        body.rotation.z += dt * 3;
        body.rotation.x += dt * 1.5;
        group.position.y -= dt * 4;
        body.scale.setScalar(Math.max(0.01, 1 - dying * 0.5));
        if (Math.random() < dt * 25) {
          tmp.set(rand(-3.5, 3.5), rand(-1.5, 1.5), rand(-2, 2)).add(group.position);
          spawnBoom(tmp);
        }
        if (dying > 1.6 && !done) {
          done = true;
          group.visible = false;
          ev.defeated = true;
        }
        return ev;
      }

      // Movement: swoop in, then drift side to side and turn toward the car.
      const p = group.position;
      if (entering) {
        p.z += (HOME_Z - p.z) * (1 - Math.exp(-2 * dt));
        if (Math.abs(p.z - HOME_Z) < 1) entering = false;
      }
      const k = 1 - Math.exp(-2 * dt);
      const tx = Math.sin(t * 0.6) * 6;
      const ty = 5 + Math.sin(t * 0.9) * 1.5;
      p.x += (tx - p.x) * k;
      p.y += (ty - p.y) * k;
      group.rotation.z = (p.x - tx) * 0.05;
      group.rotation.y = Math.atan2(carPos.x - p.x, carPos.z - p.z) * 0.6;
      hullMat.emissiveIntensity = Math.max(0, hullMat.emissiveIntensity - dt * 4);

      if (!entering) {
        group.updateMatrixWorld();
        const phase2 = hp <= maxHp / 2;
        fireT -= dt;
        if (fireT <= 0) {
          ev.fired = true;
          fireT = cfg.fireEvery * (phase2 ? 0.72 : 1);
          const from = group.localToWorld(tmp.copy(muzzles[muzzleIndex++ % 2]));
          // Later bosses fire wider spreads, so you have to pick your gap.
          const spread = phase2 ? (level >= 5 ? [-4, -2, 0, 2, 4] : [-2.5, 0, 2.5]) : level >= 3 ? [-1.8, 1.8] : [0];
          for (const off of spread) {
            const target = new THREE.Vector3(carPos.x + off, carPos.y + rand(-0.5, 0.5), carPos.z);
            spawnOfKind('red', from, target, RED_SPEED + level * 1.5);
          }
        }
        coreT -= dt;
        if (coreT <= 0) {
          coreT = 2.0;
          const target = new THREE.Vector3(rand(-BOUNDS.x, BOUNDS.x), rand(BOUNDS.yMin, BOUNDS.yMax), 0);
          spawnOfKind('blue', p, target, BLUE_SPEED);
        }
      }

      // Shots fly toward the car area.
      for (const s of shots) {
        if (!s.alive) continue;
        const sp = s.mesh.position;
        sp.addScaledVector(s.vel, dt);
        s.mesh.rotation.y += dt * 4;
        const d = sp.distanceTo(carPos);
        if (s.kind === 'red' && d < 1.4 && damage()) kill(s);
        else if (s.kind === 'blue' && d < 2.0) { kill(s); fireBolt(carPos); ev.caught = true; }
        else if (sp.z > 18) kill(s);
      }

      // Bolts home in on the boss.
      for (const b of bolts) {
        if (!b.alive) continue;
        const bp = b.mesh.position;
        tmp.subVectors(p, bp);
        const dist = tmp.length();
        if (dist < 3) {
          kill(b);
          hp -= 1;
          ev.hurt = true;
          hullMat.emissiveIntensity = 1.5;
          spawnBoom(bp);
          if (hp <= 0) {
            dying = 0;
            shots.forEach(kill);
            bolts.forEach(kill);
          }
          continue;
        }
        bp.addScaledVector(tmp.normalize(), BOLT_SPEED * dt);
        b.mesh.lookAt(p);
      }
      return ev;
    },
  };
}
