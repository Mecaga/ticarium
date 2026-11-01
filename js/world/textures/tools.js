import { N } from '../idtable.js';
import { WOOD, STONE, IRON, DIAM } from './util.js';
function toolPix(kind, col, x, y) {
  if (kind === 'axe') {
    const hx = x - 7, hy = y - 3;
    if (hy >= 0 && hy <= 6 && hx >= 0 && hx <= 5 && (hx <= 3 || (hx === 4 && hy >= 1 && hy <= 5) || (hx === 5 && hy >= 2 && hy <= 4))) return col;
  } else if (kind === 'shovel') {
    const dx = x - 11, dy = y - 4;
    if (dx >= -2 && dx <= 2 && dy >= -3 && dy <= 3 && !(Math.abs(dx) === 2 && Math.abs(dy) === 3)) return col;
  } else if (kind === 'hoe') {
    if ((y === 3 || y === 4) && x >= 6 && x <= 12) return col;
    if ((x === 11 || x === 12) && (y === 5 || y === 6)) return col;
  } else if (kind === 'sword') {
    if ((x + y === 16 || x + y === 17) && x >= 7 && x <= 13) return col;
    if (x - y === -3 && x >= 5 && x <= 8) return [90, 90, 98];
    if ((x + y === 16 || x + y === 17) && x >= 3 && x <= 5) return [122, 86, 42];
    return null;
  } else {
    const dx = x - 5.5, dy = y - 10.5, r = Math.hypot(dx, dy);
    if (r >= 5.2 && r <= 7.2 && dx >= -1 && dy <= 1) return col;
  }
  if ((x + y === 16 || x + y === 17) && x >= 3 && x <= 11) return [122, 86, 42];
  return null;
}
const T = (kind, col) => ({ c: col, spr: true, px: (x, y) => toolPix(kind, col, x, y) });
const bk = nm => ({ c: [170, 175, 182], spr: true, px: (x, y) => {
  const w = y < 5 ? 6 : (y < 12 ? 5 : 4);
  const body = y >= 3 && y <= 14 && Math.abs(x - 7.5) <= w;
  const handle = (y <= 2 && y >= 1 && x >= 4 && x <= 11) || ((x === 4 || x === 11) && y >= 2 && y <= 4);
  if (!body && !handle) return null;
  if (handle) return [85, 85, 92];
  if (nm !== 'bucket' && y >= 4 && y <= 7 && Math.abs(x - 7.5) <= w - 1) return nm === 'wbucket' ? [55, 125, 225] : [240, 110, 20];
  if (y === 3 || y === 14 || Math.abs(x - 7.5) > w - 1) return [120, 124, 132];
  return undefined;
} });
export const tiles = {
  pickW: T('pick', WOOD), pickS: T('pick', STONE), pickI: T('pick', IRON), pickD: T('pick', DIAM),
  axeW: T('axe', WOOD), axeS: T('axe', STONE), axe: T('axe', IRON), axeD: T('axe', DIAM),
  shovelW: T('shovel', WOOD), shovelS: T('shovel', STONE), shovel: T('shovel', IRON), shovelD: T('shovel', DIAM),
  hoeW: T('hoe', WOOD), hoeS: T('hoe', STONE), hoeI: T('hoe', IRON), hoeD: T('hoe', DIAM),
  swordW: T('sword', WOOD), swordS: T('sword', STONE), swordI: T('sword', IRON), swordD: T('sword', DIAM),
  bucket: bk('bucket'), wbucket: bk('wbucket'), lbucket: bk('lbucket'),
  stick: { c: [140, 100, 52], spr: true, px: (x, y) => ((x + y === 16 || x + y === 17) && x >= 4 && x <= 12) ? [140, 100, 52] : null },
  shears: { c: [215, 215, 225], spr: true, px: (x, y) => {
    const a = (x + y === 15 || x + y === 16) && x >= 5 && x <= 11, b = (x === y || x === y + 1) && x >= 5 && x <= 11;
    if (a || b) return [215, 215, 225];
    if (y >= 11 && y <= 14 && ((x >= 2 && x <= 4) || (x >= 11 && x <= 13))) return [190, 50, 50];
    return null;
  } }
};
export const faces = {
  [N.KOVA]: 'bucket', 
  [N.SU_KOVASI]: 'wbucket', 
  [N.LAV_KOVASI]: 'lbucket', 
  [N.CUBUK]: 'stick', 
  [N.MAKAS]: 'shears',
  [N.AHSAP_KAZMA]: 'pickW', 
  [N.TAS_KAZMA]: 'pickS', 
  [N.DEMIR_KAZMA]: 'pickI', 
  [N.ELMAS_KAZMA]: 'pickD',
  [N.AHSAP_BALTA]: 'axeW', 
  [N.TAS_BALTA]: 'axeS', 
  [N.DEMIR_BALTA]: 'axe', 
  [N.ELMAS_BALTA]: 'axeD',
  [N.AHSAP_KUREK]: 'shovelW', 
  [N.TAS_KUREK]: 'shovelS', 
  [N.DEMIR_KUREK]: 'shovel', 
  [N.ELMAS_KUREK]: 'shovelD',
  [N.AHSAP_CAPA]: 'hoeW', 
  [N.TAS_CAPA]: 'hoeS', 
  [N.DEMIR_CAPA]: 'hoeI', 
  [N.ELMAS_CAPA]: 'hoeD',
  [N.AHSAP_KILIC]: 'swordW', 
  [N.TAS_KILIC]: 'swordS', 
  [N.DEMIR_KILIC]: 'swordI', 
  [N.ELMAS_KILIC]: 'swordD'
};
export const flat = Object.keys(faces).map(Number);
