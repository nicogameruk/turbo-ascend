import { UPGRADES, nextCost, buy } from './progress.js';

// Garage screen between levels: spend mud on upgrades.
export function createGarage(progress, { onBuy, onLeave }) {
  const panel = document.getElementById('garage');
  const list = document.getElementById('garage-list');
  const bank = document.getElementById('garage-mud');
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

  function render() {
    bank.textContent = progress.mud;
    list.innerHTML = '';
    UPGRADES.forEach((up, i) => {
      const lvl = progress.levels[up.id];
      const cost = nextCost(progress, up);
      const btn = document.createElement('button');
      btn.className = 'upgrade';
      btn.disabled = cost === null || progress.mud < cost;
      btn.innerHTML = `
        <span class="key">${i + 1}</span>
        <span class="info"><b>${up.name}</b><small>${up.desc}</small>
          <span class="pips">${'■'.repeat(lvl)}${'□'.repeat(up.costs.length - lvl)}</span></span>
        <span class="cost">${cost === null ? 'MAX' : `${cost} mud`}</span>`;
      noFocus(btn);
      btn.addEventListener('click', () => tryBuy(up));
      list.append(btn);
    });
  }

  return {
    open() { render(); panel.style.display = 'flex'; },
    close() { panel.style.display = 'none'; },
    handleKeys(input) {
      UPGRADES.forEach((up, i) => {
        if (input.wasPressed(`Digit${i + 1}`) || input.wasPressed(`Numpad${i + 1}`)) tryBuy(up);
      });
      if (input.wasPressed('Enter') || input.wasPressed('KeyE')) onLeave();
    },
  };
}
