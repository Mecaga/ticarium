import { N } from '../idtable.js';
import { hash, ell } from './util.js';
const BOOKC = [[200, 50, 50], [60, 150, 80], [60, 120, 210], [160, 165, 180], [235, 125, 25], [140, 80, 190]];
export const tiles = {
  disc: { c: [30, 30, 36], spr: true, px: (x, y) => {
    const r = Math.hypot(x - 7.5, y - 7.5);
    if (r > 6.5) return null;
    if (r < 1.6) return [200, 200, 205];
    if (r < 3) return [190, 60, 70];
    return r > 5.6 ? [60, 60, 70] : [24, 24, 30];
  } },
  bprint: { c: [60, 120, 200], px: (x, y) => {
    if (y >= 8 && y <= 11 && x >= 7 && x <= 8) return [60, 120, 200, 1];
    if (y >= 5 && y <= 11 && x >= 4 && x <= 11) return [240, 240, 250, 1];
    if (x % 4 === 0 || y % 4 === 0) return [150, 190, 240, 1];
    return [60, 120, 200, 0.95 + hash(x, y, 147) * 0.08];
  } }
};
BOOKC.forEach((c, i) => {
  tiles['book' + i] = { c, spr: true, px: (x, y) => {
    if (x < 3 || x > 12 || y < 2 || y > 13) return null;
    if (x === 3) return c.map(v => Math.round(v * 0.55));
    if (y >= 12) return [240, 235, 220];
    return (x === 5 && y >= 4 && y <= 8) ? [250, 230, 150] : c;
  } };
});
export const faces = {
  [N.DISK_1]: 'disc', 
  [N.DISK_2]: 'disc', 
  [N.DISK_3]: 'disc', 
  [N.SEMA_BLOGU]: 'bprint',
  [N.YEMEK_KITABI]: 'book0', 
  [N.CRAFT_KITABI]: 'book1', 
  [N.ALET_KITABI]: 'book2', 
  [N.ZIRH_KITABI]: 'book3',
  [N.FIRIN_KITABI]: 'book4', 
  [N.REHBER_KITABI]: 'book5'
};
export const flat = [
  N.DISK_1, 
  N.DISK_2, 
  N.DISK_3, 
  N.YEMEK_KITABI, 
  N.CRAFT_KITABI, 
  N.ALET_KITABI, 
  N.ZIRH_KITABI, 
  N.FIRIN_KITABI, 
  N.REHBER_KITABI
];
