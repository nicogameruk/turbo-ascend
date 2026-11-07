import * as THREE from 'three';
import { input } from './input.js';
import { createCamera } from './camera.js';
import { createCar } from './car.js';
import { createWorld } from './world.js';
import { createEnemies } from './enemies.js';
import { createShots } from './shots.js';
import { createSpeedLines, createBooms } from './effects.js';
import { createHud } from './hud.js';
import { createMaterialField } from './pickups.js';
import { createPortal } from './portal.js';
import { createBoss } from './boss.js';
import { createProgress, getStats } from './progress.js';
import { createGarage } from './garage.js';
import { getLevel, bossBonus, LAST_LEVEL } from './levels.js';
import { ABILITIES, activeAbilities } from './abilities.js';

const BASE_SPEED = 40;
const INVULN_TIME = 1.5;

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

const world = createWorld(scene, hemi);
const car = createCar();
scene.add(car.group);
const booms = createBooms(scene);
const shots = createShots(scene);
const enemies = createEnemies(scene, booms);
const speedLines = createSpeedLines(scene);
const materials = createMaterialField(scene);
const portal = createPortal(scene);
const boss = createBoss(scene);
const hud = createHud();
const progress = createProgress();
const garage = createGarage(progress, {
  onBuy: () => car.applyUpgrades(progress.levels),
  onLeave: () => leaveGarage(),
  onPickLevel: (n) => { progress.level = n; },
});

// 'flying' -> (portal) -> 'boss' -> 'victory' -> 'garage' -> 'flying' ...
// plus 'paused' and 'over'.
let state = 'flying';
let pausedFrom = 'flying';
let level, stats, health, invuln, meters, elapsed, speed, runMat;

// Abilities: Shift uses the selected active one, Q switches.
let selected = 0;
const cooldown = {}; // id -> seconds left
let shieldT = 0;
let dashT = 0;
const actives = () => activeAbilities(progress.best);

function startRun() {
  level = getLevel(progress.level);
  stats = getStats(progress.levels, progress.best);
  world.setTheme(level);
  materials.setLook(level.n);
  boss.configure(level);
  enemies.setLevel(level);
  car.reset();
  car.setStats(stats);
  car.applyUpgrades(progress.levels);
  car.setTier(progress.best);
  materials.reset();
  shots.clear();
  portal.close();
  boss.stop();
  health = stats.maxHealth;
  invuln = 0;
  meters = 0;
  elapsed = 0;
  speed = BASE_SPEED;
  runMat = 0;
  shieldT = 0;
  dashT = 0;
  for (const id in cooldown) cooldown[id] = 0;
  car.setDash(false);
  state = 'flying';
  enemies.reset(ctx());
  hud.banner(`LEVEL ${level.n} · ${level.name.toUpperCase()} — collect ${level.goal} ${level.material.toLowerCase()}`, 3.5);
}

// Hurt the player. Returns true if the hit was used up (landed or blocked by the shield).
let devGodMode = false; // dev test hook only
function damage() {
  if (state !== 'flying' && state !== 'boss') return false;
  if (dashT > 0) return false; // dashing: things pass right through you
  if (shieldT > 0) { booms.spawn(car.group.position, 0x7fd8ff, 0.6); return true; }
  if (devGodMode || invuln > 0) return false;
  health -= 1;
  invuln = INVULN_TIME;
  booms.spawn(car.group.position, 0xffc070, 0.5);
  if (health <= 0) {
    state = 'over';
    car.group.visible = true;
    car.setShield(false, 0);
    hud.banner('', 0);
  }
  return true;
}

function ctx(time = 0) {
  return { carPos: car.group.position, speed, elapsed, time, diff: level.n - 1, shots, hit: damage };
}

function useAbility(time) {
  const list = actives();
  if (!list.length) return;
  const id = list[selected % list.length];
  const a = ABILITIES[id];
  if ((cooldown[id] ?? 0) > 0) return;
  cooldown[id] = a.cooldown;
  if (id === 'shield') shieldT = a.duration;
  if (id === 'dash') { dashT = a.duration; car.setDash(true); }
  if (id === 'blast') {
    booms.spawn(car.group.position, 0xfff6c0, 5);
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
  hud.banner(`BOSS: ${boss.name} — catch the blue cores, dodge the red shots!`, 4);
}

function win() {
  state = 'victory';
  const earned = runMat + bossBonus(level);
  progress.bank += earned;
  const firstClear = level.n === progress.best && progress.best < LAST_LEVEL;
  if (firstClear) progress.best += 1;
  progress.level = Math.min(LAST_LEVEL, level.n + 1);
  health = stats.maxHealth;
  if (level.n === LAST_LEVEL) {
    hud.banner(`YOU BEAT THE DEMON KING! +${earned} materials — the cosmic levels come in a later build. Press E for the garage`, Infinity);
  } else if (firstClear) {
    const next = getLevel(progress.best);
    const ability = Object.values(ABILITIES).find((a) => a.level === next.n);
    car.setTier(progress.best); // the car changes look right away
    hud.banner(`LEVEL COMPLETE! +${earned} materials · New look + ${ability.name} unlocked — press E for the garage`, Infinity);
  } else {
    hud.banner(`LEVEL COMPLETE! +${earned} materials — press E for the garage`, Infinity);
  }
}

function openGarage() {
  state = 'garage';
  hud.banner('', 0);
  boss.stop();
  shots.clear();
  materials.reset();
  enemies.hide();
  car.group.visible = true;
  car.setShield(false, 0);
  garage.open();
}

function leaveGarage() {
  if (state !== 'garage') return;
  garage.close();
  startRun();
}

function update(dt, time) {
  car.update(dt, input, time);
  const target = car.boosting ? stats.boostSpeed : BASE_SPEED;
  speed += (target - speed) * (1 - Math.exp(-3 * dt));
  const boostAmt = Math.min(1, (speed - BASE_SPEED) / (85 - BASE_SPEED));

  world.update(dt, speed);
  speedLines.update(dt, speed, boostAmt);
  booms.update(dt);
  car.setFlame(boostAmt, time);

  // Abilities
  for (const id in cooldown) cooldown[id] = Math.max(0, cooldown[id] - dt);
  shieldT = Math.max(0, shieldT - dt);
  if (dashT > 0) {
    dashT -= dt;
    if (dashT <= 0) car.setDash(false);
  }
  if (state === 'flying' || state === 'boss') {
    if (input.wasPressed('KeyQ') && actives().length) selected = (selected + 1) % actives().length;
    if (input.wasPressed('ShiftLeft') || input.wasPressed('ShiftRight')) useAbility(time);
  }
  car.setShield(shieldT > 0, time);

  invuln = Math.max(0, invuln - dt);
  car.group.visible = invuln > 0 ? Math.floor(invuln * 12) % 2 === 0 : true;
  if (dashT > 0) car.group.visible = Math.floor(time * 30) % 2 === 0;
  meters += speed * dt;
  elapsed += dt;

  const got = materials.update(dt, speed, car.group.position, state === 'flying', time, stats.magnet);
  if (got) {
    runMat += got;
    hud.pulseMud();
  }

  if (state === 'flying') {
    enemies.update(dt, ctx(time));
    shots.update(dt, car.group.position, damage);
    if (state !== 'flying') return;
    if (runMat >= level.goal && !portal.active) {
      portal.open();
      hud.banner('PORTAL OPEN! Fly through it', 3);
    }
    if (portal.update(dt, speed)) startBoss();
  } else if (state === 'boss') {
    if (boss.update(dt, car.group.position, damage).defeated) win();
  } else {
    shots.update(dt, car.group.position, () => false);
  }
}

const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;

  if (input.wasPressed('Escape')) {
    if (state === 'paused') state = pausedFrom;
    else if (['flying', 'boss', 'victory'].includes(state)) { pausedFrom = state; state = 'paused'; }
  }

  if (state === 'over' && input.wasPressed('KeyR')) startRun();
  else if (state === 'victory' && input.wasPressed('KeyE')) openGarage();
  else if (state === 'garage') {
    garage.handleKeys(input);
    if (state === 'garage') car.displaySpin(dt, time, innerWidth > 760 ? 2 : 0);
  }

  if (['flying', 'boss', 'victory'].includes(state)) update(dt, time);

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
  if (document.hidden && ['flying', 'boss', 'victory'].includes(state)) {
    pausedFrom = state;
    state = 'paused';
  }
});

startRun();
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
    get shieldT() { return shieldT; },
    get dashT() { return dashT; },
    progress,
    car,
    enemies,
    boss,
    portal,
    set godMode(v) { devGodMode = v; },
    resume() { if (state === 'paused') state = pausedFrom; },
    // Jump to a level (unlocking everything up to it).
    play(n) { progress.best = Math.max(progress.best, n); progress.level = n; garage.close(); startRun(); },
    useAbility(id) { selected = Math.max(0, actives().indexOf(id)); useAbility(simTime); },
    openGarage,
    leaveGarage,
    step(seconds, dt = 1 / 60) {
      for (let t = 0; t < seconds && ['flying', 'boss', 'victory'].includes(state); t += dt) update(dt, (simTime += dt));
    },
  };
}
