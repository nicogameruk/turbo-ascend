// Random racer names like "Blazing Falcon 42".
const ADJECTIVES = [
  'Turbo', 'Cosmic', 'Rusty', 'Blazing', 'Sneaky', 'Mighty', 'Neon', 'Golden', 'Thunder', 'Crystal',
  'Shadow', 'Rocket', 'Lucky', 'Speedy', 'Fuzzy', 'Wild', 'Super', 'Hyper', 'Atomic', 'Frosty',
  'Electric', 'Stormy', 'Galactic', 'Fearless', 'Sparky', 'Jolly', 'Silent', 'Funky', 'Mega', 'Ultra',
  'Flaming', 'Icy', 'Brave', 'Swift', 'Dizzy', 'Glowing', 'Rapid', 'Epic', 'Noble', 'Crazy',
];
const NOUNS = [
  'Falcon', 'Tiger', 'Comet', 'Racer', 'Dragon', 'Wolf', 'Pilot', 'Panda', 'Shark', 'Phoenix',
  'Ninja', 'Wizard', 'Beetle', 'Hawk', 'Bolt', 'Penguin', 'Llama', 'Fox', 'Gecko', 'Viper',
  'Rhino', 'Otter', 'Meteor', 'Badger', 'Cheetah', 'Raptor', 'Yeti', 'Kraken', 'Moose', 'Squid',
  'Jaguar', 'Eagle', 'Raccoon', 'Lion', 'Bandit', 'Knight', 'Astronaut', 'Hamster', 'Cobra', 'Dino',
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// The owner's names: never given out at random (the leaderboard also guards them).
export const RESERVED_NAMES = ['Frosty Hamster 55', 'Mighty Tiger 44'];
// Only these racers may change their name (Settings → 🔑 Owner). The database checks too.
export const RENAME_NAMES = ['Frosty Hamster 55', 'Mighty Tiger 44'];
const reserved = (name) => RESERVED_NAMES.some((r) => r.toLowerCase() === name.toLowerCase());

export function randomName() {
  let name;
  do name = `${pick(ADJECTIVES)} ${pick(NOUNS)} ${1 + Math.floor(Math.random() * 99)}`;
  while (reserved(name));
  return name;
}
