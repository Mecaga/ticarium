import { N } from '../idtable.js';
import { hash } from './util.js';

// Dev ev: yapı bloğu (dünyada) ve eşya (envanter). PNG gerekmez.
const S = (c, px) => ({ c, spr: true, px });

export const tiles = {
  devEvBlok: { c: [226, 216, 196], px: (x, y) => {
    if (y <= 1) return [150, 58, 44, 1];                                        // üst: kırmızı kiremit bant
    if (y >= 14) return [200, 190, 170, 1];                                     // alt: sıva şerit
    if (x >= 6 && x <= 9 && y >= 5 && y <= 9) return [120, 180, 220, 1];        // pencere
    return [226, 216, 196, 0.93 + hash(x, y, 330) * 0.14];
  } },
  devEvEya: S([226, 216, 196], (x, y) => {
    if (y >= 2 && y <= 6 && Math.abs(x - 7.5) <= y - 1.5) return [150, 58, 44]; // çatı
    if (y >= 7 && y <= 13 && x >= 3 && x <= 12) {
      if (x >= 7 && x <= 8 && y >= 10) return [110, 74, 40];                    // kapı
      if (y >= 8 && y <= 9 && (x === 4 || x === 5 || x === 10 || x === 11)) return [120, 180, 220]; // pencere
      return y === 7 ? [250, 246, 236] : [226, 216, 196];
    }
    return null;
  }),
};

export const faces = { [N.DEV_EV_BLOK]: 'devEvBlok', [N.DEV_EV_EYA]: 'devEvEya' };
export const flat = [N.DEV_EV_EYA];
