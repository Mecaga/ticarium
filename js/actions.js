import {
  get, set, rebuild, target, prev, wtarget, waterLvl, TYPES, H, inBounds,
  BEDROCK, SAPLING, WATER, BUCKET, WBUCKET, CANVAS, planTree
} from './world.js';
import { P, collides } from './player.js';
import { eco } from './economy.js';
import { drawHud, toast } from './ui.js';
import { queueFall, ghooks, isFalling } from './gravity.js';
import { isDead } from './health.js';
import { recordChange, recordPaint } from './progress.js';
import { G } from './state.js';
import { sfx } from './sound.js';
import { food, eat } from './hunger.js';
import { findMob, hurtMob } from './mobs.js';
import { getPaint, setPaint, removePaint, stack } from './paints.js';
import { openDraw, isDrawOpen } from './draw.js';

const FOOD = { 15: 6 };   // Et: +6 açlık
const MOB_DMG = 3;
const saplings = new Map();
let lastAtk = 0;
export const clearSaplings = () => saplings.clear();

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
  // Düşen kum/kar ve akan su da kaydedilsin, odadaki herkese gitsin
  ghooks.onChange = (x, y, z, t) => commit(x, y, z, t);
  setInterval(growSaplings, 2000);
}

export function breakBlock() {
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
  eco.inv[t]++;
  if ((t === 5 || t === 14) && Math.random() < 0.25) {
    eco.inv[SAPLING]++;
    toast('🌱 Fidan buldun!');
  }
  commit(x, y, z, 0);
  queueFall(x, y + 1, z); // üstündeki kum/kar düşsün
  sfx.breakB();
  rebuild(); drawHud();
}

// Boş kova: bakılan su kaynağını alır
function useBucket() {
  if (eco.inv[BUCKET] < 1) return toast('Kova yok.');
  if (!wtarget) return toast('Bir su kaynağına bakıp Koy\'a bas');
  const [x, y, z] = wtarget;
  if (waterLvl(x, y, z) !== 0) return toast('Sadece su kaynağı alınır (akan su alınamaz)');
  set(x, y, z, 0);
  commit(x, y, z, 0);
  eco.inv[BUCKET]--; eco.inv[WBUCKET]++;
  sfx.splash();
  toast('🪣 Kova doldu');
  rebuild(); drawHud();
}

// Dolu kova: bakılan yüzeye su kaynağı döker
function pourBucket() {
  if (eco.inv[WBUCKET] < 1) return toast('Su kovası yok.');
  if (!prev) return toast('Dökmek için bir yüzeye bak');
  const [x, y, z] = prev;
  if (!inBounds(x, y, z)) return toast('Dünya sınırı');
  const c = get(x, y, z);
  if (c !== 0 && c !== SAPLING && c !== WATER) return;
  set(x, y, z, WATER);
  commit(x, y, z, WATER);
  eco.inv[WBUCKET]--; eco.inv[BUCKET]++;
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
    if (c !== 0 && c !== SAPLING && c !== WATER) return toast('Orası doldu');
    set(x, y, z, CANVAS);
    if (collides(P.x, P.y, P.z)) { set(x, y, z, 0); return toast('Oyuncunun üstüne konmaz'); }
    commit(x, y, z, CANVAS);
    setPaint(x, y, z, data);
    recordPaint(x, y, z, data);
    eco.inv[CANVAS]--;
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
  if (FOOD[t]) {
    if (eco.inv[t] < 1) return toast(TYPES[t].name + ' yok.');
    if (food.cur >= food.max) return toast('Karnın tok');
    eco.inv[t]--;
    eat(FOOD[t]);
    sfx.eat();
    drawHud();
    return toast('🍗 Yedin (+' + FOOD[t] + ')');
  }
  if (t === BUCKET) return useBucket();
  if (t === WBUCKET) return pourBucket();
  if (t === CANVAS) return useCanvas();
  if (!prev) return;
  if (eco.inv[t] < 1) return toast(TYPES[t].name + ' yok.');
  const [x, y, z] = prev;
  if (!inBounds(x, y, z)) return toast(y >= H ? 'Yükseklik sınırı (' + H + ')' : 'Dünya sınırı');
  if (t === SAPLING && ![1, 2, 6, 8].includes(get(x, y - 1, z))) {
    return toast('Fidan çimene, toprağa, kuma ya da kara dikilir');
  }
  set(x, y, z, t);
  if (collides(P.x, P.y, P.z)) { set(x, y, z, 0); return; }
  commit(x, y, z, t);
  if (t === SAPLING) trackSapling(x, y, z);
  if (isFalling(t)) queueFall(x, y, z); // altı boşsa düşer
  eco.inv[t]--;
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
