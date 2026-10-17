import { db, uid, ref, set, update, remove, onValue } from './firebase.js';
import { onChildAdded, onChildChanged, onChildRemoved, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { get as getBlock, set as setBlock, rebuild, TYPES } from './world.js';
import { P } from './player.js';
import { eco, net, clampRaw, priceOf } from './economy.js';
import { hooks as ih, spawnItem, removeItem, clearItems } from './items.js';
import { hurt, hp } from './health.js';

const DMG = 4;
const pvp = { on: false, lastAtk: 0 };

let code = null, scene = null, timer = null, dirty = false;
let unsubs = [];
let others = {};
let last = '';
let cb = {};
let primed = false, lastHit = {}, lastDied = {};
const group = new THREE.Group();

function scheduleRebuild() {
  if (dirty) return;
  dirty = true;
  setTimeout(() => { dirty = false; rebuild(); }, 60);
}

function label(text) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 8, 256, 48);
  g.fillStyle = '#fff'; g.font = 'bold 30px sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(text).slice(0, 14), 128, 32);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, fog: false }));
  s.scale.set(2, 0.5, 1);
  s.renderOrder = 10;
  s.position.y = 2.1;
  return s;
}

function makeAvatar(name, id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360;
  const color = new THREE.Color().setHSL(h / 360, 0.6, 0.5);
  const m = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.35), new THREE.MeshLambertMaterial({ color }));
  body.position.y = 0.85;
  const headG = new THREE.Group();
  headG.position.y = 1.55;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshLambertMaterial({ color: 0xf1c27d }));
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.05), new THREE.MeshBasicMaterial({ color: 0x222222 }));
  face.position.set(0, 0, -0.21);
  headG.add(head, face);
  m.add(body, headG, label(name));
  m.userData.head = headG;
  m.visible = false;
  return m;
}

// opts: { isOwner, pvp, onPrices, onMeta, onKill }
export function startOnline(sc, roomCode, opts = {}) {
  stopOnline();
  scene = sc; code = roomCode; cb = opts;
  pvp.on = !!opts.pvp;
  primed = false; lastHit = {}; lastDied = {};
  scene.add(group);

  // Oda ayarları (PVP, limit, envanteri koru)
  unsubs.push(onValue(ref(db, `rooms/${code}/meta`), snap => {
    const m = snap.val();
    if (!m) return;
    pvp.on = !!m.pvp;
    if (cb.onMeta) cb.onMeta({ pvp: pvp.on, max: m.max || 8, keep: !!m.keep });
  }));

  // Bloklar
  const bref = ref(db, `rooms/${code}/blocks`);
  const apply = s => {
    const [x, y, z] = s.key.split('_').map(Number);
    setBlock(x, y, z, Number(s.val()) || 0);
    scheduleRebuild();
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
  // İlk alan kazanır
  ih.take = async id => {
    const r = await runTransaction(ref(db, `rooms/${code}/items/${id}`), v => (v === null ? undefined : null));
    return r.committed;
  };
  ih.expire = id => { remove(ref(db, `rooms/${code}/items/${id}`)).catch(() => {}); };
  unsubs.push(
    onChildAdded(iref, s => spawnItem(s.key, s.val())),
    onChildRemoved(iref, s => removeItem(s.key))
  );

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
    snap.forEach(ch => {
      if (ch.key === uid) return;
      seen[ch.key] = 1;
      const v = ch.val() || {};
      let o = others[ch.key];
      if (!o) {
        o = others[ch.key] = { mesh: makeAvatar(v.name || '?', ch.key), tx: 0, ty: 0, tz: 0, tyaw: 0, tpitch: 0, init: false, dead: false };
        group.add(o.mesh);
      }
      o.dead = !!v.dead;
      if (typeof v.x === 'number') {
        o.tx = v.x; o.ty = v.y; o.tz = v.z; o.tyaw = v.yaw || 0; o.tpitch = v.pitch || 0;
        if (!o.init) { o.mesh.position.set(v.x, v.y, v.z); o.init = true; }
      }
      // Ölü oyuncu görünmez
      o.mesh.visible = o.init && !o.dead;

      if (v.hit && v.hit.to === uid && lastHit[ch.key] !== v.hit.n && primed && pvp.on) {
        hurt(v.hit.d || DMG, { id: ch.key, name: v.name || '?' });
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
  clearItems();
  pvp.on = false;
  cb = {};
  code = null; last = '';
      }
