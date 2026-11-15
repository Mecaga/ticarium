import { N } from '../world/idtable.js';
import { TYPES, CATS, get, set, rebuild, surfaceY, isLoaded, target, stgt } from '../world/world.js';
import { FACE_TILES, tileOf, addFlat } from '../world/textures.js';
import { eco } from './economy.js';
import { RECIPES } from './recipes.js';
import { FOODX } from './content.js';
import { G } from '../core/state.js';
import { P } from '../entities/player.js';
import { hurt } from '../entities/health.js';
import { dropItems } from '../entities/items.js';
import { gamePhase } from '../world/sky.js';
import { isCreative } from './creative.js';
import { toast, drawHud } from '../ui/ui.js';
import { recordChange } from './progress.js';
import { sfx } from '../core/sound.js';
import { db, ref, set as fbSet, update, onValue } from '../core/firebase.js';
import { uid } from '../core/auth.js';

function reg(id, name, color, base, tile, cat) {
  TYPES[id] = { name, color, base };
  FACE_TILES[id] = [tileOf(tile), tileOf(tile), tileOf(tile)];
  eco.inv[id] = 0; eco.raw[id] = base; eco.trend[id] = 0;
  addFlat(id);
  if (!CATS[cat][1].includes(id)) CATS[cat][1].push(id);
}
reg(N.KEMIK, 'Kemik', 0xe8e8e0, 6, 'stick', 4);
reg(N.KEMIK_TOZU, 'Kemik tozu', 0xf5f5f0, 4, 'seeds', 4);
reg(N.ZOMBI_ETI, 'Zombi eti', 0x6a8a50, 6, 'cooked', 2);
FOODX[N.ZOMBI_ETI] = 2;
RECIPES.push({ out: [N.KEMIK_TOZU, 3], shapeless: [N.KEMIK] });

const grp = new THREE.Group();
let mobs = [], lastSpawn = 0;
const night = () => { const h = (gamePhase() * 24 + 6) % 24; return h >= 18 || h < 6; };

function build(kind) {
  const g = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: kind === 'zombi' ? 0x5a8a4a : 0xdddddd });
  const cloth = new THREE.MeshLambertMaterial({ color: kind === 'zombi' ? 0x3a4f8a : 0xbbbbbb });
  const add = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };
  add(0.6, 0.9, 0.35, cloth, 0, 0.85 + 0.45 - 0.45, 0);
  add(0.4, 0.4, 0.4, skin, 0, 1.55, 0);
  add(0.25, 0.8, 0.25, cloth, -0.15, 0.4, 0); add(0.25, 0.8, 0.25, cloth, 0.15, 0.4, 0);
  add(0.2, 0.7, 0.2, skin, -0.42, 1.2, kind === 'zombi' ? -0.3 : 0); add(0.2, 0.7, 0.2, skin, 0.42, 1.2, kind === 'zombi' ? -0.3 : 0);
  return g;
}
function spawn() {
  const a = Math.random() * 6.28, d = 16 + Math.random() * 10;
  const x = Math.floor(P.x + Math.cos(a) * d), z = Math.floor(P.z + Math.sin(a) * d);
  if (!isLoaded(x, z)) return;
  const y = surfaceY(x, z);
  if (y < 0) return;
  const kind = Math.random() < 0.55 ? 'zombi' : 'iskelet', g = build(kind);
  g.position.set(x + 0.5, y + 1, z + 0.5);
  grp.add(g);
  mobs.push({ g, kind, x: x + 0.5, y: y + 1, z: z + 0.5, hp: kind === 'zombi' ? 10 : 8, cd: 0 });
}

const arrows = [];
function shootAt(m) {
  const a = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.5), new THREE.MeshBasicMaterial({ color: 0xcccccc }));
  const dx = P.x - m.x, dy = P.y + 1.2 - (m.y + 1.4), dz = P.z - m.z, l = Math.hypot(dx, dy, dz) || 1;
  a.position.set(m.x, m.y + 1.4, m.z);
  grp.add(a);
  arrows.push({ a, v: new THREE.Vector3(dx / l * 14, dy / l * 14, dz / l * 14), life: 2 });
}

function die(m) {
  grp.remove(m.g); mobs = mobs.filter(k => k !== m);
  const t = m.kind === 'zombi' ? N.ZOMBI_ETI : N.KEMIK;
  dropItems([{ t, c: 1 + Math.floor(Math.random() * 2), x: m.x, y: m.y + 0.6, z: m.z, vx: 0, vy: 2, vz: 0 }]);
}

export function hitUndead(dx, dy, dz, dmg) {
  let best = null, bt = 5.5;
  for (const m of mobs) {
    const vx = m.x - P.x, vy = m.y + 0.9 - (P.y + 1.6), vz = m.z - P.z;
    const t = vx * dx + vy * dy + vz * dz;
    if (t < 0.2 || t > bt) continue;
    if (Math.hypot(vx - dx * t, vy - dy * t, vz - dz * t) > 1.2) continue;
    bt = t; best = m;
  }
  if (!best) return false;
  best.hp -= dmg;
  if (best.hp <= 0) die(best);
  return true;
}

let last = performance.now();
(function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (!G.scene) return;
  if (!grp.parent) G.scene.add(grp);
  const on = G.room && (G.room.solo || G.room.sim);
  if (!on) { mobs.forEach(m => grp.remove(m.g)); mobs = []; return; }
  const nt = night(), calm = P.ghost || isCreative();
  if (nt && mobs.length < 5 && now - lastSpawn > 5000) { lastSpawn = now; spawn(); }
  for (const m of [...mobs]) {
    if (!nt) { m.hp -= dt * 3; if (m.hp <= 0) { grp.remove(m.g); mobs = mobs.filter(k => k !== m); continue; } }
    const dx = P.x - m.x, dz = P.z - m.z, d = Math.hypot(dx, dz);
    m.cd -= dt;
    if (!calm && d < 24) {
      const keep = m.kind === 'iskelet' ? 7 : 0.9;
      if (d > keep) { m.x += dx / d * 2.2 * dt; m.z += dz / d * 2.2 * dt; }
      m.g.rotation.y = Math.atan2(-dx, -dz);
      if (m.kind === 'zombi' && d < 1.3 && m.cd <= 0 && Math.abs(P.y - m.y) < 2) { m.cd = 1; hurt(2, { name: 'Zombi' }); }
      if (m.kind === 'iskelet' && d < 16 && m.cd <= 0) { m.cd = 2; shootAt(m); }
    }
    if (isLoaded(Math.floor(m.x), Math.floor(m.z))) { const gy = surfaceY(Math.floor(m.x), Math.floor(m.z)); if (gy >= 0) m.y = gy + 1; }
    m.g.position.set(m.x, m.y, m.z);
    if (d > 70) { grp.remove(m.g); mobs = mobs.filter(k => k !== m); }
  }
  for (let i = arrows.length - 1; i >= 0; i--) {
    const a = arrows[i];
    a.a.position.addScaledVector(a.v, dt); a.life -= dt;
    const d = Math.hypot(P.x - a.a.position.x, P.y + 1 - a.a.position.y, P.z - a.a.position.z);
    if (d < 0.8 && !calm) { hurt(3, { name: 'İskelet' }); a.life = 0; }
    if (a.life <= 0) { grp.remove(a.a); arrows.splice(i, 1); }
  }
})(last);

// Kemik tozu: bakılan ekini bir aşama büyütür
import('../world/defs.js').then(d => {
  window.__boneMeal = () => {
    const s = target;
    if (!s) return false;
    const [x, y, z] = s, t = get(x, y, z), vg = d.VEG.find(([b]) => t >= b && t < b + 3);
    const nt = (t >= d.CROP_MIN && t < d.CROP_MAX) || vg ? t + 1 : 0;
    if (!nt) return false;
    set(x, y, z, nt); recordChange(x, y, z, nt);
    if (G.online) G.online.sendBlock(x, y, z, nt);
    rebuild(); return true;
  };
});
export function useBoneMeal() {
  if (!window.__boneMeal || !window.__boneMeal()) return toast('Kemik tozunu büyüyen ekine bakarak kullan');
  if (!isCreative()) eco.inv[N.KEMIK_TOZU]--;
  sfx.place(); drawHud();
}

// --- Paket 18: Çok oyunculu zombi ve iskelet senkronizasyonu ---
const rkey = () => G.room && !G.room.solo && G.room.code;
const mineU = () => G.room && (G.room.solo || G.room.sim);
const remoteU = new Map();

setInterval(() => {   // yönetici: konumları yaz
  const k = rkey();
  if (!k || !mineU()) return;
  const o = {};
  mobs.forEach((m, i) => { o['u' + i] = { x: +m.x.toFixed(2), y: +m.y.toFixed(2), z: +m.z.toFixed(2), r: +m.g.rotation.y.toFixed(2), k: m.kind === 'zombi' ? 0 : 1 }; });
  fbSet(ref(db, 'rooms/' + k + '/undead'), mobs.length ? o : null).catch(() => {});
}, 500);

let subU = '';
setInterval(() => {   // diğerleri: oku ve çiz
  const k = rkey();
  if (!k || mineU()) { remoteU.forEach(g => grp.remove(g)); remoteU.clear(); subU = ''; return; }
  if (subU === k) return;
  subU = k;
  onValue(ref(db, 'rooms/' + k + '/undead'), s => {
    const v = s.val() || {};
    for (const id in v) {
      let g = remoteU.get(id);
      if (!g) { g = build(v[id].k === 0 ? 'zombi' : 'iskelet'); grp.add(g); remoteU.set(id, g); }
      g.userData.tx = v[id].x; g.userData.ty = v[id].y; g.userData.tz = v[id].z; g.userData.tr = v[id].r;
      if (!g.userData.init) { g.position.set(v[id].x, v[id].y, v[id].z); g.userData.init = 1; }
    }
    for (const [id, g] of remoteU) if (!(id in v)) { grp.remove(g); remoteU.delete(id); }
  });
}, 1500);

export function sendUndeadHit(dx, dy, dz, d) {
  const k = rkey();
  if (!k) return;
  update(ref(db, 'rooms/' + k + '/undeadhits/' + uid), { dx, dy, dz, d, px: P.x, py: P.y, pz: P.z, n: Date.now() }).catch(() => {});
}

let hitU = '';
setInterval(() => {   // yönetici: gelen vuruşları uygula
  const k = rkey();
  if (!k || !mineU() || hitU === k) return;
  hitU = k;
  onValue(ref(db, 'rooms/' + k + '/undeadhits'), s => {
    s.forEach(c => {
      const v = c.val();
      if (!v || Date.now() - v.n > 1500 || c.key === uid) return;
      const ox = P.x, oy = P.y, oz = P.z;
      P.x = v.px; P.y = v.py; P.z = v.pz;
      hitUndead(v.dx, v.dy, v.dz, v.d);
      P.x = ox; P.y = oy; P.z = oz;
    });
  });
}, 1500);

// --- Paket 19: Uzak cihazda yakındaki canavarın oyuncuya hasar vermesi ---
setInterval(() => {
  if (!G.room || G.room.solo || mineU() || P.ghost || isCreative()) return;
  remoteU.forEach(g => {
    const d = Math.hypot(P.x - g.position.x, P.z - g.position.z);
    if (d < 1.3 && Math.abs(P.y - g.position.y) < 2) hurt(2, { name: 'Zombi' });
  });
}, 1000);

// --- Uzak cihaz için yumuşak hareket (smooth) döngüsü ---
(function smooth(t) {
  requestAnimationFrame(smooth);
  remoteU.forEach(g => {
    const u = g.userData;
    if (u.tx === undefined) return;
    g.position.x += (u.tx - g.position.x) * 0.2;
    g.position.y += (u.ty - g.position.y) * 0.2;
    g.position.z += (u.tz - g.position.z) * 0.2;
    g.rotation.y += (u.tr - g.rotation.y) * 0.2;
  });
})();
