const $ = (id) => document.getElementById(id);

export function createHud() {
  const left = $('left');
  const right = $('right');
  const fuelBox = $('fuel');
  const fuelFill = $('fuel-fill');
  const hearts = $('hearts');
  const mudBox = $('mud');
  const matLabel = $('mat-label');
  const mudCount = $('mud-count');
  const levelName = $('level-name');
  const playerName = $('player-name');
  const distance = $('distance');
  const timer = $('timer');
  const flashEl = $('flash');
  const vignette = $('hit-vignette');
  const boss = $('boss');
  const bossName = $('boss-name');
  const bossFill = $('boss-fill');
  const banner = $('banner');
  const warning = $('warning');
  const overlay = $('overlay');
  const help = $('help');
  const actions = $('actions');
  const ready = $('ready');
  const countEl = $('countdown');
  let readyTimer = 0;
  const ability = $('ability');
  const abilityName = $('ability-name');
  const abilityFill = $('ability-fill');
  const abilityHint = $('ability-hint');
  let helpTimer = 0;

  let bannerTime = 0;
  let pulseTimer = 0;
  let lastOverlay = null;
  let flashT = 0;
  let hurtT = 0;
  const setText = (el, text) => { if (el.textContent !== text) el.textContent = text; };

  return {
    // Big message near the top. seconds = Infinity keeps it up until replaced.
    banner(text, seconds) {
      banner.textContent = text;
      bannerTime = seconds;
      banner.style.opacity = text ? '1' : '0';
    },

    // Buttons under a message: [{ label, onClick }], or [] to hide them.
    setActions(list) {
      actions.innerHTML = '';
      for (const { label, onClick } of list) {
        const b = document.createElement('button');
        b.textContent = label;
        b.addEventListener('mousedown', (e) => e.preventDefault());
        b.addEventListener('click', onClick);
        actions.append(b);
      }
      actions.style.display = list.length ? 'flex' : 'none';
    },

    // Big countdown number (or "GO!") in the middle, in the level's colour.
    countdown(text, theme) {
      countEl.textContent = text;
      if (theme) countEl.style.setProperty('--accent', theme.accent);
      countEl.classList.toggle('go', text === 'GO!');
      countEl.classList.remove('pop');
      void countEl.offsetWidth; // restart the animation
      countEl.classList.add('pop');
    },
    clearCountdown() { countEl.classList.remove('pop'); },

    // Pop-up at the top: your ability has recharged.
    // theme: the level's { accent, glow, icon } (see LEVEL_THEMES in levels.js).
    abilityReady(name, touch, theme) {
      ready.textContent = `${theme?.icon ?? '⚡'} ${name} READY! ${touch ? 'Tap ABILITY' : 'Press B'}`;
      if (theme) {
        ready.style.setProperty('--accent', theme.accent);
        ready.style.setProperty('--glow', theme.glow);
      }
      ready.classList.toggle('rainbow', !!theme?.rainbow);
      ready.classList.remove('show');
      void ready.offsetWidth; // restart the slide-in
      ready.classList.add('show');
      clearTimeout(readyTimer);
      readyTimer = setTimeout(() => ready.classList.remove('show'), 2200);
    },
    hideAbilityReady() {
      clearTimeout(readyTimer);
      ready.classList.remove('show');
    },

    // Show the controls line for a few seconds.
    showHelp() {
      help.style.opacity = '0.85';
      clearTimeout(helpTimer);
      helpTimer = setTimeout(() => { help.style.opacity = '0'; }, 6000);
    },

    // White flash (lightning) and red edges (getting hit).
    flash(strength = 0.6) { flashT = strength; },
    hurt() { hurtT = 0.35; },

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

      flashT = Math.max(0, flashT - dt * 3);
      flashEl.style.opacity = flashT.toFixed(2);
      hurtT = Math.max(0, hurtT - dt);
      vignette.style.opacity = hurtT > 0 ? '1' : '0';

      const inGarage = s.state === 'garage' || s.state === 'menu' || s.state === 'ending';
      left.style.display = inGarage ? 'none' : 'flex';
      right.style.display = inGarage ? 'none' : 'flex';
      help.style.display = s.state === 'menu' ? 'none' : '';
      setText(timer, s.timeText);

      fuelBox.style.width = `${Math.round(220 * s.fuelScale)}px`;
      fuelFill.style.width = `${(s.fuel * 100).toFixed(1)}%`;
      setText(hearts, '♥'.repeat(Math.max(0, s.health)) + '♡'.repeat(Math.max(0, s.maxHealth - s.health)));
      setText(matLabel, s.level.material.toUpperCase());
      setText(mudCount, `${s.runMud} / ${s.goal}`);
      mudCount.classList.toggle('full', s.runMud >= s.goal);
      setText(levelName, `LEVEL ${s.level.n} · ${s.level.name.toUpperCase()}`);
      setText(playerName, s.playerName ? `👤 ${s.playerName}` : '');
      setText(distance, `${Math.floor(s.meters)} m`);

      boss.style.display = s.state === 'boss' ? 'block' : 'none';
      document.body.classList.toggle('boss-fight', s.state === 'boss');
      setText(bossName, s.bossName);
      bossFill.style.width = `${(Math.max(0, s.bossHp) / s.bossMax) * 100}%`;

      // Something is behind the camera (not visible) but close: warn the player.
      warning.style.opacity = s.state === 'flying' && s.warning ? '1' : '0';

      // Active ability and its cooldown.
      const a = s.ability;
      ability.style.display = a && !inGarage && s.state !== 'over' ? 'block' : 'none';
      if (a) {
        setText(abilityName, a.name);
        abilityFill.style.width = `${(1 - a.cooldownLeft / a.cooldown) * 100}%`;
        ability.classList.toggle('ready', a.cooldownLeft <= 0);
        setText(abilityHint, a.cooldownLeft > 0 ? `${Math.ceil(a.cooldownLeft)} s` : 'READY · press B');
      }

      let html = '';
      if (s.state === 'ending' && s.ending) {
        html = `<span class="ending">YOU'RE A LEGEND!</span>
          ${s.playerName ? `<b style="font-size:28px;color:#ffcf8a">${s.playerName.replace(/[<>&]/g, '')}</b>` : ''}
          <small>You saved the universe, got the job, AND drew your way out of Doodle Land. What a ride!<br>
          ${s.ending.pay} · ${s.ending.time}<br>
          All your best times added up: ${Math.floor(s.ending.total / 60)} min ${Math.round(s.ending.total % 60)} s<br><br>
          Thanks for playing <b>Turbo Ascend</b>! Replay any level from the garage to beat your records.</small>`;
      }
      if (s.state === 'over') html = `GAME OVER<small>You flew ${Math.floor(s.meters)} m and earned ${s.coinsEarned} coins${s.runPoints ? ` and ${s.runPoints} 🏆 points` : ''} (upgrades are kept)</small>`;
      if (html !== lastOverlay) {
        overlay.innerHTML = html;
        overlay.style.display = html ? 'flex' : 'none';
        lastOverlay = html;
      }
    },
  };
}
