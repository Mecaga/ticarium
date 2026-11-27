import { N } from '../world/idtable.js';
import { TYPES, CATS, solid } from '../world/world.js';
import { FACE_TILES, tileOf, addFlat } from '../world/textures.js';
import { eco } from './economy.js';
import { RECIPES } from './recipes.js';
import { G } from '../core/state.js';
import { P } from '../entities/player.js';
import { hurt } from '../entities/health.js';
import { dropItems } from '../entities/items.js';
import { clock, gamePhase } from '../world/sky.js';
import { toast } from '../ui/ui.js';
import { db, ref, set as fbSet, update, onValue } from '../core/firebase.js';
import { uid } from '../core/auth.js';
import { isCreative as isCreativeS } from './creative.js';
import { seesPlayer, seesFrom } from './sight.js';
let spSeq = 0;

// ---- Yeni eşyalar ----
function reg(id, name, color, base, tile, flat) {
  TYPES[id] = { name, color, base };
  if (tile === 'stone') FACE_TILES[id] = [tileOf(tile), tileOf(tile), tileOf(tile)];
  eco.inv[id] = 0; eco.raw[id] = base; eco.trend[id] = 0;
  if (flat) addFlat(id);
}
reg(N.IP, 'İp', 0xdddddd, 6, 'stick', true);
reg(N.DERI, 'Deri', 0x8a5a2a, 10, 'meat', true);
reg(N.CAKIL, 'Çakıl', 0x8a8a8a, 6, 'stone', false);

for (const [ci, id] of [[4, N.IP], [4, N.DERI], [0, N.CAKIL]]) {
  if (!CATS[ci][1].includes(id)) CATS[ci][1].push(id);
}

RECIPES.push({ out: [N.YUN, 1], pat: [[N.IP, N.IP], [N.IP, N.IP]] });   // 4 ip = beyaz yün

// ---- Örümcek ----
const ob = new THREE.Group();
let spiders = [];
const night = () => { const hr = (gamePhase() * 24 + 6) % 24; return hr >= 18 || hr < 6; };
function mk(x, y, z) {
  const g = new THREE.Group(), m = new THREE.MeshLambertMaterial({ color: 0x2a2a2e }), e = new THREE.MeshBasicMaterial({ color: 0xff2020 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 0.9), m); b.position.y = 0.35; g.add(b);
  const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.4), m); h.position.set(0, 0.4, -0.6); g.add(h);
  for (const s of [-0.1, 0.1]) { const k = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), e); k.position.set(s, 0.45, -0.82); g.add(k); }
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.06), m);
    l.position.set(s * 0.7, 0.25, -0.3 + i * 0.25); l.rotation.z = s * 0.4; g.add(l);
  }
  g.position.set(x, y, z);
  ob.add(g);
  return { id: ++spSeq, g, x, y, z, hp: 5, cd: 0, climb: 0 };
}
function spawnOne() {
  const a = Math.random() * 6.28, d = 14 + Math.random() * 10;
  const x = Math.floor(P.x + Math.cos(a) * d), z = Math.floor(P.z + Math.sin(a) * d);
  import('../world/world.js').then(w => {
    if (!w.isLoaded(x, z)) return;
    const y = w.surfaceY(x, z);
    if (y < 0) return;
    spiders.push(mk(x + 0.5, y + 1.05, z + 0.5));
  });
}
setInterval(() => {
  if (!G.scene) return;
  if (!ob.parent) G.scene.add(ob);
  if (!G.room || !(G.room.solo || G.room.sim)) { spiders.forEach(s => ob.remove(s.g)); spiders = []; return; }
  if (spiders.length < 3 && Math.random() < 0.3) spawnOne();
}, 4000);

let last = performance.now();
function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  const nt = night();
  import('../world/world.js').then(w => {
    for (const s of spiders) {
      const dx = P.x - s.x, dz = P.z - s.z, d = Math.hypot(dx, dz);
      if (nt && d < 20 && d > 0.9 && !P.ghost && !isCreativeS() && seesPlayer(s, 0.5)) {   // gece ve yaratıcı/hayalet değilse: saldırır ve tırmanır
        const ux = dx / (d || 1), uz = dz / (d || 1);
        const fx = Math.floor(s.x + ux * 0.7), fz = Math.floor(s.z + uz * 0.7), fy = Math.floor(s.y);
        const wall = solid(fx, fy, fz);
        const roof = solid(Math.floor(s.x), fy + 2, Math.floor(s.z)) || solid(fx, fy + 2, fz);
        if (wall && !roof) {
          s.climb = Math.min((s.climb || 0) + 3 * dt, 60);
          s.y += 3 * dt;
        } else {
          s.x += ux * 2.4 * dt; s.z += uz * 2.4 * dt;
          if (!wall) s.climb = 0;
        }
        s.g.rotation.y = Math.atan2(-dx, -dz);
      }
      const gy = w.surfaceY(Math.floor(s.x), Math.floor(s.z));
      if (gy >= 0) {
        if (!s.climb) s.y = gy + 1.05;
        else if (s.y < gy + 1.05) s.y = gy + 1.05;
      }
      if (s.climb && !solid(Math.floor(s.x + (dx / (d || 1)) * 0.7), Math.floor(s.y), Math.floor(s.z + (dz / (d || 1)) * 0.7))) {
        s.climb = 0;
      }
      s.g.position.set(s.x, s.y, s.z);
      s.cd -= dt;
      if (nt && d < 1.4 && s.cd <= 0 && Math.abs(P.y - s.y) < 2 && !P.ghost && !isCreativeS() && seesPlayer(s, 0.5)) {
        s.cd = 1;
        hurt(2, { name: 'Örümcek' });
      }
    }
    spiders = spiders.filter(s => Math.hypot(P.x - s.x, P.z - s.z) < 60 || (ob.remove(s.g), false));
  });
}
requestAnimationFrame(tick);

// Örümceğe vurma (Genişletilmiş menzil ve isabet payı)
export function hitSpider(dx, dy, dz, dmg) {
  let best = null, bt = 5.5;
  for (const s of spiders) {
    const vx = s.x - P.x, vy = s.y + 0.4 - (P.y + 1.6), vz = s.z - P.z;
    const t = vx * dx + vy * dy + vz * dz;
    if (t < 0.2 || t > bt) continue;
    if (Math.hypot(vx - dx * t, vy - dy * t, vz - dz * t) > 1.3) continue;
    bt = t; best = s;
  }
  if (!best) return false;
  best.hp -= dmg;
  if (best.hp <= 0) {
    ob.remove(best.g); spiders = spiders.filter(s => s !== best);
    dropItems([{ t: N.IP, c: 1 + Math.floor(Math.random() * 2), x: best.x, y: best.y + 0.5, z: best.z, vx: 0, vy: 2, vz: 0 }]);
  }
  return true;
}

// ---- Ortak zaman ve uyku ----
let timeSubs = [], timeKey = '', myOff = 0, lastWake = 0;
export function sleepSync(sleeping) {
  const r = G.room;
  if (!r || r.solo || !r.code) return;
  update(ref(db, 'rooms/' + r.code + '/players/' + uid), { sleep: sleeping ? Date.now() : null }).catch(() => {});
}
setInterval(() => {
  const r = G.room, k = (r && !r.solo && r.code) ? r.code : '';
  if (timeKey === k) return;
  timeSubs.forEach(u => u()); timeSubs = []; timeKey = k;
  if (!k) return;
  timeSubs.push(onValue(ref(db, 'rooms/' + k + '/time/off'), s => {
    if (typeof s.val() === 'number') { myOff = s.val(); clock.off = myOff; }
  }));
  timeSubs.push(onValue(ref(db, 'rooms/' + k + '/players'), s => {
    if (timeKey !== k || !G.room || !G.room.sim) return;
    let n = 0, z = 0;
    s.forEach(c => { const v = c.val() || {}; n++; if (v.sleep && Date.now() - v.sleep < 20000) z++; });
    if (n > 0 && z === n && Date.now() - lastWake > 30000) {
      lastWake = Date.now();
      const cur = Date.now() / 1000 + myOff;
      update(ref(db, 'rooms/' + k + '/time'), { off: myOff + 480 - (cur % 480) }).catch(() => {});
      toast('☀️ Herkes uyudu, sabah oldu');
    }
  }));
}, 2000);

// ---- Örümcek senkronu (sürüm 2) ----
const remoteS = new Map(), seenS = new Map();
let spSubs = [], spKey = '', hitSub = null, hitKey = '', pubKey = '', pubEmpty = true, lastRH = 0, lastSm = performance.now();
const roomOf = () => (G.room && !G.room.solo && G.room.code) ? G.room.code : '';
const isOwner = () => !!(G.room && (G.room.solo || G.room.sim));

setInterval(() => {   // yönetici: konumları yazar, oda değişince eskisini temizler
  const k = isOwner() ? roomOf() : '';
  if (pubKey && pubKey !== k) { fbSet(ref(db, 'rooms/' + pubKey + '/spiders'), null).catch(() => {}); pubEmpty = true; }
  pubKey = k;
  if (!k) return;
  if (!spiders.length) {
    if (!pubEmpty) { pubEmpty = true; fbSet(ref(db, 'rooms/' + k + '/spiders'), null).catch(() => {}); }
    return;
  }
  pubEmpty = false;
  const o = {};
  for (const s of spiders) o['s' + s.id] = { x: +s.x.toFixed(2), y: +s.y.toFixed(2), z: +s.z.toFixed(2), r: +s.g.rotation.y.toFixed(2) };
  fbSet(ref(db, 'rooms/' + k + '/spiders'), o).catch(() => {});
}, 500);

setInterval(() => {   // diğer cihazlar: okur, çizer, oda değişince eski aboneliği kapatır
  const k = isOwner() ? '' : roomOf();
  if (spKey === k) return;
  spSubs.forEach(u => u()); spSubs = [];
  remoteS.forEach(g => ob.remove(g)); remoteS.clear();
  spKey = k;
  if (!k) return;
  spSubs.push(onValue(ref(db, 'rooms/' + k + '/spiders'), s => {
    if (spKey !== k) return;
    const v = s.val() || {};
    for (const id in v) {
      let g = remoteS.get(id);
      if (!g) { g = mk(v[id].x, v[id].y, v[id].z).g; g.rotation.y = v[id].r; remoteS.set(id, g); }
      Object.assign(g.userData, { tx: v[id].x, ty: v[id].y, tz: v[id].z, tr: v[id].r });
    }
    for (const [id, g] of remoteS) if (!(id in v)) { ob.remove(g); remoteS.delete(id); }
  }));
}, 1000);

(function smoothS(now) {   // uzak örümcekler hedefe doğru kayar
  requestAnimationFrame(smoothS);
  const dt = Math.min(0.1, (now - lastSm) / 1000); lastSm = now;
  const a = 1 - Math.pow(0.0005, dt);
  for (const g of remoteS.values()) {
    const u = g.userData;
    if (u.tx === undefined) continue;
    g.position.x += (u.tx - g.position.x) * a;
    g.position.y += (u.ty - g.position.y) * a;
    g.position.z += (u.tz - g.position.z) * a;
    g.rotation.y += Math.atan2(Math.sin(u.tr - g.rotation.y), Math.cos(u.tr - g.rotation.y)) * a;
  }
})(lastSm);

export function sendSpiderHit(dx, dy, dz, d) {   // yönetici değilsen vuruşu yöneticiye yollar
  const k = roomOf();
  if (!k || isOwner()) return;
  update(ref(db, 'rooms/' + k + '/spiderhits/' + uid), { dx, dy, dz, d, px: P.x, py: P.y, pz: P.z, n: Date.now() }).catch(() => {});
}
setInterval(() => {   // yönetici: her vuruş isteğini yalnızca bir kez uygular
  const k = isOwner() ? roomOf() : '';
  if (hitKey === k) return;
  if (hitSub) { hitSub(); hitSub = null; }
  seenS.clear(); hitKey = k;
  if (!k) return;
  hitSub = onValue(ref(db, 'rooms/' + k + '/spiderhits'), s => {
    s.forEach(c => {
      const v = c.val();
      if (!v || c.key === uid || v.n <= (seenS.get(c.key) || 0)) return;
      seenS.set(c.key, v.n);
      if (Date.now() - v.n > 1500) return;
      const ox = P.x, oy = P.y, oz = P.z;
      P.x = v.px; P.y = v.py; P.z = v.pz;
      hitSpider(v.dx, v.dy, v.dz, v.d);
      P.x = ox; P.y = oy; P.z = oz;
    });
  });
}, 1000);

setInterval(() => {   // uzak cihazda: gece yakındaki örümcek bana vurur
  if (!G.room || G.room.solo || isOwner() || P.ghost || isCreativeS() || !night() || Date.now() - lastRH < 1000) return;
  for (const g of remoteS.values()) {
    if (Math.hypot(P.x - g.position.x, P.z - g.position.z) < 1.4 && Math.abs(P.y - g.position.y) < 2 && seesFrom(g.position.x, g.position.y, g.position.z, 0.5)) {
      lastRH = Date.now(); hurt(2, { name: 'Örümcek' }); return;
    }
  }
}, 500);

// ---- Vuruş köprüsü (combat.js kullanır) ----
export const spiderList = () => spiders;                    // yönetici: yerel örümcekler
export const remoteSpiders = () => [...remoteS.entries()];  // diğer cihazlar: çizilen örümcekler [anahtar, grup]
export function hitSpiderObj(s, dmg) {
  if (!s || !spiders.includes(s)) return false;
  s.hp -= dmg;
  if (s.hp <= 0) {
    ob.remove(s.g);
    spiders = spiders.filter(k => k !== s);
    dropItems([{ t: N.IP, c: 1 + Math.floor(Math.random() * 2), x: s.x, y: s.y + 0.5, z: s.z, vx: 0, vy: 2, vz: 0 }]);
  }
  return true;
}
