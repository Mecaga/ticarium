import { N } from '../world/idtable.js';
import { TYPES, CATS } from '../world/world.js';
import { FACE_TILES, tileOf, addFlat } from '../world/textures.js';
import { eco } from './economy.js';
import { RECIPES } from './recipes.js';
import { G } from '../core/state.js';
import { P } from '../entities/player.js';
import { hurt } from '../entities/health.js';
import { dropItems } from '../entities/items.js';
import { clock, gamePhase } from '../world/sky.js';
import { toast } from '../ui/ui.js';
import { db, ref, update, onValue } from '../core/firebase.js';
import { uid } from '../core/auth.js';

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
CATS[4][1].push(N.IP, N.DERI);
CATS[0][1].push(N.CAKIL);
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
  return { g, x, y, z, hp: 8, cd: 0 };
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
      if (nt && d < 20 && d > 0.9) {   // gece: saldırır
        s.x += dx / d * 2.4 * dt; s.z += dz / d * 2.4 * dt;
        s.g.rotation.y = Math.atan2(-dx, -dz);
      }
      const gy = w.surfaceY(Math.floor(s.x), Math.floor(s.z));
      if (gy >= 0) s.y = gy + 1.05;
      s.g.position.set(s.x, s.y, s.z);
      s.cd -= dt;
      if (nt && d < 1.4 && s.cd <= 0 && Math.abs(P.y - s.y) < 2) { s.cd = 1; hurt(2, { name: 'Örümcek' }); }
    }
    spiders = spiders.filter(s => Math.hypot(P.x - s.x, P.z - s.z) < 60 || (ob.remove(s.g), false));
  });
}
requestAnimationFrame(tick);

// Örümceğe vurma
export function hitSpider(dx, dy, dz, dmg) {
  let best = null, bt = 4.5;
  for (const s of spiders) {
    const vx = s.x - P.x, vy = s.y + 0.4 - (P.y + 1.6), vz = s.z - P.z;
    const t = vx * dx + vy * dy + vz * dz;
    if (t < 0.2 || t > bt) continue;
    if (Math.hypot(vx - dx * t, vy - dy * t, vz - dz * t) > 0.9) continue;
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

// ---- Uyku senkronu ----
export function sleepSync(sleeping) {
  const r = G.room;
  if (!r || r.solo || !r.code) return Promise.resolve(true);
  update(ref(db, 'rooms/' + r.code + '/players/' + uid), { sleep: sleeping ? Date.now() : null }).catch(() => {});
  return Promise.resolve(false);
}
let unsub = null, wasKey = '';
setInterval(() => {
  const r = G.room;
  if (!r || r.solo || !r.code) { if (unsub) { unsub(); unsub = null; wasKey = ''; } return; }
  if (wasKey === r.code) return;
  wasKey = r.code;
  unsub = onValue(ref(db, 'rooms/' + r.code + '/players'), s => {
    let n = 0, z = 0;
    s.forEach(c => { const v = c.val() || {}; n++; if (v.sleep && Date.now() - v.sleep < 20000) z++; });
    if (n > 0 && z === n && z > 0) {   // herkes uyuyor: sabah
      const cur = Date.now() / 1000 + clock.off;
      clock.off += 480 - (cur % 480);
      update(ref(db, 'rooms/' + r.code + '/players/' + uid), { sleep: null }).catch(() => {});
      toast('☀️ Herkes uyudu, sabah oldu');
    }
  });
}, 2000);
