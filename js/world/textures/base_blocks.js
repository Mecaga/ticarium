import { hash, cobble } from './util.js';
const ring = (x, y) => Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
export const tiles = {
  grassTop: { c: [95, 174, 69] },
  grassSide: { c: [139, 90, 43], px: (x, y) => (y < 3 || (y === 3 && hash(x, y, 99) < 0.5)) ? [95, 174, 69] : undefined },
  dirt: { c: [139, 90, 43] },
  stone: { c: [150, 148, 144], px: (x, y) => {
    const c = cobble(x, y);
    let k = 0.78 + hash(c.id, 3, 51) * 0.42 + (hash(x, y, 8) - 0.5) * 0.08;
    if (c.edge < 0.9) k *= 0.55;
    return [150, 148, 144, k];
  } },
  woodSide: { c: [107, 68, 35], px: (x, y, i, k) => [107, 68, 35, x % 4 === 0 ? k * 0.78 : k] },
  woodTop: { c: [150, 110, 62], px: (x, y, i, k) => [150, 110, 62, Math.floor(ring(x, y)) % 2 === 0 ? k * 0.82 : k] },
  leaves: { c: [47, 125, 50], px: (x, y, i, k) => [47, 125, 50, hash(x, y, 5) < 0.25 ? k * 0.65 : k] },
  sand: { c: [230, 214, 144] },
  snow: { c: [245, 245, 245] },
  bedrock: { c: [62, 62, 66], px: (x, y) => {
    const h = hash(x, y, 21);
    if (h < 0.18) return [22, 22, 24, 1];
    if (h > 0.93) return [120, 120, 126, 1];
    return [62, 62, 66, 0.45 + hash(x, y, 22) * 0.9];
  } },
  water: { c: [50, 115, 205], px: (x, y) => {
    let k = 0.88 + hash(x, y, 71) * 0.24;
    if ((x + y * 2) % 7 === 0 && hash(x, y, 72) < 0.5) k *= 1.18;
    return [50, 115, 205, k];
  } },
  lava: { c: [240, 100, 20], px: (x, y) => {
    if (hash(x, y, 92) < 0.16) return [255, 215, 70, 1];
    if (hash(x, y, 93) < 0.12) return [150, 30, 0, 1];
    return [240, 100, 20, 0.88 + hash(x, y, 91) * 0.24];
  } },
  birchSide: { c: [226, 223, 212], px: (x, y) => {
    if (y % 4 === 1 && hash(x >> 1, y, 42) < 0.55) return [45, 42, 40, 1];
    return [226, 223, 212, 0.94 + hash(x, y, 41) * 0.1];
  } },
  birchTop: { c: [196, 178, 128], px: (x, y, i, k) => [196, 178, 128, Math.floor(ring(x, y)) % 2 === 0 ? k * 0.85 : k] },
  birchLeaf: { c: [132, 184, 84], px: (x, y, i, k) => [132, 184, 84, hash(x, y, 43) < 0.25 ? k * 0.7 : k] }
};
export const faces = {
  1: ['grassTop', 'grassSide', 'dirt'], 2: 'dirt', 3: 'stone', 4: ['woodTop', 'woodSide', 'woodTop'],
  5: 'leaves', 6: 'sand', 8: 'snow', 11: 'bedrock', 13: ['birchTop', 'birchSide', 'birchTop'],
  14: 'birchLeaf', 17: 'water', 25: 'lava'
};
export const flat = [];
