export function genSky(c, X) {
  const { put, trees, treeCells, SKY_CUBES } = X;
  for (const [ox, oz] of SKY_CUBES) for (let dx = 0; dx < 3; dx++) for (let dz = 0; dz < 3; dz++) for (let dy = 0; dy < 3; dy++) {
    put(ox + dx, 10 + dy, oz + dz, dy === 2 ? 1 : 2);
  }
  trees([treeCells(-2, 13, -2, false)]);
}
