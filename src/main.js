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
import { ABILITIES, activeAbilities } from './abilities.js';

const BASE_SPEED = 40;
const MENU_SPEED = 22;
const INVULN_TIME = 1.5;
const NO_INPUT = { up: false, down: false, left: false, right: false, boost: false };

const renderer = new THREE.WebGLRenderer({ antialias: true });
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

// Enemy shots make a (quiet, rate-limited) sound.
let lastShotSound = 0;
const spawnShot = shots.spawn;
shots.spawn = (...args) => {
  spawnShot(...args);
  const now = performance.now();
  if (now - lastShotSound > 120) { audio.play('shot'); lastShotSound = now; }
};

const save = () => writeSave(progress);

// Shop looks: paint, trail and flame colour.
function applyLooks() {
  car.setPaint(findItem('paint', progress.equipped.paint).color ?? null);
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
  onSettings: (s) => { progress.settings = s; audio.setSettings(s); save(); },
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
let invuln = 0, meters = 0, elapsed = 0, runTime = 0, speed = MENU_SPEED, runMat = 0, coinsEarned = 0;

// Abilities: Shift uses the selected active one, Q switches.
let selected = 0;
const cooldown = {}; // id -> seconds left
let shieldT = 0;
let dashT = 0;
const actives = () => activeAbilities(progress.best);
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
  runMat = 0;
  coinsEarned = 0;
  shieldT = 0;
  dashT = 0;
  for (const id in cooldown) cooldown[id] = 0;
  car.setDash(false);
  trails.reset(car.group.position);
  state = 'flying';
  enemies.reset(ctx());
  audio.music(level);
  hud.showHelp();
  hud.banner(`LEVEL ${level.n} · ${level.name.toUpperCase()} — collect ${level.goal} ${level.material.toLowerCase()}`, 3.5);
}

// Hurt the player. Returns true if the hit was used up (landed or blocked by the shield).
let devGodMode = false; // dev test hook only
function damage() {
  if (state !== 'flying' && state !== 'boss') return false;
  if (dashT > 0) return false; // dashing: things pass right through you
  if (shieldT > 0) {
    booms.spawn(car.group.position, 0x7fd8ff, 0.6);
    audio.play('block');
    return true;
  }
  if (devGodMode || invuln > 0) return false;
  health -= 1;
  invuln = INVULN_TIME;
  sparks.burst(car.group.position);
  hud.hurt();
  audio.play('hit');
  if (health <= 0) gameOver();
  return true;
}

function gameOver() {
  state = 'over';
  car.group.visible = true;
  car.setShield(false, 0);
  booms.spawn(car.group.position, 0xff6a2a, 1.4);
  hud.banner('', 0);
  coinsEarned = runCoins(level, meters, false);
  progress.coins += coinsEarned;
  audio.setEngine(false);
  audio.play('boom');
  audio.play('lose');
  save();
}

function ctx(time = 0) {
  return { carPos: car.group.position, speed, elapsed, time, diff: level.n - 1, shots, hit: damage };
}
const hazardCtx = {
  carPos: car.group.position,
  get speed() { return speed; },
  hit: () => damage(),
  sound: (n) => audio.play(n),
  boom: (p, c, s) => booms.spawn(p, c, s),
  flash: () => hud.flash(0.5),
};

function useAbility() {
  const list = actives();
  if (!list.length) return;
  const id = list[selected % list.length];
  const a = ABILITIES[id];
  if ((cooldown[id] ?? 0) > 0) { audio.play('nope'); return; }
  cooldown[id] = a.cooldown;
  audio.play(id);
  if (id === 'shield') shieldT = a.duration;
  if (id === 'dash') { dashT = a.duration; car.setDash(true); }
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
  const earned = runMat + bossBonus(level);
  progress.bank += earned;
  coinsEarned = runCoins(level, meters, true);
  progress.coins += coinsEarned;
  const firstClear = level.n === progress.best && progress.best < LAST_LEVEL;
  if (firstClear) progress.best += 1;
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
    hud.banner(`YOU BEAT THE ${boss.name}! ${pay} · ${time}. More levels come in a later build — press E for the garage`, Infinity);
  } else if (firstClear) {
    const next = getLevel(progress.best);
    const ability = Object.values(ABILITIES).find((a) => a.level === next.n);
    car.setTier(progress.best); // the car changes look right away
    hud.banner(`LEVEL COMPLETE! ${pay} · ${time} · New look + ${ability.name} unlocked — press E for the garage`, Infinity);
  } else {
    hud.banner(`LEVEL COMPLETE! ${pay} · ${time} — press E for the garage`, Infinity);
  }
}

function openGarage() {
  state = 'garage';
  hud.banner('', 0);
  boss.stop();
  shots.clear();
  hazards.hide();
  materials.reset();
  enemies.hide();
  portal.close();
  car.group.visible = true;
  car.setShield(false, 0);
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
  const target = car.boosting ? stats.boostSpeed : BASE_SPEED;
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
  if (dashT > 0) {
    dashT -= dt;
    if (dashT <= 0) car.setDash(false);
  }
  if (state === 'flying' || state === 'boss') {
    if (input.wasPressed('KeyQ') && actives().length > 1) { selected = (selected + 1) % actives().length; audio.play('ui'); }
    if (input.wasPressed('ShiftLeft') || input.wasPressed('ShiftRight')) useAbility();
  }
  car.setShield(shieldT > 0, time);

  invuln = Math.max(0, invuln - dt);
  car.group.visible = invuln > 0 ? Math.floor(invuln * 12) % 2 === 0 : true;
  if (dashT > 0) car.group.visible = Math.floor(time * 30) % 2 === 0;
  meters += speed * dt;
  elapsed += dt;
  if (state !== 'victory') runTime += dt;

  const got = materials.update(dt, speed, car.group.position, state === 'flying', time, stats.magnet);
  if (got) {
    runMat += got;
    hud.pulseMud();
    audio.play('pickup');
  }

  const started = hazards.update(dt, hazardCtx, state === 'flying');
  if (started && HAZARD_WARNINGS[started]) hud.banner(HAZARD_WARNINGS[started], 2);
  if (state === 'over') return;

  if (state === 'flying') {
    world.setSkyProgress((runMat / level.goal) * 0.75);
    enemies.update(dt, ctx(time));
    shots.update(dt, car.group.position, damage);
    if (state !== 'flying') return;
    if (runMat >= level.goal && !portal.active) {
      portal.open();
      audio.play('portal');
      hud.banner('PORTAL OPEN! Fly through it', 3);
    }
    if (portal.update(dt, speed)) startBoss();
  } else if (state === 'boss') {
    world.setSkyProgress(0.75 + (1 - boss.hp / boss.maxHp) * 0.25);
    const ev = boss.update(dt, car.group.position, damage);
    if (ev.caught) audio.play('bolt');
    if (ev.hurt) audio.play('boom');
    if (ev.defeated) win();
  } else {
    shots.update(dt, car.group.position, () => false);
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
  if (input.wasPressed('KeyH') && (PLAYING.includes(state) || state === 'menu')) audio.horn(progress.equipped.horn);

  if (state === 'over' && input.wasPressed('KeyR')) startRun();
  else if (state === 'over' && input.wasPressed('KeyE')) openGarage();
  else if (state === 'victory' && input.wasPressed('KeyE')) openGarage();
  else if (state === 'garage') {
    garage.handleKeys(input);
    if (state === 'garage') car.displaySpin(dt, time, innerWidth > 760 ? 2 : 0);
  }

  if (PLAYING.includes(state)) update(dt, time);
  else if (state === 'menu') updateMenu(dt, time);
  else if (state === 'over') { booms.update(dt); sparks.update(dt); }

  const list = actives();
  const abilityId = list.length ? list[selected % list.length] : null;
  hud.update(dt, {
    state,
    level,
    fuel: car.fuel,
    fuelScale: stats.fuelBarScale,
    health,
    maxHealth: stats.maxHealth,
    runMud: runMat,
    goal: level.goal,
    meters,
    timeText: formatTime(runTime),
    coinsEarned,
    warning: enemies.warning,
    bossName: boss.name,
    bossHp: boss.hp,
    bossMax: boss.maxHp,
    ability: abilityId && { ...ABILITIES[abilityId], cooldownLeft: cooldown[abilityId] ?? 0, count: list.length },
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
    useAbility(id) { selected = Math.max(0, actives().indexOf(id)); useAbility(); },
    openGarage,
    leaveGarage,
    showTitle,
    step(seconds, dt = 1 / 60) {
      for (let t = 0; t < seconds && PLAYING.includes(state); t += dt) update(dt, (simTime += dt));
    },
  };
}
