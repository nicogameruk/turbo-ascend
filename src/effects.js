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
