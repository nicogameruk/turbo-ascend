import { ABILITIES, unlocked, activeAbilities, availableAbilities } from './abilities.js';
import { SHOP } from './cosmetics.js';
import { LAST_LEVEL } from './levels.js';

// Upgrades bought in the garage, and the car stats they give.
// Costs are in materials (everything you collect goes into one bank).
// group: which heading it sits under in the garage.
export const UPGRADES = [
  // Car
  { id: 'tank', group: 'Car', name: 'Fuel Tank', desc: 'Turbo lasts longer', costs: [8, 14, 22, 34, 48] },
  { id: 'armor', group: 'Car', name: 'Armour Plates', desc: '+1 heart each', costs: [12, 24, 42] },
  { id: 'thrusters', group: 'Car', name: 'Hover Thrusters', desc: 'Steer faster', costs: [6, 12, 18, 30, 44] },
  { id: 'booster', group: 'Car', name: 'Booster Engine', desc: 'Faster turbo', costs: [10, 20, 36, 52] },
  { id: 'regen', group: 'Car', name: 'Fuel Recycler', desc: 'Turbo fuel refills 30% faster each', costs: [10, 20, 34] },
  { id: 'ram', group: 'Car', name: 'Battering Ram', desc: 'While boosting, crash through enemies without getting hurt', costs: [60] },
  { id: 'cruise', group: 'Car', name: 'Cruise Engine', desc: 'Fly a bit faster all the time, so chasers catch you slower', costs: [18, 36] },
  { id: 'pole', group: 'Car', name: 'Pole Position', desc: 'A perfect start: free turbo burst for 2 / 3.5 / 5 s at the start of every level', costs: [18, 36, 60] },
  { id: 'siphon', group: 'Car', name: 'Fuel Siphon', desc: 'Every piece you grab refills 3% of your turbo fuel each', costs: [14, 28, 44] },
  { id: 'fuelsaver', group: 'Car', name: 'Fuel Saver', desc: 'Turbo burns 10% less fuel each', costs: [12, 24, 40] },
  // Survival
  { id: 'recovery', group: 'Survival', name: 'Shock Absorbers', desc: 'Longer safe time after you get hit', costs: [12, 26] },
  { id: 'autorepair', group: 'Survival', name: 'Auto Repair', desc: 'Fixes 1 heart every 60 / 45 / 30 s', costs: [30, 50, 80] },
  { id: 'startshield', group: 'Survival', name: 'Launch Shield', desc: 'Start every level with a shield for 4 / 7 s', costs: [16, 32] },
  { id: 'lucky', group: 'Survival', name: 'Lucky Charm', desc: '6% chance per level to dodge a hit', costs: [20, 36, 56] },
  { id: 'emergency', group: 'Survival', name: 'Emergency Fuel', desc: 'Getting hit refills 40% / 80% of your turbo fuel', costs: [12, 24] },
  { id: 'emp', group: 'Survival', name: 'EMP Burst', desc: 'Getting hit blasts away enemies close to you', costs: [40] },
  { id: 'battery', group: 'Survival', name: 'Shield Battery', desc: 'A free 1.5 s shield every 30 / 20 / 15 s', costs: [24, 44, 70] },
  { id: 'secondwind', group: 'Survival', name: 'Second Wind', desc: 'Once a level, a 3 / 5 s shield when you\'re down to 1 heart', costs: [22, 40] },
  // Collecting
  { id: 'coil', group: 'Collecting', name: 'Magnet Coil', desc: 'Pulls material in from further away', costs: [12, 22, 36] },
  { id: 'scoop', group: 'Collecting', name: 'Wide Scoop', desc: 'Grab material without touching it exactly', costs: [8, 16, 28] },
  { id: 'scanner', group: 'Collecting', name: 'Material Scanner', desc: 'More material appears', costs: [14, 28, 46] },
  { id: 'headstart', group: 'Collecting', name: 'Head Start', desc: 'Start each level with 3 / 6 / 9 material', costs: [15, 30, 50] },
  { id: 'salvage', group: 'Collecting', name: 'Salvage Kit', desc: '+10% material each when you beat a level', costs: [20, 40, 65] },
  { id: 'coins', group: 'Collecting', name: 'Coin Collector', desc: '+15% coins each', costs: [15, 30, 50] },
  { id: 'portalkey', group: 'Collecting', name: 'Portal Key', desc: 'The portal opens with 10% less material each', costs: [25, 50] },
  { id: 'streak', group: 'Collecting', name: 'Streak Bonus', desc: 'Every 5 pieces grabbed in a row gives +1 / +2 extra', costs: [16, 32] },
  { id: 'goldrush', group: 'Collecting', name: 'Gold Rush', desc: '+1 coin each for every 10 pieces you collect in a level', costs: [18, 36, 60] },
  { id: 'bargain', group: 'Collecting', name: 'Bargain Hunter', desc: 'Shop items cost 10% fewer coins each', costs: [30, 60] },
  // Abilities and bosses
  { id: 'capacitor', group: 'Abilities & Bosses', name: 'Ability Capacitor', desc: 'Your ability recharges 10% faster each', costs: [14, 28, 46] },
  { id: 'coremagnet', group: 'Abilities & Bosses', name: 'Core Catcher', desc: 'Catch blue cores from further away', costs: [10, 22] },
  { id: 'powerbolts', group: 'Abilities & Bosses', name: 'Power Bolts', desc: '25% chance each for a bolt to do double damage', costs: [20, 40] },
  { id: 'bossbreaker', group: 'Abilities & Bosses', name: 'Boss Breaker', desc: 'Bosses start with 10% less health each', costs: [25, 50] },
  { id: 'amplifier', group: 'Abilities & Bosses', name: 'Ability Amplifier', desc: 'Your ability lasts 20% longer each', costs: [16, 32] },
  { id: 'corerain', group: 'Abilities & Bosses', name: 'Core Rain', desc: 'Bosses drop blue cores 20% more often each', costs: [18, 36] },
  { id: 'combo', group: 'Abilities & Bosses', name: 'Combo Charge', desc: 'Every piece you grab makes your ability recharge 0.15 s sooner each', costs: [16, 32, 50] },
  { id: 'spikes', group: 'Abilities & Bosses', name: 'Spiked Hull', desc: 'When a boss fight hit lands on you, the boss takes 1 / 2 damage too', costs: [30, 55] },
  { id: 'bounty', group: 'Abilities & Bosses', name: 'Bounty Hunter', desc: '+25% boss reward each', costs: [20, 40] },
];

// Touch-screen controls by default on phones and tablets.
const isTouchDevice = () => typeof matchMedia === 'function' && matchMedia('(hover: none) and (pointer: coarse)').matches;
export const DEFAULT_SETTINGS = { volume: 0.7, music: true, sfx: true, controls: isTouchDevice() ? 'touch' : 'keyboard', graphics: 'high' };

export function createProgress() {
  return {
    bank: 0, // materials to spend on upgrades
    coins: 0, // coins to spend in the shop
    best: 1, // highest level unlocked
    level: 1, // level to fly next
    levels: Object.fromEntries(UPGRADES.map((u) => [u.id, 0])),
    // Shop items: the first item of every kind is free.
    owned: Object.fromEntries(Object.entries(SHOP).map(([k, items]) => [k, [items[0].id]])),
    equipped: Object.fromEntries(Object.entries(SHOP).map(([k, items]) => [k, items[0].id])),
    records: {}, // level number -> best clear time in seconds
    ownedAbilities: [], // abilities bought in the shop
    ability: null, // the equipped active ability (used with B)
    settings: { ...DEFAULT_SETTINGS },
    started: false, // true once a game has been started (shows "Continue")
    name: '', // your racer name, picked when you start a new game
    playerId: '', // random id for the online leaderboard (new for every new game)
    pendingPoints: 0, // leaderboard points not sent yet
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
    graphics: s.graphics === 'low' ? 'low' : 'high',
  };
  progress.started = !!saved.started;
  progress.name = typeof saved.name === 'string' ? saved.name.slice(0, 30) : '';
  progress.playerId = typeof saved.playerId === 'string' && /^[0-9a-f-]{36}$/.test(saved.playerId) ? saved.playerId : '';
  progress.pendingPoints = num(saved.pendingPoints, 0, 1e7, 0);
  return progress;
}

// Shop price in coins after the Bargain Hunter discount.
export const price = (progress, cost) => Math.ceil(cost * (1 - 0.1 * (progress.levels.bargain ?? 0)));

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
    if (progress.coins < price(progress, item.cost)) return false;
    progress.coins -= price(progress, item.cost);
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
    if (progress.coins < price(progress, a.cost)) return false;
    progress.coins -= price(progress, a.cost);
    progress.ownedAbilities.push(id);
  }
  if (!availableAbilities(progress).includes(id)) return false;
  progress.ability = id;
  return true;
}

export function getStats(levels, best = 1) {
  const tankBonus = unlocked('tank', best) ? 1.3 : 1;
  return {
    fuelDrain: 0.35 / ((1 + 0.3 * levels.tank) * tankBonus) * (1 - 0.1 * (levels.fuelsaver ?? 0)),
    fuelBarScale: Math.min(2.2, (1 + 0.2 * levels.tank) * (tankBonus > 1 ? 1.15 : 1)),
    maxHealth: 3 + levels.armor + (unlocked('armor', best) ? 1 : 0),
    steerSpeed: 13 * (1 + 0.12 * levels.thrusters),
    boostSpeed: 85 + 10 * levels.booster,
    magnet: (unlocked('magnet', best) ? 9 : 0) + 3 * levels.coil,
    refill: 0.15 * (1 + 0.3 * levels.regen),
    ram: levels.ram > 0,
    invuln: 1.5 + 0.5 * levels.recovery,
    repairEvery: [0, 60, 45, 30][levels.autorepair],
    startShield: [0, 4, 7][levels.startshield],
    dodge: 0.06 * levels.lucky,
    collect: 1.9 + 0.45 * levels.scoop,
    spawnMult: 1 - 0.15 * levels.scanner,
    headStart: 3 * levels.headstart,
    matMult: 1 + 0.1 * levels.salvage,
    coinMult: 1 + 0.15 * levels.coins,
    cooldownMult: 1 - 0.1 * levels.capacitor,
    coreRadius: 2 + 0.7 * levels.coremagnet,
    powerBolt: 0.25 * levels.powerbolts,
    bossHpMult: 1 - 0.1 * levels.bossbreaker,
    cruise: 4 * levels.cruise,
    emergencyFuel: 0.4 * levels.emergency,
    emp: levels.emp > 0,
    secondWind: [0, 3, 5][levels.secondwind],
    goalMult: 1 - 0.1 * levels.portalkey,
    streakBonus: levels.streak,
    durationMult: 1 + 0.2 * levels.amplifier,
    coreEvery: 2 * (1 - 0.2 * levels.corerain),
    bountyMult: 1 + 0.25 * levels.bounty,
    poleBoost: [0, 2, 3.5, 5][levels.pole ?? 0],
    siphon: 0.03 * (levels.siphon ?? 0),
    batteryEvery: [0, 30, 20, 15][levels.battery ?? 0],
    goldRush: levels.goldrush ?? 0,
    combo: 0.15 * (levels.combo ?? 0),
    spikes: levels.spikes ?? 0,
  };
}
