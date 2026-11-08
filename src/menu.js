// Title screen, name picker, pause menu, settings and controls panels (all HTML over the game).
import { randomName } from './names.js';

const $ = (id) => document.getElementById(id);

export function createMenus({ onContinue, onNewGame, onResume, onRestart, onQuit, onSettings, onResetSave, onLeaders, sound }) {
  const panels = { title: $('menu-title'), name: $('menu-name'), leaders: $('menu-leaders'), pause: $('menu-pause'), settings: $('menu-settings'), controls: $('menu-controls') };
  const root = $('menus');
  let current = null;
  let back = null; // panel to return to from settings/controls
  let hasName = false;
  let pendingName = '';
  let afterName = null; // what to do once a name is picked

  // Name picker: a random name you can re-roll, then it's locked in.
  const showName = (then) => {
    afterName = then;
    pendingName = randomName();
    $('name-value').textContent = pendingName;
    show('name');
  };
  const reroll = () => {
    pendingName = randomName();
    $('name-value').textContent = pendingName;
    const b = panels.name.querySelector('.reroll');
    b.classList.toggle('spin');
  };

  const show = (name) => {
    current = name;
    root.style.display = name ? 'flex' : 'none';
    for (const [k, el] of Object.entries(panels)) el.style.display = k === name ? 'flex' : 'none';
  };

  // Buttons: data-action attributes in index.html.
  const actions = {
    // Old saves from before names existed pick a name first.
    continue: () => (hasName ? onContinue() : showName((name) => onContinue(name))),
    newgame: () => {
      if (!$('btn-continue').hidden && !confirm('Start a new game? Your saved progress will be lost.')) return;
      showName((name) => onNewGame(name));
    },
    reroll,
    namestart: () => afterName?.(pendingName),
    nameback: () => show('title'),
    resume: () => onResume(),
    restart: () => onRestart(),
    quit: () => onQuit(),
    settings: () => { back = current; show('settings'); },
    controls: () => { back = current; show('controls'); },
    leaders: () => { back = current; show('leaders'); onLeaders?.(); },
    back: () => show(back ?? 'title'),
    resetsave: () => {
      if (confirm('Delete all saved progress, coins and records? This cannot be undone.')) onResetSave();
    },
  };
  root.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    sound('ui');
    actions[btn.dataset.action]?.();
  });

  const volume = $('set-volume');
  const music = $('set-music');
  const sfx = $('set-sfx');
  const controls = $('set-controls');
  const readSettings = () => onSettings({ volume: volume.value / 100, music: music.checked, sfx: sfx.checked, controls: controls.value });
  volume.addEventListener('input', readSettings);
  music.addEventListener('change', readSettings);
  sfx.addEventListener('change', readSettings);
  controls.addEventListener('change', readSettings);

  return {
    get open() { return current; },
    // name: your racer name ('' if you don't have one yet).
    showTitle(hasSave, name = '') {
      hasName = !!name;
      const btn = $('btn-continue');
      btn.hidden = !hasSave;
      btn.textContent = name ? `Continue as ${name}` : 'Continue';
      show('title');
    },
    showPause() { show('pause'); },
    hide() { show(null); },
    setSettings(s) {
      volume.value = Math.round(s.volume * 100);
      music.checked = s.music;
      sfx.checked = s.sfx;
      controls.value = s.controls;
    },
    // Keyboard: Enter picks the first button, Esc goes back / resumes.
    handleKeys(input) {
      if (!current) return;
      if (current === 'name') {
        if (input.wasPressed('Enter')) { sound('ui'); actions.namestart(); }
        else if (input.wasPressed('KeyR')) { sound('ui'); reroll(); }
        else if (input.wasPressed('Escape')) actions.nameback();
        return;
      }
      if (input.wasPressed('Enter')) {
        const first = [...panels[current].querySelectorAll('button[data-action]')].find((b) => !b.hidden);
        first?.click();
      } else if (input.wasPressed('Escape')) {
        if (current === 'settings' || current === 'controls' || current === 'leaders') actions.back();
        else if (current === 'pause') onResume();
      }
    },
  };
}
