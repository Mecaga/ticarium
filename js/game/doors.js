import { N } from '../world/idtable.js';
import { get, set, rebuild, isLoaded, isPlant, inBounds, solid, prev, BOXES } from '../world/world.js';
import { addFlat } from '../world/textures.js';
import { eco } from './economy.js';
import { RECIPES } from './recipes.js';
import { toast, drawHud } from '../ui/ui.js';
import { P } from '../entities/player.js';
import { dropItems } from '../entities/items.js';
import { isCreative } from './creative.js';
import { G } from '../core/state.js';
import { recordChange } from './progress.js';
import { sfx } from '../core/sound.js';
import { BED } from './bed.js';

// Kapı iki parçadır (alt ve üst). Her parça 4 yön × açık/kapalı = 16 numara:
// 240-243 kapalı alt, 244-247 açık alt, 248-251 kapalı üst, 252-255 açık üst. Yön = numara & 3.
const LO = 240, LOO = 244, UP = 248, UPO = 252;
export const DOOR = N.KAPI_BASI;    // kapı eşyası (envanter)
export const BEDH = N.YATAK_BASI;   // yatak başı. Yatak eşyası da bu numara.

// Levha kutuları: 0 kuzey, 1 doğu, 2 güney, 3 batı kenarı
const PAN = [
  [0, 0, 0, 1, 1, 0.1875],
  [0.8125, 0, 0, 1, 1, 1],
  [0, 0, 0.8125, 1, 1, 1],
  [0, 0, 0, 0.1875, 1, 1]
];
// Açılınca levha, menteşe köşesini paylaşan komşu kenara geçer (90° dönüş)
const OPEN = [3, 0, 1, 2];

addFlat(DOOR);

// Kırılınca düşen eşyalar. Kapı ve yatak eşyası pairFix içinde tek sefer verilir.
export const EXTRA_DROPS = { [BEDH]: [], [BED]: [] };
for (let f = 0; f < 4; f++) {
  for (const id of [LO + f, UP + f]) BOXES[id] = PAN[f];
  for (const id of [LOO + f, UPO + f]) BOXES[id] = PAN[OPEN[f]];
  EXTRA_DROPS[LO + f] = [[DOOR, 1]]; EXTRA_DROPS[LOO + f] = [[DOOR, 1]];
  EXTRA_DROPS[UP + f] = []; EXTRA_DROPS[UPO + f] = [];
}
BOXES[BED] = BOXES[BEDH] = [0, 0, 0, 1, 0.5625, 1];   // yatak: 9/16 yükseklik
export const isDoorBlock = t => t >= LO && t <= UPO + 3;

RECIPES.push({ out: [DOOR, 1], pat: [[N.TAHTA, N.TAHTA], [N.TAHTA, N.TAHTA], [N.TAHTA, N.TAHTA]] });

const commit = (x, y, z, t) => { recordChange(x, y, z, t); if (G.online) G.online.sendBlock(x, y, z, t); };
const give = t => { if (!isCreative()) dropItems([{ t, c: 1, x: P.x, y: P.y + 1.3, z: P.z, vx: 0, vy: 2, vz: 0 }]); };
const emptyAt = (x, y, z) => { const v = get(x, y, z); return v === 0 || isPlant(v); };
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Oyuncunun gövdesi (0.6 genişlik, 1.7 boy) bu hücredeki kutuyla kesişiyor mu.
// Köşe noktalarına bakmak yetmez: ince levha gövdenin ortasından geçebilir.
function inside(x, y, z) {
  if (P.ghost) return false;
  const b = BOXES[get(x, y, z)];
  if (!b) return false;
  const R = 0.3, PH = 1.7;
  return P.x + R > x + b[0] && P.x - R < x + b[3] &&
    P.y + PH > y + b[1] && P.y < y + b[4] &&
    P.z + R > z + b[2] && P.z - R < z + b[5];
}

export function placeDoor() {
  if (!prev) return;
  const [x, y, z] = prev;
  if (!isCreative() && (eco.inv[DOOR] || 0) < 1) return toast('Kapı yok');
  if (!inBounds(x, y + 1, z) || !isLoaded(x, z)) return toast('Buraya konmaz');
  if (!emptyAt(x, y, z) || !emptyAt(x, y + 1, z)) return toast('Kapı için 2 blok boşluk gerek');
  if (!solid(x, y - 1, z)) return toast('Kapı sağlam zemine konur');
  // Levha sana en yakın kenara gelir: bakış yönünün tersi
  const dx = -Math.sin(P.yaw), dz = -Math.cos(P.yaw);
  const f = Math.abs(dz) >= Math.abs(dx) ? (dz < 0 ? 2 : 0) : (dx > 0 ? 3 : 1);
  set(x, y, z, LO + f); set(x, y + 1, z, UP + f);
  if (inside(x, y, z) || inside(x, y + 1, z)) {
    set(x, y, z, 0); set(x, y + 1, z, 0);
    return toast('Oyuncunun üstüne konmaz');
  }
  commit(x, y, z, LO + f); commit(x, y + 1, z, UP + f);
  if (!isCreative()) eco.inv[DOOR]--;
  sfx.place(); rebuild(); drawHud();
}

// Alt ya da üst parçaya bakarak çağrılır: açık/kapalı durumunu değiştirir
export function toggleDoor(t) {
  const x = t[0], z = t[2];
  let y = t[1];
  if (get(x, y, z) >= UP) y--;
  const lo = get(x, y, z), hi = get(x, y + 1, z);
  if (lo < LO || lo >= UP || hi < UP || hi > UPO + 3) return;   // iki parça da kapı olmalı
  const f = (lo - LO) & 3, open = lo >= LOO;
  const nl = open ? LO + f : LOO + f, nu = open ? UP + f : UPO + f;
  set(x, y, z, nl); set(x, y + 1, z, nu);
  if (inside(x, y, z) || inside(x, y + 1, z)) {   // yeni konumda levha seni sıkıştırırsa hareket etmez
    set(x, y, z, lo); set(x, y + 1, z, hi);
    return toast('Kapı oyuncuya çarpıyor');
  }
  commit(x, y, z, nl); commit(x, y + 1, z, nu);
  sfx.place(); rebuild();
}

// Şalterden (redstone) gelen istek: kapıyı istenen duruma getirir
export function setDoor(t, wantOpen) {
  let y = t[1];
  if (get(t[0], y, t[2]) >= UP) y--;
  const lo = get(t[0], y, t[2]);
  if (lo < LO || lo >= UP) return;
  if ((lo >= LOO) === wantOpen) return;
  toggleDoor([t[0], y, t[2]]);
}

export function placeBed() {
  if (!prev) return;
  const [x, y, z] = prev;
  if (!isCreative() && (eco.inv[BEDH] || 0) < 1) return toast('Yatak yok');
  let dx = -Math.sin(P.yaw), dz = -Math.cos(P.yaw);
  if (Math.abs(dx) > Math.abs(dz)) { dx = Math.sign(dx); dz = 0; } else { dz = Math.sign(dz); dx = 0; }
  const hx = x + dx, hz = z + dz;
  if (!isLoaded(hx, hz)) return toast('Alan yüklenmedi');
  if (!emptyAt(x, y, z) || !emptyAt(hx, y, hz)) return toast('Yatak için 2 blok boşluk gerek');
  if (!solid(x, y - 1, z) || !solid(hx, y - 1, hz)) return toast('Yatak sağlam zemine konur');
  set(x, y, z, BED); set(hx, y, hz, BEDH);
  if (inside(x, y, z) || inside(hx, y, hz)) {
    set(x, y, z, 0); set(hx, y, hz, 0);
    return toast('Oyuncunun üstüne konmaz');
  }
  commit(x, y, z, BED); commit(hx, y, hz, BEDH);
  if (!isCreative()) eco.inv[BEDH]--;
  sfx.place(); rebuild(); drawHud();
}

// Bir parça kırılınca eşini de kaldırır. Kapı ve yatak eşyası tek sefer verilir.
export function pairFix(x, y, z, t) {
  const clr = (cx, cy, cz, ok) => {
    if (!ok(get(cx, cy, cz))) return false;
    set(cx, cy, cz, 0); commit(cx, cy, cz, 0); return true;
  };
  const lower = v => v >= LO && v < UP, upper = v => v >= UP && v <= UPO + 3;
  if (lower(t)) {
    clr(x, y + 1, z, upper);                          // alt kırıldı: kapı EXTRA_DROPS ile düşer
  } else if (upper(t)) {
    clr(x, y - 1, z, lower);
    give(DOOR);                                       // üst kırıldı: kapı burada verilir
  } else if (t === BED || t === BEDH) {
    const want = t === BED ? BEDH : BED;
    for (const [a, b] of D4) if (clr(x + a, y, z + b, v => v === want)) break;
    give(BEDH);                                       // yatak: iki parça da kırılınca bir kez verilir
  }
  rebuild();
  }
