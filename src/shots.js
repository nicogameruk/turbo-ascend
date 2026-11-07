import * as THREE from 'three';

// Enemy shots that fly at the car. Pooled per kind.
const KINDS = {
  red: { core: 0xff3344, halo: 0xff2a1a, size: 1, stretch: 1 },
  green: { core: 0xc8ffa8, halo: 0x44ff66, size: 1, stretch: 1 },
  fire: { core: 0xffd070, halo: 0xff5a10, size: 1.2, stretch: 1.3 },
  laser: { core: 0xffd0d8, halo: 0xff2050, size: 0.55, stretch: 6 },
};
const HIT_DIST = 1.4;

export function createShots(scene) {
  const coreGeo = new THREE.SphereGeometry(0.5, 14, 10);
  const haloGeo = new THREE.SphereGeometry(0.9, 14, 10);
  const mats = {};
  for (const [kind, k] of Object.entries(KINDS)) {
    mats[kind] = {
      core: new THREE.MeshBasicMaterial({ color: k.core }),
      halo: new THREE.MeshBasicMaterial({ color: k.halo, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }),
    };
  }

  const shots = []; // { kind, mesh, vel, alive }
  const make = (kind) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(coreGeo, mats[kind].core), new THREE.Mesh(haloGeo, mats[kind].halo));
    g.scale.set(KINDS[kind].size, KINDS[kind].size, KINDS[kind].size * KINDS[kind].stretch);
    scene.add(g);
    const s = { kind, mesh: g, vel: new THREE.Vector3(), alive: false };
    shots.push(s);
    return s;
  };
  const kill = (s) => { s.alive = false; s.mesh.visible = false; };
  const tmp = new THREE.Vector3();

  return {
    spawn(kind, from, target, speed) {
      const s = shots.find((x) => !x.alive && x.kind === kind) ?? make(kind);
      s.alive = true;
      s.mesh.visible = true;
      s.mesh.position.copy(from);
      s.vel.subVectors(target, from).normalize().multiplyScalar(speed);
      s.mesh.lookAt(tmp.copy(from).add(s.vel));
    },

    // hit(): asks the game to hurt the car; truthy means the shot was used up.
    update(dt, carPos, hit) {
      for (const s of shots) {
        if (!s.alive) continue;
        const p = s.mesh.position;
        p.addScaledVector(s.vel, dt);
        if (p.distanceTo(carPos) < HIT_DIST * Math.max(1, KINDS[s.kind].size) && hit()) kill(s);
        else if (p.z > 18 || p.z < -400) kill(s);
      }
    },

    clear() { shots.forEach(kill); },
    // Fire Breath: burn shots in front of the car.
    clearAhead(carPos, range = 80) {
      for (const s of shots) {
        if (!s.alive) continue;
        const p = s.mesh.position;
        if (p.z < carPos.z + 1 && p.z > carPos.z - range && Math.abs(p.x - carPos.x) < 6 && Math.abs(p.y - carPos.y) < 5) kill(s);
      }
    },
    get active() { return shots.filter((s) => s.alive).length; },
  };
}
