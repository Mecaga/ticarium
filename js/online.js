import { db, uid, ref, set, update, onValue } from './firebase.js';
import { onChildAdded, onChildChanged, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { set as setBlock, rebuild, TYPES } from './world.js';
import { P } from './player.js';
import { eco, net, clampRaw, priceOf } from './economy.js';

let code = null, scene = null, timer = null, dirty = false;
let unsubs = [];
let others = {};
let last = '';
let onPricesCb = null;
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
  // Kafa ayrı grup: yukarı/aşağı eğilir
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

// opts: { isOwner, onPrices }
export function startOnline(sc, roomCode, opts = {}) {
  stopOnline();
  scene = sc; code = roomCode;
  onPricesCb = opts.onPrices || null;
  scene.add(group);

  // Bloklar
  const bref = ref(db, `rooms/${code}/blocks`);
  const apply = s => {
    const [x, y, z] = s.key.split('_').map(Number);
    setBlock(x, y, z, Number(s.val()) || 0);
    scheduleRebuild();
  };
  unsubs.push(onChildAdded(bref, apply), onChildChanged(bref, apply));

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
    if (onPricesCb) onPricesCb();
  }));

  // Diğer oyuncular
  unsubs.push(onValue(ref(db, `rooms/${code}/players`), snap => {
    const seen = {};
    snap.forEach(ch => {
      if (ch.key === uid) return;
      seen[ch.key] = 1;
      const v = ch.val() || {};
      let o = others[ch.key];
      if (!o) {
        o = others[ch.key] = { mesh: makeAvatar(v.name || '?', ch.key), tx: 0, ty: 0, tz: 0, tyaw: 0, tpitch: 0, init: false };
        group.add(o.mesh);
      }
      if (typeof v.x === 'number') {
        o.tx = v.x; o.ty = v.y; o.tz = v.z; o.tyaw = v.yaw || 0; o.tpitch = v.pitch || 0;
        if (!o.init) { o.mesh.position.set(v.x, v.y, v.z); o.init = true; o.mesh.visible = true; }
      }
    });
    for (const k in others) if (!seen[k]) { group.remove(others[k].mesh); delete others[k]; }
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
  code = null; last = '';
}
