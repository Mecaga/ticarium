import {
  get, set, rebuild, target, prev, wtarget, waterLvl, TYPES, H, inBounds,
  BEDROCK, SAPLING, WATER, LAVA, BUCKET, WBUCKET, LBUCKET, CANVAS, APPLE, OBSIDIAN, planTree, isPlant
} from '../world/world.js';
import { P, collides } from '../entities/player.js';
import { eco } from './economy.js';
import { drawHud, toast } from '../ui/ui.js';
import { queueFall, ghooks, isFalling } from '../world/gravity.js';
import { isDead } from '../entities/health.js';
import { recordChange, recordPaint } from './progress.js';
import { G } from '../core/state.js';
import { sfx } from '../core/sound.js';
import { food, eat } from '../entities/hunger.js';
import { findMob, hurtMob } from '../entities/mobs.js';
import { getPaint, setPaint, removePaint, stack } from '../world/paints.js';
import { openDraw, isDrawOpen } from '../ui/draw.js';
import { dropItems } from '../entities/items.js';
import { isCreative } from './creative.js';
import { isTool } from './mining.js';

const FOOD = { 15: 6, 46: 4 };   // Et +6, Elma +4
const MOB_DMG = 3;
const D6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const saplings = new Map();
let lastAtk = 0;
export const clearSaplings = () => saplings.clear();

// Yaratıcı modda eşya harcanmaz, toplanmaz
const give = (t, n = 1) => { if (!isCreative()) eco.inv[t] += n; };
const take = (t, n = 1) => { if (!isCreative()) eco.inv[t] -= n; };
const isLog = t => t === 4 || t === 13;
const isLeaf = t => t === 5 || t === 14;

export function trackSapling(x, y, z) {
  const r = G.room;
  if (r && !r.solo && !r.isOwner) return; // odada büyütmeyi oda sahibi yapar
  saplings.set(x + '_' + y + '_' + z, { x, y, z, at: Date.now() + 45000 + Math.random() * 45000 });
}

function commit(x, y, z, t) {
  recordChange(x, y, z, t);
  if (G.online) G.online.sendBlock(x, y, z, t);
}

function growSaplings() {
  if (!G.room) return;
  const now = Date.now();
  for (const [k, s] of saplings) {
    if (get(s.x, s.y, s.z) !== SAPLING || !get(s.x, s.y - 1, s.z)) { saplings.delete(k); continue; }
    if (now < s.at) continue;
    const plan = planTree(s.x, s.y, s.z, Math.random() < 0.35);
    if (!plan) { s.at = now + 20000; continue; }
    saplings.delete(k);
    for (const b of plan) { set(b.x, b.y, b.z, b.t); commit(b.x, b.y, b.z, b.t); }
    rebuild();
  }
}

export function initActions() {
  // Düşen kum/kar ve akan sıvılar da kaydedilsin, odadaki herkese gitsin
  ghooks.onChange = (x, y, z, t) => commit(x, y, z, t);
  setInterval(growSaplings, 2000);
}

// ---- Ağaç kesme: gövde + bağlı yapraklar ----
function leafDrop(x, y, z, t) {
  const r = Math.random(), arr = [];
  const mk = id => ({
    t: id, c: 1, x: x + 0.5, y: y + 0.5, z: z + 0.5,
    vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 2, vz: (Math.random() - 0.5) * 2
  });
  if (r < 0.09) arr.push(mk(SAPLING));
  else if (t === 5 && r < 0.16) arr.push(mk(APPLE));
  if (arr.length) dropItems(arr);
}

function hasLeafNear(x, y, z) {
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = -2; dy <= 2; dy++) {
    if (isLeaf(get(x + dx, y + dy, z + dz))) return true;
  }
  return false;
}

// Gövdeye 4 blok içinde kütük bulunmayan yapraklar çürür
function decayLeaves(cx, cy, cz) {
  const R = 6, key = (x, y, z) => x + ',' + y + ',' + z;
  const dist = new Map(), queue = [];
  for (let x = cx - R - 2; x <= cx + R + 2; x++) for (let z = cz - R - 2; z <= cz + R + 2; z++) {
    for (let y = cy - R - 2; y <= cy + R + 2; y++) {
      if (isLog(get(x, y, z))) { dist.set(key(x, y, z), 0); queue.push([x, y, z, 0]); }
    }
  }
  for (let i = 0; i < queue.length; i++) {
    const [x, y, z, d] = queue[i];
    if (d >= 4) continue;
    for (const [dx, dy, dz] of D6) {
      const nx = x + dx, ny = y + dy, nz = z + dz;
      if (!isLeaf(get(nx, ny, nz))) continue;
      const k = key(nx, ny, nz);
      if (dist.has(k)) continue;
      dist.set(k, d + 1);
      queue.push([nx, ny, nz, d + 1]);
    }
  }
  for (let x = cx - R; x <= cx + R; x++) for (let z = cz - R; z <= cz + R; z++) {
    for (let y = cy - R; y <= cy + R; y++) {
      const t = get(x, y, z);
      if (!isLeaf(t) || dist.has(key(x, y, z))) continue;
      setTimeout(() => {
        if (!G.room || get(x, y, z) !== t) return;
        set(x, y, z, 0);
        commit(x, y, z, 0);
        if (!isCreative()) leafDrop(x, y, z, t);
        rebuild();
      }, 150 + Math.random() * 1500);
    }
  }
}

// Kırılan gövdenin üstündeki gövdeyi keser (ağaç gibiyse), yaprakları çürütür
function chopTree(x, y, z, L) {
  const col = [];
  for (let cy = y + 1; get(x, cy, z) === L; cy++) col.push(cy);
  const top = col.length ? col[col.length - 1] : y;
  if (!hasLeafNear(x, top, z)) return;
  for (const yy of col) { set(x, yy, z, 0); commit(x, yy, z, 0); give(L); }
  decayLeaves(x, top, z);
}

// Bakılan bloğu kırar. mining.js süre dolunca çağırır.
// canDrop=false: gereken alet yok, eşya düşmez. Bedrock'ta sadece uyarı verir.
export function breakBlock(canDrop = true) {
  if (isDead() || isDrawOpen() || !target) return;
  const [x, y, z] = target;
  const t = get(x, y, z);
  if (t === BEDROCK) return toast('Katman kayası kırılamaz');
  if (t === CANVAS) {
    const d = getPaint(x, y, z);
    if (d) {
      stack.push(d);
      if (stack.length > 12) stack.shift();
      removePaint(x, y, z);
      recordPaint(x, y, z, null);
    }
  }
  set(x, y, z, 0);
  if (canDrop) give(t);
  else toast('⚠️ Bu blok için daha iyi kazma gerekir, eşya düşmedi');
  commit(x, y, z, 0);
  if (isLeaf(t) && canDrop && !isCreative()) leafDrop(x, y, z, t);
  if (isLog(t)) chopTree(x, y, z, t);
  queueFall(x, y + 1, z); // üstündeki kum/kar düşsün
  sfx.breakB();
  rebuild(); drawHud();
}

// Boş kova: bakılan su ya da lav kaynağını alır
function useBucket() {
  if (eco.inv[BUCKET] < 1) return toast('Kova yok.');
  if (!wtarget) return toast('Bir su ya da lav kaynağına bakıp Koy\'a bas');
  const [x, y, z] = wtarget;
  const t = get(x, y, z);
  if (waterLvl(x, y, z) !== 0) return toast('Sadece kaynak alınır (akan sıvı alınamaz)');
  set(x, y, z, 0);
  commit(x, y, z, 0);
  take(BUCKET); give(t === LAVA ? LBUCKET : WBUCKET);
  sfx.splash();
  toast(t === LAVA ? '🪣 Lav kovası doldu' : '🪣 Kova doldu');
  rebuild(); drawHud();
}

// Dolu kova: bakılan yüzeye kaynak döker. Su lav kaynağına değerse obsidiyen, akan lava değerse taş olur.
function pour(item) {
  if (eco.inv[item] < 1) return toast('Kova boş.');
  if (!prev) return toast('Dökmek için bir yüzeye bak');
  const [x, y, z] = prev;
  if (!inBounds(x, y, z)) return toast('Dünya sınırı');
  const fl = item === LBUCKET ? LAVA : WATER;
  const c = get(x, y, z);
  if (c !== 0 && !isPlant(c) && c !== WATER && c !== LAVA) return;
  let res = fl;
  if ((c === WATER || c === LAVA) && c !== fl) res = (c === LAVA && waterLvl(x, y, z) === 0) ? OBSIDIAN : 3;
  set(x, y, z, res);
  commit(x, y, z, res);
  take(item); give(BUCKET);
  sfx.splash();
  rebuild(); drawHud();
}

// Tuval: bakılan tuvali düzenler, yoksa yeni tuval yerleştirir
function useCanvas() {
  if (target && get(target[0], target[1], target[2]) === CANVAS) {
    const [x, y, z] = target;
    return openDraw(getPaint(x, y, z), data => {
      setPaint(x, y, z, data);
      recordPaint(x, y, z, data);
      toast('🖼 Çizim kaydedildi');
    });
  }
  if (eco.inv[CANVAS] < 1) return toast('Tuval yok.');
  if (!prev) return;
  const [x, y, z] = prev;
  if (!inBounds(x, y, z)) return toast(y >= H ? 'Yükseklik sınırı (' + H + ')' : 'Dünya sınırı');
  const place = data => {
    if (eco.inv[CANVAS] < 1) return toast('Tuval yok.');
    const c = get(x, y, z);
    if (c !== 0 && !isPlant(c) && c !== WATER) return toast('Orası doldu');
    set(x, y, z, CANVAS);
    if (collides(P.x, P.y, P.z)) { set(x, y, z, 0); return toast('Oyuncunun üstüne konmaz'); }
    commit(x, y, z, CANVAS);
    setPaint(x, y, z, data);
    recordPaint(x, y, z, data);
    take(CANVAS);
    sfx.place();
    rebuild(); drawHud();
  };
  if (stack.length) place(stack.pop());   // kırılan tuvalin çizimi geri gelir
  else openDraw(null, place);
}

// Koy: blok yerleştirir, kova/tuval kullanır, yiyecekse yer
export function placeBlock() {
  if (isDead() || isDrawOpen()) return;
  const t = eco.sel;
  if (isTool(t)) return toast('Bu bir alet: bloğa basılı tutup kır');
  if (FOOD[t]) {
    if (eco.inv[t] < 1) return toast(TYPES[t].name + ' yok.');
    if (food.cur >= food.max) return toast('Karnın tok');
    take(t);
    eat(FOOD[t]);
    sfx.eat();
    drawHud();
    return toast('🍗 Yedin (+' + FOOD[t] + ')');
  }
  if (t === BUCKET) return useBucket();
  if (t === WBUCKET || t === LBUCKET) return pour(t);
  if (t === CANVAS) return useCanvas();
  if (!prev) return;
  if (eco.inv[t] < 1) return toast(TYPES[t].name + ' yok.');
  const [x, y, z] = prev;
  if (!inBounds(x, y, z)) return toast(y >= H ? 'Yükseklik sınırı (' + H + ')' : 'Dünya sınırı');
  if (isPlant(t)) {
    if (get(x, y, z) !== 0) return;
    const g = get(x, y - 1, z);
    if (t === SAPLING && ![1, 2, 6, 8].includes(g)) return toast('Fidan çimene, toprağa, kuma ya da kara dikilir');
    if (t !== SAPLING && ![1, 2].includes(g)) return toast('Çiçek çimene ya da toprağa dikilir');
  }
  set(x, y, z, t);
  if (collides(P.x, P.y, P.z)) { set(x, y, z, 0); return; }
  commit(x, y, z, t);
  if (t === SAPLING) trackSapling(x, y, z);
  if (isFalling(t)) queueFall(x, y, z); // altı boşsa düşer
  take(t);
  sfx.place();
  rebuild(); drawHud();
}

// Vur: hayvanlara her zaman, oyunculara sadece PVP açıkken
export function attack() {
  const room = G.room;
  if (isDead() || isDrawOpen() || !room) return;
  const now = Date.now();
  if (now - lastAtk < 450) return;
  lastAtk = now;

  const cp = Math.cos(P.pitch);
  const ex = P.x, ey = P.y + 1.6, ez = P.z;
  const dx = -Math.sin(P.yaw) * cp, dy = Math.sin(P.pitch), dz = -Math.cos(P.yaw) * cp;
  const o = G.online;
  if (o) o.swing();

  const m = findMob(ex, ey, ez, dx, dy, dz, 4.5);
  const p = (o && room.pvp) ? o.findPlayer(ex, ey, ez, dx, dy, dz, 4.5) : null;
  if (p && (!m || p.t <= m.t)) {
    o.hitPlayer(p.id);
    sfx.hit();
    return toast('Vurdun!');
  }
  if (m) {
    sfx.hit();
    if (room.solo || room.isOwner) hurtMob(m.id, MOB_DMG, P.x, P.z);
    else if (o) o.sendMobHit(m.id, MOB_DMG, P.x, P.z);
  }
}
