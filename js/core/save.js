// Eski yerel (cihazdaki) kayıt: sadece buluta aktarmak için duruyor.
const KEY = 'tc_solo_v2';
const MINE = 'tc_mine_v1';

// session.js: dünyayı sil denince bulut kaydını siler
export const saveHooks = { onDelete: null };

export function loadSolo() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    return s && s.seed ? s : null;
  } catch (e) { return null; }
}
export const hasSolo = () => !!loadSolo();
export function clearLocal() {
  try { localStorage.removeItem(KEY); } catch (e) {}
}
export function clearSolo() {
  if (saveHooks.onDelete) saveHooks.onDelete();
  else clearLocal();
}

export function getMine() {
  try {
    const a = JSON.parse(localStorage.getItem(MINE));
    return Array.isArray(a) ? a : [];
  } catch (e) { return []; }
}
export function addMine(code, name) {
  const a = getMine().filter(m => m.code !== code);
  a.unshift({ code, name, t: Date.now() });
  try { localStorage.setItem(MINE, JSON.stringify(a.slice(0, 20))); } catch (e) {}
}
export function removeMine(code) {
  const a = getMine().filter(m => m.code !== code);
  try { localStorage.setItem(MINE, JSON.stringify(a)); } catch (e) {}
}
