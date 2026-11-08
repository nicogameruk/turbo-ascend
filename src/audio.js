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
    whoosh: () => { noise({ dur: 0.6, vol: 0.25, freq: 300, type: 'bandpass', sweep: 4 }); },
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
    fanfare: () => { [0, 4, 7, 12].forEach((s, i) => tone(mtof(67 + s), { type: 'square', at: i * 0.1, dur: i === 3 ? 0.4 : 0.12, vol: 0.14 })); },
  };

  // Build a 2-bar loop (32 steps) from the level's root, scale and a seed.
  function makeSong(music, seed) {
    const r = seeded(seed);
    const note = (deg, oct = 0) => {
      const s = music.scale;
      const i = ((deg % s.length) + s.length) % s.length;
      return music.root + s[i] + 12 * (oct + Math.floor(deg / s.length));
    };
    const chords = [0, Math.floor(r() * 3) + 3, Math.floor(r() * 2) + 4, Math.floor(r() * 4)];
    const steps = [];
    for (let i = 0; i < 32; i++) {
      const chord = chords[Math.floor(i / 8)];
      const step = { kick: i % 8 === 0 || (i % 8 === 6 && r() < 0.4), snare: i % 8 === 4, hat: i % 2 === 1 };
      if (i % 4 === 0 || (i % 4 === 3 && r() < 0.5)) step.bass = note(chord, -1);
      if (r() < 0.55) step.lead = note(chord + [0, 2, 4, 7][Math.floor(r() * 4)], 1);
      steps.push(step);
    }
    return { music, steps };
  }

  function playStep(step, t) {
    const len = 60 / (song.music.tempo * (intensity ? 1.08 : 1)) / 4;
    const bus = musicBus;
    if (step.kick) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      g.gain.setValueAtTime(0.9, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.22);
    }
    const nz = (dur, vol, freq, type) => {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      const f = ctx.createBiquadFilter();
      f.type = type; f.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(bus);
      src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.01);
    };
    if (step.snare) nz(0.15, 0.35, 1800, 'bandpass');
    if (step.hat) nz(0.04, intensity ? 0.2 : 0.12, 7000, 'highpass');
    const voice = (m, type, dur, vol) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = mtof(m);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.02);
    };
    if (step.bass) voice(step.bass, 'triangle', len * 3, 0.5);
    if (step.lead) voice(step.lead + (intensity ? 12 : 0), song.music.lead, len * 1.6, 0.12);
  }

  function schedule() {
    if (!ctx || !song) return;
    const len = 60 / (song.music.tempo * (intensity ? 1.08 : 1)) / 4;
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05;
    while (nextTime < ctx.currentTime + 0.15) {
      playStep(song.steps[songStep % song.steps.length], nextTime);
      songStep++;
      nextTime += len;
    }
  }

  return {
    // Call from a key press or click.
    unlock() {
      init();
      if (ctx?.state === 'suspended') ctx.resume();
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
        song = makeSong(level.music, level.n * 7 + 3);
        songStep = 0;
      }
      if (!timer) timer = setInterval(schedule, 25);
    },

    stopMusic() {
      clearInterval(timer);
      timer = null;
    },
  };
}
