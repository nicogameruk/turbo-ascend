import * as THREE from 'three';
import { roundBox } from './round.js';

// Car body shapes from the shop. Each builds the car's shell into a Group.
// The car's paint, glass and trim materials are shared, so level looks and
// shop paint still colour every shape. The car's nose points toward -z.
//
// roofY: where hats sit. compact: the shape is too different for the roadster's
// armour plates, side tanks and stuck-on decorations, so those get hidden.

function builder(group, { paint, dark, glass, headlight }) {
  const add = (geo, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };
  const box = (w, h, d, mat, x, y, z) => add(roundBox(w, h, d), mat, x, y, z);
  const lights = (y, z, gap = 0.7) => { box(0.45, 0.12, 0.04, headlight, -gap, y, z); box(0.45, 0.12, 0.04, headlight, gap, y, z); };
  return { add, box, lights, paint, dark, glass, headlight };
}

const SHAPES = {
  // The original roadster is built in car.js.
  roadster: null,

  muscle: { roofY: 0.9, build(b) {
    b.box(2.5, 0.6, 4.4, b.paint, 0, 0.05, -0.1); // chunky body
    b.box(2.4, 0.4, 1.0, b.paint, 0, -0.05, -2.75); // long hood
    b.box(0.6, 0.22, 1.0, b.dark, 0, 0.45, -1.6); // hood scoop
    b.box(1.6, 0.5, 1.5, b.glass, 0, 0.6, 0.5); // cabin
    b.box(2.8, 0.1, 0.6, b.dark, 0, 0.98, 2.0); // big wing
    b.box(0.14, 0.6, 0.14, b.dark, -0.9, 0.62, 2.0);
    b.box(0.14, 0.6, 0.14, b.dark, 0.9, 0.62, 2.0);
    b.box(0.3, 0.02, 4.9, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }), 0, 0.36, -0.35); // racing stripe
    b.lights(0.05, -3.27, 0.8);
  } },

  wedge: { roofY: 0.65, build(b) {
    // A low, sharp supercar: a triangle side profile pulled out to full width.
    const s = new THREE.Shape();
    s.moveTo(-3.2, -0.2);
    s.lineTo(2.3, -0.2);
    s.lineTo(2.3, 0.45);
    s.lineTo(0.6, 0.6);
    s.lineTo(-3.2, 0.0);
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: 2.3, bevelEnabled: false });
    geo.translate(0, 0, -1.15);
    geo.rotateY(-Math.PI / 2); // nose toward -z
    b.add(geo, b.paint);
    const canopy = b.add(new THREE.SphereGeometry(0.75, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), b.glass, 0, 0.32, -0.2);
    canopy.scale.set(1, 0.6, 1.7);
    b.box(2.5, 0.06, 0.4, b.dark, 0, 0.55, 2.1); // slim wing
    b.lights(-0.05, -3.15, 0.75);
  } },

  formula: { roofY: 0.55, compact: true, build(b) {
    b.box(0.8, 0.35, 4.6, b.paint, 0, 0, -0.1); // narrow body
    const nose = b.add(new THREE.ConeGeometry(0.4, 1.4, 4), b.paint, 0, -0.05, -3.05);
    nose.rotation.x = -Math.PI / 2;
    nose.rotation.y = Math.PI / 4;
    b.box(2.7, 0.05, 0.5, b.dark, 0, -0.18, -3.0); // front wing
    b.box(2.3, 0.08, 0.45, b.dark, 0, 0.8, 2.05); // rear wing
    b.box(0.06, 0.6, 0.5, b.dark, -1.15, 0.55, 2.05);
    b.box(0.06, 0.6, 0.5, b.dark, 1.15, 0.55, 2.05);
    for (const x of [-0.65, 0.65]) b.box(0.5, 0.3, 1.7, b.paint, x, -0.02, 0.3); // side pods
    b.add(new THREE.SphereGeometry(0.24, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffd040, roughness: 0.3 }), 0, 0.33, -0.1); // helmet
    b.box(0.5, 0.06, 0.2, b.glass, 0, 0.3, -0.4); // visor
  } },

  truck: { roofY: 1.45, build(b) {
    b.box(2.4, 0.7, 4.4, b.paint, 0, 0.2, -0.1); // frame
    b.box(2.2, 0.9, 1.6, b.paint, 0, 1.0, -0.6); // cab
    b.box(2.0, 0.55, 0.05, b.glass, 0, 1.1, -1.42); // windscreen
    for (const x of [-1.11, 1.11]) b.box(0.05, 0.45, 1.1, b.glass, x, 1.1, -0.6); // side windows
    for (const [x, w] of [[-1.15, 0.1], [1.15, 0.1]]) b.box(w, 0.4, 1.9, b.dark, x, 0.75, 1.1); // bed sides
    b.box(2.4, 0.4, 0.1, b.dark, 0, 0.75, 2.1); // tailgate
    b.box(2.2, 0.35, 0.1, b.dark, 0, 0.2, -2.32); // grille
    for (let i = 0; i < 4; i++) b.box(0.25, 0.12, 0.12, b.headlight, -0.6 + i * 0.4, 1.52, -0.9); // roof lights
    b.lights(0.35, -2.36, 0.85);
  } },

  van: { roofY: 1.18, build(b) {
    b.box(2.3, 1.4, 4.2, b.paint, 0, 0.45, -0.1);
    b.box(2.0, 0.6, 0.05, b.glass, 0, 0.8, -2.22); // windscreen
    for (const x of [-1.16, 1.16]) {
      b.box(0.05, 0.45, 0.9, b.glass, x, 0.85, -1.4);
      b.box(0.05, 0.45, 1.4, b.glass, x, 0.85, 0.3);
    }
    b.box(2.32, 0.12, 4.22, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }), 0, 0.2, -0.1); // stripe
    b.lights(0.0, -2.22, 0.8);
  } },

  bubble: { roofY: 1.3, compact: true, build(b) {
    const shell = b.add(new THREE.SphereGeometry(1.2, 28, 20), b.paint, 0, 0.3, -0.2);
    shell.scale.set(1, 0.85, 1.35);
    const win = b.add(new THREE.SphereGeometry(1.05, 24, 16, -Math.PI * 0.35, Math.PI * 0.7, Math.PI * 0.2, Math.PI * 0.35), b.glass, 0, 0.35, -0.3);
    win.scale.set(1.02, 0.87, 1.4);
    win.rotation.y = Math.PI;
    b.lights(0.1, -1.85, 0.55);
  } },

  rocket: { roofY: 0.78, compact: true, build(b) {
    const tube = b.add(new THREE.CylinderGeometry(0.75, 0.8, 4.0, 24), b.paint, 0, 0.1, 0);
    tube.rotation.x = Math.PI / 2;
    const nose = b.add(new THREE.ConeGeometry(0.75, 1.5, 24), b.paint, 0, 0.1, -2.75);
    nose.rotation.x = -Math.PI / 2;
    b.add(new THREE.CylinderGeometry(0.77, 0.77, 0.15, 24), b.dark, 0, 0.1, -1.6).rotation.x = Math.PI / 2; // band
    for (let i = 0; i < 4; i++) {
      const fin = b.box(0.08, 0.8, 1.0, b.dark, 0, 0.1, 1.6);
      fin.geometry.translate(0, 0.65, 0);
      fin.rotation.z = (i / 4) * Math.PI * 2 + Math.PI / 4;
    }
    const port = b.add(new THREE.SphereGeometry(0.3, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), b.glass, 0, 0.78, -0.7);
    port.scale.set(1, 0.6, 1.4);
  } },

  saucer: { roofY: 1.0, compact: true, build(b) {
    const disc = b.add(new THREE.SphereGeometry(2.1, 36, 14), b.paint, 0, 0.1, 0);
    disc.scale.set(1, 0.22, 1);
    b.add(new THREE.TorusGeometry(2.05, 0.08, 8, 48), b.dark, 0, 0.1, 0).rotation.x = Math.PI / 2;
    const dome = b.add(new THREE.SphereGeometry(0.85, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), b.glass, 0, 0.3, 0);
    dome.scale.y = 0.8;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      b.add(new THREE.SphereGeometry(0.1, 8, 6), b.headlight, Math.cos(a) * 1.8, 0.12, Math.sin(a) * 1.8);
    }
  } },

  // A giant pencil (Doodle Land turns your car into one).
  pencil: { roofY: 0.75, compact: true, build(b) {
    const yellow = new THREE.MeshStandardMaterial({ color: 0xffc81a, roughness: 0.55 });
    const wood = new THREE.MeshStandardMaterial({ color: 0xe8c89a, roughness: 0.8 });
    const lead = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.4, metalness: 0.3 });
    const metal = new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.3, metalness: 1 });
    const eraser = new THREE.MeshStandardMaterial({ color: 0xff8aa8, roughness: 0.9 });
    const along = (m) => { m.rotation.x = Math.PI / 2; return m; };
    along(b.add(new THREE.CylinderGeometry(0.62, 0.62, 3.4, 6), yellow, 0, 0.15, 0.2)); // six-sided body
    const cone = b.add(new THREE.ConeGeometry(0.62, 1.2, 6), wood, 0, 0.15, -2.1); // sharpened wood
    cone.rotation.x = -Math.PI / 2;
    const tip = b.add(new THREE.ConeGeometry(0.2, 0.42, 6), lead, 0, 0.15, -2.55); // pencil lead
    tip.rotation.x = -Math.PI / 2;
    along(b.add(new THREE.CylinderGeometry(0.64, 0.64, 0.42, 20), metal, 0, 0.15, 2.1)); // metal band
    for (const z of [1.95, 2.25]) along(b.add(new THREE.TorusGeometry(0.64, 0.04, 8, 24), metal, 0, 0.15, z)).rotation.x = 0;
    along(b.add(new THREE.CylinderGeometry(0.6, 0.6, 0.5, 20), eraser, 0, 0.15, 2.55)); // pink eraser
    const end = b.add(new THREE.SphereGeometry(0.6, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), eraser, 0, 0.15, 2.8);
    end.rotation.x = Math.PI / 2;
    end.scale.y = 0.35;
  } },

  hotdog: { roofY: 0.95, compact: true, build(b) {
    // Fixed colours: a hot dog is always a hot dog.
    const bun = new THREE.MeshStandardMaterial({ color: 0xe0a050, roughness: 0.8 });
    const sausage = new THREE.MeshStandardMaterial({ color: 0xb8402a, roughness: 0.4 });
    const mustard = new THREE.MeshStandardMaterial({ color: 0xffd420, roughness: 0.5 });
    for (const x of [-0.6, 0.6]) {
      const half = b.add(new THREE.CapsuleGeometry(0.55, 3.2, 8, 16), bun, x, 0, -0.2);
      half.rotation.x = Math.PI / 2;
      half.scale.set(1, 1, 0.7);
    }
    const dog = b.add(new THREE.CapsuleGeometry(0.42, 3.9, 8, 16), sausage, 0, 0.35, -0.2);
    dog.rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) {
      const squiggle = b.box(0.5, 0.06, 0.12, mustard, (i % 2 ? 0.12 : -0.12), 0.78, -1.9 + i * 0.48);
      squiggle.rotation.y = i % 2 ? 0.6 : -0.6;
    }
    b.lights(0.1, -2.6, 0.5);
  } },
};

export const SHAPE_IDS = Object.keys(SHAPES);

// Builds every shape (hidden) into `parent`. Returns { id: { group, roofY, compact } }.
export function buildShapes(parent, mats) {
  const out = {};
  for (const [id, def] of Object.entries(SHAPES)) {
    if (!def) continue;
    const group = new THREE.Group();
    group.visible = false;
    def.build(builder(group, mats));
    parent.add(group);
    out[id] = { group, roofY: def.roofY, compact: !!def.compact };
  }
  return out;
}
