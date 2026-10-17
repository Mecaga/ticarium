import { login, db, ref, set, get, remove, onValue, onDisconnect } from './firebase.js';

let loginP = null, myUid = null;
const ready = () => loginP || (loginP = login().then(id => (myUid = id)));

let current = null;
const CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const genCode = () => Array.from({ length: 6 }, () => CH[Math.floor(Math.random() * CH.length)]).join('');
const STALE = 5 * 60 * 1000;

async function enterRoom(code, meta, playerName) {
  const pref = ref(db, `rooms/${code}/players/${myUid}`);
  await set(pref, { name: playerName, joined: Date.now() });
  const od = onDisconnect(pref);
  od.remove();

  const isOwner = meta.owner === myUid;
  let beat = null;
  if (isOwner && meta.public) {
    const pubRef = ref(db, `publicRooms/${code}`);
    const pub = () => ({ owner: myUid, name: meta.name, ownerName: playerName, created: meta.created, updated: Date.now() });
    await set(pubRef, pub());
    beat = setInterval(() => { set(pubRef, pub()).catch(() => {}); }, 30000);
  }
  current = { code, isOwner, pref, od, beat };
  return { code, name: meta.name, seed: meta.seed, isOwner, solo: false };
}

export async function createRoom({ name, isPublic, playerName }) {
  await ready();
  let code = null;
  for (let i = 0; i < 6; i++) {
    const c = genCode();
    const s = await get(ref(db, `rooms/${c}/meta`));
    if (!s.exists()) { code = c; break; }
  }
  if (!code) throw new Error('Kod üretilemedi, tekrar dene');
  const meta = { owner: myUid, name, public: !!isPublic, seed: Math.floor(Math.random() * 1e9), created: Date.now() };
  await set(ref(db, `rooms/${code}/meta`), meta);
  return enterRoom(code, meta, playerName);
}

export async function joinRoom(codeRaw, playerName) {
  await ready();
  const code = (codeRaw || '').trim().toUpperCase();
  if (code.length !== 6) throw new Error('Kod 6 haneli olmalı');
  const s = await get(ref(db, `rooms/${code}/meta`));
  if (!s.exists()) throw new Error('Oda bulunamadı');
  return enterRoom(code, s.val(), playerName);
}

export async function leaveRoom() {
  if (!current) return;
  const c = current;
  current = null;
  if (c.beat) clearInterval(c.beat);
  try { c.od.cancel(); } catch (e) {}
  try { await remove(c.pref); } catch (e) {}
  if (c.isOwner) { try { await remove(ref(db, `publicRooms/${c.code}`)); } catch (e) {} }
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
