import * as THREE from 'three';
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
import { findItem } from './cosmetics.js';
import { getLevel, bossBonus, runCoins, LAST_LEVEL } from './levels.js';
import { ABILITIES, availableAbilities, abilityCooldown, abilityDuration } from './abilities.js';
import { createTouchControls } from './touch.js';
import { createToppers } from './toppers.js';
import { createPet } from './pets.js';
import { BOUNDS } from './car.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

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
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = createCamera();

const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x7a5434, 1.3);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff4e0, 2.4);
sun.position.set(8, 20, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 14, bottom: -6, near: 1, far: 50 });
scene.add(sun);

const audio = createAudio();
const world = createWorld(scene, hemi);
const car = createCar();
scene.add(car.group);
// A soft studio "room" for chrome paint to reflect.
car.setEnvironment(new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture);

// Fire Breath: a cone of flame in front of the car.
const breathMat = new THREE.MeshBasicMaterial({ color: 0xff7a20, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const breathGeo = new THREE.ConeGeometry(4, 40, 20, 1, true);
breathGeo.translate(0, -20, 0);
breathGeo.rotateX(-Math.PI / 2); // tip at the car, wide end ahead
const breath = new THREE.Mesh(breathGeo, breathMat);
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

const toppers = createToppers(car.topperSlot);
const pet = createPet(scene);
const petIs = (id) => progress.equipped.pet === id;
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

// Shop looks: paint, trail, flame colour, glow, hat and pet.
function applyLooks() {
  car.setPaint(findItem('paint', progress.equipped.paint));
  const glowItem = findItem('glow', progress.equipped.glow);
  car.setGlow(glowItem.id === 'upgrade' ? undefined : glowItem.color);
  toppers.set(progress.equipped.topper);
  pet.set(progress.equipped.pet);
  pet.snap(car.group.position);
  const trail = findItem('trail', progress.equipped.trail);
  trails.setColor(trail.color);
  car.setTrailColor(trail.id === 'blue' ? 0xff8a2a : trail.color);
}

const garage = createGarage(progress, {
  onBuy: () => { car.applyUpgrades(progress.levels); save(); },
  onLeave: () => leaveGarage(),
  onPickLevel: (n) => { progress.level = n; save(); },
  onShop: () => { applyLooks(); save(); },
  onPreviewHorn: (id) => audio.horn(id),
  sound: (n) => audio.play(n),
});

const menus = createMenus({
  onContinue: () => { menus.hide(); openGarage(); },
  onNewGame: () => {
    const settings = progress.settings;
    Object.assign(progress, createProgress(), { settings, started: true });
    save();
    menus.hide();
    car.applyUpgrades(progress.levels);
    applyLooks();
    startRun();
  },
  onResume: () => resume(),
  onRestart: () => { menus.hide(); startRun(); },
  onQuit: () => showTitle(),
  onSettings: (s) => { progress.settings = s; audio.setSettings(s); touch.setEnabled(s.controls === 'touch'); save(); },
  onResetSave: () => {
    clearSave();
    const settings = progress.settings;
    Object.assign(progress, createProgress(), { settings });
    car.applyUpgrades(progress.levels);
    applyLooks();
    showTitle();
  },
  sound: (n) => audio.play(n),
});
menus.setSettings(progress.settings);

// States: 'menu' (title), 'flying' -> (portal) -> 'boss' -> 'victory' -> 'garage' -> 'flying' ...
// plus 'paused' and 'over'.
let state = 'menu';
let pausedFrom = 'flying';
let level = getLevel(progress.level);
let stats = getStats(progress.levels, progress.best);
let health = stats.maxHealth;
let ending = null; // set after beating the final boss
let repairT = 0; // Auto Repair timer
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
let rainbowT = 0; // Rainbow Shield
let nitroT = 0; // Nitro (shop)
let doubleT = 0; // Double Up (shop)
const resetAbilityTimers = () => { shieldT = dashT = warpT = freezeT = slowT = breathT = rainbowT = nitroT = doubleT = 0; };
const equipped = () => (progress.ability && availableAbilities(progress).includes(progress.ability) ? progress.ability : null);
const PLAYING = ['flying', 'boss', 'victory'];

// Scenery for the title screen: the furthest level you've reached.
function setScene(l) {
  world.setTheme(l);
  materials.setLook(l.n);
  car.setTier(progress.best);
}

function showTitle() {
  state = 'menu';
  hud.banner('', 0);
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
  car.applyUpgrades(progress.levels);
  setScene(getLevel(progress.best));
  trails.reset(car.group.position);
  speed = MENU_SPEED;
  audio.setEngine(false);
  audio.music(getLevel(progress.best));
  menus.showTitle(progress.started);
  save();
}

function startRun() {
  progress.started = true;
  level = getLevel(progress.level);
  stats = getStats(progress.levels, progress.best);
  setScene(level);
  boss.setPlayer(stats);
  boss.configure(level);
  enemies.setLevel(level);
  hazards.setLevel(level);
  car.reset();
  car.setStats(stats);
  car.applyUpgrades(progress.levels);
  materials.reset();
  shots.clear();
  hazards.hide();
  portal.close();
  boss.stop();
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
  state = 'flying';
  enemies.reset(ctx());
  audio.music(level);
  hud.showHelp();
  hud.banner(`LEVEL ${level.n} · ${level.name.toUpperCase()} — collect ${goal} ${level.material.toLowerCase()}`, 3.5);
}

// Hurt the player. Returns true if the hit was used up (landed or blocked by the shield).
let devGodMode = false; // dev test hook only
function damage() {
  if (state !== 'flying' && state !== 'boss') return false;
  if (dashT > 0 || warpT > 0) return false; // dashing/warping: things pass right through you
  if (shieldT > 0 || rainbowT > 0) {
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
  coinsEarned = Math.round(runCoins(level, meters, false) * (petIs('kitty') ? 1.2 : 1) * stats.coinMult);
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
    pull: pullCar, smash: rainbowT > 0 || (stats.ram && car.boosting), onKill: () => audio.play('boom'),
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
  nitro: 'whoosh', repair: 'buy', doubleup: 'portal', missiles: 'zap',
};

function useAbility() {
  const id = equipped();
  if (!id) { hud.banner('No ability equipped — pick one in the garage shop', 2); return; }
  if ((cooldown[id] ?? 0) > 0) { audio.play('nope'); return; }
  if (id === 'repair' && health >= stats.maxHealth) { audio.play('nope'); hud.banner('Hearts already full', 1); return; }
  cooldown[id] = abilityCooldown(id, progress.best) * (petIs('star') ? 0.75 : 1) * stats.cooldownMult;
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
  if (id === 'firebreath') { breathT = dur; breathTick = 0; }
  if (id === 'rainbow') rainbowT = dur;
  if (id === 'nitro') { nitroT = dur; car.fuel = 1; hud.banner('NITRO!', 1); }
  if (id === 'repair') {
    health += 1;
    sparks.burst(pos, 20, 0x8dff9a);
    hud.banner('+1 HEART', 1.2);
  }
  if (id === 'doubleup') { doubleT = dur; hud.banner('DOUBLE MATERIAL!', 1.5); }
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
  coinsEarned = Math.round(runCoins(level, meters, true) * (petIs('kitty') ? 1.2 : 1) * stats.coinMult);
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
  const pay = `+${earned} materials, +${coinsEarned} coins`;
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
  resetAbilityTimers();
  car.setDash(false);
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
  pausedFrom = state;
  state = 'paused';
  audio.setEngine(false);
  menus.showPause();
}

function resume() {
  if (state !== 'paused') return;
  menus.hide();
  state = pausedFrom;
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
  for (const id in cooldown) cooldown[id] = Math.max(0, cooldown[id] - dt);
  shieldT = Math.max(0, shieldT - dt);
  warpT = Math.max(0, warpT - dt);
  freezeT = Math.max(0, freezeT - dt);
  slowT = Math.max(0, slowT - dt);
  rainbowT = Math.max(0, rainbowT - dt);
  nitroT = Math.max(0, nitroT - dt);
  doubleT = Math.max(0, doubleT - dt);
  updateMissiles(dt);
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
  if (breathT > 0) {
    breathT -= dt;
    breathMat.opacity = 0.35 + Math.random() * 0.25;
    breath.scale.set(1 + Math.random() * 0.1, 1 + Math.random() * 0.1, 1);
    breathTick -= dt;
    if (breathTick <= 0) {
      breathTick = 0.15;
      const pos = car.group.position;
      enemies.burnAhead(pos);
      shots.clearAhead(pos);
      boss.clearShots();
      hazards.smash(pos, 45, (p, c, sz) => booms.spawn(p, c, sz));
    }
    if (state === 'boss' && Math.floor((breathT + dt) / 0.6) !== Math.floor(breathT / 0.6)) boss.hurt(1);
  }

  invuln = Math.max(0, invuln - dt);
  car.group.visible = invuln > 0 ? Math.floor(invuln * 12) % 2 === 0 : true;
  if (dashT > 0 || warpT > 0) car.group.visible = Math.floor(time * 30) % 2 === 0;
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
  if (started && HAZARD_WARNINGS[started]) hud.banner(HAZARD_WARNINGS[started], 2);
  if (state === 'over') return;

  if (state === 'flying') {
    world.setSkyProgress((runMat / goal) * 0.75);
    if (edt > 0) {
      enemies.update(edt, ctx(time));
      shots.update(edt, car.group.position, damage);
    }
    if (state !== 'flying') return;
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
    if (PLAYING.includes(state)) pause();
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
  else if (state === 'menu') updateMenu(dt, time);
  else if (state === 'over') { booms.update(dt); sparks.update(dt); }
  else if (state === 'ending') updateMenu(dt, time);

  pet.update(dt, car.group.position, time);
  toppers.update(dt);
  const abilityId = equipped();
  const abilityInfo = abilityId && { ...ABILITIES[abilityId], cooldownLeft: cooldown[abilityId] ?? 0, cooldown: abilityCooldown(abilityId, progress.best) * (petIs('star') ? 0.75 : 1) * stats.cooldownMult };
  touch.setVisible(state === 'flying' || state === 'boss');
  touch.setAbility(abilityInfo);
  hud.update(dt, {
    state,
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
    warning: enemies.warning,
    bossName: boss.name,
    bossHp: boss.hp,
    bossMax: boss.maxHp,
    ability: abilityInfo,
  });
  renderer.render(scene, camera);
  input.endFrame();
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && PLAYING.includes(state)) pause();
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
    play(n) { progress.best = Math.max(progress.best, n); progress.level = n; garage.close(); menus.hide(); startRun(); },
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
