import { db, uid, ref, set, update, remove, get as dbGet, onValue } from './firebase.js';
import { onChildAdded, onChildChanged, onChildRemoved, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { get as getBlock, set as setBlock, rebuild, TYPES } from './world.js';
import { P, knock } from './player.js';
import { eco, net, clampRaw, priceOf } from './economy.js';
import { hooks as ih, spawnItem, removeItem, clearItems } from './items.js';
import { hurt, canHurt, hp } from './health.js';
import { mhooks, spawnCows, applyRemote } from './mobs.js';
import { makeAvatar, tint } from './avatars.js';
import { sfx } from './sound.js';

const DMG = 4;
const pvp = { on: false, lastAtk: 0 };

let code = null, scene = null, timer = null, dirty = false;
let unsubs = [];
let others = {};
let last = '';
let cb = {};
let ownerId = null;
let primed = false, lastHit = {}, lastDied = {};
const group = new THREE.Group();

function scheduleRebuild() {
  if (dirty) return;
  dirty = true;
  setTimeout(() => { dirty = false; rebuild(); }, 60);
}

// opts: { isOwner, pvp, onPrices, onMeta, onCount, onBlock, onKill }
export function startOnline(sc, roomCode, opts = {}) {
  stopOnline();
  scene = sc; code = roomCode; cb = opts;
  pvp.on = !!opts.pvp;
  primed = false; lastHit = {}; lastDied = {}; ownerId = null;
  scene.add(group);

  // Oda ayarları (PVP, limit, envanteri koru)
  unsubs.push(onValue(ref(db, `rooms/${code}/meta`), snap => {
    const m = snap.val();
    if (!m) return;
    ownerId = m.owner;
    pvp.on = !!m.pvp;
    if (cb.onMeta) cb.onMeta({ pvp: pvp.on, max: m.max || 8, keep: !!m.keep });
  }));

  // Bloklar
  const bref = ref(db, `rooms/${code}/blocks`);
  const apply = s => {
    const [x, y, z] = s.key.split('_').map(Number);
    const t = Number(s.val()) || 0;
    setBlock(x, y, z, t);
    scheduleRebuild();
    if (cb.onBlock) cb.onBlock(x, y, z, t);
  };
  unsubs.push(onChildAdded(bref, apply), onChildChanged(bref, apply));

  // Yerdeki eşyalar (herkeste ortak)
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

  // İnekler: oda sahibi yönetir, diğerleri izler
  mhooks.send = obj => { if (code) update(ref(db, `rooms/${code}/mobs`), obj).catch(() => {}); };
  let mobsFirst = true;
  unsubs.push(onValue(ref(db, `rooms/${code}/mobs`), snap => {
    const v = snap.val() || {};
    if (opts.isOwner) {
      if (mobsFirst) {
        mobsFirst = false;
        if (Object.keys(v).length) applyRemote(v, true); else spawnCows();
      }
    } else applyRemote(v, false);
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

  // Diğer oyuncular + vuruşlar
  unsubs.push(onValue(ref(db, `rooms/${code}/players`), snap => {
    const seen = {};
    if (cb.onCount) cb.onCount(snap.size);
    snap.forEach(ch => {
      if (ch.key === uid) return;
      seen[ch.key] = 1;
      const v = ch.val() || {};
      let o = others[ch.key];
      if (!o) {
        o = others[ch.key] = {
          name: v.name || '?', mesh: makeAvatar(v.name || '?', ch.key),
          tx: 0, ty: 0, tz: 0, tyaw: 0, tpitch: 0, init: false, dead: false, tt: 0
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
    for (const k in others) if (!seen[k]) { group.remove(others[k].mesh); delete others[k]; }
    primed = true;
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
  set(ref(db, `rooms/${code}/blocks/${x}_${y}_${z}`), t).catch(() => {});
}

// Ölünce diğerlerinde görünmez ol (byId: öldüren oyuncu, yoksa '')
export function reportDeath(byId) {
  if (!code) return;
  update(ref(db, `rooms/${code}/players/${uid}`), { dead: true, died: { by: byId || '', n: Date.now() } }).catch(() => {});
}

export function setDead(v) {
  if (!code) return;
  last = '';
  update(ref(db, `rooms/${code}/players/${uid}`), { dead: !!v }).catch(() => {});
}

// Oyuncu ilerlemesi (envanter + konum), oda başına
export async function loadProgress() {
  if (!code || !uid) return null;
  try {
    const s = await dbGet(ref(db, `rooms/${code}/saves/${uid}`));
    return s.exists() ? s.val() : null;
  } catch (e) { return null; }
}
export function saveProgress(d) {
  if (!code || !uid) return;
  set(ref(db, `rooms/${code}/saves/${uid}`), d).catch(() => {});
}

export function getPlayers(myName) {
  const arr = [{ id: uid, name: myName, me: true, dead: hp.dead, owner: uid === ownerId, dist: 0 }];
  for (const id in others) {
    const o = others[id];
    arr.push({
      id, name: o.name, me: false, dead: o.dead, owner: id === ownerId,
      dist: Math.hypot(P.x - o.mesh.position.x, P.z - o.mesh.position.z)
    });
  }
  return arr;
}

export function attack() {
  if (!code || !pvp.on) return 'PVP kapalı';
  if (hp.dead) return '';
  const now = Date.now();
  if (now - pvp.lastAtk < 450) return '';
  pvp.lastAtk = now;

  const ex = P.x, ey = P.y + 1.6, ez = P.z;
  const cp = Math.cos(P.pitch);
  const dx = -Math.sin(P.yaw) * cp, dy = Math.sin(P.pitch), dz = -Math.cos(P.yaw) * cp;
  let best = null, bt = 99;
  for (const id in others) {
    const o = others[id];
    if (!o.init || o.dead) continue;
    const vx = o.mesh.position.x - ex, vy = o.mesh.position.y + 1.0 - ey, vz = o.mesh.position.z - ez;
    const t = vx * dx + vy * dy + vz * dz;
    if (t < 0.2 || t > 4.5) continue;
    if (Math.hypot(vx - dx * t, vy - dy * t, vz - dz * t) > 0.7) continue;
    let blocked = false;
    for (let s = 0.3; s < t; s += 0.25) {
      if (getBlock(Math.floor(ex + dx * s), Math.floor(ey + dy * s), Math.floor(ez + dz * s))) { blocked = true; break; }
    }
    if (blocked) continue;
    if (t < bt) { bt = t; best = id; }
  }
  if (!best) return 'Iskaladın';
  update(ref(db, `rooms/${code}/players/${uid}`), { hit: { to: best, n: now, d: DMG } }).catch(() => {});
  tint(others[best]);
  sfx.hit();
  return 'Vurdun!';
}

export function updateOthers(dt) {
  const k = Math.min(1, dt * 10);
  for (const id in others) {
    const o = others[id];
    if (!o.init) continue;
    const p = o.mesh.position;
    p.x += (o.tx - p.x) * k;
    p.y += (o.ty - p.y) * k;
    p.z += (o.tz - p.z) * k;
    o.mesh.rotation.y += (o.tyaw - o.mesh.rotation.y) * k;
    const hd = o.mesh.userData.head;
    hd.rotation.x += (o.tpitch - hd.rotation.x) * k;
  }
}

export function stopOnline() {
  if (timer) clearInterval(timer);
  timer = null;
  unsubs.forEach(u => { try { u(); } catch (e) {} });
  unsubs = [];
  for (const k in others) group.remove(others[k].mesh);
  others = {};
  if (scene) scene.remove(group);
  net.active = false; net.owner = false; net.trade = null; net.setPrice = null;
  ih.push = ih.take = ih.expire = null; ih.myId = '';
  mhooks.send = null;
  clearItems();
  pvp.on = false;
  cb = {};
  code = null; last = ''; ownerId = null;
}
