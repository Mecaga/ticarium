import { TYPES, CATS, get, set, rebuild, isLoaded, isPlant, inBounds, solid, prev } from '../world/world.js';
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

export const DOOR = 108, DOORU = 109, DOORO = 87, DOOROU = 88, BEDH = 99;

TYPES[DOOR] = { name: 'Kapı', color: 0x9a6a30, base: 30 };
eco.inv[DOOR] = 0; eco.raw[DOOR] = 30; eco.trend[DOOR] = 0;
CATS[0][1].push(DOOR);
const dc = tileOf('doorC'), dop = tileOf('doorO');
FACE_TILES[DOOR] = [dc, dc, dc]; FACE_TILES[DOORU] = [dc, dc, dc];
FACE_TILES[DOORO] = [dop, dop, dop]; FACE_TILES[DOOROU] = [dop, dop, dop];
FACE_TILES[BEDH] = [tileOf('wool'), tileOf('planks'), tileOf('planks')];
RECIPES.push({ out: [DOOR, 1], pat: [[70, 70], [70, 70], [70, 70]] });
addFlat(DOOR);

// Kırılınca düşenler: üst yarılar ve yatağın baş kısmı eşya düşürmez (eşyayı alt yarı / ayak verir)
export const EXTRA_DROPS = { [DOORU]: [], [DOOROU]: [], [DOORO]: [[DOOR, 1]], [BEDH]: [] };

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
  set(x, y, z, DOOR); set(x, y + 1, z, DOORU);
  if (collides(P.x, P.y, P.z)) { set(x, y, z, 0); set(x, y + 1, z, 0); return toast('Oyuncunun üstüne konmaz'); }
  commit(x, y, z, DOOR); commit(x, y + 1, z, DOORU);
  if (!isCreative()) eco.inv[DOOR]--;
  sfx.place(); rebuild(); drawHud();
}

export function toggleDoor(t) {
  let [x, y, z] = t;
  const v = get(x, y, z);
  if (v === DOORU || v === DOOROU) y--;
  const lo = get(x, y, z);
  if (lo !== DOOR && lo !== DOORO) return;
  const open = lo === DOORO;
  const a = open ? DOOR : DOORO, b = open ? DOORU : DOOROU;
  set(x, y, z, a); set(x, y + 1, z, b);
  if (open && collides(P.x, P.y, P.z)) {   // kapanırken içinde duruyorsan kapanmaz
    set(x, y, z, DOORO); set(x, y + 1, z, DOOROU);
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
  if (collides(P.x, P.y, P.z)) { set(x, y, z, 0); set(hx, y, hz, 0); return toast('Oyuncunun üstüne konmaz'); }
  commit(x, y, z, BED); commit(hx, y, hz, BEDH);
  if (!isCreative()) eco.inv[BED]--;
  sfx.place(); rebuild(); drawHud();
}

// Bir yarısı kırılınca diğer yarısını da kaldırır (kırılan blok t, x y z konumunda)
export function pairFix(x, y, z, t) {
  const clr = (cx, cy, cz, ids) => {
    if (!ids.includes(get(cx, cy, cz))) return false;
    set(cx, cy, cz, 0); commit(cx, cy, cz, 0); return true;
  };
  if (t === DOOR || t === DOORO) clr(x, y + 1, z, [DOORU, DOOROU]);
  else if (t === DOORU || t === DOOROU) { if (clr(x, y - 1, z, [DOOR, DOORO])) give(DOOR); }
  else if (t === BED) { for (const [a, b] of D4) clr(x + a, y, z + b, [BEDH]); }
  else if (t === BEDH) { for (const [a, b] of D4) if (clr(x + a, y, z + b, [BED])) { give(BED); break; } }
  rebuild();
}
