import { N } from '../idtable.js';

// Kayık eşyası: envanter ve yerdeki 16x16 sprite. PNG gelince değişir.
const WOOD = [176, 128, 72], DARK = [110, 76, 42], LIGHT = [214, 176, 118];
export const tiles = {
  boatItem: {
    c: WOOD, spr: true,
    px: (x, y) => {
      if (y === 5 && x >= 2 && x <= 13) return LIGHT;                          // üst kenar
      if (y >= 6 && y <= 10 && (x === 2 || x === 13)) return DARK;             // yan kenarlar
      if (y >= 6 && y <= 10 && x >= 3 && x <= 12) return y === 6 ? LIGHT : WOOD; // gövde
      if (y === 11 && x >= 3 && x <= 12) return DARK;                          // alt
      if (y === 12 && x >= 5 && x <= 10) return DARK;                          // kıç
      return null;
    }
  }
};
export const faces = { [N.KAYIK]: 'boatItem' };
export const flat = [N.KAYIK];
