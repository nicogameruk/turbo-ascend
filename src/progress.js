import { unlocked } from './abilities.js';

// Upgrades bought in the garage, and the car stats they give.
// Costs are in materials (everything you collect goes into one bank).
export const UPGRADES = [
  { id: 'tank', name: 'Fuel Tank', desc: 'Turbo lasts longer', costs: [8, 14, 22, 34, 48] },
  { id: 'armor', name: 'Armour Plates', desc: '+1 heart each', costs: [12, 24, 42] },
  { id: 'thrusters', name: 'Hover Thrusters', desc: 'Steer faster', costs: [6, 12, 18, 30, 44] },
  { id: 'booster', name: 'Booster Engine', desc: 'Faster turbo', costs: [10, 20, 36, 52] },
];

export function createProgress() {
  return {
    bank: 0, // materials to spend
    best: 1, // highest level unlocked
    level: 1, // level to fly next
    levels: { tank: 0, armor: 0, thrusters: 0, booster: 0 },
  };
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
