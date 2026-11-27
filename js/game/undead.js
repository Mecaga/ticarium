import { N } from '../world/idtable.js';
import { TYPES, CATS, get, set, rebuild, surfaceY, isLoaded, target, stgt, sightClear } from '../world/world.js';
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
import { seesPlayer, seesFrom, aimClear } from './sight.js';
let uSeq = 0;

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
  mobs.push({ id: ++uSeq, g, kind, x: x + 0.5, y: y + 1, z: z + 0.5, hp: kind === 'zombi' ? 10 : 8, cd: 0 });
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
    if (!calm && d < 24 && seesPlayer(m, 1.5)) {
      const keep = m.kind === 'iskelet' ? 7 : 0.9;
      if (d > keep) { m.x += dx / d * 2.2 * dt; m.z += dz / d * 2.2 * dt; }
      m.g.rotation.y = Math.atan2(-dx, -dz);
      if (m.kind === 'zombi' && d < 1.3 && m.cd <= 0 && Math.abs(P.y - m.y) < 2) { m.cd = 1; hurt(2, { name: 'Zombi' }); }
      if (m.kind === 'iskelet' && d < 16 && m.cd <= 0 && aimClear(m.x, m.y, m.z, 1.4)) { m.cd = 2; shootAt(m); }
    }
    if (isLoaded(Math.floor(m.x), Math.floor(m.z))) { const gy = surfaceY(Math.floor(m.x), Math.floor(m.z)); if (gy >= 0) m.y = gy + 1; }
    m.g.position.set(m.x, m.y, m.z);
    if (d > 70) { grp.remove(m.g); mobs = mobs.filter(k => k !== m); }
  }
  for (let i = arrows.length - 1; i >= 0; i--) {
    const a = arrows[i], p = a.a.position, ox = p.x, oy = p.y, oz = p.z;
    p.addScaledVector(a.v, dt); a.life -= dt;
    if (!sightClear(ox, oy, oz, p.x, p.y, p.z)) a.life = 0;                       // duvara ya da kapalı kapıya çarptı
    else if (!calm && Math.hypot(P.x - p.x, P.y + 1 - p.y, P.z - p.z) < 0.8) { hurt(3, { name: 'İskelet' }); a.life = 0; }
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

// ---- Canavar ağı (sürüm 2) ----
const remoteU = new Map(), seenU = new Map();
let unSubs = [], unKey = '', hitUSub = null, hitUKey = '', pubUKey = '', pubUEmpty = true, lastRU = 0, lastUm = performance.now();
const roomU = () => (G.room && !G.room.solo && G.room.code) ? G.room.code : '';
const ownerU = () => !!(G.room && (G.room.solo || G.room.sim));

setInterval(() => {   // yönetici: canavar konumlarını yazar
  const k = ownerU() ? roomU() : '';
  if (pubUKey && pubUKey !== k) { fbSet(ref(db, 'rooms/' + pubUKey + '/undead'), null).catch(() => {}); pubUEmpty = true; }
  pubUKey = k;
  if (!k) return;
  if (!mobs.length) {
    if (!pubUEmpty) { pubUEmpty = true; fbSet(ref(db, 'rooms/' + k + '/undead'), null).catch(() => {}); }
    return;
  }
  pubUEmpty = false;
  const o = {};
  for (const m of mobs) o['u' + m.id] = { x: +m.x.toFixed(2), y: +m.y.toFixed(2), z: +m.z.toFixed(2), r: +m.g.rotation.y.toFixed(2), k: m.kind === 'zombi' ? 0 : 1 };
  fbSet(ref(db, 'rooms/' + k + '/undead'), o).catch(() => {});
}, 500);

setInterval(() => {   // diğer cihazlar: okur, çizer, oda değişince eski aboneliği kapatır
  const k = ownerU() ? '' : roomU();
  if (unKey === k) return;
  unSubs.forEach(u => u()); unSubs = [];
  remoteU.forEach(g => grp.remove(g)); remoteU.clear();
  unKey = k;
  if (!k) return;
  unSubs.push(onValue(ref(db, 'rooms/' + k + '/undead'), s => {
    if (unKey !== k) return;
    const v = s.val() || {};
    for (const id in v) {
      let g = remoteU.get(id);
      if (!g) { g = build(v[id].k === 0 ? 'zombi' : 'iskelet'); g.position.set(v[id].x, v[id].y, v[id].z); g.rotation.y = v[id].r; grp.add(g); remoteU.set(id, g); }
      Object.assign(g.userData, { tx: v[id].x, ty: v[id].y, tz: v[id].z, tr: v[id].r });
    }
    for (const [id, g] of remoteU) if (!(id in v)) { grp.remove(g); remoteU.delete(id); }
  }));
}, 1000);

(function smoothU(now) {   // uzak canavarlar hedefe doğru kayar
  requestAnimationFrame(smoothU);
  const dt = Math.min(0.1, (now - lastUm) / 1000); lastUm = now;
  const a = 1 - Math.pow(0.0005, dt);
  for (const g of remoteU.values()) {
    const u = g.userData;
    if (u.tx === undefined) continue;
    g.position.x += (u.tx - g.position.x) * a;
    g.position.y += (u.ty - g.position.y) * a;
    g.position.z += (u.tz - g.position.z) * a;
    g.rotation.y += Math.atan2(Math.sin(u.tr - g.rotation.y), Math.cos(u.tr - g.rotation.y)) * a;
  }
})(lastUm);

export function sendUndeadHit(dx, dy, dz, d) {   // yönetici değilsen vuruşu yöneticiye yollar
  const k = roomU();
  if (!k || ownerU()) return;
  update(ref(db, 'rooms/' + k + '/undeadhits/' + uid), { dx, dy, dz, d, px: P.x, py: P.y, pz: P.z, n: Date.now() }).catch(() => {});
}
setInterval(() => {   // yönetici: her vuruş isteğini yalnızca bir kez uygular
  const k = ownerU() ? roomU() : '';
  if (hitUKey === k) return;
  if (hitUSub) { hitUSub(); hitUSub = null; }
  seenU.clear(); hitUKey = k;
  if (!k) return;
  hitUSub = onValue(ref(db, 'rooms/' + k + '/undeadhits'), s => {
    s.forEach(c => {
      const v = c.val();
      if (!v || c.key === uid || v.n <= (seenU.get(c.key) || 0)) return;
      seenU.set(c.key, v.n);
      if (Date.now() - v.n > 1500) return;
      const ox = P.x, oy = P.y, oz = P.z;
      P.x = v.px; P.y = v.py; P.z = v.pz;
      hitUndead(v.dx, v.dy, v.dz, v.d);
      P.x = ox; P.y = oy; P.z = oz;
    });
  });
}, 1000);

setInterval(() => {   // uzak cihazda: yakın canavar bana vurur
  if (!G.room || G.room.solo || ownerU() || P.ghost || isCreative() || Date.now() - lastRU < 1000) return;
  for (const g of remoteU.values()) {
    if (Math.hypot(P.x - g.position.x, P.z - g.position.z) < 1.3 && Math.abs(P.y - g.position.y) < 2 && seesFrom(g.position.x, g.position.y, g.position.z, 1.5)) {
      lastRU = Date.now(); hurt(2, { name: 'Zombi' }); return;
    }
  }
}, 500);

// ---- Vuruş köprüsü (combat.js kullanır) ----
export const undeadList = () => mobs;                       // yönetici: yerel zombi ve iskeletler
export const remoteUndead = () => [...remoteU.entries()];   // diğer cihazlar: çizilenler [anahtar, grup]
export function hitUndeadObj(m, dmg) {
  if (!m || !mobs.includes(m)) return false;
  m.hp -= dmg;
  if (m.hp <= 0) die(m);
  return true;
}
