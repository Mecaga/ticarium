import { N } from '../world/idtable.js';
import { TYPES, CATS, BOXES, MBOX, get, set, rebuild, prev, target, solid, isPlant } from '../world/world.js';
import { FACE_TILES, tileOf } from '../world/textures.js';
import { eco } from './economy.js';
import { RECIPES } from './recipes.js';
import { toast, drawHud } from '../ui/ui.js';
import { P, climbHook } from '../entities/player.js';
import { G } from '../core/state.js';
import { isCreative } from './creative.js';
import { recordChange } from './progress.js';
import { sfx } from '../core/sound.js';

const DX = [0, 1, 0, -1], DZ = [-1, 0, 1, 0];   // 0 kuzey, 1 doğu, 2 güney, 3 batı
const commit = (x, y, z, t) => { recordChange(x, y, z, t); if (G.online) G.online.sendBlock(x, y, z, t); };

// ---- Basamaklar (yarım blok): 3x1 tarifle 6 adet ----
const SL = [
  [N.BASAMAK_MESE, 'Meşe basamak', 'woodSide', N.TAHTA],
  [N.BASAMAK_HUS, 'Huş basamak', 'birchSide', N.HUS_ODUN],
  [N.BASAMAK_TAS, 'Taş basamak', 'stone', N.TAS],
  [N.SPRUCE_BASAMAK, 'Çam basamak', 'sprucePlanks', N.SPRUCE_TAHTA]
];
for (const [id, name, tile, src] of SL) {
  TYPES[id] = { name, color: 0x999999, base: 6 };
  FACE_TILES[id] = [tileOf(tile), tileOf(tile), tileOf(tile)];
  eco.inv[id] = 0; eco.raw[id] = 6; eco.trend[id] = 0;
  if (!CATS[0][1].includes(id)) CATS[0][1].push(id);
  BOXES[id] = [0, 0, 0, 1, 0.5, 1];
  RECIPES.push({ out: [id, 6], pat: [[src, src, src]] });
}
export const isSlab = t => SL.some(s => s[0] === t);

// ---- Merdiven: duvara bakarak konur. Hücre çarpmaz, plakası duvara bakar, tırmanılır. ----
const LAD = N.TIRMANMA_MERDIVEN;
export const LADDER = LAD;
TYPES[LAD] = { name: 'Merdiven', color: 0x8c6434, base: 8 };
if (!FACE_TILES[LAD]) FACE_TILES[LAD] = [tileOf('stick'), tileOf('stick'), tileOf('stick')];
eco.inv[LAD] = 0; eco.raw[LAD] = 8; eco.trend[LAD] = 0;
if (!CATS[0][1].includes(LAD)) CATS[0][1].push(LAD);
BOXES[LAD] = [0, 0, 0, 1, 1, 1];   // hedeflemek için tam hücre (çarpışma player.js'te kapalı)
const PLATE = [[0, 0, 0, 1, 1, 0.125], [0.875, 0, 0, 1, 1, 1], [0, 0, 0.875, 1, 1, 1], [0, 0, 0, 0.125, 1, 1]];
MBOX[LAD] = (x, y, z, f) => [[PLATE[f], FACE_TILES[LAD]]];   // plaka, duvarın olduğu yüzde
RECIPES.push({ out: [LAD, 3], pat: [[N.CUBUK, 0, N.CUBUK], [N.CUBUK, N.CUBUK, N.CUBUK], [N.CUBUK, 0, N.CUBUK]] });

function placeLadder() {
  if (!prev || !target) return toast('Merdiveni bir duvara bakarak koy');
  const [x, y, z] = prev, [tx, ty, tz] = target;
  let f = -1;
  if (ty === y) for (let d = 0; d < 4; d++) if (tx - x === DX[d] && tz - z === DZ[d]) f = d;
  if (f < 0) return toast('Merdiveni bir duvara bakarak koy');
  if (!solid(tx, ty, tz)) return toast('Merdivenin arkasında duvar olmalı');
  const here = get(x, y, z);
  if (here !== 0 && !isPlant(here)) return toast('Buraya konmaz');
  if (!isCreative() && (eco.inv[LAD] || 0) < 1) return toast('Merdiven yok');
  const v = LAD | (f << 8);   // yön bitleri: plaka bu duvara bakar
  set(x, y, z, v); commit(x, y, z, v);
  if (!isCreative()) eco.inv[LAD]--;
  sfx.place(); rebuild(); drawHud();
}

export function placeStair(t) {
  if (t === LAD) return placeLadder();
  if (!prev) return;
  const [x, y, z] = prev, here = get(x, y, z);
  if (here !== 0 && !isPlant(here)) return;
  if (!isCreative() && (eco.inv[t] || 0) < 1) return toast('Eşya yok');
  set(x, y, z, t); commit(x, y, z, t);
  if (!isCreative()) eco.inv[t]--;
  sfx.place(); rebuild(); drawHud();
}

// ---- Tırmanma: ayaklar ya da bel merdivendeyse yerçekimi yerine tırmanma hızı döner ----
climbHook.fn = (dt, f, k) => {
  if (!G.room) return null;
  const bx = Math.floor(P.x), bz = Math.floor(P.z), L = Math.floor(P.y + 0.2);
  if (get(bx, L, bz) !== LAD && get(bx, Math.floor(P.y + 1.0), bz) !== LAD) return null;
  // Merdivenin en üstünde ileri basılırsa duvarın üstüne çıkar (üstte boşluk varsa)
  if (f > 0.2 && get(bx, L, bz) === LAD && P.y - L > 0.5 && get(bx, L + 1, bz) !== LAD && !solid(bx, L + 1, bz)) {
    P.y = L + 1; P.vy = 0; return null;
  }
  if (P.sneak) return 0;                      // eğilince yerinde durur
  if (f > 0.2 || k.Space) return 2.6;         // yukarı
  if (f < -0.2 || k.KeyS) return -2.6;        // aşağı
  return -1.0;                                // bırakınca yavaşça kayar
};
