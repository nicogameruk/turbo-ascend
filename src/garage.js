import { UPGRADES, nextCost, buy, buyOrEquip, buyOrEquipAbility, price } from './progress.js';
import { LEVELS } from './levels.js';
import { ABILITIES, unlocked, availableAbilities } from './abilities.js';
import { SHOP, SHOP_TABS } from './cosmetics.js';

const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;
export const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;

// Garage between levels: upgrades (materials), the shop (coins) and records.
export function createGarage(progress, { onBuy, onLeave, onPickLevel, onShop, onPreviewHorn, sound }) {
  const panel = document.getElementById('garage');
  const $ = (id) => document.getElementById(id);
  const go = $('garage-go');
  let tab = 'upgrades';
  let shopKind = 'ability';
  const TABS = [{ kind: 'ability', label: 'Ability' }, ...SHOP_TABS];
  // Upgrade sections, like the shop's: one section shows at a time.
  const UPGRADE_GROUPS = [...new Set(UPGRADES.map((u) => u.group))];
  const GROUP_LABELS = { 'Abilities & Bosses': 'Powers' };
  let upgradeGroup = UPGRADE_GROUPS[0];
  const shownUpgrades = () => UPGRADES.filter((u) => u.group === upgradeGroup);

  // Stop buttons taking keyboard focus, so Enter/Space don't trigger them by accident.
  panel.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
  go.addEventListener('click', () => onLeave());
  panel.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => { sound('ui'); tab = b.dataset.tab; render(); }));

  const tryBuy = (up) => {
    if (buy(progress, up)) { sound('buy'); onBuy(up); } else sound('nope');
    render();
  };
  const pick = (n) => {
    if (n < 1 || n > progress.best) return;
    sound('ui');
    onPickLevel(n);
    render();
  };
  const shopItem = (kind, item) => {
    const owned = progress.owned[kind].includes(item.id);
    if (buyOrEquip(progress, kind, item)) {
      sound(owned ? 'ui' : 'buy');
      onShop(kind, item);
      if (kind === 'horn') onPreviewHorn(item.id);
    } else sound('nope');
    render();
  };

  const pickAbility = (id) => {
    const owned = !ABILITIES[id].shop || progress.ownedAbilities.includes(id);
    if (buyOrEquipAbility(progress, id)) { sound(owned ? 'ui' : 'buy'); onShop('ability'); } else sound('nope');
    render();
  };

  const button = (cls, html, onClick, disabled = false) => {
    const b = document.createElement('button');
    b.className = cls;
    b.innerHTML = html;
    b.disabled = disabled;
    b.addEventListener('click', onClick);
    return b;
  };

  function renderUpgrades() {
    const kinds = $('upgrade-kinds');
    kinds.innerHTML = '';
    for (const grp of UPGRADE_GROUPS) {
      // Show how many in the section you can afford right now.
      const affordable = UPGRADES.filter((u) => u.group === grp && nextCost(progress, u) !== null && progress.bank >= nextCost(progress, u)).length;
      const b = button('chip', `${GROUP_LABELS[grp] ?? grp}${affordable ? ` <span class="badge">${affordable}</span>` : ''}`, () => { sound('ui'); upgradeGroup = grp; render(); });
      b.classList.toggle('on', grp === upgradeGroup);
      kinds.append(b);
    }
    const list = $('garage-list');
    list.innerHTML = '';
    shownUpgrades().forEach((up, i) => {
      const lvl = progress.levels[up.id];
      const cost = nextCost(progress, up);
      list.append(button('upgrade', `
        <span class="key">${i < 9 ? i + 1 : '·'}</span>
        <span class="info"><b>${up.name}</b><small>${up.desc}</small>
          <span class="pips">${'■'.repeat(lvl)}${'□'.repeat(up.costs.length - lvl)}</span></span>
        <span class="cost">${cost === null ? 'MAX' : cost}</span>`, () => tryBuy(up), cost === null || progress.bank < cost));
    });

    const levels = $('garage-levels');
    levels.innerHTML = '';
    for (const l of LEVELS) {
      const b = button('lvl', String(l.n), () => pick(l.n), l.n > progress.best);
      b.title = l.name;
      b.classList.toggle('on', l.n === progress.level);
      levels.append(b);
    }
    const eq = progress.ability ? ABILITIES[progress.ability] : null;
    $('garage-abilities').innerHTML = [
      `<li><b>Equipped (B):</b> ${eq ? `${eq.name} — ${eq.desc}` : 'none'} · change it in <b>Shop → Ability</b></li>`,
      ...Object.entries(ABILITIES)
        .filter(([, a]) => !a.active && a.level <= LEVELS.length)
        .map(([id, a]) => (unlocked(id, progress.best)
          ? `<li><b>${a.name}</b> — ${a.desc}</li>`
          : `<li class="locked">Level ${a.level}: ???</li>`)),
    ].join('');
  }

  function renderShop() {
    const tabs = $('shop-kinds');
    tabs.innerHTML = '';
    for (const t of TABS) {
      const b = button('chip', t.label, () => { sound('ui'); shopKind = t.kind; render(); });
      b.classList.toggle('on', t.kind === shopKind);
      tabs.append(b);
    }
    const list = $('shop-list');
    list.innerHTML = '';
    if (shopKind === 'ability') {
      // Pick the one ability you take into the next round: level rewards are free, shop ones cost coins.
      // Order: ones you have, then ones to buy; locked level rewards are summed up in one line.
      const have = availableAbilities(progress);
      const actives = Object.keys(ABILITIES).filter((id) => ABILITIES[id].active);
      const buyable = actives.filter((id) => ABILITIES[id].shop && !have.includes(id));
      const locked = actives.filter((id) => !ABILITIES[id].shop && !have.includes(id));
      for (const id of [...have, ...buyable]) {
        const a = ABILITIES[id];
        const owned = have.includes(id);
        const on = progress.ability === id;
        const right = on ? 'ON' : owned ? 'Use' : `${price(progress, a.cost)} ¢`;
        const b = button('upgrade shop', `<span class="key">${a.shop ? '¢' : '★'}</span><span class="info"><b>${a.name}</b><small>${a.desc}</small></span><span class="cost">${right}</span>`,
          () => pickAbility(id), !owned && progress.coins < price(progress, a.cost));
        b.classList.toggle('on', on);
        list.append(b);
      }
      if (locked.length) {
        const note = document.createElement('p');
        note.className = 'note';
        note.textContent = `★ ${locked.length} more abilities unlock as you beat levels (next one after level ${ABILITIES[locked[0]].level - 1}).`;
        list.append(note);
      }
      return;
    }
    for (const item of SHOP[shopKind]) {
      const owned = progress.owned[shopKind].includes(item.id);
      const equipped = progress.equipped[shopKind] === item.id;
      const swatch = item.icon ?? (shopKind === 'horn' ? '🔊'
        : item.color === null ? '<span class="swatch rainbow"></span>'
          : item.color === undefined ? '<span class="swatch level"></span>'
            : `<span class="swatch${item.metal ? ' metal' : ''}" style="background:${hex(item.color)}"></span>`);
      const right = equipped ? 'ON' : owned ? 'Use' : `${price(progress, item.cost)} ¢`;
      const desc = item.desc ? `<small>${item.desc}</small>` : '';
      const b = button('upgrade shop', `<span class="key">${swatch}</span><span class="info"><b>${item.name}</b>${desc}</span><span class="cost">${right}</span>`,
        () => shopItem(shopKind, item), !owned && progress.coins < price(progress, item.cost));
      b.classList.toggle('on', equipped);
      list.append(b);
    }
  }

  function renderRecords() {
    $('records-list').innerHTML = LEVELS.map((l) => {
      const r = progress.records[l.n];
      const state = l.n > progress.best ? '<span class="dim">locked</span>' : r ? `<b>${formatTime(r)}</b>` : '<span class="dim">not cleared</span>';
      return `<li><span>${l.n}. ${l.name}</span>${state}</li>`;
    }).join('');
  }

  function render() {
    $('garage-mud').textContent = progress.bank;
    $('garage-coins').textContent = progress.coins;
    panel.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    panel.querySelectorAll('.tab-body').forEach((el) => { el.style.display = el.dataset.tab === tab ? 'flex' : 'none'; });
    if (tab === 'upgrades') renderUpgrades();
    if (tab === 'shop') renderShop();
    if (tab === 'records') renderRecords();
    const chosen = LEVELS[progress.level - 1];
    go.textContent = `Fly Level ${chosen.n}: ${chosen.name} (Enter)`;
  }

  return {
    open() { render(); panel.style.display = 'flex'; },
    close() { panel.style.display = 'none'; },
    handleKeys(input) {
      if (tab === 'upgrades') {
        shownUpgrades().forEach((up, i) => {
          if (input.wasPressed(`Digit${i + 1}`) || input.wasPressed(`Numpad${i + 1}`)) tryBuy(up);
        });
      }
      if (input.wasPressed('ArrowLeft') || input.wasPressed('KeyA')) pick(progress.level - 1);
      if (input.wasPressed('ArrowRight') || input.wasPressed('KeyD')) pick(progress.level + 1);
      if (input.wasPressed('Tab')) {
        const order = ['upgrades', 'shop', 'records'];
        tab = order[(order.indexOf(tab) + 1) % order.length];
        sound('ui');
        render();
      }
      if (input.wasPressed('Enter') || input.wasPressed('KeyE')) onLeave();
    },
  };
}
