import { hash } from './util.js';

// Ray ve vagon dokuları (16x16). Üst yüz eşlemesi: görüntünün alt satırı kuzey,
// üst satırı güney, sol batı, sağ doğu. Köşeler yarıçapı 4 ve 12 piksel olan yaylardan oluşur.
const RAIL = [196, 196, 204], TIE = [122, 88, 50];
const railNS = (x, y) => {
  if (x === 3 || x === 4 || x === 11 || x === 12) return [RAIL[0], RAIL[1], RAIL[2], 1];
  if ((y % 4 === 0 || y % 4 === 1) && x >= 2 && x <= 13) return [TIE[0], TIE[1], TIE[2], 0.92 + hash(x, y, 310) * 0.14];
  return null;
};
const railEW = (x, y) => railNS(y, x);
const corner = (cx, cy) => (x, y) => {
  const ax = Math.abs(x + 0.5 - cx), ay = Math.abs(y + 0.5 - cy), d = Math.hypot(ax, ay);
  if (Math.abs(d - 4) < 0.9 || Math.abs(d - 12) < 0.9) return [RAIL[0], RAIL[1], RAIL[2], 1];
  if (d > 4.9 && d < 11.1 && Math.floor(Math.atan2(ay, ax) / (Math.PI / 2) * 4) % 2 === 0) {
    return [TIE[0], TIE[1], TIE[2], 0.92 + hash(x, y, 311) * 0.14];
  }
  return null;
};

export const tiles = {
  railNS: { c: RAIL, px: railNS },
  railEW: { c: RAIL, px: railEW },
  railNE: { c: RAIL, px: corner(16, 16) },
  railNW: { c: RAIL, px: corner(0, 16) },
  railSE: { c: RAIL, px: corner(16, 0) },
  railSW: { c: RAIL, px: corner(0, 0) },
  railCartTop: { c: [120, 120, 128], px: (x, y) => (x < 2 || x > 13 || y < 2 || y > 13)
    ? [190, 190, 198, 1] : [52, 52, 60, 0.9 + hash(x, y, 312) * 0.2] },
  railCartSide: { c: [160, 160, 168], px: (x, y) => {
    if (y < 2) return [205, 205, 212, 1];
    if (y > 12) return [90, 90, 98, 1];
    if ((x === 3 || x === 12) && (y === 5 || y === 9)) return [100, 100, 108, 1];
    return [160, 160, 168, 0.92 + hash(x, y, 313) * 0.14];
  } }
};
export const faces = {};
export const flat = [];
