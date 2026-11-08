import * as THREE from 'three';
import { roundBox } from './round.js';
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
  const baseHull = [
    add(roundBox(7, 2.2, 4), hullMat, 0, 0, 0),
    add(roundBox(4, 1.2, 2.6), hullMat, 0, 1.5, -0.3),
    add(roundBox(5, 0.8, 1), dark, 0, -1.3, 1.6),
    add(new THREE.SphereGeometry(0.8, 24, 16), red, 0, 0.3, 2.05),
    add(new THREE.TorusGeometry(0.95, 0.15, 10, 32), dark, 0, 0.3, 2.05),
  ];

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
    for (let i = 0; i < 6; i++) put(g, roundBox(0.55, 0.3, 0.5), sirenMats[i % 2], -1.4 + i * 0.56, 2.25, -0.3);
    const white = new THREE.MeshStandardMaterial({ color: 0xeef2f8, roughness: 0.4 });
    put(g, roundBox(7.05, 0.4, 4.05), white, 0, 0.2, 0);
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
    put(g, roundBox(4.2, 0.3, 2.8), gold, 0, 2.1, -0.3);
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

  const additive = (color, opacity = 0.8) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const spinners = []; // { mesh, axis, speed }
  { // Pirate Flagship: masts, sails, side cannons
    const g = extra('pirate');
    const wood = new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.8 });
    const sail = new THREE.MeshStandardMaterial({ color: 0x1a1020, roughness: 0.9, side: THREE.DoubleSide });
    for (const z of [-1, 1.2]) {
      put(g, new THREE.CylinderGeometry(0.15, 0.15, 5, 8), wood, 0, 3.4, z);
      put(g, new THREE.PlaneGeometry(4, 2.6), sail, 0, 3.8, z + 0.1);
    }
    put(g, new THREE.CircleGeometry(0.6, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }), 0, 3.9, 1.35);
    const gold = new THREE.MeshStandardMaterial({ color: 0xc8a040, metalness: 1, roughness: 0.2 });
    for (const x of [-3.6, 3.6]) for (const z of [-1, 0.3, 1.6]) put(g, new THREE.CylinderGeometry(0.22, 0.22, 1, 8), gold, x, -0.3, z).rotation.z = Math.PI / 2;
  }
  { // Void Leviathan: giant eye and tentacles
    const g = extra('void');
    put(g, new THREE.SphereGeometry(3.2, 32, 20), new THREE.MeshStandardMaterial({ color: 0x050308, roughness: 0.2, metalness: 0.9, emissive: 0x1a0630 }), 0, 0.5, 0);
    put(g, new THREE.SphereGeometry(1.2, 20, 14), new THREE.MeshBasicMaterial({ color: 0xff3aff }), 0, 0.6, 2.6);
    put(g, new THREE.SphereGeometry(0.5, 12, 8), new THREE.MeshBasicMaterial({ color: 0x000000 }), 0, 0.6, 3.6);
    const ring = put(g, new THREE.TorusGeometry(4.5, 0.2, 8, 48), additive(0xb04aff, 0.8), 0, 0.5, 0);
    spinners.push({ mesh: ring, axis: 'z', speed: 1 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const tnt = put(g, new THREE.CylinderGeometry(0.35, 0.05, 5, 8), new THREE.MeshStandardMaterial({ color: 0x14081e, roughness: 0.4 }), Math.cos(a) * 3.6, Math.sin(a) * 3.6 + 0.5, -0.5);
      tnt.rotation.z = a - Math.PI / 2;
      spinners.push({ mesh: tnt, axis: 'wave', speed: 3, phase: i });
    }
  }
  { // Glitch Core: neon wireframe cube cage
    const g = extra('glitch');
    for (const sz of [8, 5.5]) {
      const cage = new THREE.LineSegments(new THREE.EdgesGeometry(roundBox(sz, sz * 0.5, sz * 0.7)), new THREE.LineBasicMaterial({ color: sz > 6 ? 0x00f0ff : 0xff2ad8 }));
      g.add(cage);
      spinners.push({ mesh: cage, axis: 'y', speed: sz > 6 ? 0.6 : -1 });
    }
    put(g, roundBox(2, 2, 2), additive(0xff2ad8, 0.5), 0, 0, 0);
  }
  { // Chrono Titan: clock face and gears
    const g = extra('chrono');
    put(g, new THREE.CircleGeometry(2.4, 40), new THREE.MeshBasicMaterial({ color: 0xfff4d8 }), 0, 0.6, 2.06);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      put(g, roundBox(0.12, 0.4, 0.02), new THREE.MeshBasicMaterial({ color: 0x3a2a10 }), Math.sin(a) * 2, 0.6 + Math.cos(a) * 2, 2.08).rotation.z = -a;
    }
    const handMat = new THREE.MeshBasicMaterial({ color: 0x1a1008 });
    const minute = new THREE.Group();
    minute.position.set(0, 0.6, 2.1);
    minute.add(put(new THREE.Group(), roundBox(0.12, 2, 0.02), handMat, 0, 0.9, 0));
    minute.children[0].position.y = 0.9;
    g.add(minute);
    spinners.push({ mesh: minute, axis: 'z', speed: -2 });
    const hour = new THREE.Group();
    hour.position.set(0, 0.6, 2.11);
    const hh = new THREE.Mesh(roundBox(0.16, 1.3, 0.02), handMat);
    hh.position.y = 0.6;
    hour.add(hh);
    g.add(hour);
    spinners.push({ mesh: hour, axis: 'z', speed: -0.3 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xc8963a, metalness: 1, roughness: 0.3 });
    for (const [x, y, r] of [[-3.6, 1.2, 1.2], [3.6, 1.2, 1.2], [-3, -1.2, 0.8], [3, -1.2, 0.8]]) {
      const gear = put(g, new THREE.TorusGeometry(r, 0.25, 6, 12), brass, x, y, 1.2);
      spinners.push({ mesh: gear, axis: 'z', speed: x > 0 ? 1 : -1 });
    }
  }
  { // Elder Dragon: big wings, horns and a long tail
    const g = extra('dragon');
    const scaleMat = new THREE.MeshStandardMaterial({ color: 0x5a1a10, roughness: 0.5, metalness: 0.4 });
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(8, 4);
    wingShape.lineTo(7.4, -0.5);
    wingShape.lineTo(5, -0.2);
    wingShape.lineTo(4, -2.6);
    wingShape.lineTo(1.6, -1);
    wingShape.lineTo(0, -2.4);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x8a2010, roughness: 0.7, side: THREE.DoubleSide });
    for (const sd of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(sd * 3.2, 1, -0.5);
      pivot.scale.x = sd;
      pivot.add(new THREE.Mesh(new THREE.ShapeGeometry(wingShape), wingMat));
      g.add(pivot);
      demonWings.push(pivot);
    }
    for (const sd of [-1, 1]) put(g, new THREE.ConeGeometry(0.35, 2.6, 8), new THREE.MeshStandardMaterial({ color: 0xe8d8b0 }), sd * 1.4, 2.8, 0.6).rotation.set(-0.5, 0, -sd * 0.3);
    const tail = put(g, new THREE.ConeGeometry(0.9, 7, 8), scaleMat, 0, -0.3, -5.5);
    tail.rotation.x = -Math.PI / 2;
    put(g, new THREE.SphereGeometry(0.35, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd030 }), -0.9, 1.5, 2.1);
    put(g, new THREE.SphereGeometry(0.35, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd030 }), 0.9, 1.5, 2.1);
  }
  const prismMats = [];
  { // Prism Wraith: rainbow crystal shards orbiting it
    const g = extra('prism');
    for (let i = 0; i < 6; i++) {
      const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.75, emissive: 0xffffff, emissiveIntensity: 0.4 });
      prismMats.push(m);
      const pivot = new THREE.Group();
      pivot.rotation.z = (i / 6) * Math.PI * 2;
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.9, 0), m);
      shard.position.set(4.5, 0, 0);
      shard.scale.set(0.6, 1.8, 0.6);
      pivot.add(shard);
      g.add(pivot);
      spinners.push({ mesh: pivot, axis: 'z', speed: 0.8 });
    }
  }
  const eaterParts = {};
  const managerScreen = { mat: null };
  { // The Hiring Manager: a giant office desk with a computer, a tie and a coffee
    const g = extra('manager');
    // Computer monitor showing a message
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 160;
    const x = c.getContext('2d');
    const draw = (word, col) => {
      x.fillStyle = '#0a1a3a';
      x.fillRect(0, 0, 256, 160);
      x.fillStyle = col;
      x.font = 'bold 54px system-ui, sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(word, 128, 80);
    };
    draw('NEXT!', '#4ad8ff');
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const screenMat = new THREE.MeshBasicMaterial({ map: tex });
    managerScreen.mat = screenMat;
    managerScreen.draw = (w, col) => { draw(w, col); tex.needsUpdate = true; };
    const caseMat = new THREE.MeshStandardMaterial({ color: 0x2a2e36, roughness: 0.4, metalness: 0.5 });
    put(g, roundBox(3.6, 2.2, 0.3, 0.1), caseMat, 0, 3.2, -0.6);
    put(g, new THREE.PlaneGeometry(3.2, 1.9), screenMat, 0, 3.2, -0.44);
    put(g, roundBox(0.3, 1.0, 0.3, 0.08), caseMat, 0, 1.9, -0.6);
    // Shirt collar and a long red tie on the front
    const white = new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.6 });
    for (const sd of [-1, 1]) {
      const collar = put(g, new THREE.ConeGeometry(0.45, 0.8, 3), white, sd * 0.35, 0.9, 2.05);
      collar.rotation.set(Math.PI / 2, 0, sd * 0.6);
    }
    const tieMat = new THREE.MeshStandardMaterial({ color: 0xc81a2a, roughness: 0.5 });
    put(g, roundBox(0.35, 0.3, 0.12, 0.05), tieMat, 0, 0.75, 2.12);
    const tie = put(g, new THREE.ConeGeometry(0.32, 1.6, 4), tieMat, 0, -0.25, 2.12);
    tie.rotation.set(0, Math.PI / 4, Math.PI);
    tie.scale.z = 0.35;
    // A coffee mug and a stack of papers on the desk
    put(g, new THREE.CylinderGeometry(0.35, 0.3, 0.6, 20), white, 2.6, 1.45, 0.6);
    put(g, new THREE.TorusGeometry(0.18, 0.05, 8, 16), white, 2.98, 1.45, 0.6).rotation.y = Math.PI / 2;
    put(g, roundBox(1.0, 0.5, 0.75, 0.04), new THREE.MeshStandardMaterial({ color: 0xfbfaf4, roughness: 0.9 }), -2.5, 1.35, 0.5);
  }
  { // Gummy Giant: giant lollipops and sprinkles
    const g = extra('candy');
    const stick = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    for (const [x, col] of [[-3.6, 0xff4a8a], [3.6, 0x4ad8ff]]) {
      put(g, new THREE.CylinderGeometry(0.12, 0.12, 3, 8), stick, x, 2.2, 0);
      const pop = put(g, new THREE.CylinderGeometry(1.1, 1.1, 0.3, 24), new THREE.MeshStandardMaterial({ color: col, roughness: 0.25 }), x, 3.9, 0);
      pop.rotation.x = Math.PI / 2;
      const swirl = put(g, new THREE.TorusGeometry(0.6, 0.08, 6, 24), new THREE.MeshStandardMaterial({ color: 0xffffff }), x, 3.9, 0.17);
      spinners.push({ mesh: swirl, axis: 'z', speed: 2 });
    }
    const sprinkleCols = [0xff3a5a, 0x3aff6a, 0xffd03a, 0x3a8aff, 0xffffff];
    for (let i = 0; i < 24; i++) {
      const sp = put(g, new THREE.CapsuleGeometry(0.06, 0.25, 2, 4), new THREE.MeshBasicMaterial({ color: sprinkleCols[i % 5] }), (Math.random() - 0.5) * 6.6, 1.15, (Math.random() - 0.5) * 3.6);
      sp.rotation.set(Math.PI / 2, 0, Math.random() * 3);
    }
  }
  { // Universe Eater: a huge maw full of teeth around a swirling core
    const g = extra('eater');
    const maw = put(g, new THREE.TorusGeometry(4.2, 1.1, 16, 48), new THREE.MeshStandardMaterial({ color: 0x1a0a2a, roughness: 0.3, metalness: 0.8, emissive: 0x2a0a4a }), 0, 0.5, 1.5);
    spinners.push({ mesh: maw, axis: 'z', speed: 0.2 });
    const tooth = new THREE.ConeGeometry(0.35, 1.6, 6);
    const toothMat = new THREE.MeshStandardMaterial({ color: 0xf0e8ff, roughness: 0.3 });
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const tt = put(g, tooth, toothMat, Math.cos(a) * 3.3, 0.5 + Math.sin(a) * 3.3, 2);
      tt.rotation.z = a + Math.PI / 2;
    }
    const core = put(g, new THREE.SphereGeometry(2.4, 32, 20), additive(0x8a3aff, 0.75), 0, 0.5, 1);
    eaterParts.core = core;
    const inner = put(g, new THREE.SphereGeometry(1.2, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffe8ff }), 0, 0.5, 1.4);
    eaterParts.inner = inner;
    for (const r of [6.5, 8.5]) {
      const ring = put(g, new THREE.TorusGeometry(r, 0.12, 6, 64), additive(r > 7 ? 0x4a8aff : 0xff5ad8, 0.6), 0, 0.5, 0);
      ring.rotation.x = r > 7 ? 1.2 : 0.4;
      spinners.push({ mesh: ring, axis: 'y', speed: r > 7 ? 0.5 : -0.8 });
    }
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const tnt = put(g, new THREE.CylinderGeometry(0.45, 0.05, 7, 8), new THREE.MeshStandardMaterial({ color: 0x2a0a3a, roughness: 0.4, emissive: 0x1a0030 }), Math.cos(a) * 5.2, 0.5 + Math.sin(a) * 5.2, -1.5);
      tnt.rotation.z = a - Math.PI / 2;
      spinners.push({ mesh: tnt, axis: 'wave', speed: 2, phase: i });
    }
  }

  const cannonGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.6, 16);
  cannonGeo.rotateX(Math.PI / 2);
  const hullParts = []; // the boxy hull, hidden for round bosses
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
  let patterns = [];
  let homeZ = HOME_Z;
  let specialT = 0; // timer for the level's special attack
  let minionT = 0;
  let breathT = -1;
  let breathDir = 1;
  let teleportFlash = 0;
  const ringCenter = new THREE.Vector3();
  let level = 1;
  let maxHp = 6;
  let hp = maxHp;
  let player = { coreRadius: 2, powerBolt: 0, bossHpMult: 1, coreEvery: 2 }; // from garage upgrades
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
      maxHp = Math.max(3, Math.round(cfg.hp * player.bossHpMult));
      hullMat.color.setHex(cfg.hull);
      hullMat.metalness = cfg.metal ? 1 : 0.5;
      hullMat.roughness = cfg.metal ? 0.15 : 0.6;
      for (const [name, g] of Object.entries(extras)) g.visible = name === cfg.extra;
      const noPods = ['saucer', 'demon', 'void', 'dragon', 'prism', 'eater', 'glitch', 'manager'].includes(cfg.extra);
      pods.forEach((m) => { m.visible = !noPods; });
      rotors.forEach((m) => { m.visible = !noPods; });
      const noHull = ['void', 'eater'].includes(cfg.extra);
      baseHull.forEach((m) => { m.visible = !noHull; });
      patterns = cfg.patterns ?? [];
      // The final boss is huge and keeps further away.
      group.scale.setScalar(cfg.final ? 1.7 : 1);
      homeZ = cfg.final ? -62 : HOME_Z;
    },

    // Hit by something other than a bolt (light blast).
    hurt(n = 1) {
      if (dying >= 0 || entering || !group.visible) return;
      hp -= n;
      hullMat.emissiveIntensity = 1.5;
      spawnBoom(group.position);
      if (hp <= 0) { dying = 0; shots.forEach(kill); bolts.forEach(kill); }
    },

    // Garage upgrades that change boss fights. Call before configure().
    setPlayer(stats) { player = { coreRadius: stats.coreRadius, powerBolt: stats.powerBolt, bossHpMult: stats.bossHpMult, coreEvery: stats.coreEvery }; },

    clearShots() { shots.forEach((s) => { if (s.kind === 'red') kill(s); }); },
    // Mini UFO pet: zap the boss's red shots near the car. Returns how many.
    clearNear(pos, range) {
      let n = 0;
      for (const s of shots) if (s.alive && s.kind === 'red' && s.mesh.position.distanceTo(pos) < range) { kill(s); n++; }
      return n;
    },

    start() {
      hp = maxHp;
      t = 0;
      entering = true;
      dying = -1;
      done = false;
      fireT = 1.5;
      coreT = 2.5;
      specialT = 4;
      minionT = 6;
      breathT = -1;
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
    // hooks: { spawn(type), pull(fromPos, strength) } for minions and pulling attacks.
    update(dt, carPos, damage, hooks = {}) {
      const ev = { defeated: false };
      if (!group.visible && done) return ev;
      t += dt;
      for (const sp of spinners) {
        if (sp.axis === 'wave') sp.mesh.scale.y = 1 + Math.sin(t * sp.speed + sp.phase) * 0.2;
        else sp.mesh.rotation[sp.axis] += dt * sp.speed;
      }
      prismMats.forEach((m, i) => { m.color.setHSL((t * 0.2 + i / 6) % 1, 1, 0.6); m.emissive.setHSL((t * 0.2 + i / 6) % 1, 1, 0.3); });
      if (eaterParts.core) {
        eaterParts.core.scale.setScalar(1 + Math.sin(t * 3) * 0.1);
        eaterParts.inner.scale.setScalar(1 + Math.sin(t * 7) * 0.15);
      }
      teleportFlash = Math.max(0, teleportFlash - dt);
      body.visible = teleportFlash <= 0 || Math.floor(t * 30) % 2 === 0;
      for (const r of rotors) r.rotation.y += dt * 30;
      demonWings.forEach((w) => { w.rotation.y = Math.sin(t * 5) * 0.4; });
      if (cfg.extra === 'sirens') {
        const on = Math.floor(t * 8) % 2 === 0;
        sirenMats[0].color.setHex(on ? 0xff2030 : 0x401014);
        sirenMats[1].color.setHex(on ? 0x101840 : 0x2a60ff);
      }
      if (cfg.extra === 'saucer') extras.saucer.rotation.y += dt * 0.8;
      if (cfg.extra === 'manager' && managerScreen.draw) {
        const msgs = [['NEXT!', '#4ad8ff'], ['DENIED', '#ff4a5a'], ['ANY QUESTIONS?', '#ffd040'], ['HMM...', '#4ad8ff']];
        const k = Math.floor(t / 2.5) % msgs.length;
        if (k !== managerScreen.k) { managerScreen.k = k; managerScreen.draw(...msgs[k]); }
      }

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
        p.z += (homeZ - p.z) * (1 - Math.exp(-2 * dt));
        if (Math.abs(p.z - homeZ) < 1) entering = false;
      }
      const k = 1 - Math.exp(-2 * dt);
      const tx = Math.sin(t * 0.6) * (cfg.final ? 4 : 6);
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
            spawnOfKind('red', from, target, RED_SPEED + Math.min(level, 10) * 1.5);
          }
        }
        // Special attacks for the later bosses.
        const third = hp / maxHp;
        specialT -= dt;
        if (patterns.includes('ring') && specialT <= 0) {
          // A ring of shots that lands around the middle of the screen: stay in the middle, or get outside it.
          specialT = cfg.final ? (third < 0.34 ? 3 : 4) : 5.5;
          ringCenter.set(rand(-1.5, 1.5), 4, 0);
          const n = cfg.final ? 14 : 10;
          const off = Math.random() * Math.PI;
          for (let i = 0; i < n; i++) {
            const a = off + (i / n) * Math.PI * 2;
            spawnOfKind('red', p, new THREE.Vector3(ringCenter.x + Math.cos(a) * 5, ringCenter.y + Math.sin(a) * 3.4, 0), RED_SPEED + 4);
          }
          ev.ring = true;
        }
        if (patterns.includes('slow') && Math.floor((t - dt) / 3) !== Math.floor(t / 3)) {
          // Chrono Titan: a spiral of shots, like a clock hand sweeping round.
          for (let i = 0; i < 8; i++) {
            const a = t * 2 + i * 0.8;
            spawnOfKind('red', p, new THREE.Vector3(Math.cos(a) * 5, 4 + Math.sin(a) * 3, 0), RED_SPEED - 4 + i * 1.2);
          }
        }
        if (patterns.includes('teleport') && Math.floor((t - dt) / 4.5) !== Math.floor(t / 4.5)) {
          p.x = rand(-7, 7);
          p.y = rand(3, 7);
          teleportFlash = 0.4;
          ev.teleport = true;
        }
        if (patterns.includes('breath')) {
          if (breathT < 0 && Math.floor((t - dt) / 6) !== Math.floor(t / 6)) { breathT = 0; breathDir = Math.random() < 0.5 ? -1 : 1; }
          if (breathT >= 0) {
            breathT += dt;
            if (Math.floor((breathT - dt) / 0.08) !== Math.floor(breathT / 0.08)) {
              spawnOfKind('red', p, new THREE.Vector3(breathDir * (breathT / 1.8 - 0.5) * 14, carPos.y + rand(-0.6, 0.6), 0), RED_SPEED);
            }
            if (breathT > 1.8) breathT = -1;
          }
        }
        if (patterns.includes('minions') && third < 0.67) {
          minionT -= dt;
          if (minionT <= 0) {
            minionT = third < 0.34 ? 4 : 6;
            hooks.spawn?.(cfg.minion ?? (Math.random() < 0.5 ? 'spirit' : 'demon'));
            ev.minion = true;
          }
        }
        if (patterns.includes('pull') && (!cfg.final || third < 0.34)) {
          hooks.pull?.(p, cfg.final ? 3 : 2);
        }

        coreT -= dt;
        if (coreT <= 0) {
          coreT = player.coreEvery;
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
        else if (s.kind === 'blue' && d < player.coreRadius) { kill(s); fireBolt(carPos); ev.caught = true; }
        else if (sp.z > 18) kill(s);
      }

      // Bolts home in on the boss.
      for (const b of bolts) {
        if (!b.alive) continue;
        const bp = b.mesh.position;
        tmp.subVectors(p, bp);
        const dist = tmp.length();
        if (dist < 3 * group.scale.x) {
          kill(b);
          hp -= Math.random() < player.powerBolt ? 2 : 1;
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
