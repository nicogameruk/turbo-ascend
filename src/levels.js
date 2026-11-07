// All 14 levels. Everything that changes from level to level lives here.
//
// enemies: chasers = drones that follow from behind all level;
//          waves = enemies that turn up every few seconds ([min, max] seconds, max alive at once).
// hazards: obstacles that aren't enemies (meteor, lightning, lava, asteroid).
// space: no ground, stars instead. landmark: a big object in the distant sky.
// music: root note (MIDI), scale, tempo and lead sound for the level's tune.
// ability: what the level gives you (see abilities.js).

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const PENTA = [0, 2, 4, 7, 9];
const MINPENTA = [0, 3, 5, 7, 10];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];

export const LEVELS = [
  {
    n: 1, name: 'Dirt', material: 'Mud', goal: 20,
    sky: ['#3b86f0', '#cfe8ff'], sky2: ['#e8784a', '#ffd9a8'], fog: 0xcfe8ff, hemi: [0xcfe8ff, 0x7a5434],
    ground: { base: '#8a6440', hue: [22, 34], sat: [30, 45], light: [22, 42], furrow: '#4a321c' },
    scenery: { shape: 'rock', color: 0x7a5434 },
    cloud: { color: 0xffffff, emissive: 0x8899aa },
    enemies: { chasers: 1, waves: [] },
    hazards: [],
    boss: { name: 'SCRAP HAULER', hp: 6, hull: 0x6d5a48, fireEvery: 1.4, extra: null },
    music: { root: 45, scale: PENTA, tempo: 112, lead: 'square' },
    ability: 'boost',
  },
  {
    n: 2, name: 'Grass', material: 'Vines', goal: 22,
    sky: ['#4aa0f0', '#dff5ff'], sky2: ['#5a7ad8', '#ffe2b8'], fog: 0xdff5ff, hemi: [0xe0f4ff, 0x4f7a36],
    ground: { base: '#4f8a36', hue: [95, 125], sat: [35, 55], light: [24, 42], furrow: '#2f5a20' },
    scenery: { shape: 'tree', color: 0x2f7a32 },
    cloud: { color: 0xffffff, emissive: 0x88aa99 },
    enemies: { chasers: 1, waves: [{ type: 'bike', every: [7, 10], max: 1 }] },
    hazards: [],
    boss: { name: 'THORN HARVESTER', hp: 7, hull: 0x4d6b3a, fireEvery: 1.3, extra: 'vines' },
    music: { root: 48, scale: MAJOR, tempo: 118, lead: 'triangle' },
    ability: 'tank',
  },
  {
    n: 3, name: 'Stone', material: 'Granite', goal: 24,
    sky: ['#6f8fb8', '#dfe6ee'], sky2: ['#4a5878', '#c8b8a8'], fog: 0xdfe6ee, hemi: [0xdfe6ee, 0x6d6f73],
    ground: { base: '#7d8085', hue: [205, 220], sat: [3, 10], light: [35, 60], furrow: '#55585c' },
    scenery: { shape: 'rock', color: 0x8a8c90 },
    cloud: { color: 0xf2f4f7, emissive: 0x8890a0 },
    enemies: { chasers: 0, waves: [{ type: 'jet', every: [5, 7], max: 2 }, { type: 'bike', every: [9, 12], max: 1 }] },
    hazards: [{ type: 'meteor', every: [6, 9] }],
    boss: { name: 'POLICE GUNSHIP', hp: 8, hull: 0x2c3d6b, fireEvery: 1.2, extra: 'sirens' },
    music: { root: 43, scale: DORIAN, tempo: 124, lead: 'sawtooth' },
    ability: 'armor',
  },
  {
    n: 4, name: 'Iron', material: 'Iron Ore', goal: 26,
    sky: ['#4f5866', '#c9ccd2'], sky2: ['#2a2e38', '#a89a8a'], fog: 0xc9ccd2, hemi: [0xd0d4dc, 0x4a4440],
    ground: { base: '#4a4440', hue: [12, 25], sat: [10, 25], light: [16, 32], furrow: '#2a2624' },
    scenery: { shape: 'tower', color: 0x5a5d63 },
    cloud: { color: 0xc8ccd2, emissive: 0x555a66 },
    enemies: { chasers: 1, waves: [{ type: 'ufo', every: [6, 8], max: 2 }] },
    hazards: [{ type: 'lightning', every: [5, 8] }],
    boss: { name: 'ALIEN MOTHERSHIP', hp: 9, hull: 0x5d6a78, fireEvery: 1.1, extra: 'saucer' },
    music: { root: 40, scale: MINOR, tempo: 128, lead: 'square' },
    ability: 'shield',
  },
  {
    n: 5, name: 'Gold', material: 'Gold', goal: 28,
    sky: ['#e8902a', '#ffe7a8'], sky2: ['#c8502a', '#ffc890'], fog: 0xffe7a8, hemi: [0xfff0c8, 0x9a6a20],
    ground: { base: '#d6a542', hue: [38, 48], sat: [60, 80], light: [42, 62], furrow: '#a87a22' },
    scenery: { shape: 'rock', color: 0xd4a23a, metal: true },
    cloud: { color: 0xfff4dc, emissive: 0xaa8855 },
    enemies: {
      chasers: 1,
      waves: [{ type: 'bike', every: [8, 11], max: 1 }, { type: 'jet', every: [7, 10], max: 1 }, { type: 'ufo', every: [7, 10], max: 1 }],
    },
    hazards: [{ type: 'lightning', every: [6, 9] }],
    boss: { name: 'GOLD COLOSSUS', hp: 10, hull: 0xe0b040, metal: true, fireEvery: 1.0, extra: 'gold' },
    music: { root: 50, scale: LYDIAN, tempo: 132, lead: 'triangle' },
    ability: 'magnet',
  },
  {
    n: 6, name: 'Diamond', material: 'Diamonds', goal: 30,
    sky: ['#24357f', '#a8f0ff'], sky2: ['#3a1a7f', '#f0b8ff'], fog: 0xa8e8ff, hemi: [0xc8f4ff, 0x3a5a8a],
    ground: { base: '#8fd0e8', hue: [190, 210], sat: [40, 70], light: [48, 78], furrow: '#5aa0c0' },
    scenery: { shape: 'crystal', color: 0x7fe6ff, glow: 0x2290c0 },
    cloud: { color: 0xeefcff, emissive: 0x6699bb },
    enemies: { chasers: 2, waves: [{ type: 'warship', every: [12, 15], max: 1 }, { type: 'sniper', every: [5, 7], max: 2 }] },
    hazards: [{ type: 'meteor', every: [5, 8] }],
    boss: { name: 'CRYSTAL DREADNOUGHT', hp: 11, hull: 0x6fd8f0, fireEvery: 0.95, extra: 'crystal' },
    music: { root: 52, scale: MAJOR, tempo: 136, lead: 'sine' },
    ability: 'dash',
  },
  {
    n: 7, name: 'Angel', material: 'Halo Feathers', goal: 32,
    sky: ['#ffbf5a', '#fff6e0'], sky2: ['#ff7a5a', '#ffe0c8'], fog: 0xfff3dc, hemi: [0xfff6e0, 0xc8a870],
    ground: { base: '#f3ead2', hue: [40, 50], sat: [20, 50], light: [80, 94], furrow: '#e0cf9e' },
    scenery: { shape: 'pillar', color: 0xf4efe4 },
    cloud: { color: 0xffffff, emissive: 0xccb488 },
    enemies: { chasers: 0, waves: [{ type: 'demon', every: [2.5, 4], max: 4 }] },
    hazards: [{ type: 'lava', every: [8, 11] }],
    boss: { name: 'DEMON KING', hp: 12, hull: 0x7a1414, fireEvery: 0.85, extra: 'demon' },
    music: { root: 53, scale: MAJOR, tempo: 104, lead: 'sine' },
    ability: 'blast',
  },
  // ---- After Angel: the cosmic levels ----
  {
    n: 8, name: 'Galaxy', material: 'Star Shards', goal: 34, space: true, landmark: 'planet',
    sky: ['#0a0420', '#4a1a7a'], sky2: ['#1a0440', '#8a2a8a'], fog: 0x2a1048, hemi: [0xb8a0ff, 0x2a1048],
    ground: null,
    scenery: { shape: 'rock', color: 0x5a4a7a, float: true },
    cloud: { color: 0x9a6aff, emissive: 0x4a2a8a, opacity: 0.35 },
    enemies: { chasers: 0, waves: [{ type: 'pirate', every: [5, 7], max: 2 }] },
    hazards: [{ type: 'asteroid', every: [1.2, 2.2] }],
    boss: { name: 'PIRATE FLAGSHIP', hp: 13, hull: 0x2a1a3a, fireEvery: 0.85, extra: 'pirate', patterns: ['ring'] },
    music: { root: 45, scale: DORIAN, tempo: 126, lead: 'sawtooth' },
    ability: 'warp',
  },
  {
    n: 9, name: 'Black Hole', material: 'Dark Matter', goal: 36, space: true, landmark: 'blackhole',
    sky: ['#000000', '#1a0f2a'], sky2: ['#000000', '#3a1a1a'], fog: 0x0a0612, hemi: [0x8a7aa8, 0x100818],
    ground: null,
    scenery: { shape: 'rock', color: 0x2a2030, float: true, glow: 0x3a1050 },
    cloud: { color: 0x3a2a5a, emissive: 0x1a0a2a, opacity: 0.3 },
    enemies: { chasers: 1, waves: [{ type: 'void', every: [5, 7], max: 2 }] },
    hazards: [{ type: 'meteor', every: [5, 7] }],
    boss: { name: 'VOID LEVIATHAN', hp: 14, hull: 0x14101c, fireEvery: 0.8, extra: 'void', patterns: ['ring', 'pull'] },
    music: { root: 38, scale: PHRYGIAN, tempo: 96, lead: 'sine' },
    ability: 'gravity',
  },
  {
    n: 10, name: 'Neon Cyber', material: 'Data Cores', goal: 38, landmark: 'sun',
    sky: ['#05020f', '#3a0a5a'], sky2: ['#0a0220', '#6a0a5a'], fog: 0x1a0630, hemi: [0xff6ad8, 0x1a0630],
    ground: { style: 'grid', base: '#07020f', line: '#ff2ad8', line2: '#2af0ff' },
    scenery: { shape: 'tower', color: 0x101828, glow: 0x00d8ff },
    cloud: { color: 0x3a1a6a, emissive: 0x6a1a8a, opacity: 0.25 },
    enemies: { chasers: 1, waves: [{ type: 'glitch', every: [4, 6], max: 3 }] },
    hazards: [{ type: 'lightning', every: [4, 6] }],
    boss: { name: 'GLITCH CORE', hp: 15, hull: 0x101828, fireEvery: 0.75, extra: 'glitch', patterns: ['ring', 'teleport'] },
    music: { root: 45, scale: MINOR, tempo: 140, lead: 'square' },
    ability: 'hack',
  },
  {
    n: 11, name: 'Time Warp', material: 'Time Crystals', goal: 40,
    sky: ['#3a2a10', '#c8a060'], sky2: ['#2a3a5a', '#a0c8c8'], fog: 0xb89060, hemi: [0xffe0b0, 0x5a4020],
    ground: { base: '#8a6a40', hue: [30, 45], sat: [30, 50], light: [30, 55], furrow: '#5a4020' },
    scenery: { shape: 'pillar', color: 0xb08a50, metal: true, float: true },
    cloud: { color: 0xe8d0a0, emissive: 0x8a6a3a },
    enemies: {
      chasers: 1,
      waves: [
        { type: 'bike', every: [9, 12], max: 1 }, { type: 'jet', every: [8, 11], max: 1 }, { type: 'ufo', every: [8, 11], max: 1 },
        { type: 'sniper', every: [9, 12], max: 1 }, { type: 'demon', every: [4, 6], max: 2 }, { type: 'pirate', every: [9, 12], max: 1 },
      ],
    },
    hazards: [{ type: 'meteor', every: [7, 10] }, { type: 'lightning', every: [7, 10] }],
    boss: { name: 'CHRONO TITAN', hp: 16, hull: 0x8a6a30, metal: true, fireEvery: 0.75, extra: 'chrono', patterns: ['ring', 'slow'] },
    music: { root: 47, scale: DORIAN, tempo: 120, lead: 'triangle' },
    ability: 'slowtime',
  },
  {
    n: 12, name: 'Dragon Realm', material: 'Dragon Scales', goal: 42, landmark: 'volcano',
    sky: ['#3a0a05', '#ff7a3a'], sky2: ['#1a0202', '#c83a1a'], fog: 0x8a2a10, hemi: [0xffb080, 0x3a0a05],
    ground: { base: '#2a1a14', hue: [5, 20], sat: [20, 40], light: [10, 22], furrow: '#ff5a10' },
    scenery: { shape: 'spire', color: 0x2a1a18 },
    cloud: { color: 0x5a3a30, emissive: 0x8a2a10 },
    enemies: { chasers: 0, waves: [{ type: 'dragon', every: [5, 7], max: 2 }, { type: 'demon', every: [5, 7], max: 2 }] },
    hazards: [{ type: 'lava', every: [7, 10] }, { type: 'meteor', every: [6, 9] }],
    boss: { name: 'ELDER DRAGON', hp: 17, hull: 0x5a1a10, fireEvery: 0.7, extra: 'dragon', patterns: ['ring', 'breath'] },
    music: { root: 40, scale: PHRYGIAN, tempo: 132, lead: 'sawtooth' },
    ability: 'firebreath',
  },
  {
    n: 13, name: 'Rainbow Prism', material: 'Prism Gems', goal: 44,
    sky: ['#ff9ad5', '#9ae8ff'], sky2: ['#9a8aff', '#ffe89a'], fog: 0xe8d8ff, hemi: [0xffffff, 0xb8a8ff],
    ground: { base: '#e8d8ff', hue: [0, 360], sat: [60, 80], light: [70, 85], furrow: '#ffffff' },
    scenery: { shape: 'crystal', color: 0xf0e8ff, glow: 0xa060ff },
    cloud: { color: 0xffffff, emissive: 0xc8a8ff },
    enemies: { chasers: 0, waves: [{ type: 'spirit', every: [3, 4.5], max: 3 }, { type: 'glitch', every: [8, 11], max: 1 }] },
    hazards: [{ type: 'lightning', every: [6, 8] }],
    boss: { name: 'PRISM WRAITH', hp: 18, hull: 0xe8e0ff, fireEvery: 0.65, extra: 'prism', patterns: ['ring', 'teleport'] },
    music: { root: 55, scale: LYDIAN, tempo: 128, lead: 'sine' },
    ability: 'rainbow',
  },
  {
    n: 14, name: 'Cosmic God', material: 'Cosmic Cores', goal: 46, space: true, landmark: 'galaxy',
    sky: ['#000010', '#2a3a8a'], sky2: ['#100020', '#8a3a8a'], fog: 0x101838, hemi: [0xd0d8ff, 0x101838],
    ground: null,
    scenery: { shape: 'crystal', color: 0xffe8a0, float: true, glow: 0xc89020 },
    cloud: { color: 0x6a7aff, emissive: 0x3a2a8a, opacity: 0.3 },
    enemies: {
      chasers: 1,
      waves: [{ type: 'spirit', every: [6, 8], max: 2 }, { type: 'dragon', every: [9, 12], max: 1 }, { type: 'void', every: [9, 12], max: 1 }, { type: 'pirate', every: [8, 11], max: 1 }],
    },
    hazards: [{ type: 'asteroid', every: [2, 3.5] }, { type: 'lightning', every: [8, 11] }],
    boss: { name: 'UNIVERSE EATER', hp: 30, hull: 0x1a0a2a, fireEvery: 0.7, extra: 'eater', final: true, patterns: ['ring', 'minions', 'pull'] },
    music: { root: 41, scale: MINOR, tempo: 144, lead: 'sawtooth' },
    ability: 'cosmic',
  },
];

export const LAST_LEVEL = LEVELS.length;
export const getLevel = (n) => LEVELS[Math.min(LAST_LEVEL, Math.max(1, n)) - 1];

// Material paid out for beating the boss.
export const bossBonus = (level) => 15 + 5 * (level.n - 1);
// Coins for a run: some for distance, more for winning.
export const runCoins = (level, meters, won) => Math.floor(meters / 200) + (won ? 10 + 5 * level.n : 0);
