// Title screen, pause menu, settings and controls panels (all HTML over the game).
const $ = (id) => document.getElementById(id);

export function createMenus({ onContinue, onNewGame, onResume, onRestart, onQuit, onSettings, onResetSave, sound }) {
  const panels = { title: $('menu-title'), pause: $('menu-pause'), settings: $('menu-settings'), controls: $('menu-controls') };
  const root = $('menus');
  let current = null;
  let back = null; // panel to return to from settings/controls

  const show = (name) => {
    current = name;
    root.style.display = name ? 'flex' : 'none';
    for (const [k, el] of Object.entries(panels)) el.style.display = k === name ? 'flex' : 'none';
  };

  // Buttons: data-action attributes in index.html.
  const actions = {
    continue: () => onContinue(),
    newgame: () => {
      if (!$('btn-continue').hidden && !confirm('Start a new game? Your saved progress will be lost.')) return;
      onNewGame();
    },
    resume: () => onResume(),
    restart: () => onRestart(),
    quit: () => onQuit(),
    settings: () => { back = current; show('settings'); },
    controls: () => { back = current; show('controls'); },
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
  const readSettings = () => onSettings({ volume: volume.value / 100, music: music.checked, sfx: sfx.checked });
  volume.addEventListener('input', readSettings);
  music.addEventListener('change', readSettings);
  sfx.addEventListener('change', readSettings);

  return {
    get open() { return current; },
    showTitle(hasSave) {
      $('btn-continue').hidden = !hasSave;
      show('title');
    },
    showPause() { show('pause'); },
    hide() { show(null); },
    setSettings(s) {
      volume.value = Math.round(s.volume * 100);
      music.checked = s.music;
      sfx.checked = s.sfx;
    },
    // Keyboard: Enter picks the first button, Esc goes back / resumes.
    handleKeys(input) {
      if (!current) return;
      if (input.wasPressed('Enter')) {
        const first = [...panels[current].querySelectorAll('button[data-action]')].find((b) => !b.hidden);
        first?.click();
      } else if (input.wasPressed('Escape')) {
        if (current === 'settings' || current === 'controls') actions.back();
        else if (current === 'pause') onResume();
      }
    },
  };
}
