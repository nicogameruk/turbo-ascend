import * as THREE from 'three';

// Fixed camera behind and slightly above the car. It never moves or rotates.
export function createCamera() {
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
  camera.position.set(0, 6, 14);
  camera.lookAt(0, 3.5, -20);
  return camera;
}
