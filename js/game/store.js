import { db, ref, set, get, remove, onValue } from '../core/firebase.js';
import { uid } from '../core/auth.js';
import { G } from '../core/state.js';

function base() {
  const r = G.room;
  if (!r || !r.wid) return null;
  const owner = r.solo ? uid : String(r.saveKey || '').split('_')[0];
  return owner ? 'users/' + owner + '/wdata/' + r.wid + '/store/' : null;
}
const k = (n, p) => n + '_' + p.join('_');
export const canStore = () => !!base();
export async function loadAt(n, p) {
  const b = base(); if (!b) return null;
  try { const s = await get(ref(db, b + k(n, p))); return s.exists() ? s.val() : null; } catch (e) { return null; }
}
export async function saveAt(n, p, d) {
  const b = base(); if (!b) return false;
  try { if (d) await set(ref(db, b + k(n, p)), d); else await remove(ref(db, b + k(n, p))); return true; } catch (e) { return false; }
}
export function watchAt(n, p, cb) {
  const b = base(); if (!b) return () => {};
  return onValue(ref(db, b + k(n, p)), s => cb(s.exists() ? s.val() : null));
}
