// Upgrades bought in the garage, and the car stats they give.
export const UPGRADES = [
  { id: 'tank', name: 'Fuel Tank', desc: 'Turbo lasts longer', costs: [8, 14, 22] },
  { id: 'armor', name: 'Armour Plates', desc: '+1 heart each', costs: [12, 24] },
  { id: 'thrusters', name: 'Hover Thrusters', desc: 'Steer faster', costs: [6, 12, 18] },
  { id: 'booster', name: 'Booster Engine', desc: 'Faster turbo', costs: [10, 20] },
];

export function createProgress() {
  return { mud: 0, levels: { tank: 0, armor: 0, thrusters: 0, booster: 0 } };
}

// Cost of the next level of an upgrade, or null when it's maxed out.
export function nextCost(progress, up) {
  const lvl = progress.levels[up.id];
  return lvl < up.costs.length ? up.costs[lvl] : null;
}

export function buy(progress, up) {
  const cost = nextCost(progress, up);
  if (cost === null || progress.mud < cost) return false;
  progress.mud -= cost;
  progress.levels[up.id] += 1;
  return true;
}

export function getStats(levels) {
  return {
    fuelDrain: 0.35 / (1 + 0.35 * levels.tank),
    fuelBarScale: 1 + 0.25 * levels.tank,
    maxHealth: 3 + levels.armor,
    steerSpeed: 13 * (1 + 0.15 * levels.thrusters),
    boostSpeed: 85 + 12 * levels.booster,
  };
}
