import { IRON, DIAM } from './util.js';
function armorPix(kind, col, x, y) {
  const dx = Math.abs(x - 7.5);
  let on;
  if (kind === 'helm') on = y >= 3 && y <= 10 && dx <= (y < 5 ? 3.5 : 5) && !(y >= 8 && dx <= 2);
  else if (kind === 'chest') on = (y >= 3 && y <= 5 && dx >= 2 && dx <= 6.5) || (y >= 6 && y <= 13 && dx <= 4.5) || (y >= 6 && y <= 9 && dx > 4.5 && dx <= 6.5);
  else if (kind === 'leg') on = (y >= 3 && y <= 5 && dx <= 4.5) || (y >= 6 && y <= 13 && dx >= 0.9 && dx <= 4.5);
  else on = (y >= 8 && y <= 12 && dx >= 0.9 && dx <= 5.5) || (y === 13 && dx >= 0.9 && dx <= 6.5);
  if (!on) return null;
  const rim = (y === 3 || y === 13) ? 0.78 : 1;
  return col.map(v => Math.round(v * rim));
}
const A = (kind, col) => ({ c: col, spr: true, px: (x, y) => armorPix(kind, col, x, y) });
export const tiles = {
  helmI: A('helm', IRON), chestI: A('chest', IRON), legI: A('leg', IRON), bootI: A('boot', IRON),
  helmD: A('helm', DIAM), chestD: A('chest', DIAM), legD: A('leg', DIAM), bootD: A('boot', DIAM)
};
export const faces = { 91: 'helmI', 92: 'chestI', 93: 'legI', 94: 'bootI', 95: 'helmD', 96: 'chestD', 97: 'legD', 98: 'bootD' };
export const flat = [91, 92, 93, 94, 95, 96, 97, 98];
