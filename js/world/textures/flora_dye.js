import { hash, ell } from './util.js';
export const DYE_RGB = [[154, 95, 208], [242, 201, 30], [208, 34, 40], [48, 80, 205], [243, 134, 31], [240, 120, 172], [60, 160, 60], [240, 240, 240]];
const stemLeaf = (x, y) => ((x === 7 || x === 8) && y >= 8) || (y === 11 && (x === 6 || x === 9)) || (y === 12 && (x === 5 || x === 10));
const flower = (c, fn) => ({ c, spr: true, px: (x, y) => stemLeaf(x, y) ? [70, 150, 60] : (fn(x, y, Math.hypot(x - 7.5, y - 4.5)) || null) });
const tulip = col => flower(col, (x, y) => (ell(x, y, 7.5, 5.5, 2.8, 3.2) < 1 || ((x === 6 || x === 9) && y === 2)) ? col : null);
export const tiles = {
  sapling: { c: [60, 170, 70], px: (x, y) => {
    const stalk = (x === 7 || x === 8) && y >= 8;
    const crown = ell(x, y, 7.5, 5, 4.5, 3.6) < 1 && hash(x, y, 31) < 0.9;
    if (!stalk && !crown) return null;
    return stalk ? [96, 140, 60] : undefined;
  } },
  lavender: flower([150, 90, 205], (x, y) => (x >= 6 && x <= 9 && y >= 1 && y <= 8 && ((x + y) % 2 === 0 || x === 7 || x === 8)) ? (y < 3 ? [190, 140, 235] : [150, 90, 205]) : null),
  daisy: flower([248, 248, 248], (x, y, r) => r < 1.4 ? [250, 205, 40] : r < 3.8 ? [248, 248, 248] : null),
  poppy: flower([208, 34, 40], (x, y, r) => r < 1.4 ? [25, 25, 25] : r < 3.8 ? [208, 34, 40] : null),
  bpoppy: flower([48, 82, 205], (x, y, r) => r < 1.4 ? [14, 20, 90] : r < 3.8 ? [48, 82, 205] : null),
  tulipo: tulip([243, 134, 32]), tulipp: tulip([240, 120, 172]), tulipw: tulip([245, 245, 245]),
  tallGrass: { c: [84, 160, 62], spr: true, px: (x, y) => {
    for (const [bx, h] of [[2, 9], [4, 12], [6, 8], [8, 13], [10, 10], [12, 11], [14, 8]]) {
      const lean = Math.floor((15 - y) / 6) * (bx % 2 ? 1 : -1);
      if (y >= 16 - h && y <= 15 && x === bx + lean) return y < 16 - h + 3 ? [128, 196, 84] : [84, 160, 62];
    }
    return null;
  } }
};
for (let i = 0; i < 8; i++) {
  const col = DYE_RGB[i];
  tiles['dye' + i] = { c: col, spr: true, px: (x, y) => {
    if (ell(x, y, 7.5, 10.5, 6, 3.3) < 1 || ell(x, y, 7.5, 8, 3.6, 2.6) < 1) return (x + y) % 3 === 0 ? col.map(v => Math.min(255, v + 28)) : col;
    return null;
  } };
}
export const faces = { 12: 'sapling', 40: 'lavender', 41: 'daisy', 42: 'poppy', 43: 'bpoppy', 44: 'tulipo', 45: 'tulipp', 47: 'tulipw', 106: 'tallGrass', 188: 'tulipw' };
for (let i = 0; i < 8; i++) faces[110 + i] = 'dye' + i;
export const flat = [12, 40, 41, 42, 43, 44, 45, 47, 106, 188, 110, 111, 112, 113, 114, 115, 116, 117];
