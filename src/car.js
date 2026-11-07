import * as THREE from 'three';

// Area the car can move in (it stays at z = 0; the world moves past it).
export const BOUNDS = { x: 6, yMin: 0.5, yMax: 7.5 };
const FUEL_REFILL = 0.15; // per second while not boosting
const RELOCK_LEVEL = 0.2; // fuel needed to boost again after running dry
const GLOW_COLORS = [0x5fe4ff, 0x8af0ff, 0xc8f8ff, 0xffffff];

export function createCar() {
  const group = new THREE.Group();
  const body = new THREE.Group(); // tilts and bobs; `group` holds the real position
  group.add(body);

  // Level 1 look: rusty, muddy roadster.
  const paint = new THREE.MeshStandardMaterial({ color: 0xa0582c, roughness: 0.5, metalness: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x23262d, roughness: 0.45, metalness: 0.6 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1a2c40, roughness: 0.08, metalness: 0.9 });
  const mud = new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 1 });
  const headlight = new THREE.MeshBasicMaterial({ color: 0xfff1c0 });
  const glow = new THREE.MeshBasicMaterial({ color: GLOW_COLORS[0] });

  const add = (geo, mat, x, y, z, parent = body) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const box = (w, h, d, mat, x, y, z) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z);

  box(2.3, 0.45, 4.2, paint, 0, 0, 0); // chassis
  box(2.0, 0.28, 1.1, paint, 0, -0.06, -2.55); // nose
  box(1.5, 0.45, 1.7, glass, 0, 0.44, 0.3); // cockpit
  box(2.5, 0.08, 0.5, dark, 0, 0.66, 2.0); // spoiler
  box(0.12, 0.4, 0.12, dark, -0.8, 0.42, 2.0);
  box(0.12, 0.4, 0.12, dark, 0.8, 0.42, 2.0);
  box(0.7, 0.04, 0.9, mud, -0.5, 0.24, -1.3); // mud splats
  box(0.5, 0.04, 0.5, mud, 0.65, 0.24, 1.1);
  box(0.4, 0.05, 0.3, mud, 0.3, -0.03, -3.05);
  box(0.45, 0.12, 0.04, headlight, -0.7, 0, -3.11);
  box(0.45, 0.12, 0.04, headlight, 0.7, 0, -3.11);

  // Chunky wheels folded flat into hover-thrusters, with glowing undersides.
  const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.35, 24);
  const glowGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.05, 20);
  const ringGeo = new THREE.TorusGeometry(0.5, 0.05, 8, 24);
  ringGeo.rotateX(Math.PI / 2);
  const glowDiscs = [];
  const thrusterRings = [];
  for (const x of [-1.3, 1.3]) {
    for (const z of [-1.45, 1.45]) {
      add(wheelGeo, dark, x, -0.15, z);
      const disc = add(glowGeo, glow, x, -0.34, z);
      disc.castShadow = false;
      glowDiscs.push(disc);
      thrusterRings.push(add(ringGeo, glow, x, -0.36, z));
    }
  }

  // Rear boosters with flames. The third (top) booster comes with an upgrade.
  const nozzleGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.5, 16);
  nozzleGeo.rotateX(Math.PI / 2);
  const flameGeo = new THREE.ConeGeometry(0.2, 1, 14, 1, true);
  flameGeo.translate(0, 0.5, 0); // base at origin, tip along +y
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const flames = [];
  const nozzles = [];
  const addBooster = (x, y, size, parent) => {
    const nozzle = add(nozzleGeo, dark, x, y, 2.3, parent);
    nozzle.scale.setScalar(size);
    nozzles.push(nozzle);
    for (const [mat, r] of [[flameMat, 1], [coreMat, 0.5]]) {
      const f = new THREE.Mesh(flameGeo, mat);
      f.rotation.x = Math.PI / 2; // tip points backward (+z)
      f.position.set(x, y, 2.55);
      parent.add(f);
      flames.push({ mesh: f, r: r * size });
    }
  };
  addBooster(-0.55, 0.05, 1, body);
  addBooster(0.55, 0.05, 1, body);
  const topBooster = new THREE.Group();
  body.add(topBooster);
  addBooster(0, 0.42, 0.75, topBooster);

  // Upgrade parts, shown as they are bought.
  const tankMat = new THREE.MeshStandardMaterial({ color: 0xd9822b, roughness: 0.35, metalness: 0.6, emissive: 0xff7a18, emissiveIntensity: 0 });
  const tankGeo = new THREE.CylinderGeometry(0.2, 0.2, 2.4, 16);
  tankGeo.rotateX(Math.PI / 2);
  const tanks = [-1.32, 1.32].map((x) => add(tankGeo, tankMat, x, 0.32, 0.2));
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.3, metalness: 0.9 });
  const armor1 = [
    box(2.1, 0.1, 1.2, steel, 0, 0.13, -2.5), // nose plate
    box(0.1, 0.35, 3.6, steel, -1.18, -0.05, 0), // side skirts
    box(0.1, 0.35, 3.6, steel, 1.18, -0.05, 0),
  ];
  const armor2 = [
    box(1.3, 0.08, 1.2, steel, 0, 0.7, 0.3), // roof plate
    box(2.2, 0.2, 0.25, steel, 0, -0.2, -3.15), // front bumper
  ];

  const velocity = new THREE.Vector2();
  let emptyLock = false;
  let steerSpeed = 13;
  let fuelDrain = 0.35;
  let flamePower = 1;

  const car = {
    group,
    fuel: 1,
    boosting: false,

    reset() {
      group.position.set(0, 3, 0);
      group.rotation.set(0, 0, 0);
      velocity.set(0, 0);
      car.fuel = 1;
      car.boosting = false;
      emptyLock = false;
      group.visible = true;
    },

    setStats(stats) {
      steerSpeed = stats.steerSpeed;
      fuelDrain = stats.fuelDrain;
    },

    // Show the parts for each upgrade level.
    applyUpgrades(levels) {
      const tankScale = 1 + 0.25 * Math.max(0, levels.tank - 1);
      for (const t of tanks) {
        t.visible = levels.tank > 0;
        t.scale.set(tankScale, tankScale, 1);
      }
      tankMat.emissiveIntensity = levels.tank >= 3 ? 0.6 : 0;
      armor1.forEach((m) => { m.visible = levels.armor >= 1; });
      armor2.forEach((m) => { m.visible = levels.armor >= 2; });
      const discScale = 1 + 0.25 * levels.thrusters;
      glowDiscs.forEach((d) => d.scale.set(discScale, 1, discScale));
      thrusterRings.forEach((r) => { r.visible = levels.thrusters >= 2; });
      glow.color.setHex(GLOW_COLORS[levels.thrusters]);
      nozzles.slice(0, 2).forEach((n) => n.scale.setScalar(levels.booster >= 1 ? 1.25 : 1));
      topBooster.visible = levels.booster >= 2;
      flamePower = 1 + 0.3 * levels.booster;
    },

    update(dt, input, time) {
      const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const dy = (input.up ? 1 : 0) - (input.down ? 1 : 0);
      const k = 1 - Math.exp(-7 * dt);
      velocity.x += (dx * steerSpeed - velocity.x) * k;
      velocity.y += (dy * steerSpeed - velocity.y) * k;

      const p = group.position;
      p.x += velocity.x * dt;
      p.y += velocity.y * dt;
      if (Math.abs(p.x) > BOUNDS.x) { p.x = Math.sign(p.x) * BOUNDS.x; velocity.x = 0; }
      if (p.y < BOUNDS.yMin) { p.y = BOUNDS.yMin; velocity.y = 0; }
      if (p.y > BOUNDS.yMax) { p.y = BOUNDS.yMax; velocity.y = 0; }

      // Bank, pitch and yaw toward the steering direction, plus a hover bob.
      body.rotation.z = -velocity.x * 0.045;
      body.rotation.x = velocity.y * 0.03;
      body.rotation.y = -velocity.x * 0.015;
      body.position.y = Math.sin(time * 3) * 0.06;

      // After running dry, boost stays locked until the tank refills a bit.
      if (car.fuel <= 0) emptyLock = true;
      if (car.fuel >= RELOCK_LEVEL) emptyLock = false;
      car.boosting = input.boost && !emptyLock;
      car.fuel = car.boosting
        ? Math.max(0, car.fuel - fuelDrain * dt)
        : Math.min(1, car.fuel + FUEL_REFILL * dt);
    },

    // Slowly turn the car around so you can see it in the garage.
    // x: sideways offset so the car isn't hidden behind the garage panel.
    displaySpin(dt, time, x = 0) {
      group.position.set(x, 3.6, 6); // closer to the camera than in flight
      group.rotation.y += dt * 0.7;
      body.rotation.set(0, 0, 0);
      body.position.y = Math.sin(time * 3) * 0.06;
      car.setFlame(0, time);
    },

    // amount: 0 (cruise) .. 1 (full boost)
    setFlame(amount, time) {
      const flicker = 1 + Math.sin(time * 40) * 0.08 + Math.sin(time * 23) * 0.06;
      for (const { mesh, r } of flames) {
        mesh.scale.y = (0.45 + amount * 2.4 * flamePower) * flicker * (r < 0.6 ? 0.7 : 1);
        const w = r * (1 + amount * 0.35) * (flamePower > 1 ? 1.15 : 1);
        mesh.scale.x = w;
        mesh.scale.z = w;
      }
      flameMat.opacity = 0.55 + amount * 0.4;
    },
  };

  car.applyUpgrades({ tank: 0, armor: 0, thrusters: 0, booster: 0 });
  car.reset();
  return car;
}
