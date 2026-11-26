import { N } from '../idtable.js';
import { hash } from './util.js';

// Dağ karakolu ve maden girişi: yapı blokları (dünyada) ve eşyalar (envanter). PNG gerekmez.
const S = (c, px) => ({ c, spr: true, px });
const WOOD = [150, 104, 56], STONE = [128, 126, 122], DARK = [18, 16, 18];

export const tiles = {
  karakolBlok: { c: STONE, px: (x, y) => {
    if (x < 2 || x > 13 || y < 2) return [WOOD[0], WOOD[1], WOOD[2], 0.9 + hash(x, y, 340) * 0.2];   // kütük çerçeve
    return [STONE[0], STONE[1], STONE[2], 0.86 + hash(x, y, 341) * 0.28];                            // taş iç
  } },
  karakolEya: S(STONE, (x, y) => {
    if (y >= 2 && y <= 6 && Math.abs(x - 7.5) <= y - 1.5) return [120, 58, 40];                      // çatı
    if (y >= 7 && y <= 13 && x >= 3 && x <= 12) {
      if (x >= 7 && x <= 8 && y >= 10) return [70, 46, 26];                                          // kapı
      if (y >= 8 && y <= 9 && (x === 4 || x === 5 || x === 10 || x === 11)) return [170, 220, 240]; // pencere
      return y >= 10 ? STONE : [176, 140, 90];                                                       // alt taş, üst tahta
    }
    return null;
  }),
  madenBlok: { c: STONE, px: (x, y) => {
    if (x < 2 || x > 13) return [WOOD[0], WOOD[1], WOOD[2], 0.9 + hash(x, y, 342) * 0.2];
    if (x >= 5 && x <= 10 && y >= 4 && y <= 13) return [DARK[0], DARK[1], DARK[2], 1];              // giriş (karanlık)
    if (y < 2) return [96, 94, 92, 0.9 + hash(x, y, 343) * 0.2];
    return [STONE[0], STONE[1], STONE[2], 0.86 + hash(x, y, 344) * 0.28];
  } },
  madenEya: S(STONE, (x, y) => {
    if (y >= 1 && y <= 2 && x >= 7 && x <= 8) return [240, 200, 60];                                // fener
    if (y >= 3 && y <= 4 && x >= 3 && x <= 12) return [96, 94, 92];                                 // kemer taşı
    if (y >= 5 && y <= 13 && ((x >= 3 && x <= 4) || (x >= 11 && x <= 12))) return WOOD;            // kütük ayaklar
    if (y >= 5 && y <= 13 && x >= 5 && x <= 10) return DARK;                                       // ağız
    return null;
  }),
};

export const faces = {
  [N.DAG_KARAKOL_BLOK]: 'karakolBlok', [N.DAG_KARAKOL_EYA]: 'karakolEya',
  [N.MADEN_GIRIS_BLOK]: 'madenBlok', [N.MADEN_GIRIS_EYA]: 'madenEya'
};
export const flat = [N.DAG_KARAKOL_EYA, N.MADEN_GIRIS_EYA];
