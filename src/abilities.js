// One new ability per level (see levels.js). Passive ones are always on once
// unlocked; active ones are used with Shift, and Q switches between them.
export const ABILITIES = {
  boost: { name: 'Turbo Boost', desc: 'Space: turbo boost', level: 1 },
  tank: { name: 'Big Fuel Tank', desc: 'Passive: turbo lasts 30% longer', level: 2 },
  armor: { name: 'Hard Shell', desc: 'Passive: +1 heart (takes 2 hits)', level: 3 },
  shield: { name: 'Shield Bubble', desc: 'Shift: block all hits for 3 s', level: 4, active: true, cooldown: 10, duration: 3 },
  magnet: { name: 'Material Magnet', desc: 'Passive: pulls in nearby material', level: 5 },
  dash: { name: 'Invincible Dash', desc: 'Shift: quick dash, nothing can touch you', level: 6, active: true, cooldown: 4, duration: 0.6 },
  blast: { name: 'Light Blast', desc: 'Shift: wipe out enemies and shots nearby', level: 7, active: true, cooldown: 14, duration: 0.6 },
  warp: { name: 'Warp Jump', desc: 'Shift: warp ahead, untouchable, shots vanish', level: 8, active: true, cooldown: 9, duration: 0.9 },
  gravity: { name: 'Gravity Pull', desc: 'Shift: suck in all material and crush enemies near you', level: 9, active: true, cooldown: 12, duration: 0.8 },
  hack: { name: 'Hack', desc: 'Shift: freeze every enemy and shot for 4 s', level: 10, active: true, cooldown: 15, duration: 4 },
  slowtime: { name: 'Slow Time', desc: 'Shift: everything but you slows down for 5 s', level: 11, active: true, cooldown: 15, duration: 5 },
  firebreath: { name: 'Fire Breath', desc: 'Shift: breathe fire ahead, burning enemies and shots', level: 12, active: true, cooldown: 10, duration: 1.6 },
  rainbow: { name: 'Rainbow Shield', desc: 'Shift: 6 s shield that destroys whatever it touches', level: 13, active: true, cooldown: 16, duration: 6 },
  cosmic: { name: 'Cosmic Power', desc: 'Passive: every ability recharges twice as fast and lasts longer', level: 14 },
};

export const unlocked = (id, best) => ABILITIES[id].level <= best;
export const activeAbilities = (best) => Object.keys(ABILITIES).filter((id) => ABILITIES[id].active && unlocked(id, best));

// Cosmic Power (level 14) makes every active ability better.
export const abilityCooldown = (id, best) => ABILITIES[id].cooldown * (unlocked('cosmic', best) ? 0.5 : 1);
export const abilityDuration = (id, best) => ABILITIES[id].duration * (unlocked('cosmic', best) ? 1.5 : 1);
