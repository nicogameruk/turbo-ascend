import * as THREE from 'three';

const SPAWN_Z = 24; // behind the camera, off screen
const MAX_BEHIND_Z = 40;
const BASE_SPEED = 47; // a bit faster than the car's cruise speed

// Small robot drone that chases the car from behind.
export function createDrone() {
  const group = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x8d96a3, roughness: 0.3, metalness: 0.85 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.5, metalness: 0.6 });
  const red = new THREE.MeshBasicMaterial({ color: 0xff2a3a });

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.7, 24, 16), metal);
  core.castShadow = true;
  group.add(core);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.07, 8, 32), red);
  band.rotation.x = Math.PI / 2;
  group.add(band);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), red);
  eye.position.z = -0.62;
  group.add(eye);

  const rotors = [];
  const armGeo = new THREE.BoxGeometry(1.1, 0.08, 0.12);
  const rotorGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.03, 16);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const arm = new THREE.Mesh(armGeo, dark);
    arm.position.set(Math.cos(a) * 0.9, 0.25, Math.sin(a) * 0.9);
    arm.rotation.y = -a;
    group.add(arm);
    const rotor = new THREE.Mesh(rotorGeo, dark);
    rotor.position.set(Math.cos(a) * 1.4, 0.32, Math.sin(a) * 1.4);
    group.add(rotor);
    rotors.push(rotor);
  }

  const drone = {
    group,
    get position() { return group.position; },

    reset() {
      group.position.set(0, 3, SPAWN_Z);
    },

    knockBack() {
      group.position.z = SPAWN_Z;
    },

    // carSpeed: how fast the world scrolls. The drone gets slowly faster over time.
    update(dt, carPos, carSpeed, elapsed, time) {
      const speed = BASE_SPEED + Math.min(elapsed * 0.15, 12);
      const p = group.position;
      p.z += (carSpeed - speed) * dt; // boosting makes it fall back
      p.z = Math.min(MAX_BEHIND_Z, Math.max(-1.5, p.z));

      // Turn toward the car with some delay.
      const k = 1 - Math.exp(-1.6 * dt);
      const vx = (carPos.x - p.x) * k;
      p.x += vx;
      p.y += (carPos.y - p.y) * k;

      group.rotation.z = -vx * 3;
      for (const r of rotors) r.rotation.y += dt * 40;
      core.position.y = Math.sin(time * 5) * 0.08;
    },
  };

  drone.reset();
  return drone;
}
