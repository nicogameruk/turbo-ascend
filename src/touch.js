// On-screen controls for phones and tablets: a joystick on the left half of the
// screen and buttons on the right. Turned on in Settings → Controls.
const RADIUS = 55; // how far (px) the knob can move from the centre

export function createTouchControls(input) {
  const $ = (id) => document.getElementById(id);
  const root = $('touch');
  const zone = $('stick-zone');
  const base = $('stick');
  const knob = $('stick-knob');
  const abilityBtn = $('tbtn-ability');
  const abilityName = $('tbtn-ability-name');
  const abilityFill = $('tbtn-ability-fill');
  let enabled = false;
  let stickId = null;
  let ox = 0;
  let oy = 0;

  const resetStick = () => {
    stickId = null;
    input.touch.x = 0;
    input.touch.y = 0;
    base.style.opacity = '0.35';
    knob.style.transform = 'translate(-50%, -50%)';
  };

  // Joystick: it appears wherever your thumb lands on the left side.
  zone.addEventListener('pointerdown', (e) => {
    if (stickId !== null) return;
    stickId = e.pointerId;
    try { zone.setPointerCapture(e.pointerId); } catch { /* some browsers refuse; moves still arrive */ }
    ox = e.clientX;
    oy = e.clientY;
    base.style.left = `${ox}px`;
    base.style.top = `${oy}px`;
    base.style.opacity = '1';
    e.preventDefault();
  });
  zone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== stickId) return;
    let dx = e.clientX - ox;
    let dy = e.clientY - oy;
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) { dx *= RADIUS / len; dy *= RADIUS / len; }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    // A small dead zone in the middle so the car doesn't drift.
    const dead = (v) => (Math.abs(v) < 0.15 ? 0 : v);
    input.touch.x = dead(dx / RADIUS);
    input.touch.y = dead(-dy / RADIUS);
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    zone.addEventListener(ev, (e) => { if (e.pointerId === stickId) resetStick(); });
  }

  // Buttons. Boost is held; the others are taps that act like their key.
  root.querySelectorAll('[data-key]').forEach((btn) => {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      btn.classList.add('down');
      if (btn.dataset.key === 'boost') input.touch.boost = true;
      else input.press(btn.dataset.key);
    });
    const up = () => {
      btn.classList.remove('down');
      if (btn.dataset.key === 'boost') input.touch.boost = false;
    };
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) btn.addEventListener(ev, up);
  });
  // No long-press menus or double-tap zoom on the controls.
  root.addEventListener('contextmenu', (e) => e.preventDefault());

  resetStick();
  return {
    get enabled() { return enabled; },
    setEnabled(on) {
      enabled = on;
      document.body.classList.toggle('touch-mode', on);
      if (!on) { resetStick(); input.touch.boost = false; }
    },
    // Only show the controls while flying.
    setVisible(v) {
      root.style.display = enabled && v ? 'block' : 'none';
      if (!v) { resetStick(); input.touch.boost = false; }
    },
    // ability: { name, cooldownLeft, cooldown } or null
    setAbility(a) {
      abilityBtn.style.display = a ? 'flex' : 'none';
      if (!a) return;
      if (abilityName.textContent !== a.name) abilityName.textContent = a.name;
      const ready = a.cooldownLeft <= 0;
      abilityBtn.classList.toggle('ready', ready);
      abilityFill.style.height = `${(1 - a.cooldownLeft / a.cooldown) * 100}%`;
    },
  };
}
