// Things you buy with coins: paint colours, boost trails and horns. Looks only.
export const SHOP = {
  paint: [
    { id: 'level', name: 'Level look', cost: 0 },
    { id: 'red', name: 'Racing Red', cost: 30, color: 0xd62828 },
    { id: 'blue', name: 'Electric Blue', cost: 30, color: 0x1f6fff },
    { id: 'lime', name: 'Lime Zest', cost: 40, color: 0x8ad62a },
    { id: 'pink', name: 'Bubblegum', cost: 40, color: 0xff6ac8 },
    { id: 'black', name: 'Midnight', cost: 60, color: 0x16181e },
    { id: 'white', name: 'Pearl', cost: 60, color: 0xf2f2f6 },
    { id: 'orange', name: 'Sunset', cost: 80, color: 0xff7a18 },
  ],
  trail: [
    { id: 'blue', name: 'Ice Blue', cost: 0, color: 0x5fe4ff },
    { id: 'fire', name: 'Fire', cost: 40, color: 0xff6a1a },
    { id: 'lime', name: 'Toxic', cost: 40, color: 0x8dff4a },
    { id: 'gold', name: 'Gold', cost: 60, color: 0xffd040 },
    { id: 'purple', name: 'Ultraviolet', cost: 60, color: 0xb86aff },
    { id: 'rainbow', name: 'Rainbow', cost: 120, color: null },
  ],
  horn: [
    { id: 'beep', name: 'Beep Beep', cost: 0 },
    { id: 'truck', name: 'Big Truck', cost: 30 },
    { id: 'laser', name: 'Space Laser', cost: 40 },
    { id: 'duck', name: 'Rubber Duck', cost: 50 },
    { id: 'fanfare', name: 'Fanfare', cost: 80 },
  ],
};

export const SHOP_TABS = [
  { kind: 'paint', label: 'Paint' },
  { kind: 'trail', label: 'Trail' },
  { kind: 'horn', label: 'Horn' },
];

export const findItem = (kind, id) => SHOP[kind].find((i) => i.id === id) ?? SHOP[kind][0];
