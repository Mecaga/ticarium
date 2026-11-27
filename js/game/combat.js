import { N } from '../world/idtable.js';
import { TYPES, solid } from '../world/world.js';
import { db, ref, push, remove, onValue } from '../core/firebase.js';
import { uid, userName } from '../core/auth.js';
import { G } from '../core/state.js';
import { P, knock } from '../entities/player.js';
import { hurt, isDead } from '../entities/health.js';
import * as MOB from '../entities/mobs.js';
import * as GEAR from './gear.js';
import { eco } from './economy.js';
import { isCreative } from './creative.js';
import { toast } from '../ui/ui.js';
import { sfx } from '../core/sound.js';
import { spiderList, remoteSpiders, hitSpiderObj } from './spider.js';
import { undeadList, remoteUndead, hitUndeadObj } from './undead.js';

// Vuruş sistemi. ⚔️ butonu ve F tuşu buraya bağlanır (main.js).
// Hedef sırası: örümcek, zombi/iskelet, oyuncu (PvP açıksa), hayvan.
// Yerel canavarlar yönetici cihazda doğrudan vurulur. Uzak canavarlar ve oyuncular Firebase üzerinden iletilir:
//   rooms/<kod>/mhits        uzak cihaz -> yönetici (canavar). Yönetici işler ve siler.
//   rooms/<kod>/phits/<uid>  vuran -> vurulan (PvP). Vurulan işler ve siler.

const REACH = 4.2, COOLDOWN = 350, MAX_AGE = 4000;

// Eşya başına hasar. Boş el ve diğer eşyalar 1.
const DMG = {};
[[N.AHSAP_KILIC, 3], [N.TAS_KILIC, 4], [N.DEMIR_KILIC, 5], [N.ELMAS_KILIC, 6],
 [N.AHSAP_BALTA, 2], [N.TAS_BALTA, 3], [N.DEMIR_BALTA, 4], [N.ELMAS_BALTA, 5],
 [N.AHSAP_KAZMA, 2], [N.TAS_KAZMA, 3], [N.DEMIR_KAZMA, 4], [N.ELMAS_KAZMA, 5],
 [N.AHSAP_KUREK, 2], [N.TAS_KUREK, 2], [N.DEMIR_KUREK, 3], [N.ELMAS_KUREK, 4]]
  .forEach(([t, d]) => { DMG[t] = d; });
const dmgOf = t => DMG[t] || 1;

const owner = () => !!(G.room && (G.room.solo || G.room.sim));
let plist = {};                    // uzak oyuncular: uid -> { x, y, z, dead, name, ... }
const mSeen = new Set(), pSeen = new Set();

// Işın (göz, birim yön) ile dikey gövde arasında vuruş. Vurursa en yakın uzaklık, yoksa -1.
// Gövde, taban (bx, by, bz) ile tepe arasında 7 noktayla taranır.
function rayHits(ox, oy, oz, dx, dy, dz, bx, by, bz, h, r) {
  let best = -1;
  for (let i = 0; i <= 6; i++) {
    const py = by + (h * i) / 6;
    let t = (bx - ox) * dx + (py - oy) * dy + (bz - oz) * dz;
    t = t < 0 ? 0 : t > REACH ? REACH : t;
    const qx = ox + dx * t - bx, qy = oy + dy * t - py, qz = oz + dz * t - bz;
    if (qx * qx + qy * qy + qz * qz <= r * r && (best < 0 || t < best)) best = t;
  }
  return best;
}

// Göz ile hedef arasında katı blok yok mu
function clearLine(ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, n = Math.ceil(Math.hypot(dx, dy, dz) / 0.2);
  for (let i = 1; i < n; i++) {
    const s = i / n;
    if (solid(Math.floor(ax + dx * s), Math.floor(ay + dy * s), Math.floor(az + dz * s))) return false;
  }
  return true;
}

// Vurulabilecek her şey. Yönetici kendi listesini, diğerleri çizilen (uzak) canavarları görür.
function candidates() {
  const out = [];
  if (owner()) {
    for (const s of spiderList()) out.push({ kind: 's', key: 's' + s.id, obj: s, x: s.x, y: s.y, z: s.z, h: 0.8, r: 0.5 });
    for (const m of undeadList()) out.push({ kind: 'u', key: 'u' + m.id, obj: m, x: m.x, y: m.y, z: m.z, h: 1.8, r: 0.45 });
  } else {
    for (const [k, g] of remoteSpiders()) out.push({ kind: 's', key: k, x: g.position.x, y: g.position.y, z: g.position.z, h: 0.8, r: 0.5 });
    for (const [k, g] of remoteUndead()) out.push({ kind: 'u', key: k, x: g.position.x, y: g.position.y, z: g.position.z, h: 1.8, r: 0.45 });
  }
  if (G.room && G.room.pvp && !G.room.solo) {
    for (const id in plist) {
      const v = plist[id];
      if (v.dead || typeof v.x !== 'number' || typeof v.y !== 'number' || typeof v.z !== 'number') continue;
      out.push({ kind: 'p', key: id, x: v.x, y: v.y, z: v.z, h: 1.7, r: 0.4 });
    }
  }
  return out;
}

// Işının ilk çarptığı hedef
function nearest(ox, oy, oz, dx, dy, dz) {
  let best = null, bt = Infinity;
  for (const c of candidates()) {
    const t = rayHits(ox, oy, oz, dx, dy, dz, c.x, c.y, c.z, c.h, c.r);
    if (t >= 0 && t < bt && clearLine(ox, oy, oz, c.x, c.y + c.h / 2, c.z)) { bt = t; best = c; }
  }
  return best;
}

// Yerel canavara doğrudan vuruş (yalnızca yönetici cihazda)
const hitObj = (c, d) => (c.kind === 's' ? hitSpiderObj(c.obj, d) : hitUndeadObj(c.obj, d));

// Yönetici: uzak cihazdan gelen canavar vuruşunu uygular
function applyMob(to, d) {
  if (typeof to !== 'string' || !to) return;
  if (to[0] === 's') { const s = spiderList().find(q => 's' + q.id === to); if (s) hitSpiderObj(s, d); }
  else if (to[0] === 'u') { const m = undeadList().find(q => 'u' + q.id === to); if (m) hitUndeadObj(m, d); }
}

// Vurulan oyuncu: PvP açıksa ve dünyadaysa hasar alır
function applyPvp(v) {
  if (!G.room || !G.room.pvp || G.room.solo || isDead() || P.ghost || isCreative()) return;
  hurt(v.d || 1, { name: v.by || 'Oyuncu' });
  if (typeof v.ax === 'number' && typeof v.az === 'number') knock(P.x - v.ax, P.z - v.az);
  sfx.hurt?.();
}

function sendPvp(victim, d, ox, oz) {
  push(ref(db, 'rooms/' + G.room.code + '/phits/' + victim), { d, ax: ox, az: oz, by: userName || 'Oyuncu', t: Date.now() });
}
function sendMob(key, d) {
  push(ref(db, 'rooms/' + G.room.code + '/mhits'), { to: key, d, t: Date.now() });
}

let lastSwing = 0;
// ⚔️ ve F: hedefi bul ve vur. Hedef yoksa hayvana bakar.
export function swing() {
  if (!G.room || P.ghost || isDead()) return;
  const now = performance.now();
  if (now - lastSwing < COOLDOWN) return;
  lastSwing = now;
  const held = (isCreative() || (eco.inv[eco.sel] || 0) > 0) ? eco.sel : 0;
  const d = dmgOf(held);
  const cp = Math.cos(P.pitch);
  const dx = -Math.sin(P.yaw) * cp, dy = Math.sin(P.pitch), dz = -Math.cos(P.yaw) * cp;
  const ox = P.x, oy = P.y + (P.sneak ? 1.3 : 1.6), oz = P.z;
  let hit = false;
  const c = nearest(ox, oy, oz, dx, dy, dz);
  if (c && c.kind === 'p') { sendPvp(c.key, d, ox, oz); hit = true; }
  else if (c && owner()) hit = hitObj(c, d);
  else if (c) { sendMob(c.key, d); hit = true; }
  else {
    const m = MOB.findMob ? MOB.findMob(ox, oy, oz, dx, dy, dz, 4.5) : null;
    if (m) {
      hit = true;
      if (owner()) MOB.hurtMob?.(m.id, d, P.x, P.z);
      else G.online?.sendMobHit?.(m.id, d, P.x, P.z);
    }
  }
  if (hit) {
    sfx.hit?.();
    if (held && GEAR.isGear?.(held) && GEAR.wear?.(held, 1)) toast('💥 ' + (TYPES[held] ? TYPES[held].name : 'Eşya') + ' kırıldı!');
  }
}

// ---- Dinleyiciler: oda değişince eskisini kapatır ----
let roomKey = '', ownKey = '', unsubs = [], unsubOwn = null;
function resubscribe() {
  const r = G.room;
  const k = (r && !r.solo && r.code) ? r.code : '';
  if (k !== roomKey) {
    unsubs.forEach(u => u()); unsubs = [];
    roomKey = k; plist = {}; pSeen.clear();
    if (k) {
      unsubs.push(onValue(ref(db, 'rooms/' + k + '/players'), s => {
        const next = {};
        s.forEach(c => { if (c.key !== uid) next[c.key] = c.val() || {}; });
        plist = next;
      }));
      unsubs.push(onValue(ref(db, 'rooms/' + k + '/phits/' + uid), s => {
        s.forEach(c => {
          const key = c.key, v = c.val();
          if (pSeen.has(key)) return;
          pSeen.add(key);
          remove(ref(db, 'rooms/' + k + '/phits/' + uid + '/' + key)).catch(() => {});
          if (v && Date.now() - (v.t || 0) < MAX_AGE) applyPvp(v);
        });
        if (pSeen.size > 200) pSeen.clear();
      }));
    }
  }
  // Yalnızca yönetici canavar vuruşlarını işler
  const ok = (r && !r.solo && r.code && owner()) ? r.code : '';
  if (ok !== ownKey) {
    if (unsubOwn) { unsubOwn(); unsubOwn = null; }
    ownKey = ok;
    if (ok) unsubOwn = onValue(ref(db, 'rooms/' + ok + '/mhits'), s => {
      s.forEach(c => {
        const key = c.key, v = c.val();
        if (mSeen.has(key)) return;
        mSeen.add(key);
        remove(ref(db, 'rooms/' + ok + '/mhits/' + key)).catch(() => {});
        if (v && Date.now() - (v.t || 0) < MAX_AGE) applyMob(v.to, v.d);
      });
      if (mSeen.size > 200) mSeen.clear();
    });
  }
}
setInterval(resubscribe, 1000);

// Tanı (🐞 panelinde): hedef listesi ve uzak oyuncular
window.__combat = {
  targets: () => candidates().map(c => c.kind + ':' + c.key),
  players: () => Object.keys(plist)
};
