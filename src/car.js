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
  8: { color: 0x3a1a6a, rough: 0.3, metal: 0.5, emissive: 0x2a0a5a },
  9: { color: 0x0a0a10, rough: 0.15, metal: 0.9 },
  10: { color: 0x101820, rough: 0.3, metal: 0.7, emissive: 0x050a14 },
  11: { color: 0x8a6a40, rough: 0.4, metal: 0.5 }, // flickers between the old looks
  12: { color: 0x6a1a10, rough: 0.6, metal: 0.3, flat: true, emissive: 0x2a0500 },
  13: { color: 0xffffff, rough: 0.2, metal: 0.3, emissive: 0x222222 }, // colour cycles
  14: { color: 0xfff2c0, rough: 0.2, metal: 0.2, emissive: 0xffc860, glow: 1.1 },
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

  const glowParts = []; // animated bits: { mesh, kind }
  { // 8: twinkling stars on the paint
    const g = part(8);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const dot = new THREE.SphereGeometry(0.045, 6, 4);
    for (let i = 0; i < 26; i++) {
      const m = add(dot, starMat, (Math.random() - 0.5) * 2.1, 0.235, (Math.random() - 0.5) * 4, g);
      m.castShadow = false;
      glowParts.push({ mesh: m, kind: 'twinkle', phase: Math.random() * 6 });
    }
  }
  { // 9: glowing ring around the car
    const g = part(9);
    const ring = add(new THREE.TorusGeometry(2.4, 0.08, 8, 48), new THREE.MeshBasicMaterial({ color: 0xffa040 }), 0, 0.05, 0, g);
    ring.rotation.x = Math.PI / 2;
    ring.scale.set(1, 1.6, 1);
    ring.castShadow = false;
    const halo = add(new THREE.TorusGeometry(2.4, 0.3, 8, 48), new THREE.MeshBasicMaterial({ color: 0xff7a20, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 0.05, 0, g);
    halo.rotation.x = Math.PI / 2;
    halo.scale.set(1, 1.6, 1);
    halo.castShadow = false;
    glowParts.push({ mesh: ring, kind: 'spin' });
  }
  { // 10: neon lines and a hologram
    const g = part(10);
    const cyan = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const pink = new THREE.MeshBasicMaterial({ color: 0xff2ad8 });
    for (const x of [-1.16, 1.16]) add(new THREE.BoxGeometry(0.05, 0.05, 4.1), cyan, x, 0.2, 0, g);
    add(new THREE.BoxGeometry(2.1, 0.05, 0.05), pink, 0, 0.24, -2.05, g);
    add(new THREE.BoxGeometry(2.1, 0.05, 0.05), pink, 0, 0.24, 2.05, g);
    const holo = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.35, 0)), new THREE.LineBasicMaterial({ color: 0x00f0ff }));
    holo.position.set(0, 1.25, 0.3);
    g.add(holo);
    glowParts.push({ mesh: holo, kind: 'holo' });
  }
  { // 12: dragon scales and wings
    const g = part(12);
    const scaleMat = new THREE.MeshStandardMaterial({ color: 0x2a6a2a, roughness: 0.4, metalness: 0.5, flatShading: true });
    const sc = new THREE.ConeGeometry(0.16, 0.35, 4);
    for (let z = -1.6; z <= 1.6; z += 0.4) for (const x of [-0.7, 0, 0.7]) add(sc, scaleMat, x, 0.3, z, g).rotation.x = Math.PI / 2.4;
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(2.4, 1.2);
    wingShape.lineTo(2.2, -0.2);
    wingShape.lineTo(1.4, -0.1);
    wingShape.lineTo(1.1, -0.8);
    wingShape.lineTo(0.4, -0.3);
    wingShape.lineTo(0, -0.9);
    const wingGeo = new THREE.ShapeGeometry(wingShape);
    wingGeo.rotateX(-Math.PI / 2);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x8a1a10, roughness: 0.6, side: THREE.DoubleSide });
    for (const sd of [-1, 1]) {
      const w = new THREE.Group();
      w.position.set(sd * 1.1, 0.35, 0.3);
      w.scale.x = sd;
      w.add(new THREE.Mesh(wingGeo, wingMat));
      g.add(w);
      glowParts.push({ mesh: w, kind: 'flap', side: sd });
    }
  }
  { // 13: prism fins
    const g = part(13);
    const prism = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.6, emissive: 0x8888ff, emissiveIntensity: 0.5 });
    for (const x of [-1.2, 1.2]) add(new THREE.TetrahedronGeometry(0.5, 0), prism, x, 0.4, 1.2, g).scale.set(0.5, 1.4, 1.2);
    glowParts.push({ mesh: prism, kind: 'rainbowMat' });
  }
  { // 14: star glow and orbiting sparks
    const g = part(14);
    const aura = add(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffd880, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 0.2, 0, g);
    aura.scale.set(2, 1.2, 3.2);
    aura.castShadow = false;
    glowParts.push({ mesh: aura, kind: 'pulse' });
    for (let i = 0; i < 3; i++) {
      const sp = add(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), 0, 0, 0, g);
      sp.castShadow = false;
      glowParts.push({ mesh: sp, kind: 'orbit', phase: (i / 3) * Math.PI * 2 });
    }
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
  let fuelRefill = FUEL_REFILL;
  let flamePower = 1;
  let tier = 1;
  let paintOverride = null; // shop paint colour, or null for the level look
  let paintItem = null; // the shop paint (for chrome and glowing paints)
  let glowOverride = undefined; // shop glow colour; null = rainbow; undefined = follows the upgrade
  let thrusterLevel = 0;
  let envMap = null; // reflections for chrome paints
  let rainbowFlame = false;

  const showParts = (n) => {
    for (const [k, g] of Object.entries(tierParts)) g.visible = Number(k) === n || (Number(k) === 5 && n === 6);
  };
  let flickerAt = -1;

  // Moving bits of the cosmic looks.
  function animateTier(time) {
    if (tier === 11) {
      // Time Warp look: jump between the older looks.
      const step = Math.floor(time * 2.5);
      if (step !== flickerAt) {
        flickerAt = step;
        const old = 1 + ((step * 5) % 7);
        const t = TIERS[old];
        if (paintOverride === null) paint.color.setHex(t.color);
        paint.metalness = t.metal;
        paint.roughness = t.rough;
        showParts(old);
        mudSplats.forEach((m) => { m.visible = old === 1; });
      }
    }
    if (tier === 13 && paintOverride === null) paint.color.setHSL((time * 0.15) % 1, 0.85, 0.6);
    if (glowOverride === null) glow.color.setHSL((time * 0.3) % 1, 1, 0.6);
    for (const gp of glowParts) {
      if (gp.kind === 'twinkle') gp.mesh.scale.setScalar(0.5 + Math.abs(Math.sin(time * 3 + gp.phase)));
      if (gp.kind === 'spin') gp.mesh.rotation.z = time * 1.5;
      if (gp.kind === 'holo') { gp.mesh.rotation.y = time * 2; gp.mesh.position.y = 1.25 + Math.sin(time * 3) * 0.08; }
      if (gp.kind === 'flap') gp.mesh.rotation.z = gp.side * (0.2 + Math.sin(time * 5) * 0.25);
      if (gp.kind === 'rainbowMat') gp.mesh.color.setHSL((time * 0.2 + 0.5) % 1, 1, 0.7);
      if (gp.kind === 'pulse') gp.mesh.material.opacity = 0.14 + Math.sin(time * 4) * 0.05;
      if (gp.kind === 'orbit') {
        const a = time * 3 + gp.phase;
        gp.mesh.position.set(Math.cos(a) * 2, 0.4 + Math.sin(a * 2) * 0.4, Math.sin(a) * 3);
      }
    }
  }

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
      fuelRefill = stats.refill ?? FUEL_REFILL;
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
      thrusterLevel = levels.thrusters;
      if (glowOverride === undefined) glow.color.setHex(GLOW_COLORS[Math.min(levels.thrusters, GLOW_COLORS.length - 1)]);
      nozzles.slice(0, 2).forEach((n) => n.scale.setScalar(levels.booster >= 3 ? 1.4 : levels.booster >= 1 ? 1.25 : 1));
      topBooster.visible = levels.booster >= 2;
      flamePower = 1 + 0.25 * levels.booster;
    },

    update(dt, input, time) {
      let dx = input.moveX;
      const dy = input.moveY;
      if (steerMult > 1 && Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) dx = dashDir; // dash with no steering: keep going sideways
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
      animateTier(time);

      // After running dry, boost stays locked until the tank refills a bit.
      if (car.fuel <= 0) emptyLock = true;
      if (car.fuel >= RELOCK_LEVEL) emptyLock = false;
      car.boosting = input.boost && !emptyLock;
      car.fuel = car.boosting
        ? Math.max(0, car.fuel - fuelDrain * dt)
        : Math.min(1, car.fuel + fuelRefill * dt);
    },

    get tier() { return tier; },

    // Slowly turn the car around so you can see it in the garage.
    // x: sideways offset so the car isn't hidden behind the garage panel.
    displaySpin(dt, time, x = 0) {
      group.position.set(x, 3.6, 6); // closer to the camera than in flight
      group.rotation.y += dt * 0.7;
      body.rotation.set(0, 0, 0);
      body.position.y = Math.sin(time * 3) * 0.06;
      car.setFlame(0, time);
      animateTier(time);
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
      paint.emissiveIntensity = t.emissive ? t.glow ?? 0.5 : 0;
      if (paintItem?.metal) { paint.metalness = 1; paint.roughness = 0.12; paint.flatShading = false; }
      paint.envMap = paintItem?.metal ? envMap : null;
      paint.envMapIntensity = 1.2;
      if (paintItem?.glow) { paint.emissive.setHex(paintItem.glow); paint.emissiveIntensity = 0.8; }
      if (paintItem) { paint.transparent = false; paint.opacity = 1; }
      paint.needsUpdate = true;
      mudSplats.forEach((m) => { m.visible = tier === 1; });
      showParts(tier);
    },

    // Shop paint: a colour, or null to use the level look.
    // item: the shop paint ({ color, metal, glow }), or null for the level look.
    setPaint(item) {
      paintItem = item?.color === undefined ? null : item;
      paintOverride = paintItem ? paintItem.color : null;
      car.setTier(tier);
    },

    // Something for chrome paints to reflect.
    setEnvironment(tex) {
      envMap = tex;
      car.setTier(tier);
    },

    // Shop underglow: a colour, null for rainbow, or undefined to follow the thruster upgrade.
    setGlow(hex) {
      glowOverride = hex;
      if (hex === undefined) glow.color.setHex(GLOW_COLORS[Math.min(thrusterLevel, GLOW_COLORS.length - 1)]);
      else if (hex !== null) glow.color.setHex(hex);
    },

    // Where a hat sits: on the roof, tilting with the car.
    topperSlot: (() => {
      const slot = new THREE.Group();
      slot.position.set(0, 0.67, 0.3);
      body.add(slot);
      return slot;
    })(),

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

    // rainbow: the Rainbow Shield ability's colour-cycling bubble.
    setShield(on, time, rainbow = false) {
      shield.visible = on;
      shieldMat.opacity = on ? 0.22 + Math.sin(time * 10) * 0.06 : 0;
      if (rainbow) shieldMat.color.setHSL((time * 0.8) % 1, 1, 0.6);
      else shieldMat.color.setHex(0x7fd8ff);
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
