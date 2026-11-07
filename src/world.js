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

// Neon Cyber ground: glowing grid lines on black.
function gridTexture({ base, line, line2 }) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 128);
  g.shadowBlur = 6;
  g.lineWidth = 3;
  g.strokeStyle = line;
  g.shadowColor = line;
  g.strokeRect(0, 0, 128, 128);
  g.lineWidth = 1.5;
  g.strokeStyle = line2;
  g.shadowColor = line2;
  g.beginPath();
  g.moveTo(64, 0); g.lineTo(64, 128); g.moveTo(0, 64); g.lineTo(128, 64);
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// A canvas texture drawn by a function.
function canvasTexture(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Big objects far away in the sky (they don't scroll).
function createLandmarks(scene) {
  const all = {};
  const glow = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
  const add = (name, build) => {
    const g = new THREE.Group();
    build(g);
    g.visible = false;
    scene.add(g);
    all[name] = g;
  };
  add('planet', (g) => {
    const planet = new THREE.Mesh(new THREE.SphereGeometry(70, 48, 32), new THREE.MeshStandardMaterial({ color: 0x8a5aff, roughness: 0.8, emissive: 0x2a1060, fog: false }));
    const ring = new THREE.Mesh(new THREE.RingGeometry(95, 130, 64), glow(0xd8b8ff, 0.35));
    ring.rotation.x = -1.2;
    g.add(planet, ring);
    g.position.set(-180, 90, -620);
  });
  add('blackhole', (g) => {
    const hole = new THREE.Mesh(new THREE.SphereGeometry(55, 40, 24), new THREE.MeshBasicMaterial({ color: 0x000000, fog: false }));
    const disk = new THREE.Mesh(new THREE.RingGeometry(62, 140, 80), glow(0xff8a3a, 0.6));
    disk.rotation.x = -1.35;
    const halo = new THREE.Mesh(new THREE.RingGeometry(55, 66, 64), glow(0xffd8a0, 0.8));
    g.add(disk, halo, hole);
    g.userData.spin = disk;
    g.position.set(40, 60, -650);
  });
  add('sun', (g) => {
    // Striped sunset sun for Neon Cyber.
    const tex = canvasTexture(256, (x) => {
      const grad = x.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, '#ffe24a');
      grad.addColorStop(1, '#ff2ad8');
      x.fillStyle = grad;
      x.beginPath(); x.arc(128, 128, 126, 0, Math.PI * 2); x.fill();
      x.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 7; i++) x.fillRect(0, 150 + i * 16, 256, 3 + i * 1.5);
    });
    g.add(new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false, depthWrite: false })));
    g.position.set(0, 40, -700);
  });
  add('volcano', (g) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(160, 150, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x1a0c08, roughness: 1, flatShading: true, fog: false }));
    const lava = new THREE.Mesh(new THREE.CircleGeometry(24, 24), glow(0xff5a10, 0.9));
    lava.rotation.x = -Math.PI / 2;
    lava.position.y = 70;
    const plume = new THREE.Mesh(new THREE.ConeGeometry(30, 120, 16, 1, true), glow(0xff7a2a, 0.25));
    plume.position.y = 130;
    plume.rotation.x = Math.PI;
    g.add(cone, lava, plume);
    g.position.set(120, -30, -650);
  });
  add('galaxy', (g) => {
    const tex = canvasTexture(256, (x) => {
      const grad = x.createRadialGradient(128, 128, 0, 128, 128, 128);
      grad.addColorStop(0, 'rgba(255,240,200,1)');
      grad.addColorStop(0.25, 'rgba(255,140,220,0.6)');
      grad.addColorStop(0.6, 'rgba(90,120,255,0.25)');
      grad.addColorStop(1, 'rgba(0,0,40,0)');
      x.fillStyle = grad;
      x.fillRect(0, 0, 256, 256);
      x.strokeStyle = 'rgba(255,255,255,0.25)';
      x.lineWidth = 8;
      for (let arm = 0; arm < 3; arm++) {
        x.beginPath();
        for (let t = 0; t < 1; t += 0.02) {
          const a = arm * 2.09 + t * 5;
          const px = 128 + Math.cos(a) * t * 120;
          const py = 128 + Math.sin(a) * t * 120;
          if (t === 0) x.moveTo(px, py); else x.lineTo(px, py);
        }
        x.stroke();
      }
    });
    const disc = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    g.add(disc);
    g.userData.spin = disc;
    g.position.set(-60, 80, -700);
  });
  return {
    show(name) { for (const [k, g] of Object.entries(all)) g.visible = k === name; },
    update(dt) { for (const g of Object.values(all)) if (g.visible && g.userData.spin) g.userData.spin.rotation.z += dt * 0.05; },
  };
}

// Ground scenery shapes. Each is a unit-ish shape with its base at y = -0.5.
const SHAPES = {
  rock: new THREE.DodecahedronGeometry(1, 0),
  tree: new THREE.ConeGeometry(0.6, 1, 7),
  tower: new THREE.BoxGeometry(0.6, 1, 0.6),
  crystal: new THREE.OctahedronGeometry(0.7, 0),
  pillar: new THREE.CylinderGeometry(0.3, 0.34, 1, 14),
  spire: new THREE.ConeGeometry(0.5, 1, 5),
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

  // Stars for space levels. They're very far away, so they don't scroll.
  const STARS = 1500;
  const starPos = new Float32Array(STARS * 3);
  for (let i = 0; i < STARS; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = rand(250, 600);
    starPos.set([Math.cos(a) * r, Math.sin(a) * r * 0.6 + 40, rand(-800, -100)], i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.9 }));
  stars.visible = false;
  scene.add(stars);
  const landmarks = createLandmarks(scene);

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
      if (o.userData.float) {
        // Floating chunks in space: smaller, all around you, tumbling.
        o.scale.multiplyScalar(0.5);
        o.position.y = rand(-30, 45);
        o.rotation.set(rand(0, 6), rand(0, 6), rand(0, 6));
      } else {
        o.rotation.set(0, 0, 0);
      }
    };
    place(prop);
    prop.position.z = rand(FAR_Z, NEAR_Z);
    scene.add(prop);
    props.push({ obj: prop, place });
    movers.push({ obj: prop, place });
  }

  // Puffy clouds (built from spheres). Mostly to the sides, sometimes in your path.
  const cloudMat = new THREE.MeshStandardMaterial({ roughness: 1, emissiveIntensity: 0.25, transparent: true });
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
      groundTex = null;
      ground.visible = !!level.ground;
      if (level.ground) {
        const grid = level.ground.style === 'grid';
        groundTex = grid ? gridTexture(level.ground) : groundTexture(level.ground);
        groundTex.repeat.set(GROUND_REPEAT * (grid ? 2 : 1), GROUND_REPEAT * (grid ? 2 : 1));
        groundMat.map = groundTex;
        groundMat.emissiveMap = grid ? groundTex : null;
        groundMat.emissive.setHex(grid ? 0xffffff : 0x000000);
        groundMat.needsUpdate = true;
      }
      stars.visible = !!level.space || level.n === 10;
      landmarks.show(level.landmark);

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
        obj.userData.thin = s.shape === 'tree' || s.shape === 'pillar' || s.shape === 'tower' || s.shape === 'spire';
        obj.userData.float = !!s.float;
        const z = obj.position.z;
        place(obj);
        obj.position.z = z;
      }

      cloudMat.color.setHex(level.cloud.color);
      cloudMat.emissive.setHex(level.cloud.emissive);
      cloudMat.opacity = level.cloud.opacity ?? 1;
      cloudMat.depthWrite = !level.cloud.opacity;
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
      if (groundTex) groundTex.offset.y += (dz / (GROUND_SIZE / GROUND_REPEAT)) * (groundTex.repeat.x / GROUND_REPEAT);
      landmarks.update(dt);
      for (const { obj } of props) if (obj.userData.float) { obj.rotation.x += dt * 0.2; obj.rotation.y += dt * 0.15; }
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
