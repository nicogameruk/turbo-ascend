// Keyboard and touch input. `down` = held keys, `pressed` = keys pressed since last frame.
// Touch controls write into `touch` (joystick and boost) and call press() for buttons,
// so the game reads both the same way.
const down = new Set();
const pressed = new Set();
const BLOCK_DEFAULT = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'];

addEventListener('keydown', (e) => {
  const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement;
  if (typing && e.code !== 'Escape') return; // using a settings control
  if (!down.has(e.code)) pressed.add(e.code);
  down.add(e.code);
  if (BLOCK_DEFAULT.includes(e.code)) e.preventDefault();
});
addEventListener('keyup', (e) => down.delete(e.code));
addEventListener('blur', () => down.clear());

const any = (...codes) => codes.some((c) => down.has(c));

// Joystick: x and y from -1 to 1 (up is +y). boost: the boost button is held.
const touch = { x: 0, y: 0, boost: false };

export const input = {
  touch,
  // Steering from -1 to 1. Keys win over the joystick.
  get moveX() {
    const k = (any('KeyD', 'ArrowRight') ? 1 : 0) - (any('KeyA', 'ArrowLeft') ? 1 : 0);
    return k || touch.x;
  },
  get moveY() {
    const k = (any('KeyW', 'ArrowUp') ? 1 : 0) - (any('KeyS', 'ArrowDown') ? 1 : 0);
    return k || touch.y;
  },
  get boost() { return down.has('Space') || touch.boost; },
  // An on-screen button counts as pressing this key.
  press(code) { pressed.add(code); },
  wasPressed(code) { return pressed.has(code); },
  endFrame() { pressed.clear(); },
};
