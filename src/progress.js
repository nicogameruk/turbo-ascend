import { ABILITIES, unlocked, activeAbilities, availableAbilities } from './abilities.js';
import { SHOP } from './cosmetics.js';
import { LAST_LEVEL } from './levels.js';

// Upgrades bought in the garage, and the car stats they give.
// Costs are in materials (everything you collect goes into one bank).
export const UPGRADES = [
  { id: 'tank', name: 'Fuel Tank', desc: 'Turbo lasts longer', costs: [8, 14, 22, 34, 48] },
  { id: 'armor', name: 'Armour Plates', desc: '+1 heart each', costs: [12, 24, 42] },
  { id: 'thrusters', name: 'Hover Thrusters', desc: 'Steer faster', costs: [6, 12, 18, 30, 44] },
  { id: 'booster', name: 'Booster Engine', desc: 'Faster turbo', costs: [10, 20, 36, 52] },
];

// Touch-screen controls by default on phones and tablets.
const isTouchDevice = () => typeof matchMedia === 'function' && matchMedia('(hover: none) and (pointer: coarse)').matches;
export const DEFAULT_SETTINGS = { volume: 0.7, music: true, sfx: true, controls: isTouchDevice() ? 'touch' : 'keyboard' };

export function createProgress() {
  return {
    bank: 0, // materials to spend on upgrades
    coins: 0, // coins to spend in the shop
    best: 1, // highest level unlocked
    level: 1, // level to fly next
    levels: { tank: 0, armor: 0, thrusters: 0, booster: 0 },
    owned: { paint: ['level'], trail: ['blue'], horn: ['beep'] },
    equipped: { paint: 'level', trail: 'blue', horn: 'beep' },
    records: {}, // level number -> best clear time in seconds
    ownedAbilities: [], // abilities bought in the shop
    ability: null, // the equipped active ability (used with B)
    settings: { ...DEFAULT_SETTINGS },
    started: false, // true once a game has been started (shows "Continue")
  };
}

// Load saved data on top of a fresh progress object, ignoring anything odd.
export function restoreProgress(progress, saved) {
  if (!saved || typeof saved !== 'object') return progress;
  const num = (v, min, max, d) => (Number.isFinite(v) ? Math.min(max, Math.max(min, Math.floor(v))) : d);
  progress.bank = num(saved.bank, 0, 1e7, 0);
  progress.coins = num(saved.coins, 0, 1e7, 0);
  progress.best = num(saved.best, 1, LAST_LEVEL, 1);
  progress.level = num(saved.level, 1, progress.best, progress.best);
  for (const up of UPGRADES) progress.levels[up.id] = num(saved.levels?.[up.id], 0, up.costs.length, 0);
  for (const kind of Object.keys(SHOP)) {
    const ids = SHOP[kind].map((i) => i.id);
    const owned = (saved.owned?.[kind] ?? []).filter((id) => ids.includes(id));
    progress.owned[kind] = [...new Set([ids[0], ...owned])];
    const eq = saved.equipped?.[kind];
    progress.equipped[kind] = progress.owned[kind].includes(eq) ? eq : ids[0];
  }
  for (const [k, v] of Object.entries(saved.records ?? {})) {
    if (Number(k) >= 1 && Number(k) <= LAST_LEVEL && Number.isFinite(v) && v > 0) progress.records[k] = v;
  }
  progress.ownedAbilities = (saved.ownedAbilities ?? []).filter((id) => ABILITIES[id]?.shop);
  progress.ability = availableAbilities(progress).includes(saved.ability) ? saved.ability : activeAbilities(progress.best).at(-1) ?? null;
  const s = saved.settings ?? {};
  progress.settings = {
    volume: Number.isFinite(s.volume) ? Math.min(1, Math.max(0, s.volume)) : DEFAULT_SETTINGS.volume,
    music: s.music !== false,
    sfx: s.sfx !== false,
    controls: s.controls === 'touch' || s.controls === 'keyboard' ? s.controls : DEFAULT_SETTINGS.controls,
  };
  progress.started = !!saved.started;
  return progress;
}

// Cost of the next level of an upgrade, or null when it's maxed out.
export function nextCost(progress, up) {
  const lvl = progress.levels[up.id];
  return lvl < up.costs.length ? up.costs[lvl] : null;
}

export function buy(progress, up) {
  const cost = nextCost(progress, up);
  if (cost === null || progress.bank < cost) return false;
  progress.bank -= cost;
  progress.levels[up.id] += 1;
  return true;
}

// Shop: buy an item if needed, then equip it. Returns true if anything changed.
export function buyOrEquip(progress, kind, item) {
  const owned = progress.owned[kind].includes(item.id);
  if (!owned) {
    if (progress.coins < item.cost) return false;
    progress.coins -= item.cost;
    progress.owned[kind].push(item.id);
  }
  progress.equipped[kind] = item.id;
  return true;
}

// Shop: buy an ability with coins if needed, then equip it.
export function buyOrEquipAbility(progress, id) {
  const a = ABILITIES[id];
  if (!a?.active) return false;
  if (a.shop && !progress.ownedAbilities.includes(id)) {
    if (progress.coins < a.cost) return false;
    progress.coins -= a.cost;
    progress.ownedAbilities.push(id);
  }
  if (!availableAbilities(progress).includes(id)) return false;
  progress.ability = id;
  return true;
}

export function getStats(levels, best = 1) {
  const tankBonus = unlocked('tank', best) ? 1.3 : 1;
  return {
    fuelDrain: 0.35 / ((1 + 0.3 * levels.tank) * tankBonus),
    fuelBarScale: Math.min(2.2, (1 + 0.2 * levels.tank) * (tankBonus > 1 ? 1.15 : 1)),
    maxHealth: 3 + levels.armor + (unlocked('armor', best) ? 1 : 0),
    steerSpeed: 13 * (1 + 0.12 * levels.thrusters),
    boostSpeed: 85 + 10 * levels.booster,
    magnet: unlocked('magnet', best) ? 9 : 0,
  };
}
