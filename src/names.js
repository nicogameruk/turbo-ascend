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

export function randomName() {
  return `${pick(ADJECTIVES)} ${pick(NOUNS)} ${1 + Math.floor(Math.random() * 99)}`;
}
