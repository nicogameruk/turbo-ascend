import * as THREE from 'three';

const FAR_Z = -340; // where scenery respawns
const NEAR_Z = 30; // past the camera: recycle
const SPAN = NEAR_Z - FAR_Z;

const rand = (a, b) => a + Math.random() * (b - a);

// Sky: a vertical gradient on a small canvas, redrawn as the colours shift.
function createSky() {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 256;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const top = new THREE.Color();
  const bottom = new THREE.Color();
  const tmp = new THREE.Color();
  return {
    tex,
    // f: 0 = start colours, 1 = end colours
    draw(from, to, f) {
      top.set(from[0]).lerp(tmp.set(to[0]), f);
      bottom.set(from[1]).lerp(tmp.set(to[1]), f);
      const grad = g.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, `#${top.getHexString()}`);
      grad.addColorStop(1, `#${bottom.getHexString()}`);
      g.fillStyle = grad;
      g.fillRect(0, 0, 2, 256);
      tex.needsUpdate = true;
    },
  };
}

// Speckled ground with furrows, coloured by the level's palette.
function groundTexture({ base, hue, sat, light, furrow }) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const s = rand(2, 14);
    g.fillStyle = `hsl(${rand(...hue)}, ${rand(...sat)}%, ${rand(...light)}%)`;
    g.globalAlpha = rand(0.3, 0.8);
    g.fillRect(rand(0, 256), rand(0, 256), s, s);
  }
  g.globalAlpha = 0.35;
  g.fillStyle = furrow;
  for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 5, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Ground scenery shapes. Each is a unit-ish shape with its base at y = -0.5.
const SHAPES = {
  rock: new THREE.DodecahedronGeometry(1, 0),
  tree: new THREE.ConeGeometry(0.6, 1, 7),
  tower: new THREE.BoxGeometry(0.6, 1, 0.6),
  crystal: new THREE.OctahedronGeometry(0.7, 0),
  pillar: new THREE.CylinderGeometry(0.3, 0.34, 1, 14),
};

export function createWorld(scene, hemi) {
  scene.fog = new THREE.Fog(0xffffff, 90, 330);

  // Ground far below; its texture scrolls to show speed.
  const GROUND_SIZE = 900;
  const GROUND_REPEAT = 45;
  const groundMat = new THREE.MeshStandardMaterial({ roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -30, -300);
  scene.add(ground);

  const movers = []; // { obj, place(obj) }

  // Scenery on the ground for parallax (rocks, trees, towers, crystals, pillars).
  const propMat = new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true });
  const props = [];
  for (let i = 0; i < 40; i++) {
    const prop = new THREE.Mesh(SHAPES.rock, propMat);
    const place = (o) => {
      const side = Math.random() < 0.5 ? -1 : 1;
      o.position.x = side * rand(14, 140);
      const h = rand(4, 22);
      const w = o.userData.thin ? rand(3, 5) : rand(3, 8);
      o.scale.set(w, h, o.userData.thin ? w : rand(3, 8));
      o.position.y = -30 + h * 0.5;
    };
    place(prop);
    prop.position.z = rand(FAR_Z, NEAR_Z);
    scene.add(prop);
    props.push({ obj: prop, place });
    movers.push({ obj: prop, place });
  }

  // Puffy clouds (built from spheres). Mostly to the sides, sometimes in your path.
  const cloudMat = new THREE.MeshStandardMaterial({ roughness: 1, emissiveIntensity: 0.25 });
  const puffGeo = new THREE.IcosahedronGeometry(1, 2);
  for (let i = 0; i < 34; i++) {
    const cloud = new THREE.Group();
    const puffs = 4 + Math.floor(Math.random() * 4);
    for (let j = 0; j < puffs; j++) {
      const p = new THREE.Mesh(puffGeo, cloudMat);
      const s = rand(2.5, 5.5);
      p.scale.set(s * 1.3, s, s);
      p.position.set(rand(-6, 6), rand(-1.5, 1.5), rand(-3, 3));
      cloud.add(p);
    }
    const place = (o) => {
      const inPath = Math.random() < 0.12;
      o.position.x = inPath ? rand(-10, 10) : (Math.random() < 0.5 ? -1 : 1) * rand(16, 110);
      o.position.y = inPath ? rand(14, 22) : rand(-18, 38);
    };
    place(cloud);
    cloud.position.z = rand(FAR_Z, NEAR_Z);
    scene.add(cloud);
    movers.push({ obj: cloud, place });
  }

  let groundTex = null;
  const sky = createSky();
  scene.background = sky.tex;
  let theme = null;
  let skyF = -1;

  return {
    // Repaint the world for a level.
    setTheme(level) {
      theme = level;
      skyF = -1;
      this.setSkyProgress(0);
      scene.fog.color.setHex(level.fog);
      hemi.color.setHex(level.hemi[0]);
      hemi.groundColor.setHex(level.hemi[1]);

      groundTex?.dispose();
      groundTex = groundTexture(level.ground);
      groundTex.repeat.set(GROUND_REPEAT, GROUND_REPEAT);
      groundMat.map = groundTex;
      groundMat.needsUpdate = true;

      const s = level.scenery;
      propMat.color.setHex(s.color);
      propMat.metalness = s.metal ? 0.8 : 0;
      propMat.roughness = s.metal ? 0.35 : s.shape === 'crystal' ? 0.15 : 0.95;
      propMat.emissive.setHex(s.glow ?? 0x000000);
      propMat.emissiveIntensity = s.glow ? 0.5 : 0;
      propMat.flatShading = s.shape !== 'pillar';
      propMat.needsUpdate = true;
      for (const { obj, place } of props) {
        obj.geometry = SHAPES[s.shape];
        obj.userData.thin = s.shape === 'tree' || s.shape === 'pillar' || s.shape === 'tower';
        const z = obj.position.z;
        place(obj);
        obj.position.z = z;
      }

      cloudMat.color.setHex(level.cloud.color);
      cloudMat.emissive.setHex(level.cloud.emissive);
    },

    // The sky slowly changes colour as you get through the level (0..1).
    setSkyProgress(f) {
      f = Math.min(1, Math.max(0, f));
      if (!theme || Math.abs(f - skyF) < 0.01) return;
      skyF = f;
      sky.draw(theme.sky, theme.sky2 ?? theme.sky, f);
    },

    update(dt, speed) {
      const dz = speed * dt;
      if (groundTex) groundTex.offset.y += dz / (GROUND_SIZE / GROUND_REPEAT);
      for (const { obj, place } of movers) {
        obj.position.z += dz;
        if (obj.position.z > NEAR_Z) {
          obj.position.z -= SPAN;
          place(obj);
        }
      }
    },
  };
}
