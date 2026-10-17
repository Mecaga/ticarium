import { db, uid, ref, set, update, onValue } from './firebase.js';
import { onChildAdded, onChildChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { set as setBlock, rebuild } from './world.js';
import { P } from './player.js';

let code = null, scene = null, timer = null, dirty = false;
let unsubs = [];
let others = {};
let last = '';
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
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshLambertMaterial({ color: 0xf1c27d }));
  head.position.y = 1.55;
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.05), new THREE.MeshBasicMaterial({ color: 0x222222 }));
  face.position.set(0, 1.55, -0.21);
  m.add(body, head, face, label(name));
  m.visible = false;
  return m;
}

export function startOnline(sc, roomCode) {
  stopOnline();
  scene = sc; code = roomCode;
  scene.add(group);

  // Bloklar: kayıtlı + canlı değişiklikler
  const bref = ref(db, `rooms/${code}/blocks`);
  const apply = s => {
    const [x, y, z] = s.key.split('_').map(Number);
    setBlock(x, y, z, Number(s.val()) || 0);
    scheduleRebuild();
  };
  unsubs.push(onChildAdded(bref, apply), onChildChanged(bref, apply));

  // Diğer oyuncular
  unsubs.push(onValue(ref(db, `rooms/${code}/players`), snap => {
    const seen = {};
    snap.forEach(ch => {
      if (ch.key === uid) return;
      seen[ch.key] = 1;
      const v = ch.val() || {};
      let o = others[ch.key];
      if (!o) {
        o = others[ch.key] = { mesh: makeAvatar(v.name || '?', ch.key), tx: 0, ty: 0, tz: 0, tyaw: 0, init: false };
        group.add(o.mesh);
      }
      if (typeof v.x === 'number') {
        o.tx = v.x; o.ty = v.y; o.tz = v.z; o.tyaw = v.yaw || 0;
        if (!o.init) { o.mesh.position.set(v.x, v.y, v.z); o.init = true; o.mesh.visible = true; }
      }
    });
    for (const k in others) if (!seen[k]) { group.remove(others[k].mesh); delete others[k]; }
  }));

  timer = setInterval(sendPos, 100);
}

function sendPos() {
  if (!code || !uid) return;
  const d = {
    x: Math.round(P.x * 100) / 100,
    y: Math.round(P.y * 100) / 100,
    z: Math.round(P.z * 100) / 100,
    yaw: Math.round(P.yaw * 100) / 100
  };
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
  code = null; last = '';
}
