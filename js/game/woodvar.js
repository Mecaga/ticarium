import { N } from '../world/idtable.js';
import { TYPES, CATS, BOXES, BOXFN, get, set, rebuild, prev, target, solid, faceAt, isPlant } from '../world/world.js';
import { FACE_TILES, tileOf } from '../world/textures.js';
import { eco } from './economy.js';
import { RECIPES } from './recipes.js';
import { toast, drawHud } from '../ui/ui.js';
import { P, collides } from '../entities/player.js';
import { G } from '../core/state.js';
import { isCreative } from './creative.js';
import { recordChange } from './progress.js';
import { sfx } from '../core/sound.js';

// Çit, çit kapısı, tuzak kapı, köşeli merdiven (Minecraft mantığı).
// Durum bloğun yön bitlerinde: bit 0-1 yön (0 kuzey, 1 doğu, 2 güney, 3 batı), 4 = açık, 8 = üst yarı.
// Merdivenin yön biti ön (alçak) yüzü gösterir. Çit kolları ve merdiven şekli komşulara göre hesaplanır.

const DX = [0, 1, 0, -1], DZ = [-1, 0, 1, 0];   // 0 kuzey (-z), 1 doğu (+x), 2 güney (+z), 3 batı (-x)
const commit = (x, y, z, v) => { recordChange(x, y, z, v); if (G.online) G.online.sendBlock(x, y, z, v); };
const tileId = n => { const t = tileOf(n); return t === undefined ? tileOf('stone') : t; };

// Ahşap türleri: tarif kaynağı ve doku
const WOODS = [
  { src: N.TAHTA, tile: 'planks' },
  { src: N.HUS_ODUN, tile: 'birchPlanks' },
  { src: N.SPRUCE_TAHTA, tile: 'sprucePlanks' }
];
const FENCE = [N.CIT_MESE, N.CIT_HUS, N.CIT_SPRUCE];
const GATE = [N.KAPI_CIT_MESE, N.KAPI_CIT_HUS, N.KAPI_CIT_SPRUCE];
const TRAP = [N.TUZAK_MESE, N.TUZAK_HUS, N.TUZAK_SPRUCE];
const CORNER = [N.KOSELI_MESE, N.KOSELI_HUS, N.KOSELI_SPRUCE, N.KOSELI_TAS];
const NAMES = {
  [N.CIT_MESE]: 'Meşe çit', [N.CIT_HUS]: 'Huş çit', [N.CIT_SPRUCE]: 'Çam çit',
  [N.KAPI_CIT_MESE]: 'Meşe çit kapısı', [N.KAPI_CIT_HUS]: 'Huş çit kapısı', [N.KAPI_CIT_SPRUCE]: 'Çam çit kapısı',
  [N.TUZAK_MESE]: 'Meşe tuzak kapı', [N.TUZAK_HUS]: 'Huş tuzak kapı', [N.TUZAK_SPRUCE]: 'Çam tuzak kapı',
  [N.KOSELI_MESE]: 'Meşe köşeli merdiven', [N.KOSELI_HUS]: 'Huş köşeli merdiven',
  [N.KOSELI_SPRUCE]: 'Çam köşeli merdiven', [N.KOSELI_TAS]: 'Taş köşeli merdiven'
};

// ---- Kayıtlar ve tarifler (çalışma masası 3×3) ----
function reg(id, tile, base) {
  TYPES[id] = { name: NAMES[id], color: 0x9a7040, base };
  const t = tileId(tile);
  FACE_TILES[id] = [t, t, t];
  eco.inv[id] = 0; eco.raw[id] = base; eco.trend[id] = 0;
  if (!CATS[0][1].includes(id)) CATS[0][1].push(id);
}
WOODS.forEach((w, i) => {
  const S = N.CUBUK, P_ = w.src;
  reg(FENCE[i], w.tile, 12);
  reg(GATE[i], w.tile, 16);
  reg(TRAP[i], w.tile, 14);
  reg(CORNER[i], w.tile, 10);
  RECIPES.push({ out: [FENCE[i], 3], pat: [[P_, S, P_], [P_, S, P_]] });
  RECIPES.push({ out: [GATE[i], 1], pat: [[S, P_, S], [S, P_, S]] });
  RECIPES.push({ out: [TRAP[i], 2], pat: [[P_, P_, P_], [P_, P_, P_]] });
  RECIPES.push({ out: [CORNER[i], 4], pat: [[P_, 0, 0], [P_, P_, 0], [P_, P_, P_]] });
});
reg(N.KOSELI_TAS, 'stone', 10);
RECIPES.push({ out: [N.KOSELI_TAS, 4], pat: [[N.TAS, 0, 0], [N.TAS, N.TAS, 0], [N.TAS, N.TAS, N.TAS]] });

// ---- Kutular: [x0, y0, z0, x1, y1, z1], blok koordinatına göre 0..1 ----
const POST = [0.375, 0, 0.375, 0.625, 1.5, 0.625];
const ARMS = [   // [dx, dz, kolun iki çubuğu]: kuzey, doğu, güney, batı
  [0, -1, [[0.4375, 0.375, 0, 0.5625, 0.6875, 0.375], [0.4375, 0.9375, 0, 0.5625, 1.25, 0.375]]],
  [1, 0, [[0.625, 0.375, 0.4375, 1, 0.6875, 0.5625], [0.625, 0.9375, 0.4375, 1, 1.25, 0.5625]]],
  [0, 1, [[0.4375, 0.375, 0.625, 0.5625, 0.6875, 1], [0.4375, 0.9375, 0.625, 0.5625, 1.25, 1]]],
  [-1, 0, [[0, 0.375, 0.4375, 0.375, 0.6875, 0.5625], [0, 0.9375, 0.4375, 0.375, 1.25, 0.5625]]]
];
const GATE_Z = [0, 0, 0.375, 1, 1.5, 0.625], GATE_X = [0.375, 0, 0, 0.625, 1.5, 1];
const PAN = [[0, 0, 0, 1, 1, 0.1875], [0.8125, 0, 0, 1, 1, 1], [0, 0, 0.8125, 1, 1, 1], [0, 0, 0, 0.1875, 1, 1]];
const TRAP_BOT = [0, 0, 0, 1, 0.1875, 1], TRAP_TOP = [0, 0.8125, 0, 1, 1, 1];
const LOW = [0, 0, 0, 1, 0.5, 1];   // merdivenin alt yarısı (tam genişlik)

// Üst kat (y 0.5-1): bir yönün yarısı ya da iki dik yönün kesişimi (çeyrek)
function upBox(a, b) {
  let x0 = 0, x1 = 1, z0 = 0, z1 = 1;
  for (const d of [a, b]) {
    if (d === 0) z1 = 0.5;
    else if (d === 2) z0 = 0.5;
    else if (d === 1) x0 = 0.5;
    else x1 = 0.5;
  }
  return [x0, 0.5, z0, x1, 1, z1];
}

const joins = (x, y, z) => { const t = get(x, y, z); return FENCE.includes(t) || GATE.includes(t) || solid(x, y, z); };
const fenceBoxes = (x, y, z) => {
  const out = [POST];
  for (const [dx, dz, rails] of ARMS) if (joins(x + dx, y, z + dz)) out.push(...rails);
  return out;
};
const gateBoxes = (x, y, z, f) => {
  const zAxis = (f & 3) % 2 === 0;
  if (!(f & 4)) return [zAxis ? GATE_Z : GATE_X];
  return zAxis
    ? [[0, 0, 0, 0.125, 1.5, 1], [0.875, 0, 0, 1, 1.5, 1]]
    : [[0, 0, 0, 1, 1.5, 0.125], [0, 0, 0.875, 1, 1.5, 1]];
};
const trapBoxes = (x, y, z, f) => (f & 4) ? [PAN[f & 3]] : [(f & 8) ? TRAP_TOP : TRAP_BOT];

// Merdivenin yön değeri (komşu merdiven değilse -1)
const stairDir = (x, y, z) => (CORNER.includes(get(x, y, z)) ? faceAt(x, y, z) & 3 : -1);

// Merdiven şekli. f: ön (alçak) yüz. Arka komşu dik bir merdivense iç köşe (7/8),
// ön komşu dik bir merdivense dış köşe (5/8), aksi halde düz (6/8).
function stairBoxes(x, y, z, raw) {
  const f = raw & 3, B = (f + 2) & 3;
  const gBack = stairDir(x + DX[B], y, z + DZ[B]);
  const gFront = stairDir(x + DX[f], y, z + DZ[f]);
  if (gBack >= 0 && (gBack & 1) !== (f & 1)) return [LOW, upBox(B, B), upBox(f, (gBack + 2) & 3)];   // iç köşe
  if (gFront >= 0 && (gFront & 1) !== (f & 1)) return [LOW, upBox(B, gFront)];                       // dış köşe
  return [LOW, upBox(B, B)];                                                                        // düz
}

for (const id of FENCE) { BOXES[id] = POST; BOXFN[id] = fenceBoxes; }
for (const id of GATE) { BOXES[id] = POST; BOXFN[id] = gateBoxes; }
for (const id of TRAP) { BOXES[id] = TRAP_BOT; BOXFN[id] = trapBoxes; }
for (const id of CORNER) { BOXES[id] = LOW; BOXFN[id] = stairBoxes; }

// ---- Yerleştirme ve açma/kapama ----
export const isWood = t => FENCE.includes(t) || GATE.includes(t) || TRAP.includes(t) || CORNER.includes(t);
export const isWoodToggle = t => GATE.includes(t) || TRAP.includes(t);

// Oyuncunun olduğu yatay yön (0 kuzey, 1 doğu, 2 güney, 3 batı). Kapı ve merdivenin ön yüzü buna bakar.
const facingOf = (x, z) => {
  const vx = P.x - (x + 0.5), vz = P.z - (z + 0.5);
  if (Math.abs(vz) >= Math.abs(vx)) return vz < 0 ? 0 : 2;
  return vx > 0 ? 1 : 3;
};

export function placeWood(t) {
  if (!prev) return;
  const [x, y, z] = prev, here = get(x, y, z);
  if (here !== 0 && !isPlant(here)) return toast('Buraya konmaz');
  if (!isCreative() && (eco.inv[t] || 0) < 1) return toast(NAMES[t] + ' yok');
  const [tx, ty, tz] = target || [x, y, z];
  let f = 0;
  if (GATE.includes(t) || CORNER.includes(t)) f = facingOf(x, z);
  if (TRAP.includes(t)) {
    if (ty === y) {                                    // yan yüze: duvara yaslanır ve açık gelir
      const d = DX.findIndex((dx, i) => dx === tx - x && DZ[i] === tz - z);
      f = (d < 0 ? 0 : d) | 4;
    } else {                                           // üst yüze: alt yarıda, alt yüze: üst yarıda. Sana bakan yönü tutar.
      f = facingOf(x, z) | (ty < y ? 0 : 8);
    }
  }
  const v = t | (f << 8), was = collides(P.x, P.y, P.z);
  set(x, y, z, v);
  if (!was && collides(P.x, P.y, P.z)) { set(x, y, z, here); return toast('Oyuncunun üstüne konmaz'); }
  commit(x, y, z, v);
  if (!isCreative()) eco.inv[t]--;
  sfx.place(); rebuild(); drawHud();
}

// Kapı ya da tuzak kapıya bakıp Koy (eğilmeden): açılır ya da kapanır. Oyuncu kapının içindeyse kapanmaz.
export function toggleWood(p) {
  const [x, y, z] = p, t = get(x, y, z), f = faceAt(x, y, z);
  if (!isWoodToggle(t)) return;
  const nf = f ^ 4, was = collides(P.x, P.y, P.z);
  set(x, y, z, t | (nf << 8));
  if (!was && collides(P.x, P.y, P.z)) { set(x, y, z, t | (f << 8)); return toast('Oyuncu içindeyken kapanmaz'); }
  commit(x, y, z, t | (nf << 8));
  sfx.place(); rebuild();
}
