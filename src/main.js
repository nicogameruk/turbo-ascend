import * as THREE from 'three';
import { input } from './input.js';
import { createCamera } from './camera.js';
import { createCar } from './car.js';
import { createWorld } from './world.js';
import { createDrone } from './enemy.js';
import { createSpeedLines } from './effects.js';
import { createHud } from './hud.js';
import { createMudField } from './pickups.js';
import { createPortal } from './portal.js';
import { createBoss } from './boss.js';
import { createProgress, getStats } from './progress.js';
import { createGarage } from './garage.js';

const BASE_SPEED = 40;
const MUD_GOAL = 20;
const BOSS_BONUS = 15;
const HIT_DISTANCE = 1.8;
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

scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x7a5434, 1.3));
const sun = new THREE.DirectionalLight(0xfff4e0, 2.4);
sun.position.set(8, 20, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 14, bottom: -6, near: 1, far: 50 });
scene.add(sun);

const world = createWorld(scene);
const car = createCar();
scene.add(car.group);
const drone = createDrone();
scene.add(drone.group);
const speedLines = createSpeedLines(scene);
const mud = createMudField(scene);
const portal = createPortal(scene);
const boss = createBoss(scene);
const hud = createHud();
const progress = createProgress();
const garage = createGarage(progress, {
  onBuy: () => car.applyUpgrades(progress.levels),
  onLeave: () => leaveGarage(),
});

// 'flying' -> (portal) -> 'boss' -> 'victory' -> 'garage' -> 'flying' ...
// plus 'paused' and 'over'.
let state = 'flying';
let pausedFrom = 'flying';
let stats, health, invuln, meters, elapsed, speed, runMud;

function startRun() {
  stats = getStats(progress.levels);
  car.reset();
  car.setStats(stats);
  car.applyUpgrades(progress.levels);
  drone.reset();
  drone.group.visible = true;
  mud.reset();
  portal.close();
  boss.stop();
  health = stats.maxHealth;
  invuln = 0;
  meters = 0;
  elapsed = 0;
  speed = BASE_SPEED;
  runMud = 0;
  state = 'flying';
  hud.banner(`LEVEL 1 · DIRT — collect ${MUD_GOAL} mud chunks`, 3.5);
}

// Hurt the player unless they just got hit. Returns true if the hit landed.
let devGodMode = false; // dev test hook only
function damage() {
  if (devGodMode || invuln > 0 || (state !== 'flying' && state !== 'boss')) return false;
  health -= 1;
  invuln = INVULN_TIME;
  if (health <= 0) {
    state = 'over';
    car.group.visible = true;
    hud.banner('', 0);
  }
  return true;
}

function startBoss() {
  state = 'boss';
  drone.reset();
  drone.group.visible = false;
  boss.start();
  hud.banner('BOSS: SCRAP HAULER — catch the blue cores, dodge the red shots!', 4);
}

function win() {
  state = 'victory';
  const earned = runMud + BOSS_BONUS;
  progress.mud += earned;
  health = stats.maxHealth;
  hud.banner(`LEVEL COMPLETE! +${earned} mud — press E for the garage`, Infinity);
}

function openGarage() {
  state = 'garage';
  hud.banner('', 0);
  boss.stop();
  mud.reset();
  drone.group.visible = false;
  car.group.visible = true;
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
  car.setFlame(boostAmt, time);

  invuln = Math.max(0, invuln - dt);
  car.group.visible = invuln > 0 ? Math.floor(invuln * 12) % 2 === 0 : true;
  meters += speed * dt;
  elapsed += dt;

  const got = mud.update(dt, speed, car.group.position, state === 'flying', time);
  if (got) {
    runMud += got;
    hud.pulseMud();
  }

  if (state === 'flying') {
    drone.update(dt, car.group.position, speed, elapsed, time);
    if (drone.position.distanceTo(car.group.position) < HIT_DISTANCE && damage()) drone.knockBack();
    if (state !== 'flying') return;
    if (runMud >= MUD_GOAL && !portal.active) {
      portal.open();
      hud.banner('PORTAL OPEN! Fly through it', 3);
    }
    if (portal.update(dt, speed)) startBoss();
  } else if (state === 'boss') {
    if (boss.update(dt, car.group.position, damage).defeated) win();
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

  hud.update(dt, {
    state,
    fuel: car.fuel,
    fuelScale: stats.fuelBarScale,
    health,
    maxHealth: stats.maxHealth,
    runMud,
    goal: MUD_GOAL,
    meters,
    droneZ: drone.position.z,
    bossHp: boss.hp,
    bossMax: boss.maxHp,
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
    get runMud() { return runMud; },
    set runMud(v) { runMud = v; },
    progress,
    car,
    drone,
    boss,
    portal,
    set godMode(v) { devGodMode = v; },
    resume() { if (state === 'paused') state = pausedFrom; },
    openGarage,
    leaveGarage,
    step(seconds, dt = 1 / 60) {
      for (let t = 0; t < seconds && ['flying', 'boss', 'victory'].includes(state); t += dt) update(dt, (simTime += dt));
    },
  };
}
