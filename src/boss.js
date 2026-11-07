import * as THREE from 'three';
import { BOUNDS } from './car.js';

const HOME_Z = -45; // where the boss hovers, ahead of the car
const ENTER_Z = -160;
const MAX_HP = 6;
const RED_SPEED = 30;
const BLUE_SPEED = 24;
const BOLT_SPEED = 110;

const rand = (a, b) => a + Math.random() * (b - a);

// Level 1 boss: a big junk-hauling robot. It fires red shots (dodge them) and
// releases blue power cores (catch them to fire a bolt back at it).
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
  const podGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.6, 20);
  const rotorGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.04, 20);
  for (const x of [-4.6, 4.6]) {
    for (const z of [-1.2, 1.2]) {
      add(podGeo, dark, x, 0.4, z);
      rotors.push(add(rotorGeo, dark, x, 0.8, z));
    }
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

  let hp = MAX_HP;
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
    maxHp: MAX_HP,
    get hp() { return hp; },

    start() {
      hp = MAX_HP;
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
        const phase2 = hp <= MAX_HP / 2;
        fireT -= dt;
        if (fireT <= 0) {
          fireT = phase2 ? 1.0 : 1.4;
          const from = group.localToWorld(tmp.copy(muzzles[muzzleIndex++ % 2]));
          for (const off of phase2 ? [-2.5, 0, 2.5] : [0]) {
            const target = new THREE.Vector3(carPos.x + off, carPos.y + rand(-0.5, 0.5), carPos.z);
            spawnOfKind('red', from, target, RED_SPEED);
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
        else if (s.kind === 'blue' && d < 2.0) { kill(s); fireBolt(carPos); }
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
