import { hash, cobble, ell } from './util.js';
const ore = col => ({ c: [150, 148, 144], px: (x, y, i) => {
  const c = cobble(x, y);
  let k = 0.78 + hash(c.id, 3, 51) * 0.42 + (hash(x, y, 8) - 0.5) * 0.08;
  if (c.edge < 0.9) k *= 0.55;
  if (hash(x >> 1, y >> 1, i + 200) < 0.5 && hash(x, y, i + 201) < 0.85) return [col[0], col[1], col[2], 0.85 + hash(x, y, i + 202) * 0.3];
  return [150, 148, 144, k];
} });
const ingot = col => ({ c: col, spr: true, px: (x, y) => {
  if (y < 6 || y > 10) return null;
  const s = 10 - y;
  if (x < 3 + s || x > 10 + s) return null;
  return y <= 7 ? col.map(v => Math.min(255, v + 30)) : col;
} });
const block = c => ({ c, px: (x, y) => [c[0], c[1], c[2], (0.92 + hash(x, y, 160) * 0.16) * ((x % 8 === 0 || y % 8 === 0) ? 0.75 : 1)] });
export const tiles = {
  coalOre: ore([40, 40, 46]), ironOre: ore([216, 172, 140]), goldOre: ore([250, 214, 70]), diamondOre: ore([90, 232, 232]),
  coal: { c: [40, 40, 44], spr: true, px: (x, y) => {
    if (ell(x, y, 7.5, 8.5, 5.2, 4.2) >= 1) return null;
    return (hash(x, y, 120) < 0.18 || (x === 5 && y === 6)) ? [105, 105, 118] : [38, 38, 44];
  } },
  ingotI: ingot([205, 205, 214]), ingotG: ingot([248, 204, 60]),
  gem: { c: [80, 225, 215], spr: true, px: (x, y) => {
    if (Math.abs(x - 7.5) / 6 + Math.abs(y - 8) / 5.5 >= 1) return null;
    return (x + y < 12 && x < 8) ? [170, 250, 245] : (x > 8 ? [48, 180, 175] : [80, 225, 215]);
  } },
  ironB: block([215, 215, 222]), diamB: block([80, 225, 215]),
  gold: { c: [255, 215, 0], px: (x, y, i, k) => [255, 215, 0, hash(x, y, 6) < 0.15 ? 1.2 : k] },
  obsidian: { c: [26, 16, 44], px: (x, y) => {
    if (hash(x, y, 102) < 0.09) return [92, 52, 150, 1];
    if (hash(x, y, 103) < 0.08) return [8, 4, 16, 1];
    return [26, 16, 44, 0.8 + hash(x, y, 101) * 0.4];
  } }
};
export const faces = {
  10: 'gold', 34: 'obsidian', 36: 'coalOre', 37: 'ironOre', 38: 'goldOre', 39: 'diamondOre',
  82: 'coal', 83: 'ingotI', 84: 'ingotG', 85: 'gem', 186: 'ironB', 187: 'diamB'
};
export const flat = [82, 83, 84, 85];
