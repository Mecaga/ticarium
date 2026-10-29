const CROPC = [[[70, 150, 60], [196, 160, 96]], [[84, 170, 70], [240, 130, 30]], [[60, 140, 55], [220, 50, 40]],
  [[55, 135, 60], [225, 70, 40]], [[110, 170, 70], [235, 225, 235]], [[110, 200, 80], [130, 210, 90]],
  [[60, 130, 60], [150, 30, 70]], [[50, 130, 50], [60, 150, 60]]];
function cropPix(k, s, x, y) {
  const h = [3, 6, 9, 12][s], lc = CROPC[k][0], fc = CROPC[k][1];
  for (const c of [2, 5, 8, 11, 14]) {
    const dx = Math.abs(x - c);
    if (k !== 2 && k !== 3 && s >= 2 && y >= 14 && dx <= (s === 3 ? 1 : 0)) return fc;
    if (y < 16 - h || y > 15) continue;
    if (dx === 0) return lc;
    if (dx === 1 && y % 2 === 0 && y < 14 && k !== 4) return [Math.max(0, lc[0] - 12), Math.max(0, lc[1] - 10), Math.max(0, lc[2] - 10)];
    if ((k === 2 || k === 3) && s >= 2 && dx === 1 && (y + c) % 3 === 0 && y >= 16 - h + 3 && y < 14) return fc;
  }
  return null;
}
function wheatPix(s, x, y) {
  const h = [4, 7, 11, 14][s];
  for (const c of [2, 5, 8, 11, 14]) {
    if (x === c && y >= 16 - h) {
      if (s === 3 && y < 16 - h + 4) return [226, 192, 72];
      return [[96, 175, 70], [84, 160, 60], [150, 175, 60], [196, 164, 66]][s];
    }
    if (s === 3 && Math.abs(x - c) === 1 && y >= 16 - h + 1 && y < 16 - h + 4 && (x + y) % 2 === 0) return [235, 205, 90];
    if (s === 2 && Math.abs(x - c) === 1 && y >= 16 - h + 3 && y < 16 - h + 6 && y % 2 === 0) return [120, 170, 55];
  }
  return null;
}
export const tiles = {
  seeds: { c: [90, 120, 50], spr: true, px: (x, y) => {
    for (const d of [[5, 10], [8, 8], [10, 11], [7, 12], [11, 7], [9, 5]]) if (y === d[1] && x >= d[0] && x <= d[0] + 1) return d[0] % 2 ? [60, 130, 50] : [105, 150, 62];
    return null;
  } },
  wheatI: { c: [200, 170, 60], spr: true, px: (x, y) => {
    for (const c of [4, 8, 11]) {
      if (y >= 7 && y <= 14 && x === c + Math.floor((14 - y) / 5)) return [190, 150, 60];
      if (y >= 2 && y <= 7 && Math.abs(x - (c + 2)) <= (y % 2 === 0 ? 1 : 0)) return [230, 195, 85];
    }
    return null;
  } }
};
export const faces = { 73: 'seeds', 74: 'wheatI' };
const flatL = [73, 74];
for (let s = 0; s < 4; s++) { tiles['wheat' + s] = { c: [96, 175, 70], spr: true, px: (x, y) => wheatPix(s, x, y) }; faces[77 + s] = 'wheat' + s; flatL.push(77 + s); }
for (let k = 0; k < 8; k++) for (let s = 0; s < 4; s++) {
  tiles['cr' + k + '_' + s] = { c: [80, 160, 60], spr: true, px: (x, y) => cropPix(k, s, x, y) };
  const id = k < 5 ? 130 + k * 4 + s : 210 + (k - 5) * 4 + s;
  faces[id] = 'cr' + k + '_' + s; flatL.push(id);
}
export const flat = flatL;
