import { ell } from './util.js';
// Mob yumurtaları (inek, koyun, tavuk). Mob modelleri js/entities/mobs.js içinde kutulardan çizilir.
const egg = col => ({
  c: col, spr: true,
  px: (x, y) => (ell(x, y, 7.5, 8.5, 4.6, 6) >= 1 ? null : ((x * 3 + y * 5) % 7 < 2 ? [60, 60, 60] : col))
});
export const tiles = { egg0: egg([160, 105, 60]), egg1: egg([240, 240, 240]), egg2: egg([245, 210, 90]) };
export const faces = { 230: 'egg0', 231: 'egg1', 232: 'egg2' };
export const flat = [230, 231, 232];
export const MOB_COLORS = { cow: 0xf3f3f3, sheep: 0xeeeeee, chicken: 0xf5f5f0 };
