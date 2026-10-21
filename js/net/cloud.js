import { db, ref, set, get, update, remove, push } from '../core/firebase.js';
import { login, uid, userName } from '../core/auth.js';

export const MAX_WORLDS = 6;

let lp = null;
export const ready = () => lp || (lp = login().catch(e => { lp = null; throw e; }));
const base = () => 'users/' + uid;

export async function diag() {
  try {
    const id = await ready();
    try { await get(ref(db, 'publicRooms')); }
    catch (e) { return '⚠️ Giriş tamam (' + id.slice(0, 6) + ') ama Firebase kuralları izin vermiyor: Rules → Publish'; }
    return '☁️ Bağlı · ' + userName;
  } catch (e) { return '❌ Giriş yapılamadı: ' + (e.code || e.message); }
}

// Profil: kullanıcı adı ve oyuncu adı hesabın UID'sine bağlı
export async function setProfile(name) {
  await ready();
  update(ref(db, base() + '/profile'), { name, username: userName, seen: Date.now() }).catch(() => {});
}

// ---- Kayıtlı dünyalar ----
export async function listWorlds() {
  await ready();
  const s = await get(ref(db, base() + '/worlds'));
  const a = [];
  s.forEach(c => {
    const v = c.val() || {};
    a.push({
      id: c.key, name: v.name || 'Dünya', kind: v.kind || 'normal', seed: v.seed,
      created: v.created || 0, updated: v.updated || 0, lastIn: v.lastIn || v.updated || v.created || 0, room: v.room || null
    });
  });
  a.sort((x, y) => y.lastIn - x.lastIn);
  return a;
}

async function batch(path, obj) {
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i += 300) {
    const part = {};
    keys.slice(i, i + 300).forEach(k => { part[k] = obj[k]; });
    await update(ref(db, path), part);
  }
}

export async function createWorld({ name, kind, seed }) {
  await ready();
  const s = await get(ref(db, base() + '/worlds'));
  if (s.size >= MAX_WORLDS) throw new Error('En fazla ' + MAX_WORLDS + ' dünya kaydedebilirsin. Birini sil.');
  const id = push(ref(db, base() + '/worlds')).key;
  const now = Date.now();
  await set(ref(db, base() + '/worlds/' + id), { name, kind: kind || 'normal', seed, created: now, updated: now, lastIn: now, v: 2 });
  return { id, name, kind: kind || 'normal', seed };
}

export async function renameWorld(id, name) {
  await ready();
  await update(ref(db, base() + '/worlds/' + id), { name, updated: Date.now() });
}

export async function deleteWorld(id) {
  await ready();
  await remove(ref(db, base() + '/worlds/' + id));
  await remove(ref(db, base() + '/wdata/' + id));
}

export async function loadWorld(id) {
  await ready();
  const [m, d] = await Promise.all([
    get(ref(db, base() + '/worlds/' + id)),
    get(ref(db, base() + '/wdata/' + id))
  ]);
  if (!m.exists()) throw new Error('Dünya bulunamadı');
  const v = d.val() || {};
  return { meta: m.val(), state: v.state || null, changes: v.changes || {}, paints: v.paints || {} };
}

// Dünyanın açık odasının kodu (yoksa null)
export async function setWorldRoom(id, code) {
  await ready();
  await update(ref(db, base() + '/worlds/' + id), { room: code || null });
}
export function touchWorld(id) {
  update(ref(db, base() + '/worlds/' + id), { lastIn: Date.now() }).catch(() => {});
}

export async function loadState(id) {
  await ready();
  const s = await get(ref(db, base() + '/wdata/' + id + '/state'));
  return s.exists() ? s.val() : null;
}

// Oda kapanırken/host çıkarken odadaki değişiklikler dünyaya geri yazılır
export async function replaceWorldData(id, changes, paints) {
  await ready();
  await set(ref(db, base() + '/wdata/' + id + '/changes'), changes && Object.keys(changes).length ? changes : null);
  await set(ref(db, base() + '/wdata/' + id + '/paints'), paints && Object.keys(paints).length ? paints : null);
}

// ---- Oynarken otomatik kayıt: blok değişiklikleri 4 sn'de bir toplu gider ----
let wid = null, pc = {}, pp = {}, timer = null;

export function startSaver(id) {
  dropSaver();
  wid = id;
  timer = setInterval(flush, 4000);
}
export function queueChange(k, t) { if (wid) pc[k] = t; }
export function queuePaint(k, d) { if (wid) pp[k] = d || null; }

export async function flush() {
  if (!wid) return;
  const id = wid, c = pc, p = pp;
  pc = {}; pp = {};
  try {
    if (Object.keys(c).length) await batch(base() + '/wdata/' + id + '/changes', c);
    if (Object.keys(p).length) await batch(base() + '/wdata/' + id + '/paints', p);
  } catch (e) {
    if (wid === id) { pc = Object.assign({}, c, pc); pp = Object.assign({}, p, pp); }
  }
}

export async function saveState(id, st) {
  try {
    await ready();
    await set(ref(db, base() + '/wdata/' + id + '/state'), st);
    await update(ref(db, base() + '/worlds/' + id), { updated: Date.now() });
    return true;
  } catch (e) { return false; }
}

export async function stopSaver() {
  await flush();
  dropSaver();
}
export function dropSaver() {
  if (timer) clearInterval(timer);
  timer = null; wid = null; pc = {}; pp = {};
      }
