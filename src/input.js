// Keyboard state. `down` = held keys, `pressed` = keys pressed since last frame.
const down = new Set();
const pressed = new Set();
const BLOCK_DEFAULT = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

addEventListener('keydown', (e) => {
  if (!down.has(e.code)) pressed.add(e.code);
  down.add(e.code);
  if (BLOCK_DEFAULT.includes(e.code)) e.preventDefault();
});
addEventListener('keyup', (e) => down.delete(e.code));
addEventListener('blur', () => down.clear());

const any = (...codes) => codes.some((c) => down.has(c));

export const input = {
  get up() { return any('KeyW', 'ArrowUp'); },
  get down() { return any('KeyS', 'ArrowDown'); },
  get left() { return any('KeyA', 'ArrowLeft'); },
  get right() { return any('KeyD', 'ArrowRight'); },
  get boost() { return down.has('Space'); },
  get special() { return any('ShiftLeft', 'ShiftRight'); }, // reserved for abilities
  wasPressed(code) { return pressed.has(code); },
  endFrame() { pressed.clear(); },
};
