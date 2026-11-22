import { N } from '../idtable.js';
import { hash } from './util.js';

// Kömür bloğu ve çam blokları için atlas yedek dokuları.
// PNG yüklenince blockmap.js kullanılır, bu dokular yalnızca PNG yokken görünür.
export const tiles = {
  coalBlock: {
    c: [34, 34, 38],
    px: (x, y) => (hash(x, y, 301) < 0.14 ? [80, 80, 88, 1] : [34, 34, 38, 0.86 + hash(x, y, 302) * 0.28])
  },
  spruceLogSide: {
    c: [84, 58, 34],
    px: (x, y) => [84, 58, 34, (x % 4 === 0 ? 0.78 : 1) * (0.9 + hash(x, y, 303) * 0.2)]
  },
  spruceLogTop: {
    c: [120, 88, 50],
    px: (x, y) => {
      const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
      return [120, 88, 50, Math.floor(d) % 2 === 0 ? 0.82 : 1];
    }
  },
  sprucePlanks: {
    c: [110, 78, 44],
    px: (x, y) => {
      let k = 0.9 + hash(x, y, 304) * 0.2;
      if (y % 4 === 3) k *= 0.72;
      if (x % 4 === 0 && hash(y >> 2, x >> 2, 305) < 0.2) k *= 0.82;
      return [110, 78, 44, k];
    }
  },
  spruceLeaves: {
    c: [28, 74, 40],
    px: (x, y) => [28, 74, 40, hash(x, y, 306) < 0.25 ? 0.6 : 0.9 + hash(x, y, 307) * 0.2]
  }
};

export const faces = {
  [N.KOMUR_BLOK]: 'coalBlock',
  [N.SPRUCE_ODUN]: ['spruceLogTop', 'spruceLogSide', 'spruceLogTop'],
  [N.SPRUCE_TAHTA]: 'sprucePlanks',
  [N.SPRUCE_YAPRAK]: 'spruceLeaves'
};
export const flat = [];
