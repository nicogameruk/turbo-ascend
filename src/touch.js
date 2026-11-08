// On-screen controls for phones and tablets: a joystick on the left half of the
// screen and buttons on the right. Turned on in Settings → Controls.
//
// Uses touch events (not pointer events) so we can stop the phone from zooming,
// scrolling or selecting text while you play, and track each finger on its own.
// Whenever no finger is on the screen, everything is released, so nothing can
// get stuck "held down".
const RADIUS = 60; // how far (px) the knob can move from the centre
const DEAD = 0.12; // ignore tiny thumb wobbles in the middle

// Stop pinch-zoom, double-tap zoom and long-press menus everywhere (iOS ignores
// user-scalable=no, so this is done in code too).
function blockZoom() {
  const stop = (e) => e.preventDefault();
  document.addEventListener('gesturestart', stop, { passive: false }); // iOS pinch
  document.addEventListener('gesturechange', stop, { passive: false });
  document.addEventListener('dblclick', stop, { passive: false });
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener('contextmenu', stop);
  document.addEventListener('selectstart', (e) => {
    if (!(e.target instanceof Element && e.target.closest('input, select'))) e.preventDefault();
  });
}

export function createTouchControls(input) {
  const $ = (id) => document.getElementById(id);
  const root = $('touch');
  const zone = $('stick-zone');
  const base = $('stick');
  const knob = $('stick-knob');
  const abilityBtn = $('tbtn-ability');
  const abilityName = $('tbtn-ability-name');
  const abilityFill = $('tbtn-ability-fill');
  const buttons = [...root.querySelectorAll('[data-key]')];
  let enabled = false;

  let stickId = null; // which finger is on the joystick
  let ox = 0; // joystick centre
  let oy = 0;
  const held = new Map(); // finger id -> button element

  // Where the stick rests when you're not touching it.
  const home = () => {
    const h = zone.getBoundingClientRect();
    return [Math.min(130, h.width * 0.5), h.height - Math.min(130, h.height * 0.3)];
  };
  const placeBase = (x, y) => { base.style.left = `${x}px`; base.style.top = `${y}px`; };

  const releaseStick = () => {
    stickId = null;
    input.touch.x = 0;
    input.touch.y = 0;
    knob.style.transform = 'translate(-50%, -50%)';
    base.classList.remove('active');
    base.style.opacity = '0.55';
    placeBase(...home());
  };
  const releaseButton = (btn) => {
    btn.classList.remove('down');
    if (btn.dataset.key === 'boost') input.touch.boost = [...held.values()].some((b) => b.dataset.key === 'boost' && b !== btn);
  };
  const releaseAll = () => {
    releaseStick();
    for (const btn of held.values()) btn.classList.remove('down');
    held.clear();
    input.touch.boost = false;
  };

  // --- Joystick ---
  const stickStart = (id, x, y) => {
    if (stickId !== null) return;
    const r = zone.getBoundingClientRect();
    stickId = id;
    // The stick jumps to where your thumb lands, so you never have to aim for it.
    ox = x - r.left;
    oy = y - r.top;
    placeBase(ox, oy);
    base.classList.add('active');
    base.style.opacity = '1';
    stickMove(x, y);
  };
  const stickMove = (x, y) => {
    const r = zone.getBoundingClientRect();
    let dx = x - r.left - ox;
    let dy = y - r.top - oy;
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) { dx *= RADIUS / len; dy *= RADIUS / len; }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    // Smooth response: small pushes steer gently, full pushes steer at full speed.
    const shape = (v) => {
      const a = Math.abs(v);
      return a < DEAD ? 0 : Math.sign(v) * ((a - DEAD) / (1 - DEAD));
    };
    input.touch.x = shape(dx / RADIUS);
    input.touch.y = shape(-dy / RADIUS);
  };

  // --- Buttons ---
  const buttonDown = (id, btn) => {
    held.set(id, btn);
    btn.classList.add('down');
    if (btn.dataset.key === 'boost') input.touch.boost = true;
    else input.press(btn.dataset.key);
  };

  // --- Touch events (phones and tablets) ---
  root.addEventListener('touchstart', (e) => {
    e.preventDefault(); // no zoom, scroll or text selection
    for (const t of e.changedTouches) {
      const el = t.target instanceof Element ? t.target : null;
      const btn = el?.closest('[data-key]');
      if (btn) buttonDown(t.identifier, btn);
      else if (el?.closest('#stick-zone')) stickStart(t.identifier, t.clientX, t.clientY);
    }
  }, { passive: false });
  root.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) if (t.identifier === stickId) stickMove(t.clientX, t.clientY);
  }, { passive: false });
  const touchEnd = (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) releaseStick();
      const btn = held.get(t.identifier);
      if (btn) { held.delete(t.identifier); releaseButton(btn); }
    }
    // Safety net: no fingers left on the screen means nothing is held.
    if (e.touches.length === 0) releaseAll();
  };
  root.addEventListener('touchend', touchEnd, { passive: false });
  root.addEventListener('touchcancel', touchEnd, { passive: false });

  // --- Mouse (so touch mode can be tried on a computer) ---
  const MOUSE = 'mouse';
  root.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const btn = e.target.closest('[data-key]');
    if (btn) buttonDown(MOUSE, btn);
    else if (e.target.closest('#stick-zone')) stickStart(MOUSE, e.clientX, e.clientY);
  });
  addEventListener('mousemove', (e) => { if (stickId === MOUSE) stickMove(e.clientX, e.clientY); });
  addEventListener('mouseup', () => {
    if (stickId === MOUSE) releaseStick();
    const btn = held.get(MOUSE);
    if (btn) { held.delete(MOUSE); releaseButton(btn); }
  });

  // Switching apps or locking the phone mid-press: let go of everything.
  addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
  addEventListener('resize', () => { if (stickId === null) placeBase(...home()); });

  blockZoom();
  return {
    get enabled() { return enabled; },
    setEnabled(on) {
      enabled = on;
      document.body.classList.toggle('touch-mode', on);
      if (!on) releaseAll();
    },
    // Only show the controls while flying.
    setVisible(v) {
      const show = enabled && v;
      const was = root.style.display === 'block';
      root.style.display = show ? 'block' : 'none';
      if (show && !was) releaseAll(); // fresh start, stick in its home spot
      if (!show && was) releaseAll();
    },
    // ability: { name, cooldownLeft, cooldown } or null
    setAbility(a) {
      abilityBtn.style.display = a ? 'flex' : 'none';
      if (!a) return;
      if (abilityName.textContent !== a.name) abilityName.textContent = a.name;
      abilityBtn.classList.toggle('ready', a.cooldownLeft <= 0);
      abilityFill.style.height = `${(1 - a.cooldownLeft / a.cooldown) * 100}%`;
    },
    // Dev testing: is anything being held?
    get debug() { return { stickId, held: held.size, ...input.touch }; },
  };
}
