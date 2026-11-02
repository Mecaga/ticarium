import { N } from '../idtable.js';
import { hash, ell } from './util.js';

const S = (c, px) => ({ c, spr: true, px });
const el = (x, y, cx, cy, a, b) => ell(x, y, cx, cy, a, b) < 1;
const fish = (body, belly, fin) => S(body, (x, y) => {
  if (el(x, y, 7, 8, 5.5, 3)) return y > 9 ? belly : body;
  if (x >= 12 && x <= 14 && Math.abs(y - 8) <= (x - 11)) return fin;   // kuyruk
  if (x === 4 && y === 7) return [20, 20, 20];                          // göz
  return null;
});
export const tiles = {
  rope: S([225, 225, 215], (x, y) => (Math.abs(x - 7.5 - Math.sin(y * 0.8) * 2.5) < 1.1 && y >= 2 && y <= 13) ? ((y % 3 === 0) ? [190, 190, 180] : [230, 230, 220]) : null),
  leather: S([140, 90, 45], (x, y) => (x >= 3 && x <= 12 && y >= 3 && y <= 12 && !((x === 3 || x === 12) && (y === 3 || y === 12))) ? (hash(x, y, 7) < 0.2 ? [110, 66, 30] : [145, 92, 46]) : null),
  rod: S([140, 100, 52], (x, y) => {
    if ((x + y === 16 || x + y === 17) && x >= 3 && x <= 13) return [140, 100, 52];
    if (x === 13 && y >= 3 && y <= 10) return [235, 235, 235];                  // misina
    if (el(x, y, 13, 11, 1.4, 1.4)) return [210, 50, 50];                        // şamandıra
    return null;
  }),
  salmon: fish([232, 120, 100], [245, 180, 160], [210, 90, 75]),
  anchovy: fish([150, 165, 190], [215, 220, 232], [120, 135, 165]),
  puffer: S([215, 205, 90], (x, y) => {
    if (el(x, y, 7.5, 8, 5, 4.6)) return (x + y) % 4 === 0 ? [150, 130, 50] : (y > 9 ? [245, 240, 200] : [215, 205, 90]);
    if (x === 5 && y === 6) return [20, 20, 20];
    return null;
  }),
  hedge: S([170, 140, 70], (x, y) => {
    if (el(x, y, 7.5, 8, 5, 4.6)) return (x + y) % 3 === 0 ? [70, 50, 25] : [175, 145, 75];
    if (x === 5 && y === 6) return [20, 20, 20];
    return null;
  }),
  cfish: fish([170, 100, 55], [205, 150, 95], [140, 80, 40]),
  flint: S([70, 70, 76], (x, y) => {
    const e = Math.abs(x - 7.5) / 5.5 + Math.abs(y - 8.5) / 5;
    if (e >= 1) return null;
    return (x + y < 11) ? [130, 130, 140] : (hash(x, y, 9) < 0.25 ? [30, 30, 34] : [60, 60, 66]);
  }),
  tnt: { c: [200, 50, 45], px: (x, y) => {
    if (y >= 6 && y <= 9) return (x >= 3 && x <= 12 && (x % 3 === 0)) ? [30, 30, 30, 1] : [235, 235, 230, 1];
    return [200, 50, 45, 0.92 + hash(x, y, 11) * 0.16];
  } }
};
export const faces = {
  [N.IP]: 'rope', [N.DERI]: 'leather', [N.OLTA]: 'rod', [N.SOMON]: 'salmon', [N.HAMSI]: 'anchovy',
  [N.KIRPI_BALIGI]: 'hedge', [N.BALON_BALIGI]: 'puffer', [N.PISMIS_SOMON]: 'cfish', [N.PISMIS_HAMSI]: 'cfish',
  [N.PISMIS_BALON_BALIGI]: 'cfish', [N.CAKMAK_TASI]: 'flint', [N.TNT]: 'tnt'
};
export const flat = [N.IP, N.DERI, N.OLTA, N.SOMON, N.HAMSI, N.KIRPI_BALIGI, N.BALON_BALIGI, N.PISMIS_SOMON, N.PISMIS_HAMSI, N.PISMIS_BALON_BALIGI, N.CAKMAK_TASI];
