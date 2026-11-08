// Title screen, name picker, pause menu, settings and controls panels (all HTML over the game).
import { randomName } from './names.js';

const $ = (id) => document.getElementById(id);

export function createMenus({ onContinue, onNewGame, onResume, onRestart, onQuit, onSettings, onResetSave, onLeaders, onCheckOwner, onOwnerCode, onRename, getOwnerCode, ownerNameRule, sound }) {
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
    $('owner-form').hidden = true;
    $('owner-msg').textContent = '';
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
    continue: () => (hasName ? onContinue() : showName((name, code) => onContinue(name, code))),
    newgame: () => {
      if (!$('btn-continue').hidden && !confirm('Start a new game? Your saved progress will be lost.')) return;
      showName((name, code) => onNewGame(name, code));
    },
    reroll,
    namestart: () => afterName?.(pendingName),
    // Settings: owner only — change your name and keep all your progress and scores.
    ownerrename: async () => {
      const codeInput = $('set-owner-code');
      const nameInput = $('set-owner-name');
      const msg = $('set-owner-msg');
      const code = codeInput.value || getOwnerCode();
      const name = nameInput.value.trim().replace(/\s+/g, ' ');
      msg.style.color = '#ffb0b0';
      if (!ownerNameRule.test(name)) { msg.textContent = 'Use 1–20 letters, numbers, spaces or _ . ! -'; return; }
      if (!code) { msg.textContent = 'Enter your owner code first.'; return; }
      msg.style.color = '';
      msg.textContent = 'Checking…';
      if (!(await onCheckOwner(code))) { msg.style.color = '#ffb0b0'; msg.textContent = 'That code isn\'t right.'; return; }
      await onRename(name, code);
      codeInput.value = '';
      nameInput.value = '';
      msg.style.color = '#8dff9a';
      msg.textContent = `Done! You're now ${name}.`;
    },
    // Settings: store the owner code on this device (for names like Frosty Hamster 55).
    ownersave: async () => {
      const input = $('set-owner-code');
      const msg = $('set-owner-msg');
      msg.style.color = '';
      msg.textContent = 'Checking…';
      if (!(await onCheckOwner(input.value))) { msg.style.color = '#ffb0b0'; msg.textContent = 'That code isn\'t right.'; return; }
      onOwnerCode(input.value);
      input.value = '';
      msg.style.color = '#8dff9a';
      msg.textContent = 'Saved. Your owner names will count on the leaderboard.';
    },
    // Owner only: type your own name. The database checks the code.
    ownertoggle: () => { const f = $('owner-form'); f.hidden = !f.hidden; if (!f.hidden) $('owner-code').focus(); },
    ownerstart: async () => {
      const code = $('owner-code').value;
      const name = $('owner-name').value.trim().replace(/\s+/g, ' ');
      const msg = $('owner-msg');
      if (!ownerNameRule.test(name)) { msg.textContent = 'Use 1–20 letters, numbers, spaces or _ . ! -'; return; }
      msg.textContent = 'Checking…';
      if (!(await onCheckOwner(code))) { msg.textContent = 'That code isn\'t right.'; return; }
      msg.textContent = '';
      $('owner-code').value = '';
      afterName?.(name, code);
    },
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
  const graphics = $('set-graphics');
  const readSettings = () => onSettings({ volume: volume.value / 100, music: music.checked, sfx: sfx.checked, controls: controls.value, graphics: graphics.value });
  volume.addEventListener('input', readSettings);
  music.addEventListener('change', readSettings);
  sfx.addEventListener('change', readSettings);
  controls.addEventListener('change', readSettings);
  graphics.addEventListener('change', readSettings);

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
      graphics.value = s.graphics;
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
