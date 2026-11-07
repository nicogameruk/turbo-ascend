import * as THREE from 'three';

function swirlTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.3, 'rgba(255,190,90,0.9)');
  grad.addColorStop(0.7, 'rgba(170,70,255,0.6)');
  grad.addColorStop(1, 'rgba(90,20,160,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  // spiral arms
  g.strokeStyle = 'rgba(255,255,255,0.45)';
  g.lineWidth = 6;
  for (let arm = 0; arm < 4; arm++) {
    g.beginPath();
    for (let t = 0; t < 1; t += 0.02) {
      const a = arm * (Math.PI / 2) + t * Math.PI * 2.2;
      const r = t * 120;
      const x = 128 + Math.cos(a) * r;
      const y = 128 + Math.sin(a) * r;
      if (t === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Portal that opens once you have enough material. Flying through it starts the boss fight.
export function createPortal(scene) {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(6, 0.45, 16, 64),
    new THREE.MeshStandardMaterial({ color: 0xff9a3c, emissive: 0xff7a18, emissiveIntensity: 1.6, roughness: 0.3 }),
  );
  const inner = new THREE.Mesh(new THREE.TorusGeometry(5.4, 0.12, 8, 64), new THREE.MeshBasicMaterial({ color: 0xffe0a0 }));
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(5.4, 48),
    new THREE.MeshBasicMaterial({ map: swirlTexture(), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  group.add(ring, inner, disc);
  group.visible = false;
  scene.add(group);

  let active = false;
  const close = () => { active = false; group.visible = false; };

  return {
    get active() { return active; },
    open() {
      active = true;
      group.visible = true;
      group.position.set(0, 4, -300);
    },
    close,
    // Returns true on the frame the car passes through.
    update(dt, speed) {
      if (!active) return false;
      group.position.z += speed * dt;
      disc.rotation.z += dt * 2;
      ring.rotation.z -= dt * 0.5;
      if (group.position.z > 0) {
        close();
        return true;
      }
      return false;
    },
  };
}
