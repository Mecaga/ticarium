import { login, db, ref, set, get, update, remove, onValue, onDisconnect } from './firebase.js';

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
  const cur = {
    code, isOwner, pref, od, beat: null, offCount: null, pubRef: null,
    cnt: 1, max: meta.max || 8
  };
  if (isOwner && meta.public) {
    cur.pubRef = ref(db, `publicRooms/${code}`);
    const pubObj = () => ({
      owner: myUid, name: meta.name, ownerName: playerName, created: meta.created,
      updated: Date.now(), max: cur.max, count: cur.cnt
    });
    await set(cur.pubRef, pubObj());
    cur.beat = setInterval(() => { set(cur.pubRef, pubObj()).catch(() => {}); }, 30000);
    cur.offCount = onValue(ref(db, `rooms/${code}/players`), s => {
      cur.cnt = s.size;
      update(cur.pubRef, { count: cur.cnt, updated: Date.now() }).catch(() => {});
    });
  }
  current = cur;
  return {
    code, name: meta.name, seed: meta.seed, isOwner, solo: false, playerName,
    pvp: !!meta.pvp, max: meta.max || 8, keep: !!meta.keep
  };
}

// Kayıtlı dünyayı yeni odaya kopyalar (300'lük paketlerle)
async function copyBlocks(code, blocks) {
  const keys = Object.keys(blocks);
  for (let i = 0; i < keys.length; i += 300) {
    const part = {};
    for (const k of keys.slice(i, i + 300)) part[k] = Number(blocks[k]) || 0;
    await update(ref(db, `rooms/${code}/blocks`), part);
  }
}

// source: { type:'random' } | { type:'solo', seed, changes } | { type:'room', code }
export async function createRoom({ name, isPublic, playerName, pvp, maxPlayers, keep, source }) {
  await ready();
  let code = null;
  for (let i = 0; i < 6; i++) {
    const c = genCode();
    const s = await get(ref(db, `rooms/${c}/meta`));
    if (!s.exists()) { code = c; break; }
  }
  if (!code) throw new Error('Kod üretilemedi, tekrar dene');

  let seed = Math.floor(Math.random() * 1e9) + 1;
  let blocks = null;
  if (source && source.type === 'solo') {
    seed = source.seed;
    blocks = source.changes || {};
  } else if (source && source.type === 'room') {
    const m = await get(ref(db, `rooms/${source.code}/meta`));
    if (!m.exists() || m.val().owner !== myUid) throw new Error('Kaynak oda bulunamadı');
    seed = m.val().seed;
    const b = await get(ref(db, `rooms/${source.code}/blocks`));
    blocks = b.exists() ? b.val() : {};
  }

  const meta = {
    owner: myUid, name, public: !!isPublic,
    seed, created: Date.now(),
    pvp: !!pvp, max: maxPlayers || 8, keep: !!keep
  };
  await set(ref(db, `rooms/${code}/meta`), meta);
  if (blocks) await copyBlocks(code, blocks);
  return enterRoom(code, meta, playerName);
}

export async function joinRoom(codeRaw, playerName) {
  await ready();
  const code = (codeRaw || '').trim().toUpperCase();
  if (code.length !== 6) throw new Error('Kod 6 haneli olmalı');
  const s = await get(ref(db, `rooms/${code}/meta`));
  if (!s.exists()) throw new Error('Oda bulunamadı');
  const meta = s.val();
  if (meta.owner !== myUid) {
    const ps = await get(ref(db, `rooms/${code}/players`));
    let n = 0;
    ps.forEach(c => { if (c.key !== myUid) n++; });
    if (n >= (meta.max || 8)) throw new Error('Oda dolu (' + (meta.max || 8) + ' kişilik)');
  }
  return enterRoom(code, meta, playerName);
}

// Yerel listedeki odaların gerçekten sana ait olup olmadığını kontrol eder
export async function checkOwned(list) {
  await ready();
  return Promise.all(list.map(async m => {
    try {
      const s = await get(ref(db, `rooms/${m.code}/meta`));
      if (!s.exists()) return { code: m.code, name: m.name, status: 'gone' };
      const v = s.val();
      return { code: m.code, name: v.name || m.name, status: v.owner === myUid ? 'own' : 'other' };
    } catch (e) {
      return { code: m.code, name: m.name, status: 'err' };
    }
  }));
}

export async function updateSettings(patch) {
  if (!current) throw new Error('Odada değilsin');
  await update(ref(db, `rooms/${current.code}/meta`), patch);
  if (patch.max) {
    current.max = patch.max;
    if (current.pubRef) update(current.pubRef, { max: patch.max }).catch(() => {});
  }
}

export async function leaveRoom() {
  if (!current) return;
  const c = current;
  current = null;
  if (c.beat) clearInterval(c.beat);
  if (c.offCount) { try { c.offCount(); } catch (e) {} }
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
