export function hash(x, y, s) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
const SD = Array.from({ length: 8 }, (_, i) => [hash(i, 1, 50) * 16, hash(i, 2, 50) * 16]);
export function cobble(x, y) {
  let d1 = 99, d2 = 99, id = 0;
  for (let i = 0; i < SD.length; i++) {
    let dx = Math.abs(x + 0.5 - SD[i][0]); dx = Math.min(dx, 16 - dx);
    let dy = Math.abs(y + 0.5 - SD[i][1]); dy = Math.min(dy, 16 - dy);
    const d = Math.hypot(dx, dy);
    if (d < d1) { d2 = d1; d1 = d; id = i; } else if (d < d2) d2 = d;
  }
  return { id, edge: d2 - d1 };
}
// Elips ölçüsü: < 1 ise içeride
export const ell = (x, y, cx, cy, a, b) => Math.pow((x - cx) / a, 2) + Math.pow((y - cy) / b, 2);
export const range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };
export const WOOD = [176, 136, 72], STONE = [150, 150, 150], IRON = [222, 222, 228], DIAM = [80, 225, 215];
