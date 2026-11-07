import * as THREE from 'three';

const FAR_Z = -340; // where scenery respawns
const NEAR_Z = 30; // past the camera: recycle
const SPAN = NEAR_Z - FAR_Z;
const HORIZON = 0xcfe8ff;

const rand = (a, b) => a + Math.random() * (b - a);

function gradientTexture(top, bottom) {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  g.fillStyle = grad;
  g.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function dirtTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#8a6440';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const s = rand(2, 14);
    g.fillStyle = `hsl(${rand(22, 34)}, ${rand(30, 45)}%, ${rand(22, 42)}%)`;
    g.globalAlpha = rand(0.3, 0.8);
    g.fillRect(rand(0, 256), rand(0, 256), s, s);
  }
  g.globalAlpha = 0.35;
  g.fillStyle = '#4a321c';
  for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 5, 256); // furrows
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createWorld(scene) {
  scene.background = gradientTexture('#3b86f0', '#cfe8ff');
  scene.fog = new THREE.Fog(HORIZON, 90, 330);

  // Dirt ground far below; its texture scrolls to show speed.
  const GROUND_SIZE = 900;
  const GROUND_REPEAT = 45;
  const groundTex = dirtTexture();
  groundTex.repeat.set(GROUND_REPEAT, GROUND_REPEAT);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE),
    new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -30, -300);
  scene.add(ground);

  const movers = []; // { obj, place(obj) }

  // Rock spires on the ground for parallax.
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x7a5434, roughness: 0.95, flatShading: true });
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  for (let i = 0; i < 40; i++) {
    const rock = new THREE.Mesh(rockGeo, rockMat);
    const place = (o) => {
      const side = Math.random() < 0.5 ? -1 : 1;
      o.position.x = side * rand(14, 140);
      const h = rand(4, 22);
      o.scale.set(rand(3, 8), h, rand(3, 8));
      o.position.y = -30 + h * 0.5;
    };
    place(rock);
    rock.position.z = rand(FAR_Z, NEAR_Z);
    scene.add(rock);
    movers.push({ obj: rock, place });
  }

  // Puffy clouds (built from spheres). Mostly to the sides, sometimes in your path.
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0x8899aa, emissiveIntensity: 0.25 });
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

  // Glowing rings in the flight area: speed cues now, collectible markers later.
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x2bd9ff, emissive: 0x2bd9ff, emissiveIntensity: 1.4, roughness: 0.3 });
  const ringGeo = new THREE.TorusGeometry(2.4, 0.14, 12, 40);
  for (let i = 0; i < 6; i++) {
    const ring = new THREE.Mesh(ringGeo, ringMat);
    const place = (o) => o.position.set(rand(-7, 7), rand(1, 8), o.position.z);
    place(ring);
    ring.position.z = FAR_Z + (i / 6) * SPAN;
    scene.add(ring);
    movers.push({ obj: ring, place });
  }

  return {
    update(dt, speed) {
      const dz = speed * dt;
      groundTex.offset.y += dz / (GROUND_SIZE / GROUND_REPEAT);
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
