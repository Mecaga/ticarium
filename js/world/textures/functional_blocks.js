import { hash, cobble } from './util.js';
const inb = (x, y, a, b, c, d) => x >= a && x <= b && y >= c && y <= d;
export const tiles = {
  craftTop: { c: [160, 124, 76], px: (x, y) => {
    if (x < 1 || y < 1 || x > 14 || y > 14) return [100, 70, 40, 1];
    if (x === 5 || x === 10 || y === 5 || y === 10) return [95, 66, 38, 1];
    return [160, 124, 76, 0.9 + hash(x, y, 113) * 0.2];
  } },
  craftSide: { c: [170, 134, 84], px: (x, y) => {
    if (y < 3) return [110, 78, 44, 1];
    if (inb(x, y, 3, 12, 5, 9) && hash(x, y, 115) < 0.35) return [160, 160, 170, 1];
    const k = 0.9 + hash(x, y, 114) * 0.2;
    return [170, 134, 84, x % 5 === 0 ? k * 0.78 : k];
  } },
  furnaceTop: { c: [128, 128, 132], px: (x, y) => {
    if (x < 1 || y < 1 || x > 14 || y > 14) return [80, 80, 84, 1];
    if (x > 3 && x < 12 && y > 3 && y < 12) return [55, 55, 60, 1];
    return [128, 128, 132, 0.9 + hash(x, y, 121) * 0.2];
  } },
  furnaceSide: { c: [140, 140, 144], px: (x, y) => {
    if (inb(x, y, 4, 11, 6, 12)) return (y >= 10 && hash(x, y, 122) < 0.8) ? [235, 125, 30, 1] : [28, 28, 32, 1];
    const c = cobble(x, y);
    let k = 0.8 + hash(c.id, 3, 52) * 0.35;
    if (c.edge < 0.9) k *= 0.6;
    return [140, 140, 144, k];
  } },
  chestTop: { c: [158, 108, 54], px: (x, y) => (x < 1 || x > 14 || y < 1 || y > 14) ? [80, 50, 22, 1] : [158, 108, 54, 0.92 + hash(x, y, 150) * 0.16] },
  chestSide: { c: [158, 108, 54], px: (x, y) => {
    if (x < 1 || x > 14 || y < 1 || y > 14) return [80, 50, 22, 1];
    if (inb(x, y, 7, 8, 6, 9)) return [230, 200, 70, 1];
    const k = 0.92 + hash(x, y, 150) * 0.16;
    return [158, 108, 54, (y === 6 || y === 7) ? k * 0.62 : k];
  } },
  doorC: { c: [150, 100, 52], px: (x, y) => {
    if (x < 1 || x > 14 || y < 1 || y > 14) return [95, 62, 30, 1];
    if (inb(x, y, 11, 12, 8, 9)) return [235, 205, 60, 1];
    const k = 0.92 + hash(x, y, 140) * 0.16;
    return [150, 100, 52, (y === 7 || y === 8) ? k * 0.7 : k];
  } },
  doorO: { c: [150, 100, 52], px: (x, y) => x > 3 ? null : [150, 100, 52, 0.92 + hash(x, y, 141) * 0.16] },
  jukeTop: { c: [88, 58, 38], px: (x, y) => {
    const d = Math.hypot(x - 7.5, y - 7.5);
    if (d < 1.4) return [200, 60, 60, 1];
    if (d < 4.5) return [20, 20, 24, 1];
    return [88, 58, 38, 0.9 + hash(x, y, 145) * 0.2];
  } },
  jukeSide: { c: [120, 78, 48], px: (x, y) => {
    if (inb(x, y, 4, 11, 5, 6)) return [20, 20, 24, 1];
    const k = 0.9 + hash(x, y, 146) * 0.2;
    return [120, 78, 48, x % 5 === 0 ? k * 0.8 : k];
  } },
  bedFoot: { c: [200, 45, 45], px: (x, y) => { const k = 0.93 + hash(x, y, 142) * 0.12; return [200, 45, 45, (x < 1 || x > 14 || y > 14) ? k * 0.7 : k]; } },
  bedHead: { c: [200, 45, 45], px: (x, y) => {
    const k = 0.93 + hash(x, y, 143) * 0.12;
    if (inb(x, y, 3, 12, 4, 11)) return [245, 245, 245, k];
    return [200, 45, 45, (x < 1 || x > 14 || y > 14) ? k * 0.7 : k];
  } },
  bedSide: { c: [200, 45, 45], px: (x, y) => {
    const k = 0.93 + hash(x, y, 144) * 0.12;
    return y >= 9 ? [188, 152, 98, y === 9 ? k * 0.7 : k] : [200, 45, 45, k];
  } },
  farmTop: { c: [92, 60, 34], px: (x, y) => [92, 60, 34, (0.85 + hash(x, y, 116) * 0.25) * (y % 4 === 1 ? 0.62 : 1)] },
  paint: { c: [245, 240, 225], px: (x, y) => {
    if (x < 2 || y < 2 || x > 13 || y > 13) return [112, 80, 48, 0.9 + hash(x, y, 81) * 0.2];
    if ((x * 3 + y * 5) % 13 === 0) return [214, 72, 72, 1];
    if ((x * 5 + y * 2) % 17 === 0) return [60, 110, 210, 1];
    return [245, 240, 225, 0.97 + hash(x, y, 82) * 0.06];
  } }
};
export const faces = {
  32: 'paint', 72: ['craftTop', 'craftSide', 'planks'], 76: ['farmTop', 'dirt', 'dirt'],
  81: ['furnaceTop', 'furnaceSide', 'stone'], 87: 'doorO', 88: 'doorO',
  99: ['bedHead', 'bedSide', 'planks'], 100: ['bedFoot', 'bedSide', 'planks'],
  101: ['jukeTop', 'jukeSide', 'jukeSide'], 108: 'doorC', 109: 'doorC',
  176: ['chestTop', 'chestSide', 'chestTop']
};
export const flat = [87, 88, 108, 109];
