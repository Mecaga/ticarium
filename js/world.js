export const N = 40, H = 24;

export const TYPES = {
  1:  { name: 'Çim',    color: 0x5fae45, base: 10 },
  2:  { name: 'Toprak', color: 0x8b5a2b, base: 6 },
  3:  { name: 'Taş',    color: 0x8a8a8a, base: 15 },
  4:  { name: 'Odun',   color: 0x6b4423, base: 25 },
  5:  { name: 'Yaprak', color: 0x2f7d32, base: 5 },
  6:  { name: 'Kum',    color: 0xe6d690, base: 8 },
  7:  { name: 'Tuğla',  color: 0xb5493a, base: 30 },
  8:  { name: 'Kar',    color: 0xf5f5f5, base: 12 },
  9:  { name: 'Cam',    color: 0x9fd8e8, base: 20 },
  10: { name: 'Altın',  color: 0xffd700, base: 80 }
};

const world = new Uint8Array(N * H * N);
const idx = (x, y, z) => (y * N + z) * N + x;
const inb = (x, y, z) => x >= 0 && x < N && y >= 0 && y < H && z >= 0 && z < N;
export const get = (x, y, z) => inb(x, y, z) ? world[idx(x, y, z)] : 0;
export const set = (x, y, z, t) => { if (inb(x, y, z)) world[idx(x, y, z)] = t; };

export function heightAt(x, z) {
  const h = 6 + 3 * Math.sin(x * 0.21) + 3 * Math.cos(z * 0.17) + 2 * Math.sin((x + z) * 0.11);
  return Math.max(2, Math.min(H - 8, Math.floor(h)));
}

function mulberry(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function generate(seed = 1) {
  world.fill(0);
  const rnd = mulberry(seed);
  for (let x = 0; x < N; x++) for (let z = 0; z < N; z++) {
    const h = heightAt(x, z);
    for (let y = 0; y <= h; y++) set(x, y, z, y === h ? 1 : y >= h - 2 ? 2 : 3);
  }
  for (let i = 0; i < 28; i++) {
    const x = 3 + Math.floor(rnd() * (N - 6)), z = 3 + Math.floor(rnd() * (N - 6));
    if (Math.abs(x - N / 2) < 3 && Math.abs(z - N / 2) < 3) continue;
    const h = heightAt(x, z);
    for (let y = 1; y <= 4; y++) set(x, h + y, z, 4);
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = 3; dy <= 5; dy++) {
      if (Math.abs(dx) + Math.abs(dz) > 3 || (dy === 5 && Math.abs(dx) + Math.abs(dz) > 1)) continue;
      if (!get(x + dx, h + dy, z + dz)) set(x + dx, h + dy, z + dz, 5);
    }
  }
}

// ---- Çizim ----
const meshes = {};
const MAXI = 9000;
const dummy = new THREE.Object3D();
const col = new THREE.Color();
let hl;

export function initRender(scene) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  for (const t in TYPES) {
    const m = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: TYPES[t].color }), MAXI);
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXI * 3), 3);
    m.frustumCulled = false;
    scene.add(m);
    meshes[t] = m;
  }
  hl = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01)),
    new THREE.LineBasicMaterial({ color: 0x000000 })
  );
  hl.visible = false;
  scene.add(hl);
  rebuild();
}

function exposed(x, y, z) {
  return !get(x + 1, y, z) || !get(x - 1, y, z) || !get(x, y + 1, z) ||
         !get(x, y - 1, z) || !get(x, y, z + 1) || !get(x, y, z - 1);
}

export function rebuild() {
  const c = {};
  for (const t in TYPES) c[t] = 0;
  for (let y = 0; y < H; y++) for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const t = get(x, y, z);
    if (!t || !meshes[t] || !exposed(x, y, z) || c[t] >= MAXI) continue;
    dummy.position.set(x + 0.5, y + 0.5, z + 0.5);
    dummy.updateMatrix();
    const m = meshes[t], i = c[t]++;
    m.setMatrixAt(i, dummy.matrix);
    const v = 0.88 + ((x * 7 + y * 13 + z * 17) % 5) * 0.03;
    col.setRGB(v, v, v);
    m.setColorAt(i, col);
  }
  for (const t in meshes) {
    const m = meshes[t];
    m.count = c[t];
    m.instanceMatrix.needsUpdate = true;
    m.instanceColor.needsUpdate = true;
  }
}

// ---- Hedef bulma ----
export let target = null, prev = null;

export function updateTarget(camera) {
  const d = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
  const o = camera.position;
  let lx = -1, ly = -1, lz = -1;
  target = prev = null;
  for (let s = 0; s < 6; s += 0.04) {
    const x = Math.floor(o.x + d.x * s), y = Math.floor(o.y + d.y * s), z = Math.floor(o.z + d.z * s);
    if (x === lx && y === ly && z === lz) continue;
    if (get(x, y, z)) {
      target = [x, y, z];
      prev = lx < 0 ? null : [lx, ly, lz];
      break;
    }
    lx = x; ly = y; lz = z;
  }
  hl.visible = !!target;
  if (target) hl.position.set(target[0] + 0.5, target[1] + 0.5, target[2] + 0.5);
}
