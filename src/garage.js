import { UPGRADES, nextCost, buy } from './progress.js';
import { LEVELS } from './levels.js';
import { ABILITIES, unlocked } from './abilities.js';

// Garage screen between levels: spend materials on upgrades and pick the next level.
export function createGarage(progress, { onBuy, onLeave, onPickLevel }) {
  const panel = document.getElementById('garage');
  const list = document.getElementById('garage-list');
  const bank = document.getElementById('garage-mud');
  const levelsBox = document.getElementById('garage-levels');
  const abilitiesBox = document.getElementById('garage-abilities');
  const go = document.getElementById('garage-go');

  // Stop buttons taking keyboard focus, so Enter/Space don't trigger them by accident.
  const noFocus = (el) => el.addEventListener('mousedown', (e) => e.preventDefault());
  noFocus(go);
  go.addEventListener('click', () => onLeave());

  const tryBuy = (up) => {
    if (buy(progress, up)) {
      onBuy(up);
      render();
    }
  };
  const pick = (n) => {
    if (n < 1 || n > progress.best) return;
    onPickLevel(n);
    render();
  };

  function render() {
    bank.textContent = progress.bank;
    list.innerHTML = '';
    UPGRADES.forEach((up, i) => {
      const lvl = progress.levels[up.id];
      const cost = nextCost(progress, up);
      const btn = document.createElement('button');
      btn.className = 'upgrade';
      btn.disabled = cost === null || progress.bank < cost;
      btn.innerHTML = `
        <span class="key">${i + 1}</span>
        <span class="info"><b>${up.name}</b><small>${up.desc}</small>
          <span class="pips">${'■'.repeat(lvl)}${'□'.repeat(up.costs.length - lvl)}</span></span>
        <span class="cost">${cost === null ? 'MAX' : cost}</span>`;
      noFocus(btn);
      btn.addEventListener('click', () => tryBuy(up));
      list.append(btn);
    });

    levelsBox.innerHTML = '';
    for (const l of LEVELS) {
      const btn = document.createElement('button');
      btn.className = 'lvl';
      btn.textContent = l.n;
      btn.title = l.name;
      btn.disabled = l.n > progress.best;
      btn.classList.toggle('on', l.n === progress.level);
      noFocus(btn);
      btn.addEventListener('click', () => pick(l.n));
      levelsBox.append(btn);
    }
    const chosen = LEVELS[progress.level - 1];
    go.textContent = `Fly Level ${chosen.n}: ${chosen.name} (Enter)`;

    abilitiesBox.innerHTML = Object.entries(ABILITIES)
      .map(([id, a]) => (unlocked(id, progress.best)
        ? `<li><b>${a.name}</b> — ${a.desc}</li>`
        : `<li class="locked">Level ${a.level}: ???</li>`))
      .join('');
  }

  return {
    open() { render(); panel.style.display = 'flex'; },
    close() { panel.style.display = 'none'; },
    handleKeys(input) {
      UPGRADES.forEach((up, i) => {
        if (input.wasPressed(`Digit${i + 1}`) || input.wasPressed(`Numpad${i + 1}`)) tryBuy(up);
      });
      if (input.wasPressed('ArrowLeft') || input.wasPressed('KeyA')) pick(progress.level - 1);
      if (input.wasPressed('ArrowRight') || input.wasPressed('KeyD')) pick(progress.level + 1);
      if (input.wasPressed('Enter') || input.wasPressed('KeyE')) onLeave();
    },
  };
}
