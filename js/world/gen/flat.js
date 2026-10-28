import { BEDROCK, TALL } from '../defs.js';
export function genFlat(c, X) {
  const { put, x0, z0, CW, flowerAt, grassAt } = X;
  for (let lz = 0; lz < CW; lz++) for (let lx = 0; lx < CW; lx++) {
    const x = x0 + lx, z = z0 + lz;
    put(x, 0, z, BEDROCK); put(x, 1, z, 2); put(x, 2, z, 1);
    const f = flowerAt(x, z);
    if (f) put(x, 3, z, f); else if (grassAt(x, z)) put(x, 3, z, TALL);
  }
}
