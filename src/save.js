// Auto-save in the browser (localStorage). Everything is wrapped in try/catch:
// private windows or blocked storage just mean nothing gets saved.
const KEY = 'turbo-ascend-save-v1';

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeSave(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // ignore: saving is a convenience
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
