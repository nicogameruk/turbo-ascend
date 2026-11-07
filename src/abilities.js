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
};

export const unlocked = (id, best) => ABILITIES[id].level <= best;
export const activeAbilities = (best) => Object.keys(ABILITIES).filter((id) => ABILITIES[id].active && unlocked(id, best));
