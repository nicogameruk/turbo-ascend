// Things you buy with coins in the garage shop.
// The first item of each kind is free and owned from the start.
export const SHOP = {
  // Car body shapes. Each one also gives a small bonus (see applyBodyPerk below).
  body: [
    { id: 'roadster', name: 'Roadster', cost: 0, icon: '🚗', desc: 'Turbo fuel refills 15% faster' },
    { id: 'muscle', name: 'Muscle Car', cost: 60, icon: '💪', desc: '10% faster turbo' },
    { id: 'van', name: 'Delivery Van', cost: 70, icon: '🚐', desc: '+15% material when you beat a level' },
    { id: 'bubble', name: 'Bubble Car', cost: 70, icon: '🫧', desc: '+1 heart' },
    { id: 'wedge', name: 'Hyper Wedge', cost: 90, icon: '🔺', desc: 'Steers 15% faster' },
    { id: 'truck', name: 'Monster Pickup', cost: 100, icon: '🛻', desc: '+1 second of safety after you get hit' },
    { id: 'formula', name: 'Formula Racer', cost: 120, icon: '🏎️', desc: 'Always cruises a bit faster, so chasers catch you slower' },
    { id: 'hotdog', name: 'Hot Dog', cost: 120, icon: '🌭', desc: '+25% coins (with mustard)' },
    { id: 'rocket', name: 'Rocket', cost: 150, icon: '🚀', desc: 'Turbo lasts 30% longer' },
    { id: 'saucer', name: 'Flying Saucer', cost: 180, icon: '🛸', desc: 'Tractor beam pulls material in from further away' },
    { id: 'gp', name: 'Classic Grand Prix', cost: 220, icon: '🏁', desc: 'Detailed open-wheel racer: 8% faster turbo and steers 8% faster' },
  ],
  paint: [
    { id: 'level', name: 'Level look', cost: 0 },
    { id: 'red', name: 'Racing Red', cost: 30, color: 0xd62828 },
    { id: 'blue', name: 'Electric Blue', cost: 30, color: 0x1f6fff },
    { id: 'lime', name: 'Lime Zest', cost: 40, color: 0x8ad62a },
    { id: 'pink', name: 'Bubblegum', cost: 40, color: 0xff6ac8 },
    { id: 'mint', name: 'Mint', cost: 40, color: 0x6affc8 },
    { id: 'lavender', name: 'Lavender', cost: 40, color: 0xb89aff },
    { id: 'ocean', name: 'Deep Ocean', cost: 50, color: 0x0a4a8a },
    { id: 'forest', name: 'Forest', cost: 50, color: 0x1f5a2a },
    { id: 'ruby', name: 'Ruby', cost: 60, color: 0x9a0a2a },
    { id: 'black', name: 'Midnight', cost: 60, color: 0x16181e },
    { id: 'white', name: 'Pearl', cost: 60, color: 0xf2f2f6 },
    { id: 'orange', name: 'Sunset', cost: 80, color: 0xff7a18 },
    { id: 'lava', name: 'Lava', cost: 90, color: 0xff3a0a, glow: 0x8a1a00 },
    { id: 'ice', name: 'Ice', cost: 90, color: 0xbff0ff, glow: 0x1a5a8a },
    { id: 'neon', name: 'Neon Green', cost: 100, color: 0x39ff14, glow: 0x1a8a0a },
    { id: 'chrome', name: 'Chrome', cost: 120, color: 0xdfe4ea, metal: true },
    { id: 'goldchrome', name: 'Gold Chrome', cost: 150, color: 0xffcc44, metal: true },
    { id: 'champion', name: 'Champion Yellow', cost: 110, color: 0xffd21a, glow: 0x5a4000 },
  ],
  trail: [
    { id: 'blue', name: 'Ice Blue', cost: 0, color: 0x5fe4ff },
    { id: 'fire', name: 'Fire', cost: 40, color: 0xff6a1a },
    { id: 'lime', name: 'Toxic', cost: 40, color: 0x8dff4a },
    { id: 'pink', name: 'Candy', cost: 40, color: 0xff6ad8 },
    { id: 'white', name: 'Cloud', cost: 50, color: 0xffffff },
    { id: 'red', name: 'Blood Moon', cost: 50, color: 0xff1a3a },
    { id: 'gold', name: 'Gold', cost: 60, color: 0xffd040 },
    { id: 'purple', name: 'Ultraviolet', cost: 60, color: 0xb86aff },
    { id: 'emerald', name: 'Emerald', cost: 70, color: 0x1aff8a },
    { id: 'rainbow', name: 'Rainbow', cost: 120, color: null },
    // A list of colours flows along the trail in bands.
    { id: 'champion', name: 'Champion Stripes', cost: 90, colors: [0x1adc5a, 0xffd21a, 0x2a5aff] },
  ],
  glow: [
    { id: 'upgrade', name: 'Thruster glow', cost: 0 }, // follows your Hover Thrusters upgrade
    { id: 'red', name: 'Red Glow', cost: 25, color: 0xff2a3a },
    { id: 'green', name: 'Green Glow', cost: 25, color: 0x3aff6a },
    { id: 'pink', name: 'Pink Glow', cost: 30, color: 0xff5ad8 },
    { id: 'purple', name: 'Purple Glow', cost: 30, color: 0x9a5aff },
    { id: 'orange', name: 'Orange Glow', cost: 30, color: 0xff8a1a },
    { id: 'gold', name: 'Gold Glow', cost: 50, color: 0xffd040 },
    { id: 'brazil', name: 'Brazil Green', cost: 30, color: 0x1adc5a },
    { id: 'rainbow', name: 'Rainbow Glow', cost: 100, color: null },
  ],
  topper: [
    { id: 'none', name: 'Nothing', cost: 0, icon: '—' },
    { id: 'antenna', name: 'Antenna Ball', cost: 25, icon: '🔴' },
    { id: 'party', name: 'Party Hat', cost: 35, icon: '🥳' },
    { id: 'cone', name: 'Traffic Cone', cost: 35, icon: '🚧' },
    { id: 'fin', name: 'Shark Fin', cost: 45, icon: '🦈' },
    { id: 'propeller', name: 'Propeller Cap', cost: 50, icon: '🧢' },
    { id: 'cowboy', name: 'Cowboy Hat', cost: 60, icon: '🤠' },
    { id: 'tophat', name: 'Top Hat', cost: 70, icon: '🎩' },
    { id: 'duck', name: 'Rubber Duck', cost: 80, icon: '🦆' },
    { id: 'crown', name: 'Crown', cost: 120, icon: '👑' },
    { id: 'helmet', name: 'Racing Helmet', cost: 90, icon: '⛑️', desc: 'White with a red stripe' },
    { id: 'champion', name: 'Champion Helmet', cost: 150, icon: '🏆', desc: 'Yellow with green and blue racing stripes' },
  ],
  horn: [
    { id: 'beep', name: 'Beep Beep', cost: 0 },
    { id: 'truck', name: 'Big Truck', cost: 30 },
    { id: 'bell', name: 'Bike Bell', cost: 30 },
    { id: 'laser', name: 'Space Laser', cost: 40 },
    { id: 'clown', name: 'Clown Honk', cost: 40 },
    { id: 'duck', name: 'Rubber Duck', cost: 50 },
    { id: 'train', name: 'Steam Train', cost: 60 },
    { id: 'alarm', name: 'Alarm', cost: 60 },
    { id: 'chiptune', name: 'Chiptune', cost: 70 },
    { id: 'fanfare', name: 'Fanfare', cost: 80 },
    { id: 'samba', name: 'Victory Samba', cost: 70 },
  ],
  // Pets fly next to your car. Each one also helps a little.
  pet: [
    { id: 'none', name: 'No pet', cost: 0, icon: '—', desc: 'Fly solo' },
    { id: 'penguin', name: 'Penguin', cost: 50, icon: '🐧', desc: 'Just here to be cute' },
    { id: 'puppy', name: 'Robo Puppy', cost: 70, icon: '🐶', desc: 'Fetches material near you' },
    { id: 'slime', name: 'Slime', cost: 80, icon: '🟢', desc: 'Once a level, heals you when you\'re on your last heart' },
    { id: 'kitty', name: 'Kitty', cost: 90, icon: '🐱', desc: '+20% coins' },
    { id: 'owl', name: 'Owl', cost: 100, icon: '🦉', desc: '+15% material when you beat a level' },
    { id: 'ghost', name: 'Ghost', cost: 120, icon: '👻', desc: 'Blocks the first hit every level' },
    { id: 'ufo', name: 'Mini UFO', cost: 140, icon: '🛸', desc: 'Zaps enemy shots near you every 6 s' },
    { id: 'dragon', name: 'Baby Dragon', cost: 160, icon: '🐉', desc: 'Spits a fireball at an enemy every 7 s' },
    { id: 'star', name: 'Star Sprite', cost: 200, icon: '⭐', desc: 'Your ability recharges 25% faster' },
    { id: 'phoenix', name: 'Phoenix', cost: 260, icon: '🔥', desc: 'Once a level, brings you back with 1 heart' },
    { id: 'toucan', name: 'Toucan', cost: 110, icon: '🦜', desc: 'Brazilian bird buddy: turbo fuel refills 25% faster' },
    { id: 'omni', name: 'Omni Spirit', cost: 999, icon: '🌌', desc: 'SUPER OVERPOWERED: uses a random ability from the whole game every 4 s, and has the powers of every other pet too' },
  ],
};

export const SHOP_TABS = [
  { kind: 'body', label: 'Body' },
  { kind: 'paint', label: 'Paint' },
  { kind: 'trail', label: 'Trail' },
  { kind: 'glow', label: 'Glow' },
  { kind: 'topper', label: 'Hat' },
  { kind: 'horn', label: 'Horn' },
  { kind: 'pet', label: 'Pets' },
];

export const findItem = (kind, id) => SHOP[kind].find((i) => i.id === id) ?? SHOP[kind][0];

// The bonus your car's body shape gives (changes the stats from getStats).
export function applyBodyPerk(stats, bodyId) {
  switch (bodyId) {
    case 'roadster': stats.refill *= 1.15; break;
    case 'muscle': stats.boostSpeed *= 1.1; break;
    case 'van': stats.matMult *= 1.15; break;
    case 'bubble': stats.maxHealth += 1; break;
    case 'wedge': stats.steerSpeed *= 1.15; break;
    case 'truck': stats.invuln += 1; break;
    case 'formula': stats.cruise += 5; break;
    case 'hotdog': stats.coinMult *= 1.25; break;
    case 'rocket': stats.fuelDrain /= 1.3; break;
    case 'saucer': stats.magnet += 6; break;
    case 'gp': stats.boostSpeed *= 1.08; stats.steerSpeed *= 1.08; break;
    default: break;
  }
  return stats;
}
