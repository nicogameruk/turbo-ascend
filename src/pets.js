import * as THREE from 'three';

// Pets from the shop: a little buddy that flies next to your car.
// What each pet does to help is handled in main.js (see PET perks in cosmetics.js).
const std = (color, rough = 0.5, metal = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
const glow = (color, opacity = 0.8) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const black = new THREE.MeshBasicMaterial({ color: 0x111111 });
const white = new THREE.MeshBasicMaterial({ color: 0xffffff });

function part(g, geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  g.add(m);
  return m;
}
// Two eyes looking forward (-z), the way the car flies.
function eyes(g, y, z, gap = 0.12, size = 0.07) {
  for (const x of [-gap, gap]) {
    part(g, new THREE.SphereGeometry(size, 10, 8), white, x, y, z);
    part(g, new THREE.SphereGeometry(size * 0.55, 8, 6), black, x, y, z - size * 0.6);
  }
}
function wingPair(g, mat, y, z, span = 0.5) {
  const wings = [];
  for (const sd of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(sd * 0.2, y, z);
    const w = part(pivot, new THREE.BoxGeometry(span, 0.03, 0.25), mat, sd * span / 2, 0, 0);
    w.castShadow = false;
    g.add(pivot);
    wings.push({ pivot, sd });
  }
  return wings;
}

const BUILDERS = {
  penguin(g, a) {
    part(g, new THREE.CapsuleGeometry(0.25, 0.3, 6, 14), std(0x1a1a22, 0.5)).scale.set(1, 1, 0.9);
    part(g, new THREE.SphereGeometry(0.2, 14, 10), std(0xffffff, 0.6), 0, -0.05, -0.1).scale.set(1, 1.4, 0.6);
    const beak = part(g, new THREE.ConeGeometry(0.06, 0.16, 8), std(0xff9a1a), 0, 0.22, -0.28);
    beak.rotation.x = -Math.PI / 2;
    eyes(g, 0.3, -0.2, 0.09, 0.05);
    a.wings = wingPair(g, std(0x1a1a22), 0.05, 0, 0.25);
  },
  puppy(g, a) {
    const metal = std(0xa8b0ba, 0.3, 0.8);
    part(g, new THREE.BoxGeometry(0.4, 0.3, 0.55), metal);
    part(g, new THREE.BoxGeometry(0.34, 0.3, 0.3), metal, 0, 0.22, -0.32);
    part(g, new THREE.BoxGeometry(0.3, 0.08, 0.06), new THREE.MeshBasicMaterial({ color: 0x4dd8ff }), 0, 0.25, -0.48);
    for (const x of [-0.14, 0.14]) part(g, new THREE.BoxGeometry(0.08, 0.2, 0.12), std(0x5a626a, 0.4, 0.6), x, 0.42, -0.3).rotation.z = x * 2;
    a.tail = part(g, new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6), metal, 0, 0.2, 0.33);
    a.tail.rotation.x = 0.8;
    part(g, new THREE.CylinderGeometry(0.15, 0.15, 0.05, 14), glow(0x4dd8ff), 0, -0.2, 0);
  },
  slime(g, a) {
    a.body = part(g, new THREE.SphereGeometry(0.32, 20, 14), std(0x4dff6a, 0.1, 0, { transparent: true, opacity: 0.75, emissive: 0x0a5a1a, emissiveIntensity: 0.6 }));
    eyes(g, 0.08, -0.26, 0.1, 0.06);
  },
  kitty(g, a) {
    const orange = std(0xff9a3a, 0.7);
    part(g, new THREE.SphereGeometry(0.25, 16, 12), orange).scale.set(1, 0.9, 1.3);
    part(g, new THREE.SphereGeometry(0.2, 16, 12), orange, 0, 0.2, -0.28);
    for (const x of [-0.11, 0.11]) part(g, new THREE.ConeGeometry(0.07, 0.14, 4), orange, x, 0.4, -0.28);
    eyes(g, 0.24, -0.44, 0.08, 0.045);
    part(g, new THREE.SphereGeometry(0.03, 6, 4), std(0xff6a8a), 0, 0.18, -0.47);
    a.tail = part(g, new THREE.CylinderGeometry(0.04, 0.03, 0.45, 8), orange, 0, 0.15, 0.4);
    a.tail.rotation.x = 0.9;
  },
  owl(g, a) {
    const brown = std(0x8a5a2a, 0.8);
    part(g, new THREE.SphereGeometry(0.28, 16, 12), brown).scale.set(1, 1.15, 0.9);
    part(g, new THREE.SphereGeometry(0.18, 14, 10), std(0xe8d0a0, 0.8), 0, -0.05, -0.16).scale.set(1, 1.2, 0.5);
    for (const x of [-0.11, 0.11]) {
      part(g, new THREE.SphereGeometry(0.09, 12, 8), white, x, 0.14, -0.22);
      part(g, new THREE.SphereGeometry(0.05, 8, 6), black, x, 0.14, -0.3);
      part(g, new THREE.ConeGeometry(0.04, 0.12, 4), brown, x * 1.3, 0.34, -0.1);
    }
    const beak = part(g, new THREE.ConeGeometry(0.04, 0.1, 6), std(0xffb020), 0, 0.06, -0.3);
    beak.rotation.x = Math.PI / 1.6;
    a.wings = wingPair(g, brown, 0, 0.05, 0.4);
  },
  ghost(g, a) {
    const mat = std(0xffffff, 0.6, 0, { transparent: true, opacity: 0.7, emissive: 0x8899cc, emissiveIntensity: 0.5 });
    part(g, new THREE.SphereGeometry(0.3, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat, 0, 0.1, 0);
    const skirt = part(g, new THREE.CylinderGeometry(0.3, 0.34, 0.35, 18, 1, true), mat, 0, -0.07, 0);
    skirt.material.side = THREE.DoubleSide;
    for (const x of [-0.1, 0.1]) part(g, new THREE.SphereGeometry(0.05, 8, 6), black, x, 0.16, -0.27).scale.set(1, 1.5, 0.5);
    part(g, new THREE.SphereGeometry(0.05, 8, 6), black, 0, 0.02, -0.28).scale.set(1, 0.6, 0.5);
    a.float = true;
  },
  ufo(g, a) {
    part(g, new THREE.SphereGeometry(0.4, 22, 10), std(0xa8b4c4, 0.25, 0.9)).scale.y = 0.3;
    part(g, new THREE.SphereGeometry(0.18, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(0x6dff9a, 0.05, 0.2, { transparent: true, opacity: 0.75, emissive: 0x1a7a3a }), 0, 0.07, 0);
    a.lights = [];
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      a.lights.push(part(g, new THREE.SphereGeometry(0.04, 6, 4), new THREE.MeshBasicMaterial({ color: 0x8dff9a }), Math.cos(ang) * 0.35, -0.02, Math.sin(ang) * 0.35));
    }
    a.spin = g;
  },
  dragon(g, a) {
    const green = std(0x3aaa4a, 0.4, 0.2, { flatShading: true });
    part(g, new THREE.SphereGeometry(0.24, 12, 10), green).scale.set(1, 0.9, 1.4);
    part(g, new THREE.SphereGeometry(0.18, 12, 10), green, 0, 0.18, -0.32);
    const snout = part(g, new THREE.BoxGeometry(0.16, 0.1, 0.16), green, 0, 0.14, -0.48);
    snout.castShadow = false;
    for (const x of [-0.08, 0.08]) part(g, new THREE.ConeGeometry(0.035, 0.14, 6), std(0xf0e0b0), x, 0.36, -0.28).rotation.x = 0.4;
    eyes(g, 0.25, -0.44, 0.08, 0.04);
    const tail = part(g, new THREE.ConeGeometry(0.1, 0.5, 8), green, 0, 0, 0.45);
    tail.rotation.x = Math.PI / 2;
    a.wings = wingPair(g, std(0xff7a3a, 0.6, 0, { side: THREE.DoubleSide }), 0.12, 0.05, 0.45);
    a.mouth = new THREE.Vector3(0, 0.14, -0.6);
  },
  star(g, a) {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.14 : 0.34;
      const ang = (i / 10) * Math.PI * 2 + Math.PI / 2;
      if (i === 0) s.moveTo(Math.cos(ang) * r, Math.sin(ang) * r); else s.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
    }
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 });
    geo.center();
    a.spinZ = part(g, geo, std(0xffe060, 0.2, 0.3, { emissive: 0xffb000, emissiveIntensity: 0.9 }));
    part(g, new THREE.SphereGeometry(0.45, 14, 10), glow(0xfff0a0, 0.18));
    eyes(g, 0.02, -0.1, 0.07, 0.04);
  },
  phoenix(g, a) {
    const red = std(0xff4a1a, 0.4, 0, { emissive: 0xaa2000, emissiveIntensity: 0.6 });
    part(g, new THREE.SphereGeometry(0.22, 14, 10), red).scale.set(1, 0.9, 1.4);
    part(g, new THREE.SphereGeometry(0.15, 12, 10), red, 0, 0.16, -0.28);
    const beak = part(g, new THREE.ConeGeometry(0.04, 0.12, 6), std(0xffd040), 0, 0.14, -0.44);
    beak.rotation.x = -Math.PI / 2;
    eyes(g, 0.2, -0.38, 0.07, 0.035);
    part(g, new THREE.ConeGeometry(0.06, 0.25, 6), glow(0xffd040), 0, 0.33, -0.25);
    const tail = part(g, new THREE.ConeGeometry(0.18, 0.7, 10, 1, true), glow(0xff8a2a, 0.7), 0, 0, 0.55);
    tail.rotation.x = Math.PI / 2;
    a.wings = wingPair(g, glow(0xffa030, 0.85), 0.08, 0.05, 0.6);
  },
};

export function createPet(scene) {
  const holder = new THREE.Group();
  holder.visible = false;
  scene.add(holder);
  const built = {}; // id -> { group, anim }
  let current = null;
  const target = new THREE.Vector3();
  const OFFSET = new THREE.Vector3(-2.4, 1.1, 0.8); // up and to the left of the car
  let firing = 0;

  return {
    group: holder,
    set(id) {
      if (current) current.group.visible = false;
      current = null;
      holder.visible = !!BUILDERS[id];
      if (!BUILDERS[id]) return;
      if (!built[id]) {
        const g = new THREE.Group();
        const anim = {};
        BUILDERS[id](g, anim);
        g.scale.setScalar(1.25);
        holder.add(g);
        built[id] = { group: g, anim };
      }
      current = built[id];
      current.group.visible = true;
    },
    // Snap next to the car (after the car jumps somewhere, like the garage).
    snap(carPos) { holder.position.copy(carPos).add(OFFSET); },
    // A little "fire!" lean when the pet does its trick.
    flash() { firing = 0.3; },
    // Where its shots start from.
    get mouth() { return holder.position; },
    update(dt, carPos, time) {
      if (!current) return;
      target.copy(carPos).add(OFFSET);
      // Follow with a slight delay, so it feels like it's flying along with you.
      holder.position.lerp(target, 1 - Math.exp(-6 * dt));
      holder.position.y += Math.sin(time * 3.2) * 0.004;
      const a = current.anim;
      const g = current.group;
      g.position.y = Math.sin(time * 3.2) * 0.12;
      g.rotation.z = (target.x - holder.position.x) * -0.25;
      firing = Math.max(0, firing - dt);
      g.rotation.x = firing > 0 ? -0.4 : 0;
      a.wings?.forEach(({ pivot, sd }) => { pivot.rotation.z = sd * Math.sin(time * 14) * 0.5; });
      if (a.tail) a.tail.rotation.z = Math.sin(time * 6) * 0.4;
      if (a.body) a.body.scale.set(1 + Math.sin(time * 5) * 0.08, 1 - Math.sin(time * 5) * 0.08, 1);
      if (a.spin) a.spin.rotation.y += dt * 3;
      if (a.spinZ) a.spinZ.rotation.z += dt * 2;
      if (a.float) g.position.y += Math.sin(time * 1.7) * 0.1;
      a.lights?.forEach((l, i) => l.material.color.setHex((Math.floor(time * 6) + i) % 2 ? 0x8dff9a : 0x1a5a2a));
    },
  };
}
