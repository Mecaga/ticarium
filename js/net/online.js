import { db, ref, set, update, remove, push, get as dbGet, onValue } from '../core/firebase.js';
import { uid } from '../core/auth.js';
import { onChildAdded, onChildChanged, onChildRemoved, runTransaction, query, limitToLast } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { set as setBlock, rebuild, TYPES, losBlocked } from '../world/world.js';
import { P, knock } from '../entities/player.js';
import { eco, net, clampRaw, priceOf } from '../game/economy.js';
import { hooks as ih, spawnItem, removeItem, clearItems } from '../entities/items.js';
import { hurt, canHurt, hp } from '../entities/health.js';
import { mhooks, spawnAnimals, applyRemote, hurtMob } from '../entities/mobs.js';
import { makeAvatar, tint, animateAvatar } from '../entities/avatars.js';
import { setPaint, removePaint } from '../world/paints.js';
import { G } from '../core/state.js';
import { mineHooks, makeCrack } from '../game/mining.js';

const DMG = 4;
const pvp = { on: false };

let code = null, scene = null, timer = null, beatT = null, dirty = false;
let unsubs = [];
let others = {};
let last = '';
let cb = {};
let ownerId = null, myName = '?', saveKey = '', plist = [], cnt = 0, isPub = false, closedFired = false;
let primed = false, lastHit = {}, lastDied = {}, lastSw = {};
let chatLive = false, chatTimer = null;
let outB = {}, outT = 0;
const group = new THREE.Group();

function scheduleRebuild() {
  if (dirty) return;
  dirty = true;
  setTimeout(() => { dirty = false; rebuild(); }, 60);
}

function flushBlocks() {
  outT = 0;
  const o = outB;
  outB = {};
  if (!code || !Object.keys(o).length) return;
  update(ref(db, `rooms/${code}/blocks`), o).catch(() => {});
}

// Oda yönetimi (hayvanlar, su/lav akışı): oda sahibi içerideyse onda, değilse en eski katılan oyuncuda
function recomputeSim() {
  if (!G.room || !plist.length) return;
  let best = null;
  for (const p of plist) {
    const j = p.id === ownerId ? -1 : p.j;
    if (!best || j < best.j || (j === best.j && p.id < best.id)) best = { id: p.id, j };
  }
  const v = !!best && best.id === uid;
  if (G.room.sim !== v) { G.room.sim = v; if (cb.onSim) cb.onSim(v); }
}

// opts: { isOwner, pvp, name, saveKey, onPrices, onMeta, onCount, onBlock, onChat, onKill, onSim, onClosed }
export function startOnline(sc, roomCode, opts = {}) {
  stopOnline();
  scene = sc; code = roomCode; cb = opts;
  myName = opts.name || '?';
  saveKey = opts.saveKey || ('room_' + roomCode);
  pvp.on = !!opts.pvp;
  primed = false; lastHit = {}; lastDied = {}; lastSw = {}; ownerId = null; plist = []; closedFired = false;
  chatLive = false;
  scene.add(group);

  // Oda ayarları ve kapanma
  unsubs.push(onValue(ref(db, `rooms/${code}/meta`), snap => {
    const m = snap.val();
    if (!m || m.closed) {
      if (!closedFired) { closedFired = true; if (cb.onClosed) cb.onClosed(); }
      return;
    }
    ownerId = m.owner;
    pvp.on = !!m.pvp;
    isPub = !!m.public;
    recomputeSim();
    if (cb.onMeta) cb.onMeta({ pvp: pvp.on, max: m.max || 8, keep: !!m.keep });
  }));

  // Herkese açık listeyi, oda sahibi yokken en eski oyuncu canlı tutar
  beatT = setInterval(() => {
    const r = G.room;
    if (!code || !isPub || !r || !r.sim || r.isOwner) return;
    set(ref(db, `publicRooms/${code}/updated`), Date.now()).catch(() => {});
    set(ref(db, `publicRooms/${code}/count`), cnt).catch(() => {});
  }, 30000);

  // Başkalarının blok kırışı: çatlak animasyonu bu cihazda da görünür
  mineHooks.onProgress = (x, y, z, s) => {
    if (!code) return;
    update(ref(db, `rooms/${code}/players/${uid}`), { mine: x == null ? null : { x, y, z, s, n: Date.now() } }).catch(() => {});
  };

  // Bloklar (su dahil, 17..24 seviyeli)
  const bref = ref(db, `rooms/${code}/blocks`);
  const apply = s => {
    const [x, y, z] = s.key.split('_').map(Number);
    const t = Number(s.val()) || 0;
    setBlock(x, y, z, t);
    scheduleRebuild();
    if (cb.onBlock) cb.onBlock(x, y, z, t);
  };
  unsubs.push(onChildAdded(bref, apply), onChildChanged(bref, apply));

  // Çizim blokları
  const pRef = ref(db, `rooms/${code}/paints`);
  const papply = s => { const [x, y, z] = s.key.split('_').map(Number); setPaint(x, y, z, String(s.val())); };
  unsubs.push(
    onChildAdded(pRef, papply), onChildChanged(pRef, papply),
    onChildRemoved(pRef, s => { const [x, y, z] = s.key.split('_').map(Number); removePaint(x, y, z); })
  );

  // Sohbet
  chatTimer = setTimeout(() => { chatLive = true; }, 1500);
  unsubs.push(onChildAdded(query(ref(db, `rooms/${code}/chat`), limitToLast(20)), s => {
    const v = s.val();
    if (v && cb.onChat) cb.onChat({ name: String(v.n || '?'), text: String(v.m || ''), mine: v.u === uid, live: chatLive });
  }));

  // Yerdeki eşyalar
  const iref = ref(db, `rooms/${code}/items`);
  ih.myId = uid;
  ih.push = arr => {
    const now = Date.now(), obj = {};
    arr.forEach((a, i) => {
      obj[uid.slice(0, 5) + now.toString(36) + i] = {
        t: a.t, c: a.c, x: a.x, y: a.y, z: a.z, vx: a.vx, vy: a.vy, vz: a.vz, by: a.by, n: now
      };
    });
    update(iref, obj).catch(() => {});
  };
  ih.take = async id => {
    const r = await runTransaction(ref(db, `rooms/${code}/items/${id}`), v => (v === null ? undefined : null));
    return r.committed;
  };
  ih.expire = id => { remove(ref(db, `rooms/${code}/items/${id}`)).catch(() => {}); };
  unsubs.push(
    onChildAdded(iref, s => spawnItem(s.key, s.val())),
    onChildRemoved(iref, s => removeItem(s.key))
  );

  // Hayvanlar: oda yönetimi sendeyse sen yönetirsin, değilse izlersin
  mhooks.send = obj => { if (code) update(ref(db, `rooms/${code}/mobs`), obj).catch(() => {}); };
  mhooks.remove = id => { if (code) remove(ref(db, `rooms/${code}/mobs/${id}`)).catch(() => {}); };
  let mobsFirst = true;
  unsubs.push(onValue(ref(db, `rooms/${code}/mobs`), snap => {
    const v = snap.val() || {};
    if (G.room && G.room.sim) {
      if (mobsFirst) { mobsFirst = false; if (Object.keys(v).length) applyRemote(v, true); spawnAnimals(); }
    } else applyRemote(v, false);
  }));
  // Diğer oyuncuların hayvanlara vuruşlarını oda yönetimi olan cihaz uygular
  unsubs.push(onChildAdded(ref(db, `rooms/${code}/mobhits`), s => {
    if (!(G.room && G.room.sim)) return;
    const v = s.val() || {};
    remove(s.ref).catch(() => {});
    if (Date.now() - (v.n || 0) < 10000 && v.id) hurtMob(String(v.id), v.d || 3, v.fx || 0, v.fz || 0);
  }));

  // Ortak fiyatlar
  net.active = true;
  net.owner = !!opts.isOwner;
  net.trade = (t, f) => {
    runTransaction(ref(db, `rooms/${code}/prices/t${t}`),
      v => clampRaw(t, (typeof v === 'number' ? v : eco.raw[t]) * f)).catch(() => {});
  };
  net.setPrice = (t, v) => { set(ref(db, `rooms/${code}/prices/t${t}`), v).catch(() => {}); };
  unsubs.push(onValue(ref(db, `rooms/${code}/prices`), snap => {
    const v = snap.val();
    if (!v) {
      if (net.owner) {
        const init = {};
        for (const t in TYPES) init['t' + t] = eco.raw[t];
        set(ref(db, `rooms/${code}/prices`), init).catch(() => {});
      }
      return;
    }
    for (const t in TYPES) {
      const nv = v['t' + t];
      if (typeof nv !== 'number') continue;
      const old = priceOf(t);
      eco.raw[t] = nv;
      eco.trend[t] = priceOf(t) - old;
    }
    if (cb.onPrices) cb.onPrices();
  }));

  // Diğer oyuncular
  unsubs.push(onValue(ref(db, `rooms/${code}/players`), snap => {
    const seen = {};
    plist = [];
    cnt = snap.size;
    if (cb.onCount) cb.onCount(snap.size);
    snap.forEach(ch => {
      const v = ch.val() || {};
      plist.push({ id: ch.key, j: v.joined || 9e15 });
      if (ch.key === uid) return;
      seen[ch.key] = 1;
      let o = others[ch.key];
      if (!o) {
        o = others[ch.key] = {
          name: v.name || '?', mesh: makeAvatar(v.name || '?', ch.key),
          tx: 0, ty: 0, tz: 0, tyaw: 0, tpitch: 0, init: false, dead: false, tt: 0, phase: 0, swing: 0,
          mine: null, mineN: 0, mineAt: 0, crack: null
        };
        group.add(o.mesh);
      }
      o.name = v.name || o.name;
      o.dead = !!v.dead;
      if (typeof v.x === 'number') {
        o.tx = v.x; o.ty = v.y; o.tz = v.z; o.tyaw = v.yaw || 0; o.tpitch = v.pitch || 0;
        if (!o.init) { o.mesh.position.set(v.x, v.y, v.z); o.init = true; }
      }
      o.mesh.visible = o.init && !o.dead;

      if (v.mine) { if (v.mine.n !== o.mineN) { o.mineN = v.mine.n; o.mineAt = performance.now(); } o.mine = v.mine; }
      else o.mine = null;

      if (v.sw && lastSw[ch.key] !== v.sw && primed) o.swing = 0.35;
      if (v.sw) lastSw[ch.key] = v.sw;

      if (v.hit && lastHit[ch.key] !== v.hit.n && primed) {
        if (v.hit.to === uid) {
          if (pvp.on && canHurt()) {
            hurt(v.hit.d || DMG, { id: ch.key, name: v.name || '?' });
            if (!hp.dead) knock(P.x - o.mesh.position.x, P.z - o.mesh.position.z);
          }
        } else if (others[v.hit.to]) tint(others[v.hit.to]);
      }
      if (v.hit) lastHit[ch.key] = v.hit.n;
      if (v.died && v.died.by === uid && lastDied[ch.key] !== v.died.n && primed) {
        if (cb.onKill) cb.onKill(v.name || '?');
      }
      if (v.died) lastDied[ch.key] = v.died.n;
    });
    for (const k in others) if (!seen[k]) {
      group.remove(others[k].mesh);
      if (others[k].crack) others[k].crack.remove();
      delete others[k];
    }
    primed = true;
    recomputeSim();
  }));

  timer = setInterval(sendPos, 100);
}

function sendPos() {
  if (!code || !uid) return;
  const r2 = n => Math.round(n * 100) / 100;
  const d = { x: r2(P.x), y: r2(P.y), z: r2(P.z), yaw: r2(P.yaw), pitch: r2(P.pitch) };
  const s = JSON.stringify(d);
  if (s === last) return;
  last = s;
  update(ref(db, `rooms/${code}/players/${uid}`), d).catch(() => {});
}

export function sendBlock(x, y, z, t) {
  if (!code) return;
  outB[x + '_' + y + '_' + z] = t;
  if (!outT) outT = setTimeout(flushBlocks, 120);
}

export function sendPaint(k, data) {
  if (!code) return;
  const r = ref(db, `rooms/${code}/paints/${k}`);
  if (data) set(r, data).catch(() => {});
  else remove(r).catch(() => {});
}

export function sendChat(text) {
  if (!code || !uid) return;
  set(push(ref(db, `rooms/${code}/chat`)), { n: myName, u: uid, m: String(text).slice(0, 120), t: Date.now() }).catch(() => {});
}

export function reportDeath(byId) {
  if (!code) return;
  update(ref(db, `rooms/${code}/players/${uid}`), { dead: true, died: { by: byId || '', n: Date.now() } }).catch(() => {});
}

export function setDead(v) {
  if (!code) return;
  last = '';
  update(ref(db, `rooms/${code}/players/${uid}`), { dead: !!v }).catch(() => {});
}

// Her oyuncunun envanteri kendi hesabında saklanır (oda silinse bile kalır)
export async function loadProgress() {
  if (!uid || !saveKey) return null;
  try {
    const s = await dbGet(ref(db, `users/${uid}/rstate/${saveKey}`));
    return s.exists() ? s.val() : null;
  } catch (e) { return null; }
}
export function saveProgress(d) {
  if (!uid || !saveKey) return;
  set(ref(db, `users/${uid}/rstate/${saveKey}`), d).catch(() => {});
}

export function getPlayers(name) {
  const arr = [{ id: uid, name, me: true, dead: hp.dead, owner: uid === ownerId, dist: 0 }];
  for (const id in others) {
    const o = others[id];
    arr.push({
      id, name: o.name, me: false, dead: o.dead, owner: id === ownerId,
      dist: Math.hypot(P.x - o.mesh.position.x, P.z - o.mesh.position.z)
    });
  }
  return arr;
}

export function swing() {
  if (!code) return;
  update(ref(db, `rooms/${code}/players/${uid}`), { sw: Date.now() }).catch(() => {});
}

export function findPlayer(ex, ey, ez, dx, dy, dz, range) {
  let best = null, bt = 99;
  for (const id in others) {
    const o = others[id];
    if (!o.init || o.dead) continue;
    const vx = o.mesh.position.x - ex, vy = o.mesh.position.y + 1.0 - ey, vz = o.mesh.position.z - ez;
    const t = vx * dx + vy * dy + vz * dz;
    if (t < 0.2 || t > range) continue;
    if (Math.hypot(vx - dx * t, vy - dy * t, vz - dz * t) > 0.7) continue;
    if (losBlocked(ex, ey, ez, dx, dy, dz, t)) continue;
    if (t < bt) { bt = t; best = id; }
  }
  return best ? { id: best, t: bt } : null;
}

export function hitPlayer(id) {
  if (!code) return;
  update(ref(db, `rooms/${code}/players/${uid}`), { hit: { to: id, n: Date.now(), d: DMG } }).catch(() => {});
  tint(others[id]);
}

export function sendMobHit(id, d, fx, fz) {
  if (!code) return;
  set(push(ref(db, `rooms/${code}/mobhits`)), { id, d, fx: Math.round(fx * 10) / 10, fz: Math.round(fz * 10) / 10, n: Date.now() }).catch(() => {});
}

export function updateOthers(dt) {
  const k = Math.min(1, dt * 10), now = performance.now();
  for (const id in others) {
    const o = others[id];
    if (!o.init) continue;
    const p = o.mesh.position, ox = p.x, oz = p.z;
    p.x += (o.tx - p.x) * k;
    p.y += (o.ty - p.y) * k;
    p.z += (o.tz - p.z) * k;
    o.mesh.rotation.y += (o.tyaw - o.mesh.rotation.y) * k;
    const hd = o.mesh.userData.head;
    hd.rotation.x += (o.tpitch - hd.rotation.x) * k;
    const mining = o.mine && now - o.mineAt < 1500 && !o.dead;
    if (mining) {
      if (!o.crack && scene) o.crack = makeCrack(scene);
      if (o.crack) o.crack.show(o.mine.x, o.mine.y, o.mine.z, o.mine.s);
      if (o.swing <= 0) o.swing = 0.35;   // kazma sallar
    } else if (o.crack) o.crack.hide();
    animateAvatar(o, Math.hypot(p.x - ox, p.z - oz) / Math.max(dt, 0.001), dt);
  }
}

export function stopOnline() {
  if (outT) { clearTimeout(outT); flushBlocks(); }
  if (timer) clearInterval(timer);
  if (beatT) clearInterval(beatT);
  if (chatTimer) clearTimeout(chatTimer);
  timer = beatT = chatTimer = null;
  unsubs.forEach(u => { try { u(); } catch (e) {} });
  unsubs = [];
  for (const k in others) { group.remove(others[k].mesh); if (others[k].crack) others[k].crack.remove(); }
  others = {};
  if (scene) scene.remove(group);
  net.active = false; net.owner = false; net.trade = null; net.setPrice = null;
  ih.push = ih.take = ih.expire = null; ih.myId = '';
  mhooks.send = null; mhooks.remove = null;
  mineHooks.onProgress = null;
  clearItems();
  pvp.on = false;
  cb = {};
  code = null; last = ''; ownerId = null; outB = {}; plist = [];
    }
