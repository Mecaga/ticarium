import { hash } from './util.js';
import { DYE_RGB } from './flora_dye.js';
export const tiles = {
  brick: { c: [181, 73, 58], px: (x, y) => {
    const row = Math.floor(y / 4);
    if (y % 4 === 3 || x % 8 === (row % 2 ? 3 : 7)) return [200, 195, 185, 0.95 + hash(x, y, 3) * 0.1];
    return undefined;
  } },
  glass: { c: [159, 216, 232], px: (x, y, i, k) => {
    if (x === 0 || y === 0 || x === 15 || y === 15) return [230, 245, 250, k];
    return [159, 216, 232, hash(x, y, 4) < 0.06 ? 1.25 : k];
  } },
  glassEdge: { c: [226, 244, 250], px: () => [226, 244, 250, 1] },
  planks: { c: [188, 152, 98], px: (x, y) => {
    let k = 0.9 + hash(x, y, 111) * 0.2;
    if (y % 4 === 3) k *= 0.72;
    if (x % 4 === 0 && hash(y >> 2, x >> 2, 112) < 0.2) k *= 0.82;
    return [188, 152, 98, k];
  } },
  wool: { c: [236, 236, 232], px: (x, y) => [236, 236, 232, (0.93 + hash(x, y, 62) * 0.1) * ((x + y) % 4 === 0 ? 0.95 : 1)] }
};
for (let i = 0; i < 8; i++) {
  tiles['wc' + i] = { c: DYE_RGB[i], px: (x, y) => [DYE_RGB[i][0], DYE_RGB[i][1], DYE_RGB[i][2], (0.93 + hash(x, y, 62 + i) * 0.1) * ((x + y) % 4 === 0 ? 0.95 : 1)] };
}
export const faces = { 7: 'brick', 9: 'glass', 16: 'wool', 70: 'planks' };
for (let i = 0; i < 8; i++) faces[120 + i] = 'wc' + i;
export const flat = [];
