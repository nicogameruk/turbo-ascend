// One new ability per level (see levels.js), plus extra ones bought with coins in the shop.
// Passive ones are always on once unlocked. You equip ONE active ability in the garage
// shop between rounds, and use it with B (or the ABILITY button on touch screens).
export const ABILITIES = {
  boost: { name: 'Turbo Boost', desc: 'Space: turbo boost', level: 1 },
  tank: { name: 'Big Fuel Tank', desc: 'Passive: turbo lasts 30% longer', level: 2 },
  armor: { name: 'Hard Shell', desc: 'Passive: +1 heart (takes 2 hits)', level: 3 },
  shield: { name: 'Shield Bubble', desc: 'Block all hits for 3 s', level: 4, active: true, cooldown: 10, duration: 3 },
  magnet: { name: 'Material Magnet', desc: 'Passive: pulls in nearby material', level: 5 },
  dash: { name: 'Invincible Dash', desc: 'Quick dash, nothing can touch you', level: 6, active: true, cooldown: 4, duration: 0.6 },
  blast: { name: 'Light Blast', desc: 'Wipe out enemies and shots nearby', level: 7, active: true, cooldown: 14, duration: 0.6 },
  warp: { name: 'Warp Jump', desc: 'Warp ahead, untouchable, shots vanish', level: 8, active: true, cooldown: 9, duration: 0.9 },
  gravity: { name: 'Gravity Pull', desc: 'Suck in all material and crush enemies near you', level: 9, active: true, cooldown: 12, duration: 0.8 },
  hack: { name: 'Hack', desc: 'Freeze every enemy and shot for 4 s', level: 10, active: true, cooldown: 15, duration: 4 },
  slowtime: { name: 'Slow Time', desc: 'Everything but you slows down for 5 s', level: 11, active: true, cooldown: 15, duration: 5 },
  firebreath: { name: 'Fire Breath', desc: 'Breathe fire ahead, burning enemies and shots', level: 12, active: true, cooldown: 10, duration: 1.6 },
  rainbow: { name: 'Rainbow Shield', desc: '6 s shield that destroys whatever it touches', level: 13, active: true, cooldown: 16, duration: 6 },
  cosmic: { name: 'Cosmic Power', desc: 'Passive: every ability recharges twice as fast and lasts longer', level: 14 },
  tidal: { name: 'Tidal Wave', desc: 'A huge wave wipes out enemies and shots ahead', level: 15, active: true, cooldown: 12, duration: 1 },
  sugarrush: { name: 'Sugar Rush', desc: 'Free super boost and double material for 5 s', level: 16, active: true, cooldown: 18, duration: 5 },
  meteorstrike: { name: 'Meteor Strike', desc: 'Call meteors down on up to 6 enemies (2 hit the boss)', level: 17, active: true, cooldown: 14 },
  icewall: { name: 'Ice Wall', desc: 'An ice wall in front of you blocks every shot for 5 s', level: 18, active: true, cooldown: 15, duration: 5 },
  phantom: { name: 'Phantom', desc: 'Turn into a ghost for 4 s: nothing can hit you', level: 19, active: true, cooldown: 16, duration: 4 },
  helperdrones: { name: 'Helper Drones', desc: 'Two drones fly with you for 8 s and shoot enemies', level: 20, active: true, cooldown: 18, duration: 8 },
  vinegrab: { name: 'Vine Grab', desc: 'Grab all material on screen and slow enemies for 3 s', level: 21, active: true, cooldown: 14, duration: 3 },
  thunder: { name: 'Thunderstrike', desc: 'Lightning zaps up to 8 enemies (and hits the boss twice)', level: 22, active: true, cooldown: 14 },
  dreamheal: { name: 'Sweet Dreams', desc: 'Heal 2 hearts', level: 23, active: true, cooldown: 30 },
  omega: { name: 'Omega Beam', desc: 'A giant beam melts everything ahead, boss included, for 2 s', level: 24, active: true, cooldown: 20, duration: 2 },

  // Bought in the shop with coins.
  nitro: { name: 'Nitro', desc: 'Full fuel and a free super boost for 2.5 s', active: true, shop: true, cost: 40, cooldown: 14, duration: 2.5 },
  repair: { name: 'Repair Kit', desc: 'Fix 1 heart', active: true, shop: true, cost: 60, cooldown: 25 },
  doubleup: { name: 'Double Up', desc: 'Material counts double for 8 s', active: true, shop: true, cost: 70, cooldown: 22, duration: 8 },
  missiles: { name: 'Homing Missiles', desc: 'Fire 4 missiles at the nearest enemies (one hits the boss)', active: true, shop: true, cost: 90, cooldown: 12 },
};

export const SHOP_ABILITIES = Object.keys(ABILITIES).filter((id) => ABILITIES[id].shop);

export const unlocked = (id, best) => ABILITIES[id].level <= best;
export const activeAbilities = (best) => Object.keys(ABILITIES).filter((id) => ABILITIES[id].active && unlocked(id, best));
// Every active ability you can equip: unlocked by levels, or bought in the shop.
export const availableAbilities = (progress) => [...activeAbilities(progress.best), ...progress.ownedAbilities];

// Cosmic Power (level 14) makes every active ability better.
export const abilityCooldown = (id, best) => ABILITIES[id].cooldown * (unlocked('cosmic', best) ? 0.5 : 1);
export const abilityDuration = (id, best) => ABILITIES[id].duration * (unlocked('cosmic', best) ? 1.5 : 1);
