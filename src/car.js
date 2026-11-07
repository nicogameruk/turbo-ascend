import * as THREE from 'three';

// Area the car can move in (it stays at z = 0; the world moves past it).
export const BOUNDS = { x: 6, yMin: 0.5, yMax: 7.5 };
const FUEL_REFILL = 0.15; // per second while not boosting
const RELOCK_LEVEL = 0.2; // fuel needed to boost again after running dry
const GLOW_COLORS = [0x5fe4ff, 0x8af0ff, 0xc8f8ff, 0xe6fcff, 0xb8a8ff, 0xffffff];

// Car look for each level tier (1 = Dirt ... 7 = Angel).
const TIERS = {
  1: { color: 0xa0582c, rough: 0.5, metal: 0.35 },
  2: { color: 0x3f9b4a, rough: 0.45, metal: 0.2 },
  3: { color: 0x8b8d90, rough: 0.9, metal: 0.05, flat: true },
  4: { color: 0xb8c0c8, rough: 0.22, metal: 0.95 },
  5: { color: 0xffc83a, rough: 0.12, metal: 1, emissive: 0x3a2500 },
  6: { color: 0x9fe8ff, rough: 0.05, metal: 0.1, opacity: 0.6, emissive: 0x2299cc },
  7: { color: 0xf6f2ea, rough: 0.3, metal: 0.3, emissive: 0x332a18 },
};

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
  const mudSplats = [
    box(0.7, 0.04, 0.9, mud, -0.5, 0.24, -1.3),
    box(0.5, 0.04, 0.5, mud, 0.65, 0.24, 1.1),
    box(0.4, 0.05, 0.3, mud, 0.3, -0.03, -3.05),
  ];
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
  const armor3 = [
    box(2.4, 0.2, 0.25, steel, 0, -0.15, 2.15), // rear bumper
    box(0.08, 0.5, 1.6, steel, -0.78, 0.45, 0.3), // cockpit guards
    box(0.08, 0.5, 1.6, steel, 0.78, 0.45, 0.3),
  ];

  // Tier decorations, shown by setTier().
  const tierParts = {};
  const part = (tier) => {
    const g = new THREE.Group();
    body.add(g);
    tierParts[tier] = g;
    return g;
  };
  { // 2: moss tufts and a vine stripe
    const g = part(2);
    const moss = new THREE.MeshStandardMaterial({ color: 0x2f6b2a, roughness: 1, flatShading: true });
    const tuft = new THREE.IcosahedronGeometry(0.22, 0);
    for (const [x, z] of [[-0.8, -1.6], [0.7, -0.9], [-0.6, 1.3], [0.85, 1.6], [0.1, -2.6]]) add(tuft, moss, x, 0.25, z, g).scale.set(1.3, 0.5, 1);
    add(new THREE.BoxGeometry(0.2, 0.03, 4), new THREE.MeshStandardMaterial({ color: 0x1f5a1c, roughness: 0.8 }), 0, 0.235, -0.3, g);
  }
  { // 3: rough stone armour plates
    const g = part(3);
    const stone = new THREE.MeshStandardMaterial({ color: 0x6c6e72, roughness: 1, flatShading: true });
    const plate = new THREE.DodecahedronGeometry(0.4, 0);
    for (const [x, y, z] of [[-1.2, 0.05, -1.2], [1.2, 0.05, -1.2], [-1.2, 0.05, 0.9], [1.2, 0.05, 0.9], [0, 0.25, -1.9]]) add(plate, stone, x, y, z, g).scale.set(0.5, 0.6, 1.4);
  }
  { // 4: rivets along the sides
    const g = part(4);
    const rivet = new THREE.SphereGeometry(0.06, 8, 6);
    const rivetMat = new THREE.MeshStandardMaterial({ color: 0x5c636b, roughness: 0.3, metalness: 1 });
    for (let z = -1.8; z <= 1.8; z += 0.45) for (const x of [-1.16, 1.16]) add(rivet, rivetMat, x, 0.12, z, g);
  }
  { // 5: glowing gold trim lines (kept for the diamond look too)
    const g = part(5);
    const trim = new THREE.MeshBasicMaterial({ color: 0xfff0a0 });
    add(new THREE.BoxGeometry(0.06, 0.06, 4.1), trim, -1.16, 0.2, 0, g);
    add(new THREE.BoxGeometry(0.06, 0.06, 4.1), trim, 1.16, 0.2, 0, g);
  }
  { // 6: crystal spikes
    const g = part(6);
    const crystal = new THREE.MeshStandardMaterial({ color: 0xdffaff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.75, emissive: 0x44bbee, emissiveIntensity: 0.6 });
    const spike = new THREE.OctahedronGeometry(0.3, 0);
    for (const [x, z] of [[-1.25, -0.6], [1.25, -0.6], [-1.25, 0.6], [1.25, 0.6]]) add(spike, crystal, x, 0.35, z, g).scale.set(0.6, 1.6, 0.6);
    add(spike, crystal, 0, 0.75, 1.2, g).scale.set(0.5, 1.2, 0.5);
  }
  const wings = [];
  { // 7: feathered wings and a halo
    const g = part(7);
    const feather = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, emissive: 0x887755, emissiveIntensity: 0.3 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xffcc55, roughness: 0.2, metalness: 1, emissive: 0x664400, emissiveIntensity: 0.5 });
    const featherGeo = new THREE.BoxGeometry(1, 0.05, 0.32);
    for (const s of [-1, 1]) {
      const wing = new THREE.Group();
      wing.position.set(s * 1.1, 0.3, 0.5);
      for (let i = 0; i < 4; i++) {
        const f = add(featherGeo, feather, s * (0.5 + i * 0.12), 0, i * 0.28 - 0.3, wing);
        f.scale.x = 1.6 - i * 0.25;
        f.rotation.y = s * (0.15 + i * 0.12);
      }
      wing.userData.side = s;
      g.add(wing);
      wings.push(wing);
    }
    const halo = add(new THREE.TorusGeometry(0.55, 0.06, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffe27a }), 0, 1.15, 0.3, g);
    halo.rotation.x = Math.PI / 2;
    halo.castShadow = false;
    add(new THREE.BoxGeometry(0.06, 0.06, 4.1), gold, -1.16, 0.2, 0, g);
    add(new THREE.BoxGeometry(0.06, 0.06, 4.1), gold, 1.16, 0.2, 0, g);
  }

  // Shield bubble (ability).
  const shieldMat = new THREE.MeshBasicMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const shield = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), shieldMat);
  shield.scale.set(2.2, 1.3, 3.4);
  shield.visible = false;
  group.add(shield);

  const velocity = new THREE.Vector2();
  let steerMult = 1;
  let dashDir = 0;
  let emptyLock = false;
  let steerSpeed = 13;
  let fuelDrain = 0.35;
  let flamePower = 1;
  let tier = 1;
  let paintOverride = null; // shop paint colour, or null for the level look
  let rainbowFlame = false;

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
      const tankScale = 1 + 0.15 * Math.max(0, levels.tank - 1);
      for (const t of tanks) {
        t.visible = levels.tank > 0;
        t.scale.set(tankScale, tankScale, 1);
      }
      tankMat.emissiveIntensity = levels.tank >= 3 ? 0.3 + 0.2 * (levels.tank - 3) : 0;
      armor1.forEach((m) => { m.visible = levels.armor >= 1; });
      armor2.forEach((m) => { m.visible = levels.armor >= 2; });
      armor3.forEach((m) => { m.visible = levels.armor >= 3; });
      const discScale = 1 + 0.25 * levels.thrusters;
      glowDiscs.forEach((d) => d.scale.set(discScale, 1, discScale));
      thrusterRings.forEach((r) => { r.visible = levels.thrusters >= 2; });
      glow.color.setHex(GLOW_COLORS[Math.min(levels.thrusters, GLOW_COLORS.length - 1)]);
      nozzles.slice(0, 2).forEach((n) => n.scale.setScalar(levels.booster >= 3 ? 1.4 : levels.booster >= 1 ? 1.25 : 1));
      topBooster.visible = levels.booster >= 2;
      flamePower = 1 + 0.25 * levels.booster;
    },

    update(dt, input, time) {
      let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const dy = (input.up ? 1 : 0) - (input.down ? 1 : 0);
      if (steerMult > 1 && dx === 0 && dy === 0) dx = dashDir; // dash with no key held: keep going sideways
      const k = 1 - Math.exp(-(steerMult > 1 ? 20 : 7) * dt);
      velocity.x += (dx * steerSpeed * steerMult - velocity.x) * k;
      velocity.y += (dy * steerSpeed * steerMult - velocity.y) * k;

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
      for (const w of wings) w.rotation.z = w.userData.side * (0.15 + Math.sin(time * 4) * 0.12);

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

    // Change the paint and decorations to a level's look.
    setTier(n) {
      tier = n;
      const t = TIERS[tier] ?? TIERS[1];
      paint.color.setHex(paintOverride ?? t.color);
      paint.roughness = t.rough;
      paint.metalness = t.metal;
      paint.flatShading = !!t.flat;
      paint.transparent = t.opacity !== undefined;
      paint.opacity = t.opacity ?? 1;
      paint.emissive.setHex(t.emissive ?? 0x000000);
      paint.emissiveIntensity = t.emissive ? 0.5 : 0;
      paint.needsUpdate = true;
      mudSplats.forEach((m) => { m.visible = tier === 1; });
      for (const [n, g] of Object.entries(tierParts)) g.visible = Number(n) === tier || (Number(n) === 5 && tier === 6);
    },

    // Shop paint: a colour, or null to use the level look.
    setPaint(hex) {
      paintOverride = hex ?? null;
      car.setTier(tier);
    },

    // Shop trail colour also tints the booster flames (null = rainbow).
    setTrailColor(hex) {
      rainbowFlame = hex === null;
      flameMat.color.setHex(hex ?? 0xff8a2a);
    },

    // Dash ability: steer much faster for a moment.
    setDash(on) {
      steerMult = on ? 2.8 : 1;
      if (on) dashDir = velocity.x < 0 ? -1 : 1;
    },

    setShield(on, time) {
      shield.visible = on;
      shieldMat.opacity = on ? 0.22 + Math.sin(time * 10) * 0.06 : 0;
      shield.rotation.y = time;
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
      if (rainbowFlame) flameMat.color.setHSL((time * 0.4) % 1, 1, 0.55);
    },
  };

  car.applyUpgrades({ tank: 0, armor: 0, thrusters: 0, booster: 0 });
  car.setTier(1);
  car.reset();
  return car;
}
