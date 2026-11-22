import { N } from '../idtable.js';
import { ell } from './util.js';

// Kar topu: düz eşya, PNG gerekmez
export const tiles = {
  snowball: {
    c: [240, 246, 255], spr: true,
    px: (x, y) => {
      if (ell(x, y, 7.5, 7.5, 5.4, 5.4) >= 1) return null;
      return (x + y < 10) ? [255, 255, 255] : [206, 218, 236];
    }
  }
};
export const faces = { [N.KAR_TOPU]: 'snowball' };
export const flat = [N.KAR_TOPU];
