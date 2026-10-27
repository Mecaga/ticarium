import { TYPES, CATS, get, set, rebuild, isLoaded, isPlant, inBounds, solid, prev, BOXES } from '../world/world.js';
import { FACE_TILES, tileOf, addFlat } from '../world/textures.js';
import { eco } from './economy.js';
import { RECIPES } from './recipes.js';
import { toast, drawHud } from '../ui/ui.js';
import { P, collides } from '../entities/player.js';
import { dropItems } from '../entities/items.js';
import { isCreative } from './creative.js';
import { G } from '../core/state.js';
import { recordChange } from './progress.js';
import { sfx } from '../core/sound.js';
import { BED } from './bed.js';

export const DOOR = 108, BEDH = 99;
const LO = 160, LOO = 164, UP = 168, UPO = 172;   // kapalı alt, açık alt, kapalı üst, açık üst (her biri 4 yön)
const PAN = [[0, 0, 0, 1, 1, 0.1875], [0.8125, 0, 0, 1, 1, 1], [0, 0, 0.8125, 1, 1, 1], [0, 0, 0, 0.1875, 1, 1]];
const dc = tileOf('doorC');

TYPES[DOOR] = { name: 'Kapı', color: 0x9a6a30, base: 30 };
eco.inv[DOOR] = 0; eco.raw[DOOR] = 30; eco.trend[DOOR] = 0;
CATS[0][1].push(DOOR);
RECIPES.push({ out: [DOOR, 1], pat: [[70, 70], [70, 70], [70, 70]] });
addFlat(DOOR);

export const EXTRA_DROPS = { [BEDH]: [] };
for (let f = 0; f < 4; f++) {
  for (const id of [LO + f, UP + f]) { FACE_TILES[id] = [dc, dc, dc]; BOXES[id] = PAN[f]; }
  for (const id of [LOO + f, UPO + f]) { FACE_TILES[id] = [dc, dc, dc]; BOXES[id] = PAN[(f + 1) % 4]; }   // açılınca levha yan kenara döner
  EXTRA_DROPS[LO + f] = [[DOOR, 1]]; EXTRA_DROPS[LOO + f] = [[DOOR, 1]];
  EXTRA_DROPS[UP + f] = []; EXTRA_DROPS[UPO + f] = [];
}
BOXES[BED] = BOXES[BEDH] = [0, 0, 0, 1, 0.5625, 1];   // yatak: yarım blok
export const isDoorBlock = t => t >= LO && t <= UPO + 3;

const commit = (x, y, z, t) => { recordChange(x, y, z, t); if (G.online) G.online.sendBlock(x, y, z, t); };
const give = t => { if (!isCreative()) dropItems([{ t, c: 1, x: P.x, y: P.y + 1.3, z: P.z, vx: 0, vy: 2, vz: 0 }]); };
const emptyAt = (x, y, z) => { const v = get(x, y, z); return v === 0 || isPlant(v); };
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function placeDoor() {
  if (!prev) return;
  const [x, y, z] = prev;
  if (!isCreative() && (eco.inv[DOOR] || 0) < 1) return toast('Kapı yok');
  if (!inBounds(x, y + 1, z) || !isLoaded(x, z)) return toast('Buraya konmaz');
  if (!emptyAt(x, y, z) || !emptyAt(x, y + 1, z)) return toast('Kapı için 2 blok boşluk gerek');
  if (!solid(x, y - 1, z)) return toast('Kapı sağlam zemine konur');
  const dx = -Math.sin(P.yaw), dz = -Math.cos(P.yaw);   // levha oyuncuya yakın kenara gelir
  const f = Math.abs(dz) >= Math.abs(dx) ? (dz < 0 ? 2 : 0) : (dx > 0 ? 3 : 1);
  set(x, y, z, LO + f); set(x, y + 1, z, UP + f);
  if (collides(P.x, P.y, P.z)) { set(x, y, z, 0); set(x, y + 1, z, 0); return toast('Oyuncunun üstüne konmaz'); }
  commit(x, y, z, LO + f); commit(x, y + 1, z, UP + f);
  if (!isCreative()) eco.inv[DOOR]--;
  sfx.place(); rebuild(); drawHud();
}

export function toggleDoor(t) {
  const x = t[0], z = t[2];
  let y = t[1];
  if (get(x, y, z) >= UP) y--;
  const lo = get(x, y, z);
  if (lo < LO || lo >= UP) return;
  const f = (lo - LO) & 3, open = lo >= LOO;
  const a = open ? LO + f : LOO + f, b = open ? UP + f : UPO + f;
  set(x, y, z, a); set(x, y + 1, z, b);
  if (open && collides(P.x, P.y, P.z)) {   // kapanırken levhanın içindeysen kapanmaz
    set(x, y, z, LOO + f); set(x, y + 1, z, UPO + f);
    return toast('Kapının içindesin');
  }
  commit(x, y, z, a); commit(x, y + 1, z, b);
  sfx.place(); rebuild();
}

export function placeBed() {
  if (!prev) return;
  const [x, y, z] = prev;
  if (!isCreative() && (eco.inv[BED] || 0) < 1) return toast('Yatak yok');
  let dx = -Math.sin(P.yaw), dz = -Math.cos(P.yaw);
  if (Math.abs(dx) > Math.abs(dz)) { dx = Math.sign(dx); dz = 0; } else { dz = Math.sign(dz); dx = 0; }
  const hx = x + dx, hz = z + dz;
  if (!isLoaded(hx, hz)) return toast('Alan yüklenmedi');
  if (!emptyAt(x, y, z) || !emptyAt(hx, y, hz)) return toast('Yatak için 2 blok boşluk gerek');
  if (!solid(x, y - 1, z) || !solid(hx, y - 1, hz)) return toast('Yatak sağlam zemine konur');
  set(x, y, z, BED); set(hx, y, hz, BEDH);
  commit(x, y, z, BED); commit(hx, y, hz, BEDH);
  if (!isCreative()) eco.inv[BED]--;
  sfx.place(); rebuild(); drawHud();
}

// Bir yarısı kırılınca diğer yarısını da kaldırır
export function pairFix(x, y, z, t) {
  const clr = (cx, cy, cz, ok) => {
    if (!ok(get(cx, cy, cz))) return false;
    set(cx, cy, cz, 0); commit(cx, cy, cz, 0); return true;
  };
  const lower = v => v >= LO && v < UP, upper = v => v >= UP && v <= UPO + 3;
  if (lower(t)) clr(x, y + 1, z, upper);
  else if (upper(t)) { if (clr(x, y - 1, z, lower)) give(DOOR); }
  else if (t === BED) { for (const [a, b] of D4) clr(x + a, y, z + b, v => v === BEDH); }
  else if (t === BEDH) { for (const [a, b] of D4) if (clr(x + a, y, z + b, v => v === BED)) { give(BED); break; } }
  rebuild();
}
