import * as THREE from 'three';

const COUNT = 160;
const rand = (a, b) => a + Math.random() * (b - a);

// Speed lines that streak past the camera, stronger while boosting.
export function createSpeedLines(scene) {
  const lines = [];
  const positions = new Float32Array(COUNT * 6);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
  const mesh = new THREE.LineSegments(geo, mat);
  mesh.frustumCulled = false;
  scene.add(mesh);

  const respawn = (l, z) => {
    l.x = rand(-24, 24);
    l.y = rand(-6, 18);
    // keep the area right around the car clear
    if (Math.abs(l.x) < 5 && l.y > -1 && l.y < 10) l.x += Math.sign(l.x || 1) * 6;
    l.z = z;
  };
  for (let i = 0; i < COUNT; i++) {
    const l = {};
    respawn(l, rand(-140, 16));
    lines.push(l);
  }

  return {
    update(dt, speed, boostAmt) {
      mat.opacity = 0.04 + boostAmt * 0.55;
      const len = 1.5 + boostAmt * 12;
      for (let i = 0; i < COUNT; i++) {
        const l = lines[i];
        l.z += speed * 1.4 * dt;
        if (l.z > 16) respawn(l, rand(-150, -110));
        positions.set([l.x, l.y, l.z, l.x, l.y, l.z - len], i * 6);
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

// Quick glowing explosion puffs.
export function createBooms(scene) {
  const geo = new THREE.SphereGeometry(1, 16, 12);
  const booms = [];
  return {
    spawn(pos, color = 0xffa040, size = 1) {
      let b = booms.find((x) => !x.alive);
      if (!b) {
        const mat = new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
        b = { mesh: new THREE.Mesh(geo, mat), mat };
        scene.add(b.mesh);
        booms.push(b);
      }
      b.alive = true;
      b.age = 0;
      b.size = size;
      b.mat.color.setHex(color);
      b.mesh.visible = true;
      b.mesh.position.copy(pos);
    },
    update(dt) {
      for (const b of booms) {
        if (!b.alive) continue;
        b.age += dt;
        b.mesh.scale.setScalar((0.5 + b.age * 9) * b.size);
        b.mat.opacity = Math.max(0, 1 - b.age * 2);
        if (b.age > 0.5) { b.alive = false; b.mesh.visible = false; }
      }
    },
  };
}

// Glowing ribbons behind the two rear boosters. Brighter while boosting.
export function createTrails(scene) {
  const N = 14; // points per ribbon (the trail is about this many frames long)
  const ribbons = [-0.55, 0.55].map((offset) => {
    const pts = Array.from({ length: N }, () => new THREE.Vector3(offset, 3, 2.6));
    const pos = new Float32Array(N * 2 * 3);
    const col = new Float32Array(N * 2 * 3);
    const idx = [];
    for (let i = 0; i < N - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    mesh.frustumCulled = false;
    scene.add(mesh);
    return { offset, pts, pos, col, geo, mesh };
  });
  const c = new THREE.Color();
  let color = 0x5fe4ff; // null = rainbow

  return {
    setColor(hex) { color = hex; },
    setVisible(v) { ribbons.forEach((r) => { r.mesh.visible = v; }); },
    reset(carPos) {
      for (const r of ribbons) for (const p of r.pts) p.set(carPos.x + r.offset, carPos.y, carPos.z + 2.6);
    },
    // carPos: car position; speed: world scroll; amount: 0..1 boost
    update(dt, carPos, speed, amount, time) {
      for (const r of ribbons) {
        // Keep the last N side/up positions; spread them over a fixed length behind
        // the car, so the trail looks the same at any frame rate.
        for (let i = N - 1; i > 0; i--) r.pts[i].copy(r.pts[i - 1]);
        r.pts[0].set(carPos.x + r.offset, carPos.y + 0.05, 0);
        const len = 3 + amount * 6 + Math.min(1, speed / 60) * 1.5;
        for (let i = 0; i < N; i++) r.pts[i].z = carPos.z + 2.6 + (i / (N - 1)) * len;
        const strength = 0.12 + amount * 0.88;
        for (let i = 0; i < N; i++) {
          const f = 1 - i / (N - 1);
          const w = (0.1 + amount * 0.1) * f + 0.02;
          const p = r.pts[i];
          r.pos.set([p.x - w, p.y, p.z, p.x + w, p.y, p.z], i * 6);
          if (color === null) c.setHSL((time * 0.5 + i / N) % 1, 1, 0.55);
          else c.setHex(color);
          c.multiplyScalar(f * strength);
          r.col.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6);
        }
        r.geo.attributes.position.needsUpdate = true;
        r.geo.attributes.color.needsUpdate = true;
      }
    },
  };
}

// Sparks that fly off when the car gets hit.
export function createSparks(scene) {
  const N = 60;
  const pos = new Float32Array(N * 3);
  const vel = Array.from({ length: N }, () => new THREE.Vector3());
  const life = new Float32Array(N);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffc060, size: 0.35, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);
  let next = 0;
  for (let i = 0; i < N; i++) pos[i * 3 + 1] = -999;

  return {
    burst(at, count = 24, color = 0xffc060) {
      mat.color.setHex(color);
      for (let k = 0; k < count; k++) {
        const i = next++ % N;
        pos.set([at.x, at.y, at.z], i * 3);
        vel[i].set(rand(-1, 1), rand(-0.3, 1.2), rand(-1, 1)).normalize().multiplyScalar(rand(6, 14));
        life[i] = rand(0.35, 0.7);
      }
    },
    update(dt) {
      for (let i = 0; i < N; i++) {
        if (life[i] <= 0) continue;
        life[i] -= dt;
        vel[i].y -= 20 * dt;
        pos[i * 3] += vel[i].x * dt;
        pos[i * 3 + 1] = life[i] > 0 ? pos[i * 3 + 1] + vel[i].y * dt : -999;
        pos[i * 3 + 2] += vel[i].z * dt;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}
