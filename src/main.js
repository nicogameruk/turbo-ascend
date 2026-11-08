import * as THREE from 'three';
import { roundBox } from './round.js';
import { input } from './input.js';
import { createCamera } from './camera.js';
import { createCar } from './car.js';
import { createWorld } from './world.js';
import { createEnemies } from './enemies.js';
import { createShots } from './shots.js';
import { createSpeedLines, createBooms, createTrails, createSparks } from './effects.js';
import { createHazards, HAZARD_WARNINGS } from './hazards.js';
import { createHud } from './hud.js';
import { createMaterialField } from './pickups.js';
import { createPortal } from './portal.js';
import { createBoss } from './boss.js';
import { createProgress, restoreProgress, getStats } from './progress.js';
import { createGarage, formatTime } from './garage.js';
import { createMenus } from './menu.js';
import { createAudio } from './audio.js';
import { loadSave, writeSave, clearSave } from './save.js';
import { findItem, applyBodyPerk } from './cosmetics.js';
import { getLevel, bossBonus, runCoins, LAST_LEVEL, LEVEL_THEMES } from './levels.js';
import { ABILITIES, availableAbilities, abilityCooldown, abilityDuration } from './abilities.js';
import { createTouchControls } from './touch.js';
import { createToppers } from './toppers.js';
import { createPet } from './pets.js';
import { runPoints, sendPoints, forgetPlayer, newPlayerId, createBoardView } from './leaderboard.js';
import { BOUNDS } from './car.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';

const BASE_SPEED = 40;
const MENU_SPEED = 22;
const INVULN_TIME = 1.5;
const NO_INPUT = { moveX: 0, moveY: 0, boost: false };

// Without WebGL the game can't run: show a message instead of a blank page.
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (err) {
  document.getElementById('fatal').style.display = 'flex';
  document.getElementById('hud').style.display = 'none';
  throw err;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9; // a touch darker: reflections and glow add their own light
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = createCamera();

const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x7a5434, 0.85);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff4e0, 2.4);
sun.position.set(8, 20, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
sun.shadow.radius = 3;
Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 14, bottom: -6, near: 1, far: 50 });
scene.add(sun);

const audio = createAudio();
const world = createWorld(scene, hemi, { anisotropy: renderer.capabilities.getMaxAnisotropy() });
const car = createCar();
scene.add(car.group);
// Reflections: every shiny surface (car paint, glass, metal, gold, crystals)
// reflects a soft studio "room", so things look solid and real.
const envMap = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = envMap;
scene.environmentIntensity = 0.35;
car.setEnvironment(envMap);

// Glow: bright things (thrusters, lasers, lava, neon, explosions) bleed soft light.
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.3, 0.4, 0.97);
composer.addPass(bloom);
composer.addPass(new OutputPass());
let highGraphics = true;
// Cartoon levels: thick black outlines around everything.
const outline = new OutlineEffect(renderer, { defaultThickness: 0.0045, defaultColor: [0.05, 0.05, 0.08] });
let cartoon = false;
// Settings → Graphics: High (glow, sharp shadows) or Low (faster, for slow devices).
function applyGraphics(level) {
  highGraphics = level !== 'low';
  renderer.setPixelRatio(Math.min(devicePixelRatio, highGraphics ? 2 : 1));
  renderer.setSize(innerWidth, innerHeight);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(innerWidth, innerHeight);
  const size = highGraphics ? 2048 : 1024;
  if (sun.shadow.mapSize.x !== size) {
    sun.shadow.mapSize.set(size, size);
    sun.shadow.map?.dispose();
    sun.shadow.map = null;
  }
}

// Fire Breath: a cone of flame in front of the car.
const breathMat = new THREE.MeshBasicMaterial({ color: 0xff7a20, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const breathGeo = new THREE.ConeGeometry(4, 40, 20, 1, true);
breathGeo.translate(0, -20, 0);
breathGeo.rotateX(-Math.PI / 2); // tip at the car, wide end ahead
const breath = new THREE.Mesh(breathGeo, breathMat);
let omegaBeam = false; // Omega Beam reuses the Fire Breath cone, bigger and white

// Tidal Wave: a wall of water that rushes forward.
const wave = new THREE.Mesh(roundBox(22, 9, 2), new THREE.MeshBasicMaterial({ color: 0x5ad8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
wave.visible = false;
scene.add(wave);
let waveT = 0;

// Ice Wall: a sheet of ice just in front of the car.
const iceWall = new THREE.Mesh(roundBox(7, 4.5, 0.25), new THREE.MeshStandardMaterial({ color: 0xd8f4ff, roughness: 0.05, transparent: true, opacity: 0.45, emissive: 0x4a8ab8, emissiveIntensity: 0.5 }));
iceWall.position.set(0, 0.3, -5);
iceWall.visible = false;
car.group.add(iceWall);

// Helper Drones: two little drones orbit the car.
const helpers = [0, 1].map(() => {
  const d = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), new THREE.MeshStandardMaterial({ color: 0xc8d0da, metalness: 0.8, roughness: 0.3 }));
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0x5ad8ff }));
  eye.position.z = -0.28;
  d.add(core, eye);
  d.visible = false;
  scene.add(d);
  return d;
});
let helperShot = 0;
breath.position.z = -3;
breath.visible = false;
car.group.add(breath);

// Homing Missiles (shop ability): small glowing darts that chase a target.
const missileGeo = new THREE.SphereGeometry(0.25, 10, 8);
const missileMat = new THREE.MeshBasicMaterial({ color: 0xffd060 });
const missiles = []; // { mesh, target, alive }
function fireMissile(target, delay, from = null) {
  let m = missiles.find((x) => !x.alive);
  if (!m) {
    m = { mesh: new THREE.Mesh(missileGeo, missileMat) };
    m.mesh.scale.set(1, 1, 3);
    scene.add(m.mesh);
    missiles.push(m);
  }
  m.alive = true;
  m.target = target;
  m.delay = delay;
  m.life = 3;
  m.mesh.visible = false;
  if (from) m.mesh.position.copy(from);
  else m.mesh.position.copy(car.group.position).add(new THREE.Vector3((Math.random() - 0.5) * 2, 0.8, -1));
}
function updateMissiles(dt) {
  for (const m of missiles) {
    if (!m.alive) continue;
    m.delay -= dt;
    if (m.delay > 0) continue;
    m.mesh.visible = true;
    m.life -= dt;
    if (!m.target.alive || m.life <= 0) { m.alive = false; m.mesh.visible = false; continue; }
    const to = m.target.pos.clone().sub(m.mesh.position);
    if (to.length() < 2.5 * (m.target.size ?? 1)) {
      m.target.destroy();
      audio.play('boom');
      m.alive = false;
      m.mesh.visible = false;
      continue;
    }
    m.mesh.position.addScaledVector(to.normalize(), 110 * dt);
    m.mesh.lookAt(m.target.pos);
  }
}
const clearMissiles = () => missiles.forEach((m) => { m.alive = false; m.mesh.visible = false; });

// Web Slinger (shop ability): white web lines from the car to each target, fading out fast.
const WEB_MAX = 8;
const webPos = new Float32Array(WEB_MAX * 3 * 2 * 3); // 3 strands per web, 2 points each
const webGeo = new THREE.BufferGeometry();
webGeo.setAttribute('position', new THREE.BufferAttribute(webPos, 3));
const webMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
const webLines = new THREE.LineSegments(webGeo, webMat);
webLines.frustumCulled = false;
scene.add(webLines);
let webT = 0;
function shootWebs(from, targets) {
  webPos.fill(0);
  targets.slice(0, WEB_MAX).forEach((t, i) => {
    for (let k = 0; k < 3; k++) {
      // three slightly spread strands, so it looks like a sticky web line
      const o = (i * 3 + k) * 6;
      webPos.set([from.x + (k - 1) * 0.25, from.y + 0.6, from.z - 1, t.pos.x + (k - 1) * 0.6, t.pos.y + (k - 1) * 0.4, t.pos.z], o);
    }
  });
  webGeo.attributes.position.needsUpdate = true;
  webT = 0.6;
}
function updateWebs(dt) {
  webT = Math.max(0, webT - dt);
  webMat.opacity = webT / 0.6;
  webLines.visible = webT > 0;
}

const toppers = createToppers(car.topperSlot);
const pet = createPet(scene);
// The pet you have out (none on levels where pets stay home).
function petOn() { return level.noPets ? 'none' : progress.equipped.pet; }
const petIs = (id) => petOn() === id;
let petTimer = 0; // for pets that do something every few seconds
let petUsed = false; // for once-a-level pet perks

const trails = createTrails(scene);
const sparks = createSparks(scene);
const booms = createBooms(scene);
const shots = createShots(scene);
const enemies = createEnemies(scene, booms);
const hazards = createHazards(scene);
const speedLines = createSpeedLines(scene);
const materials = createMaterialField(scene);
const portal = createPortal(scene);
const boss = createBoss(scene);
const hud = createHud();
const progress = restoreProgress(createProgress(), loadSave());
audio.setSettings(progress.settings);
applyGraphics(progress.settings.graphics);
const touch = createTouchControls(input);
touch.setEnabled(progress.settings.controls === 'touch');

// Enemy shots make a (quiet, rate-limited) sound.
let lastShotSound = 0;
const spawnShot = shots.spawn;
shots.spawn = (...args) => {
  spawnShot(...args);
  const now = performance.now();
  if (now - lastShotSound > 120) { audio.play('shot'); lastShotSound = now; }
};

const save = () => writeSave(progress);
// Every named racer needs a leaderboard id (old saves get one now).
if (progress.name && !progress.playerId) { progress.playerId = newPlayerId(); writeSave(progress); }
const boardMenu = createBoardView(document.getElementById('lb-menu'), () => progress, (n) => audio.play(n));
const boardGarage = createBoardView(document.getElementById('lb-garage'), () => progress, (n) => audio.play(n));
let lastRunPoints = 0;
// A finished run's points go to the leaderboard (they wait offline if needed).
function addRunPoints(won) {
  lastRunPoints = progress.name ? runPoints(level, meters, runMat, won) : 0;
  if (!lastRunPoints) return;
  progress.pendingPoints += lastRunPoints;
  save();
  sendPoints(progress, save);
}

// Shop looks: paint, trail, flame colour, glow, hat and pet.
function applyLooks() {
  car.setShape(progress.equipped.body);
  car.setPaint(findItem('paint', progress.equipped.paint));
  const glowItem = findItem('glow', progress.equipped.glow);
  car.setGlow(glowItem.id === 'upgrade' ? undefined : glowItem.color);
  toppers.set(progress.equipped.topper);
  pet.set(progress.equipped.pet);
  pet.snap(car.group.position);
  const trail = findItem('trail', progress.equipped.trail);
  trails.setColor(trail.colors ?? trail.color);
  car.setTrailColor(trail.id === 'blue' ? 0xff8a2a : trail.colors ? trail.colors[1] : trail.color);
}

const garage = createGarage(progress, {
  onBuy: () => { car.applyUpgrades(progress.levels); save(); },
  onLeave: () => leaveGarage(),
  onHome: () => { if (state === 'garage') showTitle(); },
  onPickLevel: (n) => { progress.level = n; save(); },
  onShop: () => { applyLooks(); save(); },
  onPreviewHorn: (id) => audio.horn(id),
  onLeaders: () => boardGarage.render(),
  sound: (n) => audio.play(n),
});

const menus = createMenus({
  onContinue: (name) => {
    if (name) { progress.name = name; progress.playerId = newPlayerId(); save(); }
    menus.hide();
    openGarage();
  },
  onNewGame: (name) => {
    const settings = progress.settings;
    // The old racer's leaderboard scores are dropped; the new name starts from zero.
    forgetPlayer(progress.playerId);
    Object.assign(progress, createProgress(), { settings, started: true, name, playerId: newPlayerId() });
    save();
    menus.hide();
    car.applyUpgrades(progress.levels);
    applyLooks();
    startRun();
  },
  onResume: () => resume(),
  onRestart: () => { menus.hide(); startRun(); },
  onQuit: () => showTitle(),
  onSettings: (s) => { progress.settings = s; audio.setSettings(s); touch.setEnabled(s.controls === 'touch'); applyGraphics(s.graphics); save(); },
  onResetSave: () => {
    forgetPlayer(progress.playerId);
    clearSave();
    const settings = progress.settings;
    Object.assign(progress, createProgress(), { settings });
    car.applyUpgrades(progress.levels);
    applyLooks();
    showTitle();
  },
  onLeaders: () => boardMenu.render(),
  sound: (n) => audio.play(n),
});
menus.setSettings(progress.settings);
sendPoints(progress, save); // anything left over from last time

// States: 'menu' (title), 'flying' -> (portal) -> 'boss' -> 'victory' -> 'garage' -> 'flying' ...
// plus 'paused' and 'over'.
let state = 'menu';
let pausedFrom = 'flying';
let level = getLevel(progress.level);
// Car stats: upgrades, then the body shape's bonus, then the pet's.
const makeStats = () => {
  const s = applyBodyPerk(getStats(progress.levels, progress.best), progress.equipped.body);
  if (petOn() === 'toucan') s.refill *= 1.25;
  if (petOn() === 'legend') {
    // The Ultimate Legend secretly makes things worse: it's a heavy rock.
    s.refill *= 0.85;
    s.cruise -= 10; // 25% slower normal flying
    s.boostSpeed *= 0.85; // and a slower turbo
    s.maxHealth = Math.max(1, s.maxHealth - 1); // and it takes away a heart
  }
  return s;
};
let stats = makeStats();
let health = stats.maxHealth;
let ending = null; // set after beating the final boss
let repairT = 0; // Auto Repair timer
// 3, 2, 1, GO! before a round starts and after unpausing. The game waits during it.
let countdownT = 0;
let countdownTo = 'flying';
let countdownShown = 0;
function startCountdown(to) {
  countdownTo = to;
  state = 'countdown';
  countdownT = 3;
  countdownShown = 0;
}
function updateCountdown(dt) {
  countdownT -= dt;
  const n = Math.ceil(countdownT);
  if (n > 0 && n !== countdownShown) {
    countdownShown = n;
    hud.countdown(String(n), LEVEL_THEMES[level.n]);
    audio.play('count');
  }
  if (countdownT <= 0) {
    hud.countdown('GO!', LEVEL_THEMES[level.n]);
    audio.play('go');
    state = countdownTo;
  }
}
let goal = 20; // material needed this run (Portal Key lowers it)
let streak = 0; // Streak Bonus: pieces grabbed in a row
let lastPickup = 0;
let secondWindUsed = false;
let invuln = 0, meters = 0, elapsed = 0, runTime = 0, speed = MENU_SPEED, runMat = 0, coinsEarned = 0;

// Abilities: B uses the one equipped in the garage shop (progress.ability).
const cooldown = {}; // id -> seconds left
let shieldT = 0;
let dashT = 0;
let warpT = 0; // Warp Jump: untouchable, very fast
let freezeT = 0; // Hack: enemies and shots frozen
let slowT = 0; // Slow Time
let breathT = 0; // Fire Breath
let breathTick = 0;
let rainbowT = 0; // Rainbow Burst: just the short colourful glow around the car
let nitroT = 0; // Nitro (shop)
let doubleT = 0; // Double Up (shop)
let iceT = 0; // Ice Wall
let phantomT = 0; // Phantom
let helperT = 0; // Helper Drones
const resetAbilityTimers = () => { shieldT = dashT = warpT = freezeT = slowT = breathT = rainbowT = nitroT = doubleT = iceT = phantomT = helperT = waveT = 0; };
const equipped = () => (progress.ability && availableAbilities(progress).includes(progress.ability) ? progress.ability : null);
const PLAYING = ['flying', 'boss', 'victory'];

// Scenery for the title screen: the furthest level you've reached.
function setScene(l) {
  world.setTheme(l);
  materials.setLook(l.n);
  car.setTier(progress.best);
  cartoon = !!l.cartoon;
  scene.environmentIntensity = cartoon ? 0.1 : 0.35; // flat cartoon colours, fewer reflections
  document.body.classList.toggle('bright-level', cartoon);
}

function showTitle() {
  state = 'menu';
  hud.banner('', 0);
  hud.hideAbilityReady();
  hud.setActions([]);
  clearMissiles();
  garage.close();
  boss.stop();
  enemies.hide();
  hazards.hide();
  shots.clear();
  materials.reset();
  portal.close();
  car.reset();
  car.setShield(false, 0);
  car.setShape(progress.equipped.body);
  car.applyUpgrades(progress.levels);
  setScene(getLevel(progress.best));
  trails.reset(car.group.position);
  speed = MENU_SPEED;
  audio.setEngine(false);
  audio.music(getLevel(progress.best));
  menus.showTitle(progress.started, progress.name);
  save();
}

function startRun() {
  progress.started = true;
  level = getLevel(progress.level);
  stats = makeStats();
  pet.group.visible = petOn() !== 'none'; // hidden on levels where pets stay home
  setScene(level);
  boss.setPlayer(stats);
  boss.configure(level);
  enemies.setLevel(level);
  hazards.setLevel(level);
  car.reset();
  car.setStats(stats);
  car.setShape(level.carShape ?? progress.equipped.body); // Doodle Land: you're a pencil!
  car.applyUpgrades(progress.levels);
  materials.reset();
  shots.clear();
  hazards.hide();
  portal.close();
  boss.stop();
  if (level.oneHeart) stats.maxHealth = 1; // the Impossible level
  health = stats.maxHealth;
  invuln = 0;
  meters = 0;
  elapsed = 0;
  runTime = 0;
  speed = BASE_SPEED;
  runMat = stats.headStart;
  goal = Math.max(5, Math.round(level.goal * stats.goalMult));
  streak = 0;
  secondWindUsed = false;
  coinsEarned = 0;
  repairT = 0;
  hud.setActions([]);
  clearMissiles();
  petTimer = 0;
  petUsed = false;
  pet.snap(car.group.position);
  resetAbilityTimers();
  for (const id in cooldown) cooldown[id] = 0;
  car.setDash(false);
  trails.reset(car.group.position);
  shieldT = stats.startShield;
  nitroT = stats.poleBoost; // Pole Position: launch off the line
  state = 'flying';
  enemies.reset(ctx());
  audio.music(level);
  hud.showHelp();
  hud.banner(`LEVEL ${level.n} · ${level.name.toUpperCase()} — collect ${goal} ${level.material.toLowerCase()}`, 4.5);
  startCountdown('flying');
}

// Hurt the player. Returns true if the hit was used up (landed or blocked by the shield).
let devGodMode = false; // dev test hook only
function damage() {
  if (state !== 'flying' && state !== 'boss') return false;
  if (dashT > 0 || warpT > 0 || phantomT > 0) return false; // dashing/warping/ghost: things pass right through you
  if (shieldT > 0) {
    booms.spawn(car.group.position, 0x7fd8ff, 0.6);
    audio.play('block');
    return true;
  }
  if (devGodMode || invuln > 0) return false;
  if (stats.dodge && Math.random() < stats.dodge) {
    invuln = 0.6;
    hud.banner('🍀 Lucky dodge!', 0.8);
    audio.play('block');
    return true;
  }
  if (petIs('ghost') && !petUsed) {
    petUsed = true;
    invuln = 1;
    booms.spawn(car.group.position, 0xccddff, 0.8);
    audio.play('block');
    hud.banner('👻 Your ghost blocked that hit!', 1.5);
    return true;
  }
  health -= 1;
  invuln = stats.invuln ?? INVULN_TIME;
  if (health <= 0 && petIs('phoenix') && !petUsed) {
    petUsed = true;
    health = 1;
    invuln = 2.5;
    booms.spawn(car.group.position, 0xff8a2a, 3);
    hud.flash(0.5);
    audio.play('portal');
    hud.banner('🔥 PHOENIX REVIVE! Back with 1 heart', 2);
  }
  if (health === 1 && petIs('slime') && !petUsed && stats.maxHealth > 1) {
    petUsed = true;
    health = 2;
    sparks.burst(car.group.position, 20, 0x8dff9a);
    hud.banner('🟢 Your slime healed you!', 1.5);
  }
  sparks.burst(car.group.position);
  hud.hurt();
  audio.play('hit');
  if (stats.emergencyFuel) car.fuel = Math.min(1, car.fuel + stats.emergencyFuel);
  if (stats.emp) {
    enemies.blast(car.group.position, 18);
    booms.spawn(car.group.position, 0x7ad8ff, 3);
  }
  if (stats.secondWind && health === 1 && !secondWindUsed) {
    secondWindUsed = true;
    shieldT = Math.max(shieldT, stats.secondWind);
    hud.banner('💨 Second Wind! Shield up', 1.5);
  }
  if (health <= 0) gameOver();
  return true;
}

function gameOver() {
  state = 'over';
  car.group.visible = true;
  car.setShield(false, 0);
  booms.spawn(car.group.position, 0xff6a2a, 1.4);
  hud.banner('', 0);
  coinsEarned = Math.round(runCoins(level, meters, false) * (petIs('kitty') ? 1.2 : petIs('legend') ? 0.9 : 1) * stats.coinMult);
  addRunPoints(false);
  progress.coins += coinsEarned;
  audio.setEngine(false);
  audio.play('boom');
  audio.play('lose');
  hud.setActions([
    { label: 'Try again (R)', onClick: () => startRun() },
    { label: 'Garage (E)', onClick: () => openGarage() },
    { label: 'Menu (Esc)', onClick: () => showTitle() },
  ]);
  save();
}

// Void creatures and some bosses drag the car toward them.
function pullCar(from, strength) {
  if (warpT > 0 || dashT > 0) return;
  const p = car.group.position;
  const dt = 1 / 60;
  p.x += THREE.MathUtils.clamp(from.x - p.x, -1, 1) * strength * dt;
  p.y += THREE.MathUtils.clamp(from.y - p.y, -1, 1) * strength * dt * 0.6;
  p.x = THREE.MathUtils.clamp(p.x, -BOUNDS.x, BOUNDS.x);
  p.y = THREE.MathUtils.clamp(p.y, BOUNDS.yMin, BOUNDS.yMax);
}

function ctx(time = 0) {
  return {
    carPos: car.group.position, speed, elapsed, time, diff: Math.min(level.n - 1, 10), shots, hit: damage,
    pull: pullCar, smash: stats.ram && car.boosting, onKill: () => audio.play('boom'),
  };
}
const hazardCtx = {
  carPos: car.group.position,
  get speed() { return speed; },
  hit: () => damage(),
  sound: (n) => audio.play(n),
  boom: (p, c, s) => booms.spawn(p, c, s),
  flash: () => hud.flash(0.5),
};

const ABILITY_SOUNDS = {
  warp: 'dash', gravity: 'blast', hack: 'zap', slowtime: 'shield', firebreath: 'whoosh', rainbow: 'shield',
  nitro: 'whoosh', repair: 'buy', doubleup: 'portal', missiles: 'zap', rainmaster: 'whoosh', webslinger: 'thwip',
  tidal: 'whoosh', sugarrush: 'buy', meteorstrike: 'boom', icewall: 'shield', phantom: 'portal',
  helperdrones: 'zap', vinegrab: 'whoosh', thunder: 'thunder', chaos: 'blast', dreamheal: 'buy', omega: 'blast', coffee: 'ready', scribble: 'whoosh',
};

function useAbility() {
  const id = equipped();
  if (!id) { hud.banner('No ability equipped — pick one in the garage shop', 2); return; }
  if ((cooldown[id] ?? 0) > 0) { audio.play('nope'); return; }
  if ((id === 'repair' || id === 'dreamheal') && health >= stats.maxHealth) { audio.play('nope'); hud.banner('Hearts already full', 1); return; }
  cooldown[id] = abilityCooldown(id, progress.best) * (petIs('star') ? 0.75 : 1) * stats.cooldownMult * (level.cooldownMult ?? 1);
  castAbility(id);
}

// The pet casting doesn't touch your own ability's recharge.
function petCast(id) {
  const saved = cooldown[id] ?? 0;
  castAbility(id);
  cooldown[id] = saved;
}

function castAbility(id) {
  const dur = abilityDuration(id, progress.best) * stats.durationMult;
  const pos = car.group.position;
  audio.play(ABILITY_SOUNDS[id] ?? id);
  if (id === 'shield') shieldT = dur;
  if (id === 'dash') { dashT = dur; car.setDash(true); }
  if (id === 'warp') {
    warpT = dur;
    shots.clear();
    boss.clearShots();
    hazards.smash(pos, 40, (p, c, sz) => booms.spawn(p, c, sz));
    booms.spawn(pos, 0xb08aff, 3);
    hud.flash(0.5);
  }
  if (id === 'gravity') {
    materials.pullAll(1.6);
    const n = enemies.blast(pos, 30);
    hazards.smash(pos, 30, (p, c, sz) => booms.spawn(p, c, sz));
    booms.spawn(pos, 0x8a3aff, 4);
    if (state === 'boss') boss.hurt(1);
    hud.banner(n ? `GRAVITY PULL! ${n} crushed` : 'GRAVITY PULL!', 1.2);
  }
  if (id === 'hack') { freezeT = dur; hud.banner('HACKED — everything is frozen!', 1.5); }
  if (id === 'slowtime') { slowT = dur; hud.banner('TIME SLOWED', 1.2); }
  if (id === 'firebreath') { breathT = dur; breathTick = 0; omegaBeam = false; }
  if (id === 'omega') {
    breathT = dur;
    breathTick = 0;
    omegaBeam = true;
    hud.flash(0.5);
    hud.banner('Ω OMEGA BEAM!', 1.5);
  }
  if (id === 'tidal') {
    waveT = 1;
    wave.position.set(pos.x, pos.y, pos.z - 2);
    const n = enemies.burnAhead(pos) + enemies.blast(pos, 22);
    shots.clearAhead(pos, 160);
    boss.clearShots();
    hazards.smash(pos, 90, (p, c, sz) => booms.spawn(p, c, sz));
    if (state === 'boss') boss.hurt(1);
    hud.banner(n ? `TIDAL WAVE! ${n} washed away` : 'TIDAL WAVE!', 1.2);
  }
  if (id === 'sugarrush') {
    nitroT = dur;
    doubleT = dur;
    car.fuel = 1;
    hud.banner('🍬 SUGAR RUSH!', 1.2);
  }
  if (id === 'meteorstrike') {
    const targets = enemies.targets(pos, 6);
    if (state === 'boss' && boss.hp > 0) {
      for (let k = 0; k < 2; k++) targets.push({ pos: boss.group.position, size: boss.group.scale.x * 1.5, get alive() { return boss.hp > 0; }, destroy: () => boss.hurt(1) });
    }
    // The meteors drop from high above each target.
    targets.forEach((t, k) => fireMissile(t, k * 0.1, t.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 8, 30, -10))));
    hud.banner(targets.length ? `☄️ METEOR STRIKE! ${targets.length} targets` : 'No targets in range', 1.2);
    if (!targets.length) cooldown[id] = 1;
  }
  if (id === 'icewall') iceT = dur;
  if (id === 'phantom') { phantomT = dur; hud.banner('👻 PHANTOM — nothing can touch you', 1.5); }
  if (id === 'helperdrones') { helperT = dur; helperShot = 0; hud.banner('🤖 HELPER DRONES!', 1.2); }
  if (id === 'vinegrab') {
    materials.pullAll(1.6);
    slowT = Math.max(slowT, dur);
    booms.spawn(pos, 0x5aff6a, 3);
    hud.banner('🌿 VINE GRAB!', 1.2);
  }
  if (id === 'thunder') {
    const targets = enemies.targets(pos, 8);
    for (const t of targets) { booms.spawn(t.pos, 0xd8f0ff, 1.5); t.destroy(); }
    if (state === 'boss') boss.hurt(2);
    hud.flash(0.6);
    hud.banner(`⚡ THUNDERSTRIKE! ${targets.length + (state === 'boss' ? 1 : 0)} zapped`, 1.2);
  }
  if (id === 'chaos') {
    const pool = Object.keys(ABILITIES).filter((a) => ABILITIES[a].active && a !== 'chaos' && a !== 'repair' && a !== 'dreamheal');
    const picks = [];
    while (picks.length < 3) { const a = pool[Math.floor(Math.random() * pool.length)]; if (!picks.includes(a)) picks.push(a); }
    picks.forEach((a) => petCast(a));
    booms.spawn(pos, 0xff1a3a, 4);
    hud.flash(0.5);
    hud.banner(`💀 CHAOS STORM: ${picks.map((a) => ABILITIES[a].name).join(' + ')}!`, 2);
  }
  if (id === 'webslinger') {
    const targets = enemies.targets(pos, 5);
    shootWebs(pos, targets);
    for (const t of targets) { booms.spawn(t.pos, 0xf4f4f4, 1.2); t.destroy(); }
    const caught = shots.clearNear(pos, 10) + (state === 'boss' ? boss.clearNear(pos, 10) : 0);
    if (state === 'boss') boss.hurt(1);
    const n = targets.length + (state === 'boss' ? 1 : 0);
    hud.banner(`🕸️ WEBBED ${n}!${caught ? ` ${caught} shots caught` : ''}`, 1.3);
    if (!n && !caught) cooldown[id] = 1; // nothing there: try again soon
  }
  if (id === 'scribble') {
    const targets = enemies.targets(pos, 3);
    for (const t of targets) {
      for (let k = 0; k < 4; k++) booms.spawn(t.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, 0)), 0x14141a, 0.5);
      t.destroy();
    }
    if (state === 'boss') boss.hurt(1);
    hud.banner(targets.length ? `✏️ SCRIBBLED OUT ${targets.length}!` : '✏️ Nothing to scribble', 1.2);
    if (!targets.length && state !== 'boss') cooldown[id] = 1;
  }
  if (id === 'coffee') {
    health = Math.min(stats.maxHealth, health + 1);
    car.fuel = 1;
    slowT = Math.max(slowT, dur);
    sparks.burst(pos, 18, 0xc89a6a);
    hud.banner('☕ COFFEE BREAK!', 1.5);
  }
  if (id === 'dreamheal') {
    health = Math.min(stats.maxHealth, health + 2);
    sparks.burst(pos, 24, 0xffb8f0);
    hud.banner('💭 SWEET DREAMS: +2 hearts', 1.2);
  }
  if (id === 'rainbow') {
    // A quick ring of rainbow light: clears shots close by and shoves enemies away.
    rainbowT = dur;
    const cleared = shots.clearNear(pos, 12) + boss.clearNear(pos, 12);
    const pushed = enemies.pushAway(pos, 18);
    [0xff3a3a, 0xffa020, 0xffff40, 0x40ff60, 0x40a0ff, 0xa040ff].forEach((c, k) => booms.spawn(pos, c, 1.2 + k * 0.35));
    hud.flash(0.25);
    hud.banner(cleared || pushed ? `🌈 RAINBOW BURST! ${cleared} shots gone, ${pushed} pushed away` : '🌈 RAINBOW BURST!', 1.3);
  }
  if (id === 'nitro') { nitroT = dur; car.fuel = 1; hud.banner('NITRO!', 1); }
  if (id === 'repair') {
    health += 1;
    sparks.burst(pos, 20, 0x8dff9a);
    hud.banner('+1 HEART', 1.2);
  }
  if (id === 'doubleup') { doubleT = dur; hud.banner('DOUBLE MATERIAL!', 1.5); }
  if (id === 'rainmaster') {
    // Like a legend in the rain: the world slows down, you don't, and close shots wash away.
    slowT = Math.max(slowT, dur);
    const washed = shots.clearNear(pos, 14) + boss.clearNear(pos, 14);
    booms.spawn(pos, 0x7ab8ff, 3);
    hud.banner(`🌧️ RAIN MASTER!${washed ? ` ${washed} shots washed away` : ''}`, 1.5);
  }
  if (id === 'missiles') {
    const targets = enemies.targets(pos, state === 'boss' ? 3 : 4);
    if (state === 'boss' && boss.hp > 0) {
      targets.push({ pos: boss.group.position, size: boss.group.scale.x * 1.5, get alive() { return boss.hp > 0; }, destroy: () => boss.hurt(1) });
    }
    targets.forEach((t, i) => fireMissile(t, i * 0.08));
    hud.banner(targets.length ? `MISSILES AWAY! ${targets.length} locked` : 'No targets in range', 1.2);
    if (!targets.length) cooldown[id] = 1; // nothing to shoot: almost no wait
  }
  if (id === 'blast') {
    booms.spawn(car.group.position, 0xfff6c0, 5);
    hud.flash(0.4);
    shots.clear();
    boss.clearShots();
    const n = enemies.blast(car.group.position);
    if (state === 'boss') boss.hurt(1);
    hud.banner(n ? `LIGHT BLAST! ${n} down` : 'LIGHT BLAST!', 1.2);
  }
}

function startBoss() {
  state = 'boss';
  enemies.hide();
  shots.clear();
  boss.start();
  audio.play('whoosh');
  audio.music(level, true);
  hud.banner(`BOSS: ${boss.name} — catch the blue cores, dodge the red shots!`, 4);
}

function win() {
  state = 'victory';
  hazards.hide();
  enemies.hide();
  clearMissiles();
  const earned = Math.round((runMat + bossBonus(level) * stats.bountyMult) * (petIs('owl') ? 1.15 : 1) * stats.matMult);
  progress.bank += earned;
  coinsEarned = Math.round(runCoins(level, meters, true) * (petIs('kitty') ? 1.2 : petIs('legend') ? 0.9 : 1) * stats.coinMult);
  addRunPoints(true);
  progress.coins += coinsEarned;
  const firstClear = level.n === progress.best && progress.best < LAST_LEVEL;
  if (firstClear) {
    progress.best += 1;
    // Equip a newly unlocked ability if nothing is equipped yet.
    const fresh = Object.keys(ABILITIES).find((k) => ABILITIES[k].level === progress.best && ABILITIES[k].active);
    if (fresh && !progress.ability) progress.ability = fresh;
  }
  progress.level = Math.min(LAST_LEVEL, level.n + 1);
  const old = progress.records[level.n];
  const record = !old || runTime < old;
  if (record) progress.records[level.n] = runTime;
  health = stats.maxHealth;
  audio.play('win');
  audio.music(level);
  save();

  const time = `Time ${formatTime(runTime)}${record ? ' — NEW RECORD!' : ''}`;
  const pay = `+${earned} materials, +${coinsEarned} coins${lastRunPoints ? `, +${lastRunPoints} 🏆` : ''}`;
  if (level.n === LAST_LEVEL) {
    state = 'ending';
    car.group.visible = true;
    car.setShield(false, 0);
    hud.banner('', 0);
    audio.play('portal');
    ending = { pay, time, total: Object.values(progress.records).reduce((a, b) => a + b, 0) };
    hud.setActions([{ label: 'Garage (Enter)', onClick: () => openGarage() }]);
  } else if (firstClear) {
    const next = getLevel(progress.best);
    const ability = Object.values(ABILITIES).find((a) => a.level === next.n);
    car.setTier(progress.best); // the car changes look right away
    const where = ability.active ? ' (equip it in the garage shop)' : '';
    hud.banner(`LEVEL COMPLETE! ${pay} · ${time} · New look + ${ability.name} unlocked${where}`, Infinity);
    hud.setActions([{ label: 'Garage (E)', onClick: () => openGarage() }]);
  } else {
    hud.banner(`LEVEL COMPLETE! ${pay} · ${time}`, Infinity);
    hud.setActions([{ label: 'Garage (E)', onClick: () => openGarage() }]);
  }
}

function openGarage() {
  state = 'garage';
  hud.banner('', 0);
  hud.hideAbilityReady();
  hud.setActions([]);
  clearMissiles();
  boss.stop();
  shots.clear();
  hazards.hide();
  materials.reset();
  enemies.hide();
  portal.close();
  car.group.visible = true;
  car.setShield(false, 0);
  breath.visible = false;
  iceWall.visible = false;
  wave.visible = false;
  helpers.forEach((d) => { d.visible = false; });
  resetAbilityTimers();
  car.setDash(false);
  car.setShape(progress.equipped.body);
  pet.set(progress.equipped.pet); // back from a level where pets stay home
  car.applyUpgrades(progress.levels);
  car.setTier(progress.best);
  audio.setEngine(false);
  audio.music(getLevel(progress.best));
  save();
  garage.open();
}

function leaveGarage() {
  if (state !== 'garage') return;
  garage.close();
  startRun();
}

function pause() {
  pausedFrom = state === 'countdown' ? countdownTo : state;
  hud.clearCountdown();
  state = 'paused';
  audio.setEngine(false);
  menus.showPause();
}

function resume() {
  if (state !== 'paused') return;
  menus.hide();
  // Back into the action with a countdown (not needed on the level-complete screen).
  if (pausedFrom === 'flying' || pausedFrom === 'boss') startCountdown(pausedFrom);
  else state = pausedFrom;
}

function update(dt, time) {
  car.update(dt, input, time);
  const target = warpT > 0 ? 220 : nitroT > 0 ? stats.boostSpeed * 1.25 : car.boosting ? stats.boostSpeed : BASE_SPEED + stats.cruise;
  speed += (target - speed) * (1 - Math.exp(-3 * dt));
  const boostAmt = Math.min(1, (speed - BASE_SPEED) / (85 - BASE_SPEED));

  world.update(dt, speed);
  speedLines.update(dt, speed, boostAmt);
  booms.update(dt);
  sparks.update(dt);
  trails.update(dt, car.group.position, speed, boostAmt, time);
  car.setFlame(boostAmt, time);
  audio.setEngine(true, boostAmt);

  // Abilities
  for (const id in cooldown) {
    const was = cooldown[id];
    cooldown[id] = Math.max(0, cooldown[id] - dt);
    // Recharged just now: pop up at the top of the screen.
    if (was > 0 && cooldown[id] === 0 && id === equipped() && (state === 'flying' || state === 'boss')) {
      hud.abilityReady(ABILITIES[id].name.toUpperCase(), touch.enabled, LEVEL_THEMES[level.n]);
      audio.play('ready');
    }
  }
  shieldT = Math.max(0, shieldT - dt);
  warpT = Math.max(0, warpT - dt);
  freezeT = Math.max(0, freezeT - dt);
  slowT = Math.max(0, slowT - dt);
  rainbowT = Math.max(0, rainbowT - dt);
  nitroT = Math.max(0, nitroT - dt);
  doubleT = Math.max(0, doubleT - dt);
  updateNewAbilities(dt, time);
  updateMissiles(dt);
  updateWebs(dt);
  if (state === 'flying' || state === 'boss') {
    updatePetPerks(dt);
    if (stats.repairEvery && health < stats.maxHealth) {
      repairT += dt;
      if (repairT >= stats.repairEvery) {
        repairT = 0;
        health += 1;
        sparks.burst(car.group.position, 16, 0x8dff9a);
        hud.banner('🔧 Auto Repair: +1 heart', 1.2);
      }
    } else repairT = 0;
  }
  if (dashT > 0) {
    dashT -= dt;
    if (dashT <= 0) car.setDash(false);
  }
  if (state === 'flying' || state === 'boss') {
    if (input.wasPressed('KeyB')) useAbility();
  }
  car.setShield(shieldT > 0 || rainbowT > 0, time, rainbowT > 0);

  // Fire Breath burns what's ahead every few frames.
  breath.visible = breathT > 0;
  breathMat.color.setHex(omegaBeam ? 0xc8e8ff : 0xff7a20);
  if (breathT > 0) {
    breathT -= dt;
    breathMat.opacity = 0.35 + Math.random() * 0.25;
    const big = omegaBeam ? 1.8 : 1;
    breath.scale.set(big * (1 + Math.random() * 0.1), big * (1 + Math.random() * 0.1), omegaBeam ? 1.6 : 1);
    breathTick -= dt;
    if (breathTick <= 0) {
      breathTick = 0.15;
      const pos = car.group.position;
      enemies.burnAhead(pos);
      shots.clearAhead(pos);
      boss.clearShots();
      hazards.smash(pos, 45, (p, c, sz) => booms.spawn(p, c, sz));
    }
    const every = omegaBeam ? 0.35 : 0.6;
    if (state === 'boss' && Math.floor((breathT + dt) / every) !== Math.floor(breathT / every)) boss.hurt(1);
  }

  invuln = Math.max(0, invuln - dt);
  car.group.visible = invuln > 0 ? Math.floor(invuln * 12) % 2 === 0 : true;
  if (dashT > 0 || warpT > 0) car.group.visible = Math.floor(time * 30) % 2 === 0;
  if (phantomT > 0) car.group.visible = Math.floor(time * 8) % 3 !== 0; // ghostly flicker
  // Slow Time and Hack slow or stop everything except you.
  const edt = freezeT > 0 ? 0 : slowT > 0 ? dt * 0.35 : dt;
  meters += speed * dt;
  elapsed += dt;
  if (state !== 'victory') runTime += dt;

  const got = materials.update(dt, speed, car.group.position, state === 'flying', time, petIs('puppy') ? Math.max(stats.magnet, 5) : stats.magnet,
    { collect: stats.collect, spawnMult: stats.spawnMult });
  if (got) {
    runMat += got * (doubleT > 0 ? 2 : 1);
    if (stats.streakBonus) {
      streak = elapsed - lastPickup < 2.5 ? streak + got : got;
      lastPickup = elapsed;
      if (streak >= 5) {
        streak -= 5;
        runMat += stats.streakBonus;
        hud.banner(`STREAK! +${stats.streakBonus}`, 0.8);
      }
    }
    hud.pulseMud();
    audio.play('pickup');
  }

  const started = hazards.update(edt, hazardCtx, state === 'flying');
  const warning = level.warnings?.[started] ?? HAZARD_WARNINGS[started];
  if (started && warning) hud.banner(warning, 2);
  if (state === 'over') return;

  if (state === 'flying') {
    world.setSkyProgress((runMat / goal) * 0.75);
    if (edt > 0) {
      enemies.update(edt, ctx(time));
      shots.update(edt, car.group.position, damage);
    }
    if (state !== 'flying') return;
    if (runMat >= goal && level.noBoss) { win(); return; } // no boss: the level (and the game) is done
    if (runMat >= goal && !portal.active) {
      portal.open();
      audio.play('portal');
      hud.banner('PORTAL OPEN! Fly through it', 3);
    }
    if (portal.update(dt, speed)) startBoss();
  } else if (state === 'boss') {
    world.setSkyProgress(0.75 + (1 - boss.hp / boss.maxHp) * 0.25);
    const ev = boss.update(edt, car.group.position, damage, {
      spawn: (type) => enemies.spawn(type, ctx(time)),
      pull: pullCar,
    });
    if (edt > 0) {
      enemies.update(edt, ctx(time), false); // the final boss's minions
      shots.update(edt, car.group.position, damage);
    }
    if (ev.teleport) audio.play('zap');
    if (ev.caught) audio.play('bolt');
    if (ev.hurt) audio.play('boom');
    if (ev.defeated) win();
  } else {
    shots.update(dt, car.group.position, () => false);
  }
}

// Pets that do something every few seconds.
function updatePetPerks(dt) {
  petTimer += dt;
  // The Ultimate Legend brags every 8 s... and nothing happens.
  if (petIs('legend') && petTimer > 8) {
    petTimer = 0;
    pet.flash();
    sparks.burst(pet.mouth, 4, 0x8a8680);
    hud.banner(['👑 ULTIMATE POWER ACTIVATED!!!', '👑 MEGA LEGEND MODE!!!', '👑 YOU ARE NOW UNSTOPPABLE!!!', '👑 MAXIMUM AWESOME!!!'][Math.floor(Math.random() * 4)], 1.2);
  }
  // Once charged (6 s), the UFO zaps the next shots that come close.
  if (petIs('ufo') && petTimer > 6) {
    const n = shots.clearNear(car.group.position, 10) + (state === 'boss' ? boss.clearNear(car.group.position, 10) : 0);
    if (n) { petTimer = 0; booms.spawn(pet.mouth, 0x8dff9a, 0.8); audio.play('zap'); pet.flash(); }
  }
  if (petIs('dragon') && petTimer > 7) {
    const [t] = enemies.targets(car.group.position, 1);
    const target = t ?? (state === 'boss' && boss.hp > 0
      ? { pos: boss.group.position, size: boss.group.scale.x * 1.5, get alive() { return boss.hp > 0; }, destroy: () => boss.hurt(1) }
      : null);
    if (target) {
      petTimer = 0;
      fireMissile(target, 0, pet.mouth.clone());
      audio.play('whoosh');
      pet.flash();
    }
  }
}

// Timers and visuals for the level 15-24 abilities.
function updateNewAbilities(dt, time) {
  const pos = car.group.position;
  phantomT = Math.max(0, phantomT - dt);
  // Ice Wall: melts every shot that reaches it.
  iceT = Math.max(0, iceT - dt);
  iceWall.visible = iceT > 0;
  if (iceT > 0) {
    shots.clearAhead(pos, 9);
    boss.clearNear(pos.clone().add(new THREE.Vector3(0, 0, -4)), 5);
    iceWall.material.opacity = 0.35 + Math.sin(time * 6) * 0.08;
  }
  // Tidal Wave rushing forward.
  if (waveT > 0) {
    waveT = Math.max(0, waveT - dt);
    wave.visible = waveT > 0;
    wave.position.z -= 160 * dt;
    wave.material.opacity = waveT * 0.5;
  } else wave.visible = false;
  // Helper Drones: orbit and shoot.
  helperT = Math.max(0, helperT - dt);
  helpers.forEach((d, k) => {
    d.visible = helperT > 0;
    if (!d.visible) return;
    const a = time * 3 + k * Math.PI;
    d.position.set(pos.x + Math.cos(a) * 2.6, pos.y + 1 + Math.sin(a * 2) * 0.4, pos.z + Math.sin(a) * 1.5);
  });
  if (helperT > 0) {
    helperShot -= dt;
    if (helperShot <= 0) {
      helperShot = state === 'boss' ? 1.4 : 0.7;
      const [t] = enemies.targets(pos, 1);
      const target = t ?? (state === 'boss' && boss.hp > 0
        ? { pos: boss.group.position, size: boss.group.scale.x * 1.5, get alive() { return boss.hp > 0; }, destroy: () => boss.hurt(1) }
        : null);
      if (target) fireMissile(target, 0, helpers[Math.floor(Math.random() * 2)].position.clone());
    }
  }
}

// Title screen: the car cruises along on its own.
function updateMenu(dt, time) {
  car.update(dt, NO_INPUT, time);
  car.group.position.x = Math.sin(time * 0.5) * 2.5;
  car.group.position.y = 3 + Math.sin(time * 0.7) * 0.8;
  world.update(dt, speed);
  speedLines.update(dt, speed, 0);
  trails.update(dt, car.group.position, speed, 0.3, time);
  car.setFlame(0.2, time);
}

// Sound can only start after a key press or click.
const unlockAudio = () => audio.unlock();
addEventListener('keydown', unlockAudio);
addEventListener('pointerdown', unlockAudio);

const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;

  if (menus.open) menus.handleKeys(input);
  else if (input.wasPressed('Escape')) {
    if (PLAYING.includes(state) || state === 'countdown') pause();
    else if (state === 'over') showTitle();
  }
  if (input.wasPressed('KeyM') && (PLAYING.includes(state) || state === 'menu')) audio.horn(progress.equipped.horn);

  if (state === 'over' && input.wasPressed('KeyR')) startRun();
  else if (state === 'over' && input.wasPressed('KeyE')) openGarage();
  else if (state === 'victory' && input.wasPressed('KeyE')) openGarage();
  else if (state === 'ending' && (input.wasPressed('Enter') || input.wasPressed('KeyE'))) openGarage();
  else if (state === 'garage') {
    garage.handleKeys(input);
    if (state === 'garage') car.displaySpin(dt, time, innerWidth > 760 ? 2 : 0);
  }

  if (PLAYING.includes(state)) update(dt, time);
  else if (state === 'countdown') updateCountdown(dt);
  else if (state === 'menu') updateMenu(dt, time);
  else if (state === 'over') { booms.update(dt); sparks.update(dt); }
  else if (state === 'ending') updateMenu(dt, time);

  pet.update(dt, car.group.position, time);
  toppers.update(dt);
  const abilityId = equipped();
  const abilityInfo = abilityId && { ...ABILITIES[abilityId], cooldownLeft: cooldown[abilityId] ?? 0, cooldown: abilityCooldown(abilityId, progress.best) * (petIs('star') ? 0.75 : 1) * stats.cooldownMult * (level.cooldownMult ?? 1) };
  const shownState = state === 'countdown' ? countdownTo : state;
  touch.setVisible(shownState === 'flying' || shownState === 'boss');
  touch.setAbility(abilityInfo);
  hud.update(dt, {
    state: shownState,
    level,
    fuel: car.fuel,
    fuelScale: stats.fuelBarScale,
    health,
    maxHealth: stats.maxHealth,
    runMud: runMat,
    goal,
    meters,
    timeText: formatTime(runTime),
    coinsEarned,
    ending,
    playerName: progress.name,
    runPoints: lastRunPoints,
    warning: enemies.warning,
    bossName: boss.name,
    bossHp: boss.hp,
    bossMax: boss.maxHp,
    ability: abilityInfo,
  });
  if (cartoon) outline.render(scene, camera);
  else if (highGraphics) composer.render();
  else renderer.render(scene, camera);
  input.endFrame();
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && (PLAYING.includes(state) || state === 'countdown')) pause();
});

car.applyUpgrades(progress.levels);
applyLooks();
showTitle();
frame();

if (import.meta.env.DEV) {
  // Dev-only test hook: advance the simulation without rendering (works while the tab is hidden).
  let simTime = 0;
  window.__game = {
    get state() { return state; },
    get health() { return health; },
    get level() { return level; },
    get runMud() { return runMat; },
    set runMud(v) { runMat = v; },
    get enemyCount() { return enemies.count; },
    get shotCount() { return shots.active; },
    get hazardCount() { return hazards.count; },
    get shieldT() { return shieldT; },
    get dashT() { return dashT; },
    get timers() { return { warpT, freezeT, slowT, breathT, rainbowT }; },
    progress,
    car,
    enemies,
    boss,
    portal,
    menus,
    audio,
    set godMode(v) { devGodMode = v; },
    resume,
    // Jump to a level (unlocking everything up to it).
    play(n) { progress.best = Math.max(progress.best, n); progress.level = n; garage.close(); menus.hide(); startRun(); state = 'flying'; },
    get countdown() { return { state, countdownT, countdownTo }; },
    // Equip and use an ability (unlocking/buying it for the test).
    useAbility(id) {
      if (ABILITIES[id].shop && !progress.ownedAbilities.includes(id)) progress.ownedAbilities.push(id);
      progress.ability = id;
      useAbility();
    },
    get missilesFlying() { return missiles.filter((m) => m.alive).length; },
    get timers2() { return { nitroT, doubleT }; },
    touch,
    openGarage,
    leaveGarage,
    showTitle,
    step(seconds, dt = 1 / 60) {
      for (let t = 0; t < seconds && PLAYING.includes(state); t += dt) update(dt, (simTime += dt));
    },
  };
}
