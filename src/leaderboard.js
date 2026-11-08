// Daily and weekly online leaderboard, stored in Supabase (see docs/leaderboard-setup.sql).
// The game talks to three database functions: add_score, forget_player and leaderboard.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './leaderboard-config.js';

export const leaderboardOn = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY);

async function rpc(fn, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`leaderboard ${fn}: ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Points for one run: distance, material, and a big bonus for beating the level.
export function runPoints(level, meters, material, won) {
  return Math.max(0, Math.round(meters / 10 + material * 5 + (won ? 200 + 100 * level.n : 0)));
}

export function newPlayerId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  // Older browsers: build a random v4 UUID by hand.
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// Points wait in progress.pendingPoints until they reach the server, so a bad
// connection never loses them. Call after every run and when the game loads.
let sending = false;
export async function sendPoints(progress, save) {
  if (!leaderboardOn() || sending || !progress.name || !progress.playerId || !(progress.pendingPoints > 0)) return;
  sending = true;
  try {
    while (progress.pendingPoints > 0) {
      const chunk = Math.min(20000, progress.pendingPoints);
      const body = { p_player: progress.playerId, p_name: progress.name, p_points: chunk };
      if (progress.ownerCode) body.p_code = progress.ownerCode; // owner's typed name
      await rpc('add_score', body);
      progress.pendingPoints -= chunk;
      save();
    }
  } catch {
    // Offline or the server said no: try again after the next run.
  } finally {
    sending = false;
  }
}

// Owner names: the database checks the secret code (the game never knows the right one).
export const OWNER_NAME_RULE = /^[A-Za-z0-9 _.!-]{1,20}$/;
export async function checkOwnerCode(code) {
  if (!leaderboardOn()) return false;
  try { return (await rpc('check_owner', { p_code: code })) === true; } catch { return false; }
}

// Owner only: change the name on your existing scores.
export async function renamePlayer(progress) {
  if (!leaderboardOn() || !progress.playerId || !progress.ownerCode) return false;
  try {
    await rpc('rename_player', { p_player: progress.playerId, p_name: progress.name, p_code: progress.ownerCode });
    return true;
  } catch {
    return false;
  }
}

// Starting over: the old racer's scores are removed from the boards.
export async function forgetPlayer(playerId) {
  if (!leaderboardOn() || !playerId) return;
  try { await rpc('forget_player', { p_player: playerId }); } catch { /* not important */ }
}

// kind: 'day' or 'week'. Returns { top: [{ pos, name, points, me }], me, total }.
export async function fetchBoard(kind, playerId) {
  return rpc('leaderboard', { p_kind: kind, p_player: playerId ?? '00000000-0000-0000-0000-000000000000' });
}

// Draws a board into an element, with Today / This week buttons.
export function createBoardView(el, getProgress, sound = () => {}) {
  let kind = 'day';
  let token = 0;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  async function render() {
    const my = ++token;
    const progress = getProgress();
    el.innerHTML = `
      <div class="lb-kinds">
        <button class="chip${kind === 'day' ? ' on' : ''}" data-kind="day">Today</button>
        <button class="chip${kind === 'week' ? ' on' : ''}" data-kind="week">This week</button>
      </div>
      <div class="lb-body"><p class="note">Loading…</p></div>`;
    el.querySelectorAll('[data-kind]').forEach((b) => b.addEventListener('click', () => { sound('ui'); kind = b.dataset.kind; render(); }));
    const body = el.querySelector('.lb-body');
    if (!leaderboardOn()) {
      body.innerHTML = '<p class="note">The online leaderboard isn\'t switched on yet.</p>';
      return;
    }
    try {
      await sendPoints(progress, () => {});
      const data = await fetchBoard(kind, progress.playerId);
      if (my !== token) return; // a newer render started
      const row = (r) => `<li class="${r.me ? 'me' : ''}"><span class="pos">#${r.pos}</span><span class="nm">${esc(r.name)}</span><b>${r.points.toLocaleString()}</b></li>`;
      const top = data.top ?? [];
      const meInTop = top.some((r) => r.me);
      body.innerHTML = `
        <ol class="lb-list">${top.length ? top.map(row).join('') : '<li class="empty">No scores yet — be the first!</li>'}</ol>
        ${data.me && !meInTop ? `<ol class="lb-list lb-me">${row({ ...data.me, me: true })}</ol>` : ''}
        <p class="lb-you">${data.me
    ? `Your position: <b>#${data.me.pos}</b> of ${data.total} · ${data.me.points.toLocaleString()} points`
    : progress.name ? `${esc(progress.name)} isn't on this board yet — finish a run to get points!` : 'Start a game to get a name and join the board.'}</p>
        ${progress.pendingPoints > 0 ? `<p class="note">${progress.pendingPoints} points waiting to send (no connection?)</p>` : ''}
        <p class="note">${kind === 'day' ? 'Resets every day at midnight (UTC).' : 'Resets every Monday (UTC).'} Starting a new game drops your old name's scores.</p>`;
    } catch {
      if (my !== token) return;
      body.innerHTML = '<p class="note">Couldn\'t reach the leaderboard. Check your internet connection and try again.</p>';
    }
  }
  return { render };
}
