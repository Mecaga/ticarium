import { hash } from '../textures.js';
import { BEDROCK, OBSIDIAN, LAVA, WATER, TALL } from '../defs.js';
export function genNormal(c, X) {
  const { b, put, trees, x0, z0, CW, H, SEA, SNOW_H, seed, heightAt, oreAt, ruinAt, ruinCells, treeAt, treeCells, flowerAt, grassAt } = X;
  const hs = new Int16Array(CW * CW);
  for (let lz = 0; lz < CW; lz++) for (let lx = 0; lx < CW; lx++) {
    const x = x0 + lx, z = z0 + lz, h = heightAt(x, z);
    hs[lz * CW + lx] = h;
    for (let y = 0; y <= h; y++) {
      let t;
      if (y === 0) t = BEDROCK;
      else if (y === 1 && hash(x, z, seed + 17) < 0.5) t = BEDROCK;
      else if (y === h) t = h <= SEA ? 6 : h >= SNOW_H ? 8 : 1;
      else if (y >= h - 2) t = h <= SEA ? 6 : 2;
      else {
        t = 3;
        if (y >= 2 && y <= h - 3) {
          const o = oreAt(x, y, z);
          if (o) t = o;
          else if (y <= 3 && hash(x * 5 + y, z * 3, seed + 6) < 0.004) t = OBSIDIAN;
          else if (y === 3 && h >= 9 && hash(x >> 1, z >> 1, seed + 5) < 0.012) t = LAVA;
        }
      }
      b[(y * CW + lz) * CW + lx] = t;
    }
    for (let y = h + 1; y <= SEA; y++) b[(y * CW + lz) * CW + lx] = WATER;
  }
  for (let rx = Math.floor((x0 - 4) / 48); rx <= Math.floor((x0 + CW + 4) / 48); rx++) {
    for (let rz = Math.floor((z0 - 4) / 48); rz <= Math.floor((z0 + CW + 4) / 48); rz++) {
      const r = ruinAt(rx, rz);
      if (r) ruinCells(r, put);
    }
  }
  const list = [];
  for (let x = x0 - 2; x <= x0 + CW + 1; x++) for (let z = z0 - 2; z <= z0 + CW + 1; z++) {
    const tr = treeAt(x, z);
    if (tr) list.push(treeCells(x, heightAt(x, z) + 1, z, tr === 2));
  }
  trees(list);
  for (let lz = 0; lz < CW; lz++) for (let lx = 0; lx < CW; lx++) {
    const h = hs[lz * CW + lx];
    if (h <= SEA || h >= SNOW_H || h + 1 >= H) continue;
    const ix = ((h + 1) * CW + lz) * CW + lx;
    if (b[ix] !== 0 || b[(h * CW + lz) * CW + lx] !== 1) continue;
    const f = flowerAt(x0 + lx, z0 + lz);
    if (f) b[ix] = f; else if (grassAt(x0 + lx, z0 + lz)) b[ix] = TALL;
  }
  for (let lz = 0; lz < CW; lz++) for (let lx = 0; lx < CW; lx++) {   // dağ tepesi: basamak basamak kar
    const h = hs[lz * CW + lx], d = h - SNOW_H;
    if (d < 0 || d > 2 || h + 1 >= H) continue;
    const ix = ((h + 1) * CW + lz) * CW + lx;
    if (b[ix] === 0 && b[(h * CW + lz) * CW + lx] === 8) b[ix] = 180 + d;
  }
}
