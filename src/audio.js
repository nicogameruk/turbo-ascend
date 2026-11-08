// All sound is made in the browser with Web Audio: no audio files.
// Browsers only allow sound after a key press or click, so unlock() is called then.

const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

// Small seeded random, so each level's tune is always the same.
function seeded(seed) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function createAudio() {
  let ctx = null;
  let master, musicBus, sfxBus, noiseBuf;
  let echoIn, echoDelay, echoWet; // echo effect for the music
  let revIn; // reverb send: makes the music sound roomy and polished
  let tonalBus; // bass/chords/melody (ducks on each kick for the "pumping" sound)
  let engine = null;
  let settings = { volume: 0.7, music: true, sfx: true };

  // Music state
  let song = null; // { music, steps: [...] }
  let songStep = 0;
  let nextTime = 0;
  let timer = null;
  let intensity = 0; // 0 normal, 1 boss

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.connect(master);
    // Echo: notes sent to echoIn repeat a few times, getting quieter.
    echoIn = ctx.createGain();
    echoDelay = ctx.createDelay(1.5);
    const feedback = ctx.createGain();
    feedback.gain.value = 0.35;
    echoWet = ctx.createGain();
    echoWet.gain.value = 0;
    echoIn.connect(echoDelay);
    echoDelay.connect(feedback);
    feedback.connect(echoDelay);
    echoDelay.connect(echoWet);
    echoWet.connect(musicBus);
    // Reverb: a generated "room" echo tail (no audio files needed).
    const room = ctx.createConvolver();
    const seconds = 2.4;
    const ir = ctx.createBuffer(2, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3;
    }
    room.buffer = ir;
    revIn = ctx.createGain();
    const revOut = ctx.createGain();
    revOut.gain.value = 0.35;
    revIn.connect(room);
    room.connect(revOut);
    revOut.connect(musicBus);
    tonalBus = ctx.createGain();
    tonalBus.connect(musicBus);
    sfxBus = ctx.createGain();
    sfxBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    applySettings();

    // Engine: two detuned saws through a low-pass filter.
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const oscs = [0, 7].map((detune) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = 55;
      o.detune.value = detune;
      o.connect(filter);
      o.start();
      return o;
    });
    filter.connect(gain);
    gain.connect(sfxBus);
    engine = { oscs, filter, gain };
  }

  function applySettings() {
    if (!ctx) return;
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(settings.volume * 0.8, t, 0.05);
    musicBus.gain.setTargetAtTime(settings.music ? 0.32 : 0, t, 0.05);
    sfxBus.gain.setTargetAtTime(settings.sfx ? 0.9 : 0, t, 0.05);
  }

  // One note with a quick attack and decay.
  function tone(freq, { type = 'sine', at = 0, dur = 0.15, vol = 0.3, slide = 0, bus = sfxBus, attack = 0.005 } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(bus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise({ at = 0, dur = 0.3, vol = 0.4, freq = 1200, type = 'lowpass', bus = sfxBus, sweep = 0 } = {}) {
    if (!ctx) return;
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweep) f.frequency.exponentialRampToValueAtTime(freq * sweep, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(bus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  const SFX = {
    pickup: () => { tone(880, { type: 'triangle', dur: 0.08, vol: 0.18 }); tone(1320, { type: 'triangle', at: 0.06, dur: 0.12, vol: 0.18 }); },
    hit: () => { noise({ dur: 0.35, vol: 0.5, freq: 900, sweep: 0.2 }); tone(110, { type: 'square', dur: 0.25, vol: 0.25, slide: 0.5 }); },
    block: () => { tone(660, { type: 'sine', dur: 0.2, vol: 0.2, slide: 1.5 }); },
    shot: () => { tone(520, { type: 'square', dur: 0.08, vol: 0.05, slide: 0.6 }); },
    boom: () => { noise({ dur: 0.6, vol: 0.5, freq: 600, sweep: 0.15 }); tone(70, { type: 'sine', dur: 0.4, vol: 0.4, slide: 0.5 }); },
    zap: () => { tone(1400, { type: 'sawtooth', dur: 0.15, vol: 0.12, slide: 0.2 }); },
    bolt: () => { tone(400, { type: 'triangle', dur: 0.25, vol: 0.2, slide: 3 }); },
    portal: () => { for (let i = 0; i < 6; i++) tone(mtof(60 + i * 4), { type: 'triangle', at: i * 0.07, dur: 0.3, vol: 0.15 }); },
    shield: () => { tone(300, { type: 'sine', dur: 0.5, vol: 0.25, slide: 2 }); tone(450, { type: 'sine', dur: 0.5, vol: 0.15, slide: 2 }); },
    dash: () => { noise({ dur: 0.35, vol: 0.4, freq: 3000, type: 'bandpass', sweep: 0.2 }); },
    blast: () => { noise({ dur: 1, vol: 0.6, freq: 4000, sweep: 0.05 }); tone(880, { type: 'sine', dur: 0.8, vol: 0.25, slide: 0.25 }); },
    thunder: () => { noise({ dur: 1.2, vol: 0.6, freq: 400, sweep: 0.3 }); noise({ dur: 0.15, vol: 0.4, freq: 5000, type: 'highpass' }); },
    // A quick 'thwip' for shooting webs: a fast falling zip plus a sticky snap.
    thwip: () => { noise({ dur: 0.18, vol: 0.35, freq: 4000, type: 'bandpass', sweep: 0.25 }); tone(1400, { type: 'triangle', dur: 0.12, vol: 0.08, slide: 0.4 }); },
    whoosh: () => { noise({ dur: 0.6, vol: 0.25, freq: 300, type: 'bandpass', sweep: 4 }); },
    count: () => { tone(523, { type: 'square', dur: 0.14, vol: 0.14 }); },
    go: () => { tone(1046, { type: 'square', dur: 0.35, vol: 0.15 }); tone(1568, { type: 'triangle', dur: 0.4, vol: 0.1 }); },
    ready: () => { tone(880, { type: 'triangle', dur: 0.1, vol: 0.14 }); tone(1320, { type: 'triangle', at: 0.08, dur: 0.18, vol: 0.14 }); },
    ui: () => { tone(660, { type: 'triangle', dur: 0.06, vol: 0.15 }); },
    buy: () => { [0, 4, 7, 12].forEach((s, i) => tone(mtof(72 + s), { type: 'triangle', at: i * 0.05, dur: 0.15, vol: 0.15 })); },
    nope: () => { tone(200, { type: 'square', dur: 0.15, vol: 0.12 }); },
    win: () => { [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => tone(mtof(64 + s), { type: 'square', at: i * 0.11, dur: 0.22, vol: 0.12 })); },
    lose: () => { [7, 5, 3, 0].forEach((s, i) => tone(mtof(55 + s), { type: 'triangle', at: i * 0.2, dur: 0.35, vol: 0.2 })); },
  };

  const HORNS = {
    beep: () => { tone(500, { type: 'square', dur: 0.12, vol: 0.18 }); tone(500, { type: 'square', at: 0.18, dur: 0.12, vol: 0.18 }); },
    truck: () => { tone(110, { type: 'sawtooth', dur: 0.7, vol: 0.3 }); tone(138, { type: 'sawtooth', dur: 0.7, vol: 0.25 }); },
    laser: () => { tone(1800, { type: 'sawtooth', dur: 0.35, vol: 0.15, slide: 0.1 }); tone(1500, { type: 'sawtooth', at: 0.2, dur: 0.35, vol: 0.15, slide: 0.1 }); },
    duck: () => { tone(700, { type: 'square', dur: 0.12, vol: 0.15, slide: 0.6 }); tone(650, { type: 'square', at: 0.15, dur: 0.14, vol: 0.15, slide: 0.6 }); },
    bell: () => { tone(2200, { dur: 0.6, vol: 0.15 }); tone(2640, { dur: 0.5, vol: 0.1 }); tone(2200, { at: 0.18, dur: 0.6, vol: 0.15 }); },
    clown: () => { tone(300, { type: 'square', dur: 0.18, vol: 0.15, slide: 2.2 }); tone(380, { type: 'square', at: 0.22, dur: 0.18, vol: 0.15, slide: 2.2 }); },
    train: () => { [0, 0.45].forEach((at) => { tone(220, { type: 'sawtooth', at, dur: 0.4, vol: 0.18 }); tone(277, { type: 'sawtooth', at, dur: 0.4, vol: 0.15 }); tone(330, { type: 'sawtooth', at, dur: 0.4, vol: 0.12 }); }); },
    alarm: () => { for (let i = 0; i < 4; i++) tone(i % 2 ? 660 : 880, { type: 'square', at: i * 0.12, dur: 0.11, vol: 0.12 }); },
    chiptune: () => { [0, 4, 7, 11, 12, 7, 12, 16].forEach((st, i) => tone(mtof(72 + st), { type: 'square', at: i * 0.06, dur: 0.07, vol: 0.1 })); },
    // A short celebration samba: a bouncy tune over a tamborim-style click rhythm.
    samba: () => {
      const beat = 0.09;
      [[0, 0], [1, 4], [3, 7], [4, 9], [6, 7], [7, 12], [9, 9], [10, 12], [12, 16]].forEach(([at, st]) =>
        tone(mtof(72 + st), { type: 'square', at: at * beat, dur: 0.1, vol: 0.1 }));
      [0, 2, 3, 5, 6, 8, 10, 11, 12].forEach((at) => noise({ at: at * beat, dur: 0.04, vol: 0.18, freq: 3500, type: 'bandpass' }));
    },
    fanfare: () => { [0, 4, 7, 12].forEach((s, i) => tone(mtof(67 + s), { type: 'square', at: i * 0.1, dur: i === 3 ? 0.4 : 0.12, vol: 0.14 })); },
  };

  // ---------------- Music ----------------
  // Every level has its own style: drum pattern, bass line, instruments and echo.
  // Drum patterns are one bar of 16 steps: x = hit, . = rest.
  const STYLES = {
    rock: { // Dirt: dusty rock
      kick: 'x.....x.x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.',
      bass: 'root8', bassWave: 'triangle',
      lead: { wave: 'square', octave: 1, density: 0.5, len: 1.4, vol: 0.09, filter: 2200 },
    },
    folk: { // Grass: bouncy and happy
      kick: 'x.......x.......', snare: '....x.......x...', shaker: 'xxxxxxxxxxxxxxxx',
      bass: 'bounce', bassWave: 'triangle',
      lead: { wave: 'triangle', octave: 1, density: 0.6, len: 1, vol: 0.13 },
      arp: { wave: 'triangle', octave: 2, every: 2, vol: 0.05 },
      delay: 0.22,
    },
    heavy: { // Stone: slow and heavy
      kick: 'x..x..x...x..x..', snare: '....x.......x...', hat: 'x...x...x...x...', tom: '............x.xx',
      bass: 'heavy', bassWave: 'sawtooth', bassFilter: 500,
      lead: { wave: 'sawtooth', octave: 0, density: 0.3, len: 2, vol: 0.07, filter: 900 },
    },
    industrial: { // Iron: clanky machines
      kick: 'x...x...x...x...', snare: '....x.......x..x', metal: '..x...x...x...x.', hat: 'xxxxxxxxxxxxxxxx',
      bass: 'pulse16', bassWave: 'square', bassFilter: 700,
      lead: { wave: 'square', octave: 1, density: 0.35, len: 0.8, vol: 0.06, filter: 1800 },
      delay: 0.15,
    },
    funk: { // Gold: funky and shiny
      kick: 'x..x......x..x..', snare: '....x..x....x...', hat: 'x.xxx.xxx.xxx.xx',
      bass: 'funk', bassWave: 'square', bassFilter: 900,
      stab: true,
      lead: { wave: 'triangle', octave: 1, density: 0.35, len: 1, vol: 0.1 },
      delay: 0.1,
    },
    crystal: { // Diamond: sparkly bells
      kick: 'x.......x.......', snare: '........x.......', hat: '..x...x...x...x.',
      bass: 'root4', bassWave: 'sine',
      bell: { octave: 2, every: 2 },
      lead: { wave: 'sine', octave: 2, density: 0.35, len: 2.5, vol: 0.09 },
      delay: 0.35, softDrums: true,
    },
    ethereal: { // Angel: dreamy harp and soft pads, no drums
      bass: 'long', bassWave: 'sine',
      pad: true, harp: true,
      lead: { wave: 'sine', octave: 1, density: 0.25, len: 4, vol: 0.09 },
      delay: 0.4,
    },
    synthwave: { // Galaxy: retro space synths
      kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.',
      bass: 'octave8', bassWave: 'sawtooth', bassFilter: 800,
      pad: true,
      arp: { wave: 'sawtooth', octave: 1, every: 1, vol: 0.035, filter: 2500 },
      lead: { wave: 'sawtooth', octave: 1, density: 0.3, len: 2, vol: 0.06, filter: 2000 },
      delay: 0.3,
    },
    dark: { // Black Hole: slow, deep and spooky
      kick: 'x...........x...', tom: '......x.........',
      bass: 'drone', bassWave: 'sawtooth', bassFilter: 300,
      pad: true,
      lead: { wave: 'sine', octave: 0, density: 0.15, len: 6, vol: 0.08 },
      delay: 0.45,
    },
    techno: { // Neon Cyber: four-on-the-floor club beat
      kick: 'x...x...x...x...', clap: '....x.......x...', openhat: '..x...x...x...x.', hat: 'x.x.x.x.x.x.x.x.',
      bass: 'offbeat', bassWave: 'sawtooth', bassFilter: 1200,
      arp: { wave: 'square', octave: 1, every: 1, vol: 0.035, filter: 3000 },
      lead: { wave: 'square', octave: 2, density: 0.2, len: 0.8, vol: 0.05 },
      delay: 0.25,
    },
    clockwork: { // Time Warp: ticking clocks
      kick: 'x.......x.......', snare: '....x.......x...', block: 'x.x.x.x.x.x.x.x.',
      bass: 'walk', bassWave: 'triangle',
      lead: { wave: 'triangle', octave: 1, density: 0.55, len: 0.5, vol: 0.12 },
      delay: 0.15, swing: 0.18,
    },
    epic: { // Dragon Realm: big war drums
      kick: 'x.....x.x.....x.', taiko: 'x..x..x.x..x..x.', snare: '....x.......x...',
      bass: 'root8', bassWave: 'sawtooth', bassFilter: 600,
      pad: true, padWave: 'sawtooth',
      lead: { wave: 'sawtooth', octave: 1, density: 0.4, len: 1.6, vol: 0.08, filter: 1600 },
      delay: 0.15,
    },
    chip: { // Rainbow Prism: fast video-game chiptune
      kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.',
      bass: 'octave8', bassWave: 'square', bassFilter: 1500,
      arp: { wave: 'square', octave: 2, every: 1, vol: 0.04 },
      lead: { wave: 'square', octave: 1, density: 0.6, len: 0.9, vol: 0.08 },
    },
    cosmic: { // Cosmic God: the big finale, everything at once
      kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', taiko: '............x.x.',
      bass: 'octave8', bassWave: 'sawtooth', bassFilter: 900,
      pad: true,
      arp: { wave: 'sawtooth', octave: 2, every: 1, vol: 0.03, filter: 3000 },
      lead: { wave: 'sawtooth', octave: 1, density: 0.45, len: 1.5, vol: 0.07, filter: 2500 },
      delay: 0.3,
    },
  };
  Object.assign(STYLES, {
    underwater: { // Ocean Abyss: slow, bubbly and echoey
      kick: 'x.......x.......', shaker: '..x...x...x...x.',
      bass: 'long', bassWave: 'sine',
      pad: true, padWave: 'triangle',
      arp: { wave: 'sine', octave: 2, every: 2, vol: 0.05 },
      lead: { wave: 'sine', octave: 1, density: 0.3, len: 3, vol: 0.08 },
      delay: 0.45, softDrums: true,
    },
    candy: { // Candy Land: sugary bouncy pop
      kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.',
      bass: 'bounce', bassWave: 'square', bassFilter: 1400,
      bell: { octave: 2, every: 4 },
      arp: { wave: 'square', octave: 2, every: 2, vol: 0.035 },
      lead: { wave: 'square', octave: 1, density: 0.6, len: 0.8, vol: 0.08 },
      delay: 0.12,
    },
    volcano: { // Volcano Core: pounding drums and heavy bass
      kick: 'x..x..x.x..x..x.', taiko: 'x.....x.x.......', snare: '....x.......x...', tom: '............xxxx',
      bass: 'heavy', bassWave: 'sawtooth', bassFilter: 450,
      pad: true, padWave: 'sawtooth',
      lead: { wave: 'sawtooth', octave: 0, density: 0.35, len: 1.6, vol: 0.07, filter: 1100 },
    },
    ice: { // Ice Age: cold, sparkly and spacious
      kick: 'x...........x...', hat: '....x.......x...',
      bass: 'long', bassWave: 'sine',
      pad: true, padWave: 'triangle',
      bell: { octave: 2, every: 3 },
      lead: { wave: 'sine', octave: 2, density: 0.25, len: 3, vol: 0.08 },
      delay: 0.4, softDrums: true,
    },
    haunted: { // Haunted Night: spooky organ and harpsichord
      kick: 'x.....x.....x...', snare: '......x.........',
      bass: 'walk', bassWave: 'triangle',
      pad: true, padWave: 'square',
      arp: { wave: 'square', octave: 1, every: 1, vol: 0.03, filter: 2000 },
      lead: { wave: 'triangle', octave: 1, density: 0.3, len: 2, vol: 0.09 },
      delay: 0.3,
    },
    factory: { // Robot Factory: machine techno
      kick: 'x...x...x...x...', clap: '....x.......x...', metal: '.x...x...x...x..', hat: 'xxxxxxxxxxxxxxxx',
      bass: 'pulse16', bassWave: 'sawtooth', bassFilter: 900,
      arp: { wave: 'square', octave: 1, every: 2, vol: 0.035, filter: 2200 },
      lead: { wave: 'square', octave: 1, density: 0.25, len: 0.7, vol: 0.06 },
      delay: 0.18,
    },
    jungle: { // Jungle Temple: tribal drums and marimba
      kick: 'x.......x.......', taiko: 'x..x..x...x.x...', tom: '...x.....x...x..', shaker: 'xxxxxxxxxxxxxxxx',
      bass: 'root4', bassWave: 'triangle',
      lead: { wave: 'triangle', octave: 1, density: 0.6, len: 0.6, vol: 0.12 },
      delay: 0.15,
    },
    storm: { // Storm Sky: fast drum and bass
      kick: 'x.........x.....', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx',
      bass: 'drone', bassWave: 'sawtooth', bassFilter: 500,
      pad: true,
      lead: { wave: 'sawtooth', octave: 1, density: 0.35, len: 1.2, vol: 0.06, filter: 2400 },
      delay: 0.2,
    },
    dream: { // Dream World: a soft music box lullaby
      bass: 'long', bassWave: 'sine',
      bell: { octave: 2, every: 2 },
      harp: true,
      lead: { wave: 'sine', octave: 2, density: 0.3, len: 3, vol: 0.07 },
      delay: 0.45,
    },
    cartoon: { // Doodle Land: bouncy cartoon tune
      kick: 'x...x...x...x...', snare: '....x.......x...', block: '..x...x...x...x.',
      bass: 'bounce', bassWave: 'triangle',
      bell: { octave: 2, every: 4 },
      lead: { wave: 'triangle', octave: 1, density: 0.65, len: 0.5, vol: 0.12 },
      delay: 0.1,
    },
    office: { // Job Application: smooth elevator-music jazz
      kick: 'x.......x.......', shaker: '..x...x...x...x.', snare: '....x.......x...',
      bass: 'walk', bassWave: 'triangle',
      pad: true, padWave: 'triangle',
      lead: { wave: 'triangle', octave: 1, density: 0.45, len: 1.6, vol: 0.1 },
      bell: { octave: 2, every: 4 },
      delay: 0.2, swing: 0.22, softDrums: true,
    },
    omega: { // Omega: the biggest finale yet
      kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', taiko: 'x.....x.x.....x.',
      bass: 'octave8', bassWave: 'sawtooth', bassFilter: 1000,
      pad: true, padWave: 'sawtooth',
      arp: { wave: 'sawtooth', octave: 2, every: 1, vol: 0.03, filter: 3200 },
      lead: { wave: 'sawtooth', octave: 1, density: 0.5, len: 1.4, vol: 0.07, filter: 2800 },
      delay: 0.3,
    },
  });
  Object.assign(STYLES, {
    trap: { // hard-hitting trap: 808s and hi-hat rolls
      kick: 'x.....x...x.....', clap: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', trap: true,
      bass: '808', pad: true, padWave: 'triangle', bell: { octave: 2, every: 4 },
      lead: { wave: 'triangle', octave: 1, density: 0.45, len: 1.2, vol: 0.09 },
      verb: 0.3, pump: false,
    },
    disco: { // disco-house: four-on-the-floor, funky bass, chord stabs
      kick: 'x...x...x...x...', clap: '....x.......x...', openhat: '..x...x...x...x.', hat: 'x.x.x.x.x.x.x.x.',
      bass: 'octave8', bassWave: 'sawtooth', bassFilter: 900, stab: true, pad: true,
      lead: { wave: 'square', octave: 1, density: 0.45, len: 1, vol: 0.06, filter: 2600 },
      verb: 0.25, delay: 0.15,
    },
    darktrap: { // dark trap: slow, heavy 808s, spooky pads
      kick: 'x.......x..x....', clap: '........x.......', hat: 'x.x.x.x.x.x.x.x.', trap: true,
      bass: '808', pad: true, padWave: 'sawtooth',
      lead: { wave: 'sine', octave: 1, density: 0.25, len: 3, vol: 0.08 },
      verb: 0.45, delay: 0.3, pump: false,
    },
    bigroom: { // big-room EDM: huge supersaw lead and pumping chords
      kick: 'x...x...x...x...', clap: '....x.......x...', openhat: '..x...x...x...x.',
      bass: 'offbeat', bassWave: 'sawtooth', bassFilter: 1400, pad: true,
      lead: { wave: 'sawtooth', octave: 1, density: 0.5, len: 1.2, vol: 0.06, filter: 3200 },
      verb: 0.3,
    },
    dubstep: { // the final boss level: half-time drums and a wobble bass drop
      kick: 'x.......x.......', snare: '........x.......', hat: 'x.x.x.x.x.x.x.x.', trap: true,
      bass: 'wobble', pad: true, padWave: 'sawtooth',
      lead: { wave: 'sawtooth', octave: 1, density: 0.4, len: 1.4, vol: 0.06, filter: 2800 },
      verb: 0.3, pump: false,
    },
  });
  const LEVEL_STYLE = {
    1: 'rock', 2: 'folk', 3: 'trap', 4: 'industrial', 5: 'disco', 6: 'crystal', 7: 'ethereal',
    8: 'synthwave', 9: 'darktrap', 10: 'techno', 11: 'clockwork', 12: 'epic', 13: 'chip', 14: 'cosmic',
    15: 'underwater', 16: 'candy', 17: 'volcano', 18: 'ice', 19: 'haunted', 20: 'bigroom', 21: 'jungle',
    22: 'storm', 23: 'dream', 24: 'dubstep', 25: 'office', 26: 'cartoon',
  };
  const hit = (pattern, i) => !!pattern && pattern[i % 16] === 'x';

  // Chord progressions real pop songs use (scale steps: 0 = I, 3 = IV, 4 = V, 5 = vi).
  const PROGRESSIONS = [[0, 5, 3, 4], [0, 4, 5, 3], [5, 3, 0, 4], [0, 3, 4, 3], [5, 4, 3, 4], [0, 5, 1, 4]];
  const SECTION = ['verse', 'build', 'drop', 'drop2'];

  // Build an 8-bar song (128 steps): verse → build-up → drop → second drop.
  function makeSong(music, seed, styleName) {
    const style = STYLES[styleName] ?? STYLES.rock;
    const r = seeded(seed);
    const note = (deg, oct = 0) => {
      const s = music.scale;
      const i = ((deg % s.length) + s.length) % s.length;
      return music.root + s[i] + 12 * (oct + Math.floor(deg / s.length));
    };
    const chordTones = (c) => [c, c + 2, c + 4];
    const prog = PROGRESSIONS[Math.floor(r() * PROGRESSIONS.length)];
    // Two catchy melody patterns (one bar each) that repeat, like a real hook.
    const L = style.lead;
    const makeMotif = () => Array.from({ length: 16 }, (_, k) => {
      if (!L) return null;
      const chance = k % 2 === 0 ? L.density : L.density * 0.4;
      return r() < chance ? [0, 2, 4, 7, 4, 2, 9][Math.floor(r() * 7)] : null;
    });
    const hookA = makeMotif();
    const hookB = makeMotif();
    const fourOnFloor = !!style.kick && style.kick.startsWith('x...x...x...x...');
    const steps = [];
    for (let i = 0; i < 128; i++) {
      const sec = SECTION[Math.floor(i / 32)];
      const inSec = i % 32;
      const k = i % 16;
      const chord = prog[Math.floor(i / 8) % 4];
      const inChord = i % 8;
      const drop = sec === 'drop' || sec === 'drop2';
      const s = { sec };
      // Drums: the verse is lighter, the build-up drops the kick near the end, the drops hit hardest.
      const kickOn = !(sec === 'build' && inSec >= 24);
      s.kick = kickOn && hit(style.kick, i) && (sec !== 'verse' || k % 4 === 0 || fourOnFloor);
      s.snare = hit(style.snare, i) && sec !== 'verse';
      s.clap = hit(style.clap, i) && (drop || (sec === 'verse' && inSec >= 16));
      s.hat = hit(style.hat, i) && (drop || k % 2 === 0);
      s.openhat = hit(style.openhat, i) && drop;
      s.shaker = hit(style.shaker, i);
      s.tom = hit(style.tom, i) && drop;
      s.taiko = hit(style.taiko, i) && sec !== 'verse';
      s.metal = hit(style.metal, i);
      s.block = hit(style.block, i) ? (i % 4 === 0 ? 1 : 2) : 0;
      // Trap hi-hat rolls in the drops
      if (style.trap && drop && [7, 11, 14].includes(k) && r() < 0.6) s.roll = r() < 0.5 ? 3 : 4;
      // Build-up: a snare roll that speeds up, and a rising whoosh
      if (sec === 'build' && inSec >= 16) s.buildSnare = inSec >= 24 || inSec % 2 === 0 ? (inSec - 15) / 17 : 0;
      if (sec === 'build' && inSec === 0) s.riser = 32;
      if (drop && inSec === 0) s.crash = true;
      s.pump = (style.pump ?? fourOnFloor) && s.kick;
      // Bass line
      const root = note(chord, -1);
      const b = style.bass;
      if (b === 'root8' && i % 2 === 0) s.bass = [root, 1];
      if (b === 'root4' && i % 4 === 0) s.bass = [root, 3];
      if (b === 'bounce' && i % 2 === 0) s.bass = [i % 4 === 0 ? root : note(chord + 4, -1), 1];
      if (b === 'heavy' && s.kick) s.bass = [root - 12, 2];
      if (b === 'pulse16') s.bass = [root, 0.6];
      if (b === 'funk' && hit('x..x..x.x.x..x..', i)) s.bass = [r() < 0.3 ? root + 12 : root, 0.8];
      if (b === 'long' && inChord === 0) s.bass = [root, 8];
      if (b === 'drone' && i % 16 === 0) s.bass = [root - 12, 16];
      if (b === 'octave8' && i % 2 === 0) s.bass = [i % 4 === 0 ? root : root + 12, 1];
      if (b === 'offbeat' && i % 4 === 2) s.bass = [root, 1.2];
      if (b === 'walk' && i % 4 === 0) s.bass = [note(chord + [0, 2, 4, 5][(i / 4) % 4], -1), 3];
      if (b === '808' && (s.kick || (drop && k === 10))) s.b808 = [root - 12, s.kick ? 6 : 3];
      if (b === 'wobble' && drop && i % 4 === 0) s.wobble = [root - 12, 4];
      if (b === 'wobble' && !drop && inChord === 0) s.bass = [root - 12, 8];
      if (sec === 'build' && inSec >= 24 && s.bass) s.bass = null; // a moment of silence before the drop
      // Chords, arpeggios and melody
      if (style.pad && inChord === 0) s.pad = chordTones(chord).map((d) => note(d, 0));
      if (style.stab && i % 4 === 2 && drop) s.stab = chordTones(chord).map((d) => note(d, 1));
      if (style.arp && i % style.arp.every === 0 && sec !== 'verse') s.arp = note(chordTones(chord)[(i / style.arp.every) % 3] + (Math.floor(i / 3) % 2 ? 7 : 0), style.arp.octave);
      if (style.bell && i % style.bell.every === 0 && r() < 0.7) s.bell = note(chordTones(chord)[Math.floor(r() * 3)], style.bell.octave);
      if (style.harp) s.harp = note(chordTones(chord)[i % 3] + (Math.floor(i / 3) % 2) * 7, 1);
      const hook = sec === 'drop2' ? hookB : hookA;
      const deg = hook[k];
      const leadOn = drop || (sec === 'verse' && k % 4 === 0) || (sec === 'build' && inSec < 24);
      if (L && deg !== null && leadOn) s.lead = note(chord + deg, L.octave);
      steps.push(s);
    }
    return { music, style, steps };
  }

  // Soft distortion for the 808 bass.
  let warmCurve = null;
  const warm = () => {
    if (warmCurve) return warmCurve;
    warmCurve = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = i / 128 - 1; warmCurve[i] = Math.tanh(x * 2.5); }
    return warmCurve;
  };

  function playStep(step, t) {
    const st = song.style;
    const len = 60 / (song.music.tempo * (intensity ? 1.08 : 1)) / 4;
    const bus = musicBus;
    const soft = st.softDrums ? 0.5 : 1;
    const drop = step.sec === 'drop' || step.sec === 'drop2';
    const verb = st.verb ?? 0.22;

    // A note: oscillators (with optional detune spread), low-pass filter, echo and reverb.
    const voice = (m, type, dur, vol, { filter, attack = 0.01, detune = 0, spread = null, echo = true, reverb = verb, dest = tonalBus } = {}) => {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, attack + 0.02));
      let out = g;
      if (filter) {
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = filter;
        g.connect(f);
        out = f;
      }
      out.connect(dest);
      if (echo && st.delay) out.connect(echoIn);
      if (reverb) { const send = ctx.createGain(); send.gain.value = reverb; out.connect(send); send.connect(revIn); }
      for (const d of spread ?? (detune ? [-detune, detune] : [0])) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = mtof(m);
        o.detune.value = d;
        o.connect(g);
        o.start(t);
        o.stop(t + dur + 0.05);
      }
    };
    const nz = (dur, vol, freq, type, q = 1, at = 0, reverb = 0) => {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t + at);
      g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
      src.connect(f); f.connect(g); g.connect(bus);
      if (reverb) { const send = ctx.createGain(); send.gain.value = reverb; g.connect(send); send.connect(revIn); }
      src.start(t + at, Math.random() * 0.5); src.stop(t + at + dur + 0.01);
    };
    const drum = (from, to, dur, vol, sweep = 0.8) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(from, t);
      o.frequency.exponentialRampToValueAtTime(to, t + dur * sweep);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.02);
    };

    // Pumping: the music ducks on every kick, then swells back (the EDM "breathing" sound).
    if (step.pump) {
      tonalBus.gain.cancelScheduledValues(t);
      tonalBus.gain.setValueAtTime(0.35, t);
      tonalBus.gain.linearRampToValueAtTime(1, t + len * 3);
    }

    // Drums
    if (step.kick) { drum(160, 46, 0.38, 1.0 * soft, 0.3); nz(0.012, 0.25 * soft, 3500, 'highpass'); } // punchy kick with a click
    if (step.snare) { nz(0.18, 0.35 * soft, 1900, 'bandpass', 1, 0, 0.35); drum(220, 160, 0.1, 0.25 * soft); }
    if (step.clap) [0, 0.011, 0.022].forEach((at, n) => nz(n === 2 ? 0.16 : 0.03, 0.3, 1300, 'bandpass', 2, at, 0.4));
    if (step.buildSnare) nz(0.08, 0.08 + step.buildSnare * 0.32, 1900, 'bandpass', 1, 0, 0.3);
    if (step.hat || (intensity && !st.hat && step.kick === false && st.kick)) nz(0.035, (intensity ? 0.18 : 0.11) * soft, 8000, 'highpass');
    if (step.roll) for (let n = 1; n < step.roll; n++) nz(0.025, 0.09, 8500, 'highpass', 1, (len * n) / step.roll);
    if (step.openhat) nz(0.22, 0.11, 8000, 'highpass');
    if (step.shaker) nz(0.05, 0.06, 6000, 'highpass');
    if (step.tom) drum(170, 70, 0.3, 0.6);
    if (step.taiko) { drum(95, 45, 0.45, 0.9); nz(0.08, 0.2, 400, 'lowpass', 1, 0, 0.3); }
    if (step.metal) { nz(0.12, 0.25, 3200, 'bandpass', 8); voice(91, 'square', 0.08, 0.03, { echo: false, reverb: 0 }); }
    if (step.block) voice(step.block === 1 ? 96 : 91, 'sine', 0.05, 0.25, { echo: false, reverb: 0.1, dest: bus });
    if (step.crash) nz(1.6, 0.22, 6000, 'highpass', 1, 0, 0.5); // cymbal at the start of a drop
    if (step.riser) {
      // A rising whoosh through the build-up
      const dur = len * step.riser;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 2;
      f.frequency.setValueAtTime(300, t);
      f.frequency.exponentialRampToValueAtTime(7000, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + dur * 0.95);
      g.gain.linearRampToValueAtTime(0, t + dur);
      src.connect(f); f.connect(g); g.connect(bus);
      src.start(t); src.stop(t + dur + 0.05);
    }

    // Bass
    if (step.bass) voice(step.bass[0], st.bassWave, len * step.bass[1] * 1.6, 0.42, { filter: st.bassFilter, echo: false, reverb: 0 });
    if (step.b808) {
      // Deep 808: a sine that slides down into the note, slightly distorted
      const [m, steps808] = step.b808;
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(mtof(m + 5), t);
      o.frequency.exponentialRampToValueAtTime(mtof(m), t + 0.06);
      const shaper = ctx.createWaveShaper();
      shaper.curve = warm();
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.55, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len * steps808 * 1.5);
      o.connect(shaper); shaper.connect(g); g.connect(bus);
      o.start(t); o.stop(t + len * steps808 * 1.5 + 0.05);
    }
    if (step.wobble) {
      // Dubstep wobble: a saw bass whose filter opens and closes in rhythm
      const [m, steps] = step.wobble;
      const dur = len * steps;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = mtof(m);
      const o2 = ctx.createOscillator();
      o2.type = 'square';
      o2.frequency.value = mtof(m) * 1.005;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.Q.value = 8;
      const wobbles = 2 + Math.floor((m % 3));
      for (let n = 0; n <= wobbles * 2; n++) f.frequency.setValueAtTime(n % 2 ? 1800 : 180, t + (dur * n) / (wobbles * 2));
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.3, t);
      g.gain.setValueAtTime(0.3, t + dur * 0.9);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(f); o2.connect(f); f.connect(g); g.connect(tonalBus);
      o.start(t); o2.start(t); o.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
    }

    // Chords: wide supersaws (several detuned saws per note), brighter in the drops
    if (step.pad) {
      const wave = st.padWave ?? 'sawtooth';
      const spread = wave === 'sawtooth' ? [-14, -5, 5, 14] : [-8, 8];
      for (const m of step.pad) voice(m, wave, len * 8, wave === 'sawtooth' ? 0.016 : 0.03, { filter: drop ? 2600 : 1200, attack: 0.18, spread, reverb: verb + 0.1 });
    }
    if (step.stab) for (const m of step.stab) voice(m, 'sawtooth', len * 0.7, 0.03, { filter: 3000, spread: [-10, 10] });
    if (step.arp) voice(step.arp + (intensity ? 12 : 0), st.arp.wave, len * 0.9, st.arp.vol, { filter: st.arp.filter });
    if (step.bell) { voice(step.bell, 'sine', len * 6, 0.07); voice(step.bell + 19, 'sine', len * 2, 0.02); }
    if (step.harp) voice(step.harp, 'triangle', len * 5, 0.05);
    if (step.lead) {
      const L = st.lead;
      voice(step.lead + (intensity ? 12 : 0), L.wave, len * L.len, L.vol, { filter: L.filter, spread: L.wave === 'sawtooth' ? [-9, 0, 9] : null });
    }
  }

  // Echo lands on the beat (three 16th-notes later), as loud as the style wants.
  function applyEcho() {
    if (!ctx || !song) return;
    echoDelay.delayTime.value = Math.min(1.4, (60 / song.music.tempo / 4) * 3);
    echoWet.gain.setTargetAtTime(song.style.delay ?? 0, ctx.currentTime, 0.1);
  }

  function schedule() {
    if (!ctx || !song) return;
    const len = 60 / (song.music.tempo * (intensity ? 1.08 : 1)) / 4;
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05;
    while (nextTime < ctx.currentTime + 0.15) {
      // Swing: every second step comes in a little late (Time Warp's clock feel).
      const swing = songStep % 2 ? (song.style.swing ?? 0) * len : 0;
      playStep(song.steps[songStep % song.steps.length], nextTime + swing);
      songStep++;
      nextTime += len;
    }
  }

  return {
    // Call from a key press or click.
    unlock() {
      const fresh = !ctx;
      init();
      if (ctx?.state === 'suspended') ctx.resume();
      if (fresh) applyEcho();
    },

    setSettings(s) {
      settings = { ...settings, ...s };
      applySettings();
    },

    play(name) { if (ctx && SFX[name]) SFX[name](); },
    horn(id) { if (ctx) (HORNS[id] ?? HORNS.beep)(); },
    hornPreview(id) { this.unlock(); this.horn(id); },

    // amount 0..1 (boost), on = engine running.
    setEngine(on, amount = 0) {
      if (!engine) return;
      const t = ctx.currentTime;
      engine.gain.gain.setTargetAtTime(on ? 0.05 + amount * 0.05 : 0, t, 0.1);
      for (const o of engine.oscs) o.frequency.setTargetAtTime(55 + amount * 55, t, 0.15);
      engine.filter.frequency.setTargetAtTime(350 + amount * 1400, t, 0.15);
    },

    // Start a level's tune (boss = faster, higher).
    music(level, boss = false) {
      intensity = boss ? 1 : 0;
      if (song?.music !== level.music) {
        song = makeSong(level.music, level.n * 7 + 3, LEVEL_STYLE[level.n]);
        songStep = 0;
        applyEcho();
      }
      if (!timer) timer = setInterval(schedule, 25);
    },

    stopMusic() {
      clearInterval(timer);
      timer = null;
    },
  };
}
