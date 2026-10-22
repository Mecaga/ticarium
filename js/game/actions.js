import {
  get, set, rebuild, target, prev, wtarget, stgt, waterLvl, TYPES, H, inBounds, eachBlock,
  BEDROCK, SAPLING, WATER, LAVA, BUCKET, WBUCKET, LBUCKET, CANVAS, APPLE, OBSIDIAN,
  CRAFT, FARM, FURNACE, SEEDS, WHEAT, STICK, COAL, INGOT_I, INGOT_G, GEM, COAL_ORE, DIAMOND_ORE,
  CROP_MIN, CROP_MAX, isCrop, planTree, isPlant
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
import { isTool, TOOLS, hardTime } from './mining.js';
import { addItem } from './inventory.js';
import { isGear, wear } from './gear.js';
import { openCraft, isCraftOpen } from '../ui/craft.js';
import { openFurnace, isFurnaceOpen } from '../ui/furnace.js';
import { isArmor } from './armor.js';

const FOOD = { 15: 6, 46: 4, 75: 5, 86: 10 };   // Et +6, Elma +4, Ekmek +5, Pişmiş et +10
const NOPLACE = new Set([STICK, WHEAT, COAL, INGOT_I, INGOT_G, GEM]);
const MOB_DMG = 3, PVP_DMG = 4;
const D6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
let lastAtk = 0;

// Eski çağrılar için (fidan ve buğday artık tarama ile büyür)
export const clearSaplings = () => {};
export const trackSapling = () => {};

// Yaratıcı modda eşya harcanmaz, toplanmaz. Çanta doluysa fazlası yere düşer.
const give = (t, n = 1) => {
  if (isCreative()) return;
  const a = addItem(t, n);
  if (a < n) {
    toast('🎒 Çanta dolu');
    dropItems([{ t, c: n - a, x: P.x, y: P.y + 1.3, z: P.z, vx: (Math.random() - 0.5) * 2, vy: 2, vz: (Math.random() - 0.5) * 2 }]);
  }
};
const take = (t, n = 1) => { if (!isCreative()) eco.inv[t] -= n; };
const isLog = t => t === 4 || t === 13;
const isLeaf = t => t === 5 || t === 14;
const uiOpen = () => isDrawOpen() || isCraftOpen() || isFurnaceOpen();

function commit(x, y, z, t) {
  recordChange(x, y, z, t);
  if (G.online) G.online.sendBlock(x, y, z, t);
}

// Alet aşınır; kırılırsa haber verir
function afterWear(t, amt) {
  if (!isGear(t)) return;
  if (wear(t, amt)) { toast('💥 ' + TYPES[t].name + ' kırıldı!'); sfx.hit(); }
  drawHud();
}

// Blok kırılınca düşen eşyalar [[eşya, adet], ...]
function dropsOf(t) {
  if (t === FARM) return [[2, 1]];
  if (t === COAL_ORE) return [[COAL, 1]];
  if (t === DIAMOND_ORE) return [[GEM, 1]];
  if (isCrop(t)) {
    if (t < CROP_MAX) return [[SEEDS, 1]];
    return [[WHEAT, 1], [SEEDS, 1 + Math.floor(Math.random() * 2)]];
  }
  if (t === 1 && Math.random() < 0.12) return [[1, 1], [SEEDS, 1]];
  return [[t, 1]];
}

// Altındaki blok kırılınca üstteki bitki (çiçek, fidan, buğday) yere düşer
function popPlant(x, y, z) {
  const a = get(x, y, z);
  if (!isPlant(a)) return;
  set(x, y, z, 0);
  commit(x, y, z, 0);
  if (isCreative()) return;
  dropItems(dropsOf(a).map(([it, n]) => ({
    t: it, c: n, x: x + 0.5, y: y + 0.5, z: z + 0.5,
    vx: (Math.random() - 0.5) * 2, vy: 2.5, vz: (Math.random() - 0.5) * 2
  })));
}

// ---- Büyüme: fidanlar ve buğday (yüklü chunk'lar taranır, sadece oda yönetimi olan cihazda) ----
const GROW = [SAPLING, 77, 78, 79];

function wetNear(x, y, z) {   // 4 blok yarıçapında su var mı
  for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) {
    if (get(x + dx, y - 1, z + dz) === WATER || get(x + dx, y, z + dz) === WATER) return true;
  }
  return false;
}

function growTick() {
  const r = G.room;
  if (!r || !r.sim) return;
  eachBlock(GROW, (x, y, z, t) => {
    if (t === SAPLING) {
      if (Math.random() > 0.06) return;
      if (![1, 2, 6, 8].includes(get(x, y - 1, z))) return;
      const plan = planTree(x, y, z, Math.random() < 0.35);
      if (!plan) return;
      for (const b of plan) { set(b.x, b.y, b.z, b.t); commit(b.x, b.y, b.z, b.t); }
      return;
    }
    if (get(x, y - 1, z) !== FARM) { popPlant(x, y, z); return; }   // toprak yoksa tohum düşer
    if (Math.random() < (wetNear(x, y, z) ? 0.2 : 0.07)) { set(x, y, z, t + 1); commit(x, y, z, t + 1); }
  });
  rebuild();
}

export function initActions() {
  // Düşen kum/kar ve akan sıvılar da kaydedilsin, odadaki herkese gitsin
  ghooks.onChange = (x, y, z, t) => commit(x, y, z, t);
  setInterval(growTick, 3000);
}

// ---- Yapraklar: gövde bitince zamanla çürür ----
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

// Hiçbir gövdeye 4 blok içinde bağlı olmayan yapraklar yavaş yavaş kaybolur.
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
      }, 1500 + Math.random() * 10500);
    }
  }
}

// Bakılan bloğu kırar. mining.js süre dolunca çağırır.
// canDrop=false: gereken alet yok, eşya düşmez. Bedrock'ta sadece uyarı verir.
export function breakBlock(canDrop = true) {
  if (isDead() || uiOpen() || !target) return;
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
  if (canDrop) for (const [it, n] of dropsOf(t)) give(it, n);
  else toast('⚠️ Bu blok için daha iyi kazma gerekir, eşya düşmedi');
  commit(x, y, z, 0);
  popPlant(x, y + 1, z);   // üstündeki bitki desteksiz kalır
  if (isLeaf(t) && canDrop && !isCreative()) leafDrop(x, y, z, t);
  if (isLog(t)) decayLeaves(x, y, z);   // her odun tek tek kırılır, yapraklar son odundan sonra çürür
  queueFall(x, y + 1, z); // üstündeki kum/kar düşsün
  const sel = eco.sel;
  if (isGear(sel) && hardTime(t) >= 0.5) afterWear(sel, TOOLS[sel] && TOOLS[sel][0] === 'sword' ? 2 : 1);
  sfx.breakB();
  rebuild(); drawHud();
}

// Boş kova: bakılan SU ya da LAV KAYNAĞINI alır (altında/çevresinde ne olduğu önemli değil).
// Akan sıvı alınamaz: bakış ışını akan sıvıyı atlayıp ilk kaynak bloğu bulur.
function useBucket() {
  if (eco.inv[BUCKET] < 1) return toast('Kova yok.');
  if (!wtarget) return toast('Bir su ya da lav kaynağına bak (akan sıvı alınamaz)');
  const [x, y, z] = wtarget;
  const t = get(x, y, z);
  if ((t !== WATER && t !== LAVA) || waterLvl(x, y, z) !== 0) return toast('Sadece kaynak blok alınır');
  set(x, y, z, 0);
  commit(x, y, z, 0);
  take(BUCKET); give(t === LAVA ? LBUCKET : WBUCKET);
  sfx.splash();
  toast(t === LAVA ? '🪣 Lav kovası doldu' : '🪣 Su kovası doldu');
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

// Çapa: bakılan çimen/toprak bloğunu işlenmiş toprak yapar
function useHoe() {
  const t = eco.sel;
  if (eco.inv[t] < 1) return toast('Çapa yok.');
  if (!target) return toast('Çapayla çimen ya da toprak bloğuna bak');
  const [x, y, z] = target, b = get(x, y, z);
  if ((b !== 1 && b !== 2) || get(x, y + 1, z) !== 0) return toast('Çapa, üstü boş çimen/toprak bloğunu işler');
  set(x, y, z, FARM);
  commit(x, y, z, FARM);
  sfx.place();
  afterWear(t, 1);
  rebuild(); drawHud();
}

// Tohum: akıllı ekim
//  1) Olgun buğdaya bakıyorsan: hasat edip yerine hemen yeni tohum eker (kır-ve-ek)
//  2) Bakış ışını bitkilerin içinden geçer: arkadaki işlenmiş toprağa eker
//     (üstünde çiçek/fidan varsa kırılıp yerine tohum konur, olgunlaşmamış buğdayın aşamasını söyler)
function plantSeeds() {
  if (eco.inv[SEEDS] < 1) return toast('Tohum yok.');
  if (target && get(target[0], target[1], target[2]) === CROP_MAX) {
    const [x, y, z] = target;
    if (get(x, y - 1, z) === FARM) {
      for (const [it, n] of dropsOf(CROP_MAX)) give(it, n);
      set(x, y, z, CROP_MIN);
      commit(x, y, z, CROP_MIN);
      take(SEEDS);
      sfx.breakB();
      toast('🌾 Hasat edildi, yeniden ekildi');
      rebuild(); drawHud();
      return;
    }
  }
  const s = stgt;
  if (!s || get(s[0], s[1], s[2]) !== FARM) return toast('Tohum işlenmiş toprağa ekilir. Önce çapayla toprağı işle.');
  const [x, y, z] = s, a = get(x, y + 1, z);
  if (isCrop(a)) return toast('🌱 Burada buğday var (' + (a - CROP_MIN + 1) + '/4). Olgunlaşınca hasat edip yeniden ekersin');
  if (a !== 0 && !isPlant(a)) return toast('Üstü dolu');
  set(x, y + 1, z, CROP_MIN);
  commit(x, y + 1, z, CROP_MIN);
  take(SEEDS);
  sfx.place();
  if (a !== 0) toast('Bitki kırıldı, tohum ekildi');
  rebuild(); drawHud();
}

// Koy: masa/ocak açar, çapa/tohum/kova/tuval kullanır, yiyecekse yer, değilse blok yerleştirir
export function placeBlock() {
  if (isDead() || uiOpen()) return;
  const t = eco.sel;
  if (target) {
    const tb = get(target[0], target[1], target[2]);
    if (tb === CRAFT) return openCraft(3);
    if (tb === FURNACE) return openFurnace();
  }
  const tl = TOOLS[t];
  if (tl && tl[0] === 'hoe') return useHoe();
  if (isTool(t)) return toast('Bu bir alet: bloğa basılı tutup kır, kılıçla vur');
  if (isArmor(t)) return toast('Zırhı çantadan giy: eşyaya dokun → 🛡 Giy');
  if (t === SEEDS) return plantSeeds();
  if (NOPLACE.has(t)) return toast('Bu eşya yerleştirilemez');
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
  if (isFalling(t)) queueFall(x, y, z); // altı boşsa düşer
  take(t);
  sfx.place();
  rebuild(); drawHud();
}

// Vur: hayvanlara her zaman, oyunculara sadece PVP açıkken. Kılıç ve alet seviyesi hasarı artırır.
export function attack() {
  const room = G.room;
  if (isDead() || uiOpen() || !room) return;
  const now = Date.now();
  if (now - lastAtk < 450) return;
  lastAtk = now;

  const cp = Math.cos(P.pitch);
  const ex = P.x, ey = P.y + 1.6, ez = P.z;
  const dx = -Math.sin(P.yaw) * cp, dy = Math.sin(P.pitch), dz = -Math.cos(P.yaw) * cp;
  const o = G.online;
  if (o) o.swing();

  const sel = eco.sel, tl = TOOLS[sel], has = (eco.inv[sel] || 0) > 0 || isCreative();
  const isSword = !!tl && tl[0] === 'sword' && has;
  const bonus = isSword ? tl[1] : 0;   // ahşap 1, taş 2, demir 3, elmas 4
  const m = findMob(ex, ey, ez, dx, dy, dz, 4.5);
  const p = (o && room.pvp) ? o.findPlayer(ex, ey, ez, dx, dy, dz, 4.5) : null;
  if (p && (!m || p.t <= m.t)) {
    o.hitPlayer(p.id, PVP_DMG + bonus);
    sfx.hit();
    if (isGear(sel) && has) afterWear(sel, isSword ? 1 : 2);
    return toast('Vurdun!');
  }
  if (m) {
    sfx.hit();
    const dmg = MOB_DMG + bonus;
    if (room.solo || room.sim) hurtMob(m.id, dmg, P.x, P.z);
    else if (o) o.sendMobHit(m.id, dmg, P.x, P.z);
    if (isGear(sel) && has) afterWear(sel, isSword ? 1 : 2);
  }
    }
