import * as THREE from 'three';
import { input } from './input.js';
import { createCamera } from './camera.js';
import { createCar } from './car.js';
import { createWorld } from './world.js';
import { createDrone } from './enemy.js';
import { createSpeedLines } from './effects.js';
import { createHud } from './hud.js';

const BASE_SPEED = 40;
const BOOST_SPEED = 85;
const MAX_HEALTH = 3;
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
const hud = createHud();

let state = 'playing'; // 'playing' | 'paused' | 'over'
let health, invuln, meters, elapsed, speed;

function reset() {
  car.reset();
  drone.reset();
  health = MAX_HEALTH;
  invuln = 0;
  meters = 0;
  elapsed = 0;
  speed = BASE_SPEED;
  state = 'playing';
}

function update(dt, time) {
  car.update(dt, input, time);

  const target = car.boosting ? BOOST_SPEED : BASE_SPEED;
  speed += (target - speed) * (1 - Math.exp(-3 * dt));
  const boostAmt = (speed - BASE_SPEED) / (BOOST_SPEED - BASE_SPEED);

  world.update(dt, speed);
  speedLines.update(dt, speed, boostAmt);
  car.setFlame(boostAmt, time);
  drone.update(dt, car.group.position, speed, elapsed, time);

  invuln = Math.max(0, invuln - dt);
  car.group.visible = invuln > 0 ? Math.floor(invuln * 12) % 2 === 0 : true;

  if (invuln === 0 && drone.position.distanceTo(car.group.position) < HIT_DISTANCE) {
    health -= 1;
    invuln = INVULN_TIME;
    drone.knockBack();
    if (health <= 0) {
      state = 'over';
      car.group.visible = true;
    }
  }

  meters += speed * dt;
  elapsed += dt;
}

const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;

  if (input.wasPressed('Escape') && state !== 'over') state = state === 'paused' ? 'playing' : 'paused';
  if (input.wasPressed('KeyR') && state === 'over') reset();

  if (state === 'playing') update(dt, time);

  hud.update({ fuel: car.fuel, health, maxHealth: MAX_HEALTH, meters, droneZ: drone.position.z, state });
  renderer.render(scene, camera);
  input.endFrame();
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'playing') state = 'paused';
});

reset();
frame();

if (import.meta.env.DEV) {
  // Dev-only test hook: advance the simulation without rendering (works while the tab is hidden).
  let simTime = 0;
  window.__game = {
    get state() { return state; },
    get health() { return health; },
    car,
    drone,
    resume() { if (state === 'paused') state = 'playing'; },
    step(seconds, dt = 1 / 60) {
      for (let t = 0; t < seconds && state === 'playing'; t += dt) update(dt, (simTime += dt));
    },
  };
}
