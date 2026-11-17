import { N } from '../world/idtable.js';
import { hash, ell } from './util.js';

const S = (c, px) => ({ c, spr: true, px });
const el = (x, y, cx, cy, a, b) => ell(x, y, cx, cy, a, b) < 1;

function armorPix(kind, col, x, y) {
  const dx = Math.abs(x - 7.5);
  let on;
  if (kind === 'helm') on = y >= 3 && y <= 10 && dx <= (y < 5 ? 3.5 : 5) && !(y >= 8 && dx <= 2);
  else if (kind === 'chest') on = (y >= 3 && y <= 5 && dx >= 2 && dx <= 6.5) || (y >= 6 && y <= 13 && dx <= 4.5) || (y >= 6 && y <= 9 && dx > 4.5 && dx <= 6.5);
  else if (kind === 'leg') on = (y >= 3 && y <= 5 && dx <= 4.5) || (y >= 6 && y <= 13 && dx >= 0.9 && dx <= 4.5);
  else on = (y >= 8 && y <= 12 && dx >= 0.9 && dx <= 5.5) || (y === 13 && dx >= 0.9 && dx <= 6.5);
  if (!on) return null;
  const rim = (y === 3 || y === 13) ? 0.78 : 1;
  return col.map(v => Math.round(v * rim));
}
const LEATHER = [150, 92, 48];
const leather = kind => S(LEATHER, (x, y) => {
  const c = armorPix(kind, LEATHER, x, y);
  if (!c) return null;
  return (x + y) % 4 === 0 ? c.map(v => Math.min(255, v + 20)) : c;
});

export const tiles = {
  gravel: { c: [136, 130, 126], px: (x, y) => {
    const h = hash(x, y, 201);
    if (h < 0.18) return [88, 84, 82, 1];
    if (h > 0.86) return [176, 170, 164, 1];
    return [136, 130, 126, 0.9 + hash(x >> 1, y >> 1, 202) * 0.2];
  } },
  redBlock: { c: [170, 24, 18], px: (x, y) => {
    const h = hash(x, y, 203);
    if (x === 0 || y === 0 || x === 15 || y === 15) return [130, 14, 10, 1];
    if (h < 0.12) return [110, 10, 8, 1];
    if (h > 0.88) return [235, 70, 50, 1];
    return [175, 26, 20, 0.92 + hash(x, y, 204) * 0.16];
  } },
  clayBlock: { c: [158, 166, 184], px: (x, y) => [158, 166, 184, 0.94 + hash(x, y, 205) * 0.1] },
  hopperTop: { c: [88, 88, 96], px: (x, y) => {
    if (x < 1 || x > 14 || y < 1 || y > 14) return [50, 50, 56, 1];
    if (x >= 5 && x <= 10 && y >= 5 && y <= 10) return [18, 18, 22, 1];
    return [88, 88, 96, 0.92 + hash(x, y, 206) * 0.12];
  } },
  hopperSide: { c: [84, 84, 92], px: (x, y) => {
    if (y <= 2) return [118, 118, 126, 1];
    if (y >= 12 && (x < 5 || x > 10)) return [38, 38, 44, 1];
    if (x <= 1 || x >= 14) return [52, 52, 58, 1];
    return [84, 84, 92, 0.9 + hash(x, y, 207) * 0.2];
  } },
  rail: { c: [190, 190, 196], px: (x, y) => {
    if (x === 3 || x === 4 || x === 11 || x === 12) return [196, 196, 204, 1];
    if ((y % 4 === 0 || y % 4 === 1) && x >= 2 && x <= 13) return [122, 88, 50, 0.92 + hash(x, y, 210) * 0.14];
    return null;
  } },
  lever: { c: [140, 100, 52], px: (x, y) => {
    if (y >= 10) return [128, 128, 134, 0.9 + hash(x, y, 211) * 0.2];
    if (x >= 6 && x <= 9) return [150, 106, 54, 1];
    return [100, 72, 36, 0.9];
  } },
  leverOn: { c: [140, 100, 52], px: (x, y) => {
    if (y >= 10) return [128, 128, 134, 0.9 + hash(x, y, 211) * 0.2];
    if (y < 5) return [210, 40, 40, 1];
    return [150, 106, 54, 1];
  } },
  birchPlanks: { c: [216, 200, 150], px: (x, y) => {
    let k = 0.9 + hash(x, y, 208) * 0.2;
    if (y % 4 === 3) k *= 0.78;
    return [216, 200, 150, k];
  } },
  ladder: S([150, 108, 56], (x, y) => {
    if (x === 3 || x === 4 || x === 11 || x === 12) return [140, 98, 50];
    if ((y === 2 || y === 6 || y === 10 || y === 14) && x >= 3 && x <= 12) return [166, 120, 62];
    return null;
  }),
  clay: S([150, 160, 180], (x, y) => {
    if (!el(x, y, 7.5, 8.5, 5.2, 4.8)) return null;
    if (x + y < 10) return [190, 198, 214];
    return y > 10 ? [112, 122, 142] : [152, 162, 182];
  }),
  brickItem: S([180, 80, 60], (x, y) => {
    if (x < 2 || x > 13 || y < 5 || y > 11) return null;
    if (y === 5 || x === 2) return [214, 120, 96];
    if (y === 11 || x === 13) return [124, 48, 34];
    return (x + y) % 5 === 0 ? [196, 96, 74] : [180, 78, 58];
  }),
  cart: S([170, 170, 178], (x, y) => {
    if (y >= 5 && y <= 11 && x >= 1 && x <= 14) {
      if (y === 5 || x === 1 || x === 14) return [210, 210, 218];
      if (y === 11) return [100, 100, 108];
      return (x + y) % 3 === 0 ? [140, 140, 148] : [165, 165, 173];
    }
    if (y >= 12 && y <= 14 && ((x >= 3 && x <= 5) || (x >= 10 && x <= 12))) return [50, 50, 56];
    return null;
  }),
  bow: S([140, 100, 52], (x, y) => {
    const px = x - 7.5, py = y - 7.5;
    const a = -(px + py) * 0.7071, b = (py - px) * 0.7071;
    if (Math.abs(b) > 6.6) return null;
    if (Math.abs(a) < 0.6) return [235, 235, 225];
    if (Math.abs(a - 4.2 * Math.cos(b * 0.24)) < 0.85) return [150, 104, 50];
    return null;
  }),
  arrow: S([190, 190, 196], (x, y) => {
    const s = x + y - 15, t = x - y;
    if (x >= 11 && y <= 4 && x + y >= 13 && x + y <= 17 && t >= 7) return [204, 204, 212];
    if ((s === 0 || s === 1) && t >= -13 && t <= 7) return [150, 108, 56];
    if (s !== 0 && s !== 1 && Math.abs(s) <= 2 && t <= -8 && t >= -12) return [238, 238, 238];
    return null;
  }),
  lhelm: leather('helm'), lchest: leather('chest'), lleg: leather('leg'), lboot: leather('boot'),
  bone: S([232, 232, 222], (x, y) => {
    const s = x + y - 15, t = x - y;
    if ((s === 0 || s === 1) && t >= -9 && t <= 9) return [236, 236, 226];
    if (Math.hypot(x - 2, y - 11) < 1.4 || Math.hypot(x - 4, y - 13) < 1.4 || Math.hypot(x - 11, y - 2) < 1.4 || Math.hypot(x - 13, y - 4) < 1.4) return [222, 222, 210];
    return null;
  }),
  bonemeal: S([245, 245, 240], (x, y) => {
    if (el(x, y, 7.5, 10.5, 6, 3.3) || el(x, y, 7.5, 8, 3.6, 2.6)) return (x + y) % 3 === 0 ? [255, 255, 250] : [238, 238, 230];
    return null;
  }),
  rotten: S([110, 130, 70], (x, y) => {
    if (!el(x, y, 7.5, 8.5, 6, 4.4)) return null;
    const h = hash(x, y, 209);
    if (h < 0.25) return [150, 70, 60];
    if (h > 0.8) return [78, 96, 48];
    return [112, 134, 72];
  }),
  // ✨ Paket 22: Doğu-batı ray ve vagon blok dokuları eklendi
  railX: { c: [190, 190, 196], px: (x, y, i, k) => {
    const fn = tiles.rail.px;
    return fn ? fn(y, x, i, k) : null;
  }},
  cartTop: { c: [120, 120, 128], px: (x, y) => ((x < 2 || x > 13 || y < 2 || y > 13) ? [190, 190, 198, 1] : [52, 52, 60, 0.9 + hash(x, y, 212) * 0.2]) },
  cartSide: { c: [160, 160, 168], px: (x, y) => {
    if (y < 2) return [205, 205, 212, 1];
    if (y > 12) return [90, 90, 98, 1];
    if ((x === 3 || x === 12) && (y === 5 || y === 9)) return [100, 100, 108, 1];
    return [160, 160, 168, 0.92 + hash(x, y, 213) * 0.14];
  }}
};

export const faces = {
  [N.CAKIL]: 'gravel', [N.REDSTONE_BLOK]: 'redBlock', [N.KIL_BLOK]: 'clayBlock', [N.KIL]: 'clay', [N.PISMIS_TUGLA]: 'brickItem',
  [N.HUNI]: ['hopperTop', 'hopperSide', 'hopperSide'], [N.RAY]: 'rail', [N.VAGON]: 'cart',
  [N.SALTER]: 'lever', 78: 'leverOn',
  [N.BASAMAK_MESE]: 'planks', [N.BASAMAK_HUS]: 'birchPlanks', [N.BASAMAK_TAS]: 'stone', [N.TIRMANMA_MERDIVEN]: 'ladder',
  [N.YAY]: 'bow', [N.OK]: 'arrow',
  [N.DERI_MIGFER]: 'lhelm', [N.DERI_ZIRH]: 'lchest', [N.DERI_PANTOLON]: 'lleg', [N.DERI_BOT]: 'lboot',
  [N.KEMIK]: 'bone', [N.KEMIK_TOZU]: 'bonemeal', [N.ZOMBI_ETI]: 'rotten',
  // ✨ Paket 22: Ray ve vagon yüzey eşlemeleri
  156: 'railX',
  157: ['cartTop', 'cartSide', 'cartSide'],
  158: ['cartTop', 'cartSide', 'cartSide']
};

export const flat = [
  N.KIL, N.PISMIS_TUGLA, N.VAGON, N.TIRMANMA_MERDIVEN, N.YAY, N.OK,
  N.DERI_MIGFER, N.DERI_ZIRH, N.DERI_PANTOLON, N.DERI_BOT, N.KEMIK, N.KEMIK_TOZU, N.ZOMBI_ETI
];
