import { N } from '../idtable.js';
import { hash } from './util.js';

// Büyük malikâne: yapı bloğu (dünyada) ve eşya (envanter). PNG gerekmez.
const S = (c, px) => ({ c, spr: true, px });
const CREAM = [208, 196, 168], ROOF = [120, 40, 36], GOLD = [230, 200, 90], GLASS = [120, 180, 220];

export const tiles = {
  malikaneBlok: { c: CREAM, px: (x, y) => {
    if (y <= 1) return [96, 60, 40, 1];                                                  // alt bant: koyu ahşap
    if (y >= 14) return [ROOF[0], ROOF[1], ROOF[2], 1];                                  // üst bant: bordo
    if (x === 0 || x === 15) return [170, 150, 120, 1];                                  // köşe lezeni
    if (x >= 6 && x <= 9 && y >= 5 && y <= 10) return [GOLD[0], GOLD[1], GOLD[2], 1];    // amblem
    if (y % 4 === 3) return [176, 164, 140, 0.95];                                       // taş derzi
    return [CREAM[0], CREAM[1], CREAM[2], 0.92 + hash(x, y, 350) * 0.14];
  } },
  malikaneEya: S(CREAM, (x, y) => {
    if (y <= 1 && (x === 7 || x === 8)) return GOLD;                                     // kule ucu
    if (y >= 2 && y <= 4 && Math.abs(x - 7.5) <= y - 1.5) return ROOF;                   // çatı üçgeni
    if (y >= 5 && y <= 6 && x >= 2 && x <= 13) return ROOF;                              // çatı bandı
    if (y >= 7 && y <= 13 && x >= 2 && x <= 13) {
      if (x >= 6 && x <= 9 && y >= 10) return [90, 60, 30];                              // kapı
      if (y >= 8 && y <= 9 && ((x >= 3 && x <= 4) || (x >= 11 && x <= 12))) return GLASS; // pencere
      return y % 3 === 0 ? [176, 150, 116] : CREAM;
    }
    return null;
  }),
};

export const faces = { [N.MALIKANE_BLOK]: 'malikaneBlok', [N.MALIKANE_EYA]: 'malikaneEya' };
export const flat = [N.MALIKANE_EYA];
