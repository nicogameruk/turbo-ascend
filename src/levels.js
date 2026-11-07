// Levels 1–7 (the main path). Everything that changes from level to level lives here.
//
// enemies: chasers = drones that follow from behind all level;
//          waves = enemies that turn up every few seconds ([min, max] seconds, max alive at once).
// ability: what the level gives you (see abilities.js).

export const LEVELS = [
  {
    n: 1, name: 'Dirt', material: 'Mud', goal: 20,
    sky: ['#3b86f0', '#cfe8ff'], fog: 0xcfe8ff, hemi: [0xcfe8ff, 0x7a5434],
    ground: { base: '#8a6440', hue: [22, 34], sat: [30, 45], light: [22, 42], furrow: '#4a321c' },
    scenery: { shape: 'rock', color: 0x7a5434 },
    cloud: { color: 0xffffff, emissive: 0x8899aa },
    enemies: { chasers: 1, waves: [] },
    boss: { name: 'SCRAP HAULER', hp: 6, hull: 0x6d5a48, fireEvery: 1.4, extra: null },
    ability: 'boost',
  },
  {
    n: 2, name: 'Grass', material: 'Vines', goal: 22,
    sky: ['#4aa0f0', '#dff5ff'], fog: 0xdff5ff, hemi: [0xe0f4ff, 0x4f7a36],
    ground: { base: '#4f8a36', hue: [95, 125], sat: [35, 55], light: [24, 42], furrow: '#2f5a20' },
    scenery: { shape: 'tree', color: 0x2f7a32 },
    cloud: { color: 0xffffff, emissive: 0x88aa99 },
    enemies: { chasers: 1, waves: [{ type: 'bike', every: [7, 10], max: 1 }] },
    boss: { name: 'THORN HARVESTER', hp: 7, hull: 0x4d6b3a, fireEvery: 1.3, extra: 'vines' },
    ability: 'tank',
  },
  {
    n: 3, name: 'Stone', material: 'Granite', goal: 24,
    sky: ['#6f8fb8', '#dfe6ee'], fog: 0xdfe6ee, hemi: [0xdfe6ee, 0x6d6f73],
    ground: { base: '#7d8085', hue: [205, 220], sat: [3, 10], light: [35, 60], furrow: '#55585c' },
    scenery: { shape: 'rock', color: 0x8a8c90 },
    cloud: { color: 0xf2f4f7, emissive: 0x8890a0 },
    enemies: { chasers: 0, waves: [{ type: 'jet', every: [5, 7], max: 2 }, { type: 'bike', every: [9, 12], max: 1 }] },
    boss: { name: 'POLICE GUNSHIP', hp: 8, hull: 0x2c3d6b, fireEvery: 1.2, extra: 'sirens' },
    ability: 'armor',
  },
  {
    n: 4, name: 'Iron', material: 'Iron Ore', goal: 26,
    sky: ['#4f5866', '#c9ccd2'], fog: 0xc9ccd2, hemi: [0xd0d4dc, 0x4a4440],
    ground: { base: '#4a4440', hue: [12, 25], sat: [10, 25], light: [16, 32], furrow: '#2a2624' },
    scenery: { shape: 'tower', color: 0x5a5d63 },
    cloud: { color: 0xc8ccd2, emissive: 0x555a66 },
    enemies: { chasers: 1, waves: [{ type: 'ufo', every: [6, 8], max: 2 }] },
    boss: { name: 'ALIEN MOTHERSHIP', hp: 9, hull: 0x5d6a78, fireEvery: 1.1, extra: 'saucer' },
    ability: 'shield',
  },
  {
    n: 5, name: 'Gold', material: 'Gold', goal: 28,
    sky: ['#e8902a', '#ffe7a8'], fog: 0xffe7a8, hemi: [0xfff0c8, 0x9a6a20],
    ground: { base: '#d6a542', hue: [38, 48], sat: [60, 80], light: [42, 62], furrow: '#a87a22' },
    scenery: { shape: 'rock', color: 0xd4a23a, metal: true },
    cloud: { color: 0xfff4dc, emissive: 0xaa8855 },
    enemies: {
      chasers: 1,
      waves: [{ type: 'bike', every: [8, 11], max: 1 }, { type: 'jet', every: [7, 10], max: 1 }, { type: 'ufo', every: [7, 10], max: 1 }],
    },
    boss: { name: 'GOLD COLOSSUS', hp: 10, hull: 0xe0b040, metal: true, fireEvery: 1.0, extra: 'gold' },
    ability: 'magnet',
  },
  {
    n: 6, name: 'Diamond', material: 'Diamonds', goal: 30,
    sky: ['#24357f', '#a8f0ff'], fog: 0xa8e8ff, hemi: [0xc8f4ff, 0x3a5a8a],
    ground: { base: '#8fd0e8', hue: [190, 210], sat: [40, 70], light: [48, 78], furrow: '#5aa0c0' },
    scenery: { shape: 'crystal', color: 0x7fe6ff, glow: 0x2290c0 },
    cloud: { color: 0xeefcff, emissive: 0x6699bb },
    enemies: { chasers: 2, waves: [{ type: 'warship', every: [12, 15], max: 1 }, { type: 'sniper', every: [5, 7], max: 2 }] },
    boss: { name: 'CRYSTAL DREADNOUGHT', hp: 11, hull: 0x6fd8f0, fireEvery: 0.95, extra: 'crystal' },
    ability: 'dash',
  },
  {
    n: 7, name: 'Angel', material: 'Halo Feathers', goal: 32,
    sky: ['#ffbf5a', '#fff6e0'], fog: 0xfff3dc, hemi: [0xfff6e0, 0xc8a870],
    ground: { base: '#f3ead2', hue: [40, 50], sat: [20, 50], light: [80, 94], furrow: '#e0cf9e' },
    scenery: { shape: 'pillar', color: 0xf4efe4 },
    cloud: { color: 0xffffff, emissive: 0xccb488 },
    enemies: { chasers: 0, waves: [{ type: 'demon', every: [2.5, 4], max: 4 }] },
    boss: { name: 'DEMON KING', hp: 12, hull: 0x7a1414, fireEvery: 0.85, extra: 'demon' },
    ability: 'blast',
  },
];

export const LAST_LEVEL = LEVELS.length;
export const getLevel = (n) => LEVELS[Math.min(LAST_LEVEL, Math.max(1, n)) - 1];

// Material paid out for beating the boss.
export const bossBonus = (level) => 15 + 5 * (level.n - 1);
