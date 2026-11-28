import { N } from '../idtable.js';

const PAL = {
  oak: { hi: [208, 172, 116], mid: [188, 152, 98], lo: [146, 112, 70], dk: [104, 76, 42] },
  birch: { hi: [242, 232, 196], mid: [216, 200, 150], lo: [180, 164, 118], dk: [136, 120, 80] },
  spruce: { hi: [140, 102, 64], mid: [110, 78, 44], lo: [84, 58, 32], dk: [58, 40, 22] },
  stone: { hi: [172, 170, 164], mid: [128, 126, 122], lo: [98, 96, 94], dk: [66, 64, 62] }
};
const inR = (x, y, x0, y0, x1, y1) => x >= x0 && x <= x1 && y >= y0 && y <= y1;

const fence = p => (x, y) => {
  if (inR(x, y, 7, 1, 8, 14)) return x === 7 ? p.mid : p.lo;
  if (inR(x, y, 2, 4, 13, 5)) return y === 4 ? p.hi : p.mid;
  if (inR(x, y, 2, 10, 13, 11)) return y === 10 ? p.hi : p.lo;
  return null;
};
const gate = p => (x, y) => {
  if (inR(x, y, 1, 2, 2, 14)) return x === 1 ? p.hi : p.mid;
  if (inR(x, y, 13, 2, 14, 14)) return x === 13 ? p.mid : p.lo;
  if (inR(x, y, 3, 4, 12, 5)) return y === 4 ? p.hi : p.mid;
  if (inR(x, y, 3, 10, 12, 11)) return y === 10 ? p.hi : p.mid;
  if (inR(x, y, 11, 7, 11, 8)) return p.dk;
  if (inR(x, y, 3, 6, 12, 9)) return x % 2 === 1 ? p.mid : p.lo;
  return null;
};
const trap = p => (x, y) => {
  if (!inR(x, y, 1, 3, 14, 12)) return null;
  if (x === 1 || x === 14 || y === 3 || y === 12) return p.dk;
  if (x === 5 || x === 10) return p.lo;
  return y % 2 === 0 ? p.mid : p.hi;
};
const stair = p => (x, y) => {
  if (inR(x, y, 1, 11, 14, 11)) return p.hi;
  if (inR(x, y, 1, 12, 14, 12)) return p.mid;
  if (inR(x, y, 1, 13, 14, 13)) return p.dk;
  if (inR(x, y, 6, 8, 14, 8)) return p.hi;
  if (inR(x, y, 6, 9, 14, 9)) return p.mid;
  if (inR(x, y, 6, 10, 14, 10)) return p.lo;
  if (inR(x, y, 11, 5, 14, 5)) return p.hi;
  if (inR(x, y, 11, 6, 14, 6)) return p.mid;
  if (inR(x, y, 11, 7, 14, 7)) return p.lo;
  return null;
};
const slab = p => (x, y) => {
  if (inR(x, y, 1, 6, 14, 6)) return p.hi;
  if (inR(x, y, 1, 7, 14, 7)) return p.mid;
  if (inR(x, y, 1, 8, 14, 11)) return y === 10 ? p.lo : p.mid;
  if (inR(x, y, 1, 12, 14, 12)) return p.dk;
  return null;
};
const ladder = p => (x, y) => {
  if (y < 1 || y > 14) return null;
  if (x === 4 || x === 11) return p.lo;
  if (x === 5 || x === 10) return p.mid;
  if ((y === 3 || y === 6 || y === 9 || y === 12) && x >= 5 && x <= 10) return p.hi;
  return null;
};

export const iconPx = {
  [N.CIT_MESE]: fence(PAL.oak), [N.CIT_HUS]: fence(PAL.birch), [N.CIT_SPRUCE]: fence(PAL.spruce),
  [N.KAPI_CIT_MESE]: gate(PAL.oak), [N.KAPI_CIT_HUS]: gate(PAL.birch), [N.KAPI_CIT_SPRUCE]: gate(PAL.spruce),
  [N.TUZAK_MESE]: trap(PAL.oak), [N.TUZAK_HUS]: trap(PAL.birch), [N.TUZAK_SPRUCE]: trap(PAL.spruce),
  [N.KOSELI_MESE]: stair(PAL.oak), [N.KOSELI_HUS]: stair(PAL.birch), [N.KOSELI_SPRUCE]: stair(PAL.spruce), [N.KOSELI_TAS]: stair(PAL.stone),
  [N.BASAMAK_MESE]: slab(PAL.oak), [N.BASAMAK_HUS]: slab(PAL.birch), [N.BASAMAK_TAS]: slab(PAL.stone), [N.SPRUCE_BASAMAK]: slab(PAL.spruce),
  [N.TIRMANMA_MERDIVEN]: ladder(PAL.oak)
};
