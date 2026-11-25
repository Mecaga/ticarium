import { N } from '../idtable.js';
import { hash } from './util.js';

// Yapı blokları (dünyada) ve yapı eşyaları (envanter). Kendi dokuları, PNG gerekmez.
const S = (c, px) => ({ c, spr: true, px });

export const tiles = {
  // Kale: taş tuğla, ortada altın amblem
  kaleBlok: { c: [128, 126, 124], px: (x, y) => {
    if (Math.abs(x - 7.5) < 2 && Math.abs(y - 7.5) < 2) return [214, 178, 60, 1];
    const row = Math.floor(y / 4);
    if (y % 4 === 3 || x % 8 === (row % 2 ? 3 : 7)) return [88, 86, 86, 1];
    return [128, 126, 124, 0.9 + hash(x, y, 320) * 0.2];
  } },
  // Köylü tarlası: sürülmüş toprak sıraları, ortada su kanalı
  tarlaBlok: { c: [110, 78, 40], px: (x, y) => {
    if (y === 7 || y === 8) return [66, 128, 212, 1];
    if (y % 4 === 0) return [76, 50, 26, 0.95];
    return [118, 84, 44, 0.9 + hash(x, y, 321) * 0.2];
  } },
  // Villa: ahşap, ortada cam pencere çerçevesi
  villaBlok: { c: [188, 152, 98], px: (x, y) => {
    if (x >= 5 && x <= 10 && y >= 5 && y <= 10) {
      if (x === 5 || x === 10 || y === 5 || y === 10) return [90, 60, 30, 1];
      return [170, 220, 240, 1];
    }
    let k = 0.9 + hash(x, y, 322) * 0.2;
    if (y % 4 === 3) k *= 0.72;
    return [188, 152, 98, k];
  } },
  // Eşya ikonları (16x16)
  kaleEya: S([132, 128, 122], (x, y) => {
    if (x === 8 && y >= 1 && y <= 4) return [90, 70, 40];                          // bayrak direği
    if ((x === 9 || x === 10) && (y === 1 || y === 2)) return [240, 200, 60];      // bayrak
    if (y >= 5 && y <= 6 && x >= 3 && x <= 12 && x % 2 === 1) return [160, 156, 150]; // siper dişleri
    if (y >= 7 && y <= 14 && x >= 3 && x <= 12) {
      if (x >= 6 && x <= 9 && y >= 11) return [60, 50, 40];                        // kapı
      return y % 4 === 3 ? [100, 96, 94] : [132, 128, 122];
    }
    return null;
  }),
  tarlaEya: S([110, 78, 40], (x, y) => {
    if (y >= 5 && y <= 6 && (x === 3 || x === 6 || x === 9 || x === 12)) return [90, 170, 60]; // filizler
    if (y >= 7 && y <= 13 && x >= 2 && x <= 13) {
      if (y === 9 && x >= 5 && x <= 10) return [70, 140, 230];                     // su kanalı
      return y % 3 === 0 ? [76, 50, 26] : [118, 84, 44];
    }
    return null;
  }),
  villaEya: S([190, 150, 95], (x, y) => {
    if (y >= 2 && y <= 6 && Math.abs(x - 7.5) <= y - 1.5) return [160, 70, 50];    // çatı
    if (y >= 7 && y <= 13 && x >= 3 && x <= 12) {
      if (x >= 6 && x <= 9 && y >= 10) return [90, 60, 30];                        // kapı
      if (y >= 8 && y <= 9 && ((x >= 4 && x <= 5) || (x >= 10 && x <= 11))) return [170, 220, 240]; // pencere
      return y % 3 === 0 ? [160, 124, 74] : [190, 150, 95];
    }
    return null;
  })
};

export const faces = {
  [N.KALE_BLOK]: 'kaleBlok', [N.KOYLU_TARLA_BLOK]: 'tarlaBlok', [N.VILLA_BLOK]: 'villaBlok',
  [N.KALE_EYA]: 'kaleEya', [N.KOYLU_TARLA_EYA]: 'tarlaEya', [N.VILLA_EYA]: 'villaEya'
};
export const flat = [N.KALE_EYA, N.KOYLU_TARLA_EYA, N.VILLA_EYA];
