import { hash, ell } from './util.js';
const S = (c, px) => ({ c, spr: true, px });
const el = (x, y, cx, cy, a, b) => ell(x, y, cx, cy, a, b) < 1;
const bowl = c => S(c, (x, y) => (y < 8 || !el(x, y, 7.5, 8, 6, 5)) ? null : (y <= 9 ? c : [190, 190, 200]));
export const tiles = {
  meat: S([196, 70, 80], (x, y) => {
    if ((x + y * 2) % 6 === 0 && hash(x, y, 61) < 0.7) return [238, 214, 204, 1];
    return [196, 70, 80, (x === 0 || y === 0 || x === 15 || y === 15) ? 0.75 : 0.95];
  }),
  apple: S([200, 30, 30], (x, y) => {
    if (y >= 2 && y <= 4 && x === 8) return [95, 60, 30];
    if (y === 3 && x >= 9 && x <= 11) return [70, 150, 60];
    if (Math.hypot((x - 7.5) * 0.95, y - 9.5) < 5.2) return (x === 5 && y === 7) ? [250, 150, 150] : [200, 30, 30];
    return null;
  }),
  bread: S([200, 150, 80], (x, y) => el(x, y, 7.5, 9, 6, 3.6) ? (y < 8 ? [215, 165, 90] : [185, 125, 60]) : null),
  cooked: S([150, 85, 50], (x, y) => !el(x, y, 7.5, 8.5, 6, 4.6) ? null : ((x + y) % 5 === 0 ? [215, 130, 75] : (y < 8 ? [168, 100, 56] : [128, 72, 40]))),
  potato: S([196, 160, 96], (x, y) => {
    if (!el(x, y, 7.5, 9, 5.5, 4)) return null;
    if ((x === 5 && y === 8) || (x === 10 && y === 10)) return [110, 80, 46];
    return (x + y) % 4 === 0 ? [150, 115, 66] : [196, 160, 96];
  }),
  carrot: S([240, 130, 30], (x, y) => {
    if (y >= 1 && y <= 5 && x >= 6 && x <= 9 && (x + y) % 2 === 0) return [80, 170, 70];
    const cx = 8 + (y - 8) * 0.12, hw = Math.max(0, (15 - y) * 0.33);
    if (y >= 5 && y <= 15 && Math.abs(x - cx) <= hw) return y % 3 === 0 ? [205, 105, 20] : [240, 130, 30];
    return null;
  }),
  tomato: S([220, 50, 40], (x, y) => {
    if (y >= 4 && y <= 5 && x >= 6 && x <= 9) return [70, 150, 60];
    if (Math.hypot(x - 7.5, y - 9.5) < 5.2) return (x === 5 && y === 7) ? [250, 150, 140] : [220, 50, 40];
    return null;
  }),
  pepper: S([60, 170, 60], (x, y) => {
    if (y >= 2 && y <= 3 && x >= 7 && x <= 8) return [60, 110, 50];
    if (!el(x, y, 7.5, 9.5, 3.6, 5.8)) return null;
    return (x === 6 && y < 9) ? [140, 220, 120] : [60, 170, 60];
  }),
  onion: S([235, 225, 235], (x, y) => {
    if (y >= 2 && y <= 6 && x >= 7 && x <= 8) return y < 4 ? [120, 170, 70] : [176, 126, 76];
    if (Math.hypot(x - 7.5, y - 10) < 4.6) return (x + y) % 4 === 0 ? [200, 170, 200] : [235, 225, 235];
    return null;
  }),
  cigkofte: S([168, 58, 32], (x, y) => {
    if (y >= 12 && y <= 13 && x >= 2 && x <= 13) return [90, 170, 70];
    if (!el(x, y, 7.5, 9.5, 6, 3.8)) return null;
    return hash(x, y, 130) < 0.2 ? [210, 120, 60] : [168, 58, 32];
  }),
  eggI: S([245, 240, 225], (x, y) => el(x, y, 7.5, 9, 3.8, 5) ? [245, 240, 225] : null),
  milkB: S([245, 245, 250], (x, y) => (y < 4 || y > 13 || Math.abs(x - 7.5) > (y < 8 ? 5 : 4)) ? null : (y <= 6 ? [245, 245, 250] : [150, 155, 165])),
  dough: S([235, 215, 170], (x, y) => el(x, y, 7.5, 9, 6, 4) ? [235, 215, 170] : null),
  cake: S([240, 200, 210], (x, y) => {
    if (y === 4 && x >= 7 && x <= 8) return [210, 40, 50];
    if (y >= 5 && y <= 7 && x >= 2 && x <= 13) return [240, 200, 210];
    return (y >= 8 && y <= 13 && x >= 2 && x <= 13) ? [200, 150, 90] : null;
  }),
  lettuce: S([120, 200, 80], (x, y) => Math.hypot(x - 7.5, y - 9) < 5.5 ? (x === 7 || x === 8 ? [80, 150, 55] : [120, 200, 80]) : null),
  beet: S([150, 30, 70], (x, y) => {
    if (y >= 2 && y <= 5 && x >= 7 && x <= 8) return [70, 150, 60];
    return Math.hypot(x - 7.5, y - 10) < 4.5 ? [150, 30, 70] : null;
  }),
  cucumber: S([60, 150, 60], (x, y) => el(x, y, 7.5, 8.5, 6.5, 2.8) ? (x < 4 ? [120, 190, 100] : [60, 150, 60]) : null),
  saladC: bowl([210, 60, 50]), saladL: bowl([130, 200, 90]),
  soupB: bowl([150, 30, 70]), soupT: bowl([215, 70, 40]), soupV: bowl([230, 150, 50]),
  fries: S([235, 190, 70], (x, y) => ([4, 6, 8, 10].includes(x) && y >= 4 + (x % 3) && y <= 13) ? [235, 190, 70] : null)
};
export const faces = { 15: 'meat', 46: 'apple', 75: 'bread', 86: 'cooked', 150: 'potato', 151: 'carrot', 152: 'tomato', 153: 'pepper', 154: 'onion', 155: 'cigkofte' };
export const flat = [15, 46, 75, 86, 150, 151, 152, 153, 154, 155];
