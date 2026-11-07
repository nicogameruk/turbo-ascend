const $ = (id) => document.getElementById(id);

export function createHud() {
  const fuelFill = $('fuel-fill');
  const hearts = $('hearts');
  const distance = $('distance');
  const warning = $('warning');
  const overlay = $('overlay');
  const help = $('help');
  setTimeout(() => { help.style.opacity = '0'; }, 6000);

  let lastOverlay = null;
  return {
    update({ fuel, health, maxHealth, meters, droneZ, state }) {
      fuelFill.style.width = `${(fuel * 100).toFixed(1)}%`;
      hearts.textContent = '♥'.repeat(health) + '♡'.repeat(maxHealth - health);
      distance.textContent = `${Math.floor(meters)} m`;
      // Drone is behind the camera (not visible) but close: warn the player.
      warning.style.opacity = state === 'playing' && droneZ > 12 && droneZ < 26 ? '1' : '0';

      let html = '';
      if (state === 'paused') html = 'PAUSED<small>Press Esc to resume</small>';
      if (state === 'over') html = `GAME OVER<small>You flew ${Math.floor(meters)} m · Press R to restart</small>`;
      if (html !== lastOverlay) {
        overlay.innerHTML = html;
        overlay.style.display = html ? 'flex' : 'none';
        lastOverlay = html;
      }
    },
  };
}
