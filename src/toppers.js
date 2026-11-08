import * as THREE from 'three';
import { roundBox } from './round.js';

// Hats and roof toppers from the shop, built from simple shapes.
// Each builder returns a Group whose base sits at y = 0 (the car roof).
const std = (color, rough = 0.5, metal = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });

function part(g, geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  g.add(m);
  return m;
}

// A racing helmet: a painted shell, a dark visor across the front, and a chin guard.
// draw(ctx, w, h) paints the shell's design onto a canvas wrapped around it.
function racingHelmet(g, draw) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  draw(c.getContext('2d'), 512, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const paint = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 });
  const shell = part(g, new THREE.SphereGeometry(0.5, 40, 24), paint, 0, 0.42, 0);
  shell.scale.set(0.95, 0.92, 1.1);
  // Dark visor wrapped around the front (the car faces -z)
  const visorMat = new THREE.MeshPhysicalMaterial({ color: 0x14161c, roughness: 0.05, metalness: 0.6, clearcoat: 1, side: THREE.DoubleSide });
  const visor = part(g, new THREE.CylinderGeometry(0.49, 0.49, 0.17, 32, 1, true, Math.PI * 0.62, Math.PI * 0.76), visorMat, 0, 0.42, 0);
  visor.scale.set(0.98, 1, 1.12);
  // Chin guard and a little air vent on top
  const chin = part(g, new THREE.SphereGeometry(0.3, 20, 12, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), paint, 0, 0.28, -0.32);
  chin.scale.set(1.2, 0.7, 0.8);
  part(g, roundBox(0.14, 0.05, 0.3, 0.02), std(0x2a2a30), 0, 0.88, 0.05);
  g.scale.setScalar(1.2); // a bit bigger so it shows up while flying
}

const BUILDERS = {
  // Classic white racing helmet with a red stripe over the top.
  helmet(g) {
    racingHelmet(g, (x, w, h) => {
      x.fillStyle = '#f6f6f8'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#d81e2a'; x.fillRect(0, 0, w, h * 0.12); // stripe over the crown
      x.fillRect(w * 0.47, 0, w * 0.06, h); // stripe front-to-back
    });
  },
  // Champion helmet: bright yellow with green and blue racing stripes.
  champion(g) {
    racingHelmet(g, (x, w, h) => {
      x.fillStyle = '#ffd21a'; x.fillRect(0, 0, w, h);
      // Two diagonal racing stripes sweeping back along each side
      for (const [col, off, thick] of [['#169a3c', 0, 34], ['#1e46c8', 44, 16]]) {
        x.fillStyle = col;
        for (const side of [0, w / 2]) {
          x.beginPath();
          x.moveTo(side + 20 + off, h * 0.25);
          x.lineTo(side + 20 + off + thick, h * 0.25);
          x.lineTo(side + 200 + off + thick, h * 0.62);
          x.lineTo(side + 200 + off, h * 0.62);
          x.closePath();
          x.fill();
        }
      }
      x.fillStyle = '#169a3c'; x.fillRect(0, 0, w, h * 0.07); // green ring on the very top
    });
  },

  antenna(g) {
    part(g, new THREE.CylinderGeometry(0.02, 0.02, 1, 6), std(0x333333, 0.4, 0.8), 0.5, 0.5, 0.6);
    part(g, new THREE.SphereGeometry(0.14, 14, 10), std(0xff2a3a, 0.3), 0.5, 1.05, 0.6);
  },
  party(g) {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const x = c.getContext('2d');
    ['#ff4d6d', '#ffd040', '#4dd8ff', '#8dff6a'].forEach((col, i) => { x.fillStyle = col; x.fillRect(0, i * 16, 64, 16); });
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    part(g, new THREE.ConeGeometry(0.3, 0.75, 20), std(0xffffff, 0.6, 0, { map: tex }), 0, 0.38, 0);
    part(g, new THREE.SphereGeometry(0.09, 10, 8), std(0xffffff, 0.8), 0, 0.78, 0);
  },
  cone(g) {
    part(g, roundBox(0.6, 0.06, 0.6), std(0xff6a1a), 0, 0.03, 0);
    part(g, new THREE.ConeGeometry(0.25, 0.8, 20), std(0xff6a1a), 0, 0.46, 0);
    part(g, new THREE.CylinderGeometry(0.16, 0.19, 0.12, 20), std(0xffffff), 0, 0.42, 0);
  },
  fin(g) {
    const s = new THREE.Shape();
    s.moveTo(-0.5, 0);
    s.quadraticCurveTo(0, 0.2, 0.45, 0.9);
    s.quadraticCurveTo(0.35, 0.3, 0.55, 0);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false });
    geo.translate(0, 0, -0.04);
    const fin = part(g, geo, std(0x6a7a8a, 0.4, 0.3));
    fin.rotation.y = Math.PI / 2;
  },
  propeller(g) {
    part(g, new THREE.SphereGeometry(0.32, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(0x2a6aff));
    part(g, roundBox(0.4, 0.04, 0.25), std(0xff2a3a), 0, 0.02, -0.4);
    part(g, new THREE.CylinderGeometry(0.03, 0.03, 0.15, 6), std(0x333333), 0, 0.38, 0);
    const prop = new THREE.Group();
    prop.position.y = 0.46;
    part(prop, roundBox(0.8, 0.02, 0.1), std(0xffd040));
    part(prop, roundBox(0.1, 0.02, 0.8), std(0xff2a3a));
    g.add(prop);
    g.userData.spin = prop;
  },
  cowboy(g) {
    const brown = std(0x7a4a22, 0.8);
    part(g, new THREE.CylinderGeometry(0.62, 0.62, 0.05, 28), brown, 0, 0.03, 0).scale.set(1, 1, 0.8);
    part(g, new THREE.CylinderGeometry(0.28, 0.32, 0.4, 20), brown, 0, 0.25, 0);
    part(g, new THREE.CylinderGeometry(0.33, 0.33, 0.07, 20), std(0x2a1a0a), 0, 0.1, 0);
  },
  tophat(g) {
    const black = std(0x111111, 0.4);
    part(g, new THREE.CylinderGeometry(0.5, 0.5, 0.04, 28), black, 0, 0.02, 0);
    part(g, new THREE.CylinderGeometry(0.3, 0.3, 0.6, 24), black, 0, 0.33, 0);
    part(g, new THREE.CylinderGeometry(0.31, 0.31, 0.08, 24), std(0xb8102a), 0, 0.1, 0);
  },
  duck(g) {
    const yellow = std(0xffd420, 0.35);
    part(g, new THREE.SphereGeometry(0.32, 20, 14), yellow, 0, 0.25, 0).scale.set(1, 0.8, 1.2);
    part(g, new THREE.SphereGeometry(0.2, 18, 12), yellow, 0, 0.55, -0.22);
    const beak = part(g, new THREE.ConeGeometry(0.08, 0.2, 10), std(0xff7a1a), 0, 0.52, -0.45);
    beak.rotation.x = -Math.PI / 2;
    for (const x of [-0.08, 0.08]) part(g, new THREE.SphereGeometry(0.035, 8, 6), std(0x111111), x, 0.6, -0.38);
  },
  crown(g) {
    const gold = std(0xffcc33, 0.15, 1, { emissive: 0x4a3000, emissiveIntensity: 0.4 });
    part(g, new THREE.CylinderGeometry(0.34, 0.34, 0.2, 24, 1, true), gold, 0, 0.1, 0).material.side = THREE.DoubleSide;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      part(g, new THREE.ConeGeometry(0.07, 0.22, 6), gold, Math.cos(a) * 0.32, 0.3, Math.sin(a) * 0.32);
      part(g, new THREE.SphereGeometry(0.045, 8, 6), std(i % 2 ? 0xff2a3a : 0x2a8aff, 0.1, 0.2), Math.cos(a) * 0.32, 0.43, Math.sin(a) * 0.32);
    }
  },
};

// Puts the chosen topper on the car (or removes it for 'none').
export function createToppers(slot) {
  const built = {};
  let current = null;
  return {
    set(id) {
      if (current) current.visible = false;
      current = null;
      if (!BUILDERS[id]) return;
      if (!built[id]) {
        const g = new THREE.Group();
        BUILDERS[id](g);
        slot.add(g);
        built[id] = g;
      }
      current = built[id];
      current.visible = true;
    },
    update(dt) {
      if (current?.userData.spin) current.userData.spin.rotation.y += dt * 18;
    },
  };
}
