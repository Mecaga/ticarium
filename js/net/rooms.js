import { login, db, ref, set, get, update, remove, onValue, onDisconnect } from '../core/firebase.js';

let loginP = null, myUid = null;
const ready = () => loginP || (loginP = login().then(id => (myUid = id)).catch(e => { loginP = null; throw e; }));

let current = null;
const bgs = new Map();   // host menüye dönünce açık kalan odalar (arka plan yenilemesi)
const CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const genCode = () => Array.from({ length: 6 }, () => CH[Math.floor(Math.random() * CH.length)]).join('');
const STALE = 5 * 60 * 1000;
const cloudMod = () => import('./cloud.js');

// Herkese açık listedeki kaydı canlı tutar
function startBeat(cur) {
  stopBeat(cur);
  if (!cur.meta.public) return;
  cur.pubRef = ref(db, `publicRooms/${cur.code}`);
  const obj = () => ({
    owner: myUid, name: cur.meta.name, ownerName: cur.ownerName, created: cur.meta.created,
    updated: Date.now(), max: cur.max, count: cur.cnt, kind: cur.meta.kind || 'normal'
  });
  set(cur.pubRef, obj()).catch(() => {});
  cur.beat = setInterval(() => { set(cur.pubRef, obj()).catch(() => {}); }, 30000);
  cur.offCount = onValue(ref(db, `rooms/${cur.code}/players`), s => {
    cur.cnt = s.size;
    update(cur.pubRef, { count: cur.cnt, updated: Date.now() }).catch(() => {});
  });
}
function stopBeat(cur) {
  if (cur.beat) clearInterval(cur.beat);
  if (cur.offCount) { try { cur.offCount(); } catch (e) {} }
  cur.beat = cur.offCount = null;
}

async function copyTo(path, obj) {
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i += 300) {
    const part = {};
    for (const k of keys.slice(i, i + 300)) part[k] = obj[k];
    await update(ref(db, path), part);
  }
}

// Odadaki değişiklikleri dünyaya geri yaz
async function syncBack(code, wid) {
  if (!wid) return;
  const C = await cloudMod();
  const b = await get(ref(db, `rooms/${code}/blocks`));
  const p = await get(ref(db, `rooms/${code}/paints`));
  await C.replaceWorldData(wid, b.exists() ? b.val() : {}, p.exists() ? p.val() : {});
}

async function enterRoom(code, meta, playerName) {
  const pref = ref(db, `rooms/${code}/players/${myUid}`);
  await set(pref, { name: playerName, joined: Date.now() });
  const od = onDisconnect(pref);
  od.remove();
  const isOwner = meta.owner === myUid;
  const cur = { code, isOwner, pref, od, wid: meta.wid || null, meta, ownerName: playerName, cnt: 1, max: meta.max || 8, beat: null, offCount: null, pubRef: null };
  if (isOwner) {
    const old = bgs.get(code);
    if (old) { stopBeat(old); bgs.delete(code); }
    startBeat(cur);
  }
  current = cur;
  return {
    code, name: meta.name, seed: meta.seed, kind: meta.kind || 'normal', wid: meta.wid || null,
    isOwner, solo: false, playerName, pvp: !!meta.pvp, max: meta.max || 8, keep: !!meta.keep, public: !!meta.public,
    saveKey: meta.wid ? meta.owner + '_' + meta.wid : 'room_' + code
  };
}

// Kayıtlı dünyadan oda açar (varsa mevcut odayı kullanır). enter=true ise hemen girer.
export async function hostWorld({ wid, name, isPublic, pvp, keep, maxPlayers, playerName, enter }) {
  await ready();
  const C = await cloudMod();
  const w = await C.loadWorld(wid);
  let code = w.meta.room || null, exists = false, meta = null;
  if (code) {
    const s = await get(ref(db, `rooms/${code}/meta`));
    if (s.exists() && !s.val().closed) { exists = true; meta = s.val(); }
  }
  const wname = name || w.meta.name;
  if (!exists) {
    for (let i = 0; i < 6 && !exists; i++) {
      const c = genCode();
      const s = await get(ref(db, `rooms/${c}/meta`));
      if (!s.exists()) { code = c; break; }
      code = null;
    }
    if (!code) throw new Error('Kod üretilemedi, tekrar dene');
    meta = {
      owner: myUid, wid, name: wname, public: !!isPublic, seed: w.meta.seed, kind: w.meta.kind || 'normal',
      created: Date.now(), pvp: !!pvp, max: maxPlayers || 8, keep: !!keep, closed: false
    };
    await set(ref(db, `rooms/${code}/meta`), meta);
    if (Object.keys(w.changes).length) await copyTo(`rooms/${code}/blocks`, w.changes);
    if (Object.keys(w.paints).length) await copyTo(`rooms/${code}/paints`, w.paints);
    await C.setWorldRoom(wid, code);
  } else {
    const patch = { name: wname, public: !!isPublic };
    if (pvp != null) patch.pvp = !!pvp;
    if (keep != null) patch.keep = !!keep;
    if (maxPlayers) patch.max = maxPlayers;
    await update(ref(db, `rooms/${code}/meta`), patch);
    meta = { ...meta, ...patch };
  }
  if (!meta.public) remove(ref(db, `publicRooms/${code}`)).catch(() => {});
  if (enter) return enterRoom(code, meta, playerName);
  const old = bgs.get(code);
  if (old) stopBeat(old);
  const cur = { code, meta, ownerName: playerName, cnt: 0, max: meta.max || 8, beat: null, offCount: null, pubRef: null };
  startBeat(cur);
  bgs.set(code, cur);
  return { code };
}

export async function joinRoom(codeRaw, playerName) {
  await ready();
  const code = (codeRaw || '').trim().toUpperCase();
  if (code.length !== 6) throw new Error('Kod 6 haneli olmalı');
  const s = await get(ref(db, `rooms/${code}/meta`));
  if (!s.exists()) throw new Error('Oda bulunamadı');
  const meta = s.val();
  if (meta.closed) throw new Error('Bu oda kapatıldı');
  if (meta.owner !== myUid) {
    const ps = await get(ref(db, `rooms/${code}/players`));
    let n = 0;
    ps.forEach(c => { if (c.key !== myUid) n++; });
    if (n >= (meta.max || 8)) throw new Error('Oda dolu (' + (meta.max || 8) + ' kişilik)');
  }
  return enterRoom(code, meta, playerName);
}

export async function roomState(code) {
  await ready();
  const s = await get(ref(db, `rooms/${code}/meta`));
  if (!s.exists()) return { exists: false };
  const v = s.val();
  let count = 0;
  if (v.public) { try { const c = await get(ref(db, `publicRooms/${code}/count`)); count = c.val() || 0; } catch (e) {} }
  return { exists: true, closed: !!v.closed, public: !!v.public, name: v.name, count };
}

// Odayı kapatır: dünyaya geri yazar, herkesi atar, listeden kaldırır
export async function closeRoom(code, wid) {
  await ready();
  const bg = bgs.get(code);
  if (bg) { stopBeat(bg); bgs.delete(code); }
  const C = await cloudMod();
  const ms = await get(ref(db, `rooms/${code}/meta`));
  const w = wid || (ms.exists() ? ms.val().wid : null);
  if (ms.exists()) {
    try { await syncBack(code, w); } catch (e) {}
    await update(ref(db, `rooms/${code}/meta`), { closed: true });
  }
  await remove(ref(db, `publicRooms/${code}`)).catch(() => {});
  if (w) await C.setWorldRoom(w, null).catch(() => {});
  setTimeout(() => { remove(ref(db, `rooms/${code}`)).catch(() => {}); }, 8000);
}

export async function updateSettings(patch) {
  if (!current) throw new Error('Odada değilsin');
  await update(ref(db, `rooms/${current.code}/meta`), patch);
  if (patch.max) {
    current.max = patch.max;
    if (current.pubRef) update(current.pubRef, { max: patch.max }).catch(() => {});
  }
}

// keepOpen: host çıkarken oda açık kalsın mı (diğer oyuncular devam eder)
export async function leaveRoom(opts = {}) {
  if (!current) return;
  const c = current;
  current = null;
  try { c.od.cancel(); } catch (e) {}
  try { await remove(c.pref); } catch (e) {}
  if (!c.isOwner) return;
  await new Promise(r => setTimeout(r, 500));   // son blok yazımlarının gitmesini bekle
  try { await syncBack(c.code, c.wid); } catch (e) {}
  if (opts.keepOpen) {
    c.cnt = Math.max(0, c.cnt - 1);
    bgs.set(c.code, c);   // arka planda listede canlı kalır
  } else {
    stopBeat(c);
    await closeRoom(c.code, c.wid);
  }
}

export async function watchPublicRooms(cb) {
  await ready();
  return onValue(ref(db, 'publicRooms'), snap => {
    const arr = [];
    const now = Date.now();
    snap.forEach(ch => {
      const v = ch.val() || {};
      if (now - (v.updated || v.created || 0) < STALE) arr.push({ code: ch.key, ...v });
    });
    arr.sort((a, b) => b.created - a.created);
    cb(arr, null);
  }, e => cb(null, e));
      }
