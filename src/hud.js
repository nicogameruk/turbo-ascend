const $ = (id) => document.getElementById(id);

export function createHud() {
  const left = $('left');
  const right = $('right');
  const fuelBox = $('fuel');
  const fuelFill = $('fuel-fill');
  const hearts = $('hearts');
  const mudBox = $('mud');
  const mudCount = $('mud-count');
  const distance = $('distance');
  const boss = $('boss');
  const bossFill = $('boss-fill');
  const banner = $('banner');
  const warning = $('warning');
  const overlay = $('overlay');
  const help = $('help');
  setTimeout(() => { help.style.opacity = '0'; }, 6000);

  let bannerTime = 0;
  let pulseTimer = 0;
  let lastOverlay = null;

  return {
    // Big message near the top. seconds = Infinity keeps it up until replaced.
    banner(text, seconds) {
      banner.textContent = text;
      bannerTime = seconds;
      banner.style.opacity = text ? '1' : '0';
    },

    pulseMud() {
      mudBox.classList.add('pulse');
      clearTimeout(pulseTimer);
      pulseTimer = setTimeout(() => mudBox.classList.remove('pulse'), 150);
    },

    update(dt, s) {
      if (bannerTime > 0 && bannerTime !== Infinity) {
        bannerTime -= dt;
        if (bannerTime <= 0) banner.style.opacity = '0';
      }

      const inGarage = s.state === 'garage';
      left.style.display = inGarage ? 'none' : 'flex';
      right.style.display = inGarage ? 'none' : 'flex';

      fuelBox.style.width = `${Math.round(220 * s.fuelScale)}px`;
      fuelFill.style.width = `${(s.fuel * 100).toFixed(1)}%`;
      hearts.textContent = '♥'.repeat(Math.max(0, s.health)) + '♡'.repeat(Math.max(0, s.maxHealth - s.health));
      mudCount.textContent = `${s.runMud} / ${s.goal}`;
      mudCount.classList.toggle('full', s.runMud >= s.goal);
      distance.textContent = `${Math.floor(s.meters)} m`;

      boss.style.display = s.state === 'boss' ? 'block' : 'none';
      bossFill.style.width = `${(Math.max(0, s.bossHp) / s.bossMax) * 100}%`;

      // Drone is behind the camera (not visible) but close: warn the player.
      warning.style.opacity = s.state === 'flying' && s.droneZ > 12 && s.droneZ < 26 ? '1' : '0';

      let html = '';
      if (s.state === 'paused') html = 'PAUSED<small>Press Esc to resume</small>';
      if (s.state === 'over') html = `GAME OVER<small>You flew ${Math.floor(s.meters)} m · Press R to try again (upgrades are kept)</small>`;
      if (html !== lastOverlay) {
        overlay.innerHTML = html;
        overlay.style.display = html ? 'flex' : 'none';
        lastOverlay = html;
      }
    },
  };
}
