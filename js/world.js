export const N = 48, H = 32, CS = 16;
const NC = N / CS;
export const BEDROCK = 11, SAPLING = 12, BIRCH_LOG = 13, BIRCH_LEAF = 14;

export const TYPES = {
  1:  { name: 'Çim',    color: 0x5fae45, base: 10 },
  2:  { name: 'Toprak', color: 0x8b5a2b, base: 6 },
  3:  { name: 'Taş',    color: 0x969490, base: 15 },
  4:  { name: 'Odun',   color: 0x6b4423, base: 25 },
  5:  { name: 'Yaprak', color: 0x2f7d32, base: 5 },
  6:  { name: 'Kum',    color: 0xe6d690, base: 8 },
  7:  { name: 'Tuğla',  color: 0xb5493a, base: 30 },
  8:  { name: 'Kar',    color: 0xf5f5f5, base: 12 },
  9:  { name: 'Cam',    color: 0x9fd8e8, base: 20 },
  10: { name: 'Altın',  color: 0xffd700, base: 80 },
  12: { name: 'Fidan',  color: 0x4caf50, base: 14 },
  13: { name: 'Huş odun',   color: 0xe4e0d2, base: 25 },
  14: { name: 'Huş yaprak', color: 0x8fc060, base: 5 }
};

// ---- Dünya verisi ----
const world = new Uint8Array(N * H * N);
const idx = (x, y, z) => (y * N + z) * N + x;
const inb = (x, y, z) => x >= 0 && x < N && y >= 0 && y < H && z >= 0 && z < N;
export const inBounds = inb;
export const get = (x, y, z) => inb(x, y, z) ? world[idx(x, y, z)] : 0;
// Fidan içinden geçilir, diğer bloklar katıdır
export const solid = (x, y, z) => { const t = get(x, y, z); return t !== 0 && t !== SAPLING; };
const opaque = t => t !== 0 && t !== SAPLING;

const dirty = new Set();
const addDirty = (cx, cz) => { if (cx >= 0 && cz >= 0 && cx < NC && cz < NC) dirty.add(cz * NC + cx); };
function markDirty(x, z) {
  const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
  addDirty(cx, cz);
  const lx = x - cx * CS, lz = z - cz * CS;
  if (lx === 0) addDirty(cx - 1, cz);
  if (lx === CS - 1) addDirty(cx + 1, cz);
  if (lz === 0) addDirty(cx, cz - 1);
  if (lz === CS - 1) addDirty(cx, cz + 1);
}
export const set = (x, y, z, t) => {
  if (!inb(x, y, z)) return;
  const i = idx(x, y, z);
  if (world[i] === t) return;
  world[i] = t;
  markDirty(x, z);
};

export function heightAt(x, z) {
  const h = 10 + 4 * Math.sin(x * 0.15) + 4 * Math.cos(z * 0.13) + 3 * Math.sin((x + z) * 0.08);
  return Math.max(3, Math.min(H - 9, Math.floor(h)));
}

function mulberry(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// (x,y,z): gövdenin ilk bloğu (fidan hücresi). Yer yoksa null, varsa yerleştirilecek bloklar.
export function planTree(x, y, z, birch) {
  const log = birch ? BIRCH_LOG : 4, leaf = birch ? BIRCH_LEAF : 5;
  const th = birch ? 5 : 4;
  const out = [];
  for (let i = 0; i < th; i++) {
    const yy = y + i;
    if (!inb(x, yy, z)) return null;
    const t = get(x, yy, z);
    if (t !== 0 && t !== SAPLING && t !== 5 && t !== BIRCH_LEAF) return null;
    out.push({ x, y: yy, z, t: log });
  }
  const top = y + th - 1;
  for (let L = top - 1; L <= top + 1; L++) for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
    const m = Math.abs(dx) + Math.abs(dz);
    if (m > 3 || (L === top + 1 && m > 1)) continue;
    if (dx === 0 && dz === 0 && L <= top) continue;
    const lx = x + dx, lz = z + dz;
    if (!inb(lx, L, lz) || get(lx, L, lz) !== 0) continue;
    out.push({ x: lx, y: L, z: lz, t: leaf });
  }
  return out;
}

export function generate(seed = 1) {
  world.fill(0);
  for (let cx = 0; cx < NC; cx++) for (let cz = 0; cz < NC; cz++) addDirty(cx, cz);
  const rnd = mulberry(seed);

  // Arazi: alt katman kayası, alçakta kum, tepede kar
  for (let x = 0; x < N; x++) for (let z = 0; z < N; z++) {
    const h = heightAt(x, z);
    for (let y = 0; y <= h; y++) {
      let t;
      if (y === 0) t = BEDROCK;
      else if (y === 1 && hash(x, z, 17) < 0.5) t = BEDROCK;
      else if (y === h) t = h <= 7 ? 6 : h >= 16 ? 8 : 1;
      else if (y >= h - 2) t = h <= 7 ? 6 : 2;
      else t = 3;
      set(x, y, z, t);
    }
  }

  // Rastgele kum yamaları
  for (let i = 0; i < 4; i++) {
    const cx = 4 + Math.floor(rnd() * (N - 8)), cz = 4 + Math.floor(rnd() * (N - 8));
    const r = 3 + Math.floor(rnd() * 3);
    if (Math.abs(cx - N / 2) < r + 3 && Math.abs(cz - N / 2) < r + 3) continue;
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      if (dx * dx + dz * dz > r * r) continue;
      const x = cx + dx, z = cz + dz;
      if (x < 0 || z < 0 || x >= N || z >= N) continue;
      const h = heightAt(x, z);
      if (get(x, h, z) === 1) set(x, h, z, 6);
      if (get(x, h - 1, z) === 2) set(x, h - 1, z, 6);
    }
  }

  // Meşe ağaçları (sadece çimde)
  for (let i = 0; i < 40; i++) {
    const x = 3 + Math.floor(rnd() * (N - 6)), z = 3 + Math.floor(rnd() * (N - 6));
    if (Math.abs(x - N / 2) < 3 && Math.abs(z - N / 2) < 3) continue;
    const h = heightAt(x, z);
    if (get(x, h, z) !== 1) continue;
    for (let y = 1; y <= 4; y++) set(x, h + y, z, 4);
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = 3; dy <= 5; dy++) {
      if (Math.abs(dx) + Math.abs(dz) > 3 || (dy === 5 && Math.abs(dx) + Math.abs(dz) > 1)) continue;
      if (!get(x + dx, h + dy, z + dz)) set(x + dx, h + dy, z + dz, 5);
    }
  }

  // Yer altı altın damarları
  for (let i = 0; i < 20; i++) {
    let x = 2 + Math.floor(rnd() * (N - 4)), z = 2 + Math.floor(rnd() * (N - 4));
    const h = heightAt(x, z);
    let y = 2 + Math.floor(rnd() * Math.max(1, h - 4));
    const len = 2 + Math.floor(rnd() * 3);
    for (let k = 0; k < len; k++) {
      if (get(x, y, z) === 3) set(x, y, z, 10);
      const a = Math.floor(rnd() * 6);
      if (a === 0) x++; else if (a === 1) x--; else if (a === 2) z++;
      else if (a === 3) z--; else if (a === 4) y++; else y--;
    }
  }

  // Tuğla harabeler (cam pencereli)
  let placed = 0;
  for (let tries = 0; tries < 60 && placed < 4; tries++) {
    const cx = 6 + Math.floor(rnd() * (N - 12)), cz = 6 + Math.floor(rnd() * (N - 12));
    if (Math.abs(cx - N / 2) < 7 && Math.abs(cz - N / 2) < 7) continue;
    placed++;
    const hc = heightAt(cx, cz);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) set(cx + dx, hc, cz + dz, 7);
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== 2) continue;
      if (dx === 0 && dz === 2) continue; // kapı
      const x = cx + dx, z = cz + dz;
      const hs = heightAt(x, z);
      const top = hc + 2 + (rnd() < 0.5 ? 1 : 0);
      for (let y = hs + 1; y <= top; y++) {
        if (rnd() < 0.12) continue; // yıkık boşluk
        const win = y === hc + 2 && (dx === 0 || dz === 0) && rnd() < 0.6;
        set(x, y, z, win ? 9 : 7);
      }
    }
  }

  // Huş ağaçları (ayrı rastgele akış, diğer yerleşimi bozmaz)
  const rnd2 = mulberry((seed ^ 0x5bd1e995) >>> 0);
  let birches = 0;
  for (let tries = 0; tries < 90 && birches < 12; tries++) {
    const x = 3 + Math.floor(rnd2() * (N - 6)), z = 3 + Math.floor(rnd2() * (N - 6));
    if (Math.abs(x - N / 2) < 3 && Math.abs(z - N / 2) < 3) continue;
    const h = heightAt(x, z);
    if (get(x, h, z) !== 1 || get(x, h + 1, z) !== 0) continue;
    const plan = planTree(x, h + 1, z, true);
    if (!plan) continue;
    for (const b of plan) set(b.x, b.y, b.z, b.t);
    birches++;
  }
}

// ---- Dokular (atlas) ----
const TILE_NAMES = ['grassTop', 'grassSide', 'dirt', 'stone', 'woodSide', 'woodTop', 'leaves', 'sand', 'brick', 'snow', 'glass', 'gold', 'bedrock', 'sapling', 'birchSide', 'birchTop', 'birchLeaf'];
const TI = {};
TILE_NAMES.forEach((n, i) => TI[n] = i);
const T = TILE_NAMES.length;
// [üst, yan, alt]
const FACE_TILES = {
  1: [TI.grassTop, TI.grassSide, TI.dirt],
  2: [TI.dirt, TI.dirt, TI.dirt],
  3: [TI.stone, TI.stone, TI.stone],
  4: [TI.woodTop, TI.woodSide, TI.woodTop],
  5: [TI.leaves, TI.leaves, TI.leaves],
  6: [TI.sand, TI.sand, TI.sand],
  7: [TI.brick, TI.brick, TI.brick],
  8: [TI.snow, TI.snow, TI.snow],
  9: [TI.glass, TI.glass, TI.glass],
  10: [TI.gold, TI.gold, TI.gold],
  11: [TI.bedrock, TI.bedrock, TI.bedrock],
  12: [TI.sapling, TI.sapling, TI.sapling],
  13: [TI.birchTop, TI.birchSide, TI.birchTop],
  14: [TI.birchLeaf, TI.birchLeaf, TI.birchLeaf]
};
export const atlas = { tex: null, T };
export const sideTile = t => FACE_TILES[t][1];

function hash(x, y, s) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

const BASE = {
  grassTop: [95, 174, 69], grassSide: [139, 90, 43], dirt: [139, 90, 43], stone: [150, 148, 144],
  woodSide: [107, 68, 35], woodTop: [150, 110, 62], leaves: [47, 125, 50], sand: [230, 214, 144],
  brick: [181, 73, 58], snow: [245, 245, 245], glass: [159, 216, 232], gold: [255, 215, 0],
  bedrock: [62, 62, 66], sapling: [60, 170, 70], birchSide: [226, 223, 212], birchTop: [196, 178, 128],
  birchLeaf: [132, 184, 84]
};

// Kaldırım taşı için hücre noktaları (kenarlar birleşsin diye sarmalı)
const SEEDS = Array.from({ length: 8 }, (_, i) => [hash(i, 1, 50) * 16, hash(i, 2, 50) * 16]);
function cobble(x, y) {
  let d1 = 99, d2 = 99, id = 0;
  for (let i = 0; i < SEEDS.length; i++) {
    let dx = Math.abs(x + 0.5 - SEEDS[i][0]); dx = Math.min(dx, 16 - dx);
    let dy = Math.abs(y + 0.5 - SEEDS[i][1]); dy = Math.min(dy, 16 - dy);
    const d = Math.hypot(dx, dy);
    if (d < d1) { d2 = d1; d1 = d; id = i; } else if (d < d2) d2 = d;
  }
  return { id, edge: d2 - d1 };
}

function buildAtlas() {
  const cv = document.createElement('canvas');
  cv.width = 16 * T; cv.height = 16;
  const ctx = cv.getContext('2d');
  TILE_NAMES.forEach((name, i) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      let [r, g, b] = BASE[name];
      let k = 0.86 + hash(x, y, i) * 0.28;
      if (name === 'sapling') {
        const stalk = (x === 7 || x === 8) && y >= 8;
        const dxx = (x - 7.5) / 4.5, dyy = (y - 5) / 3.6;
        const crown = dxx * dxx + dyy * dyy < 1 && hash(x, y, 31) < 0.9;
        if (!stalk && !crown) continue; // şeffaf kalır
        if (stalk) { r = 96; g = 140; b = 60; }
      } else {
        switch (name) {
          case 'grassSide':
            if (y < 3 || (y === 3 && hash(x, y, 99) < 0.5)) [r, g, b] = [95, 174, 69];
            break;
          case 'stone': {
            const c = cobble(x, y);
            k = 0.78 + hash(c.id, 3, 51) * 0.42 + (hash(x, y, 8) - 0.5) * 0.08;
            if (c.edge < 0.9) k *= 0.55;
            break;
          }
          case 'bedrock': {
            const h = hash(x, y, 21);
            k = 0.45 + hash(x, y, 22) * 0.9;
            if (h < 0.18) { r = 22; g = 22; b = 24; k = 1; }
            else if (h > 0.93) { r = 120; g = 120; b = 126; k = 1; }
            break;
          }
          case 'woodSide': if (x % 4 === 0) k *= 0.78; break;
          case 'woodTop': {
            const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
            if (Math.floor(d) % 2 === 0) k *= 0.82;
            break;
          }
          case 'birchSide':
            k = 0.94 + hash(x, y, 41) * 0.1;
            if (y % 4 === 1 && hash(x >> 1, y, 42) < 0.55) { r = 45; g = 42; b = 40; k = 1; }
            break;
          case 'birchTop': {
            const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
            if (Math.floor(d) % 2 === 0) k *= 0.85;
            break;
          }
          case 'birchLeaf': if (hash(x, y, 43) < 0.25) k *= 0.7; break;
          case 'leaves': if (hash(x, y, 5) < 0.25) k *= 0.65; break;
          case 'brick': {
            const row = Math.floor(y / 4);
            if (y % 4 === 3 || x % 8 === (row % 2 ? 3 : 7)) { [r, g, b] = [200, 195, 185]; k = 0.95 + hash(x, y, 3) * 0.1; }
            break;
          }
          case 'glass':
            if (x === 0 || y === 0 || x === 15 || y === 15) [r, g, b] = [230, 245, 250];
            else if (hash(x, y, 4) < 0.06) k = 1.25;
            break;
          case 'gold': if (hash(x, y, 6) < 0.15) k = 1.2; break;
        }
      }
      ctx.fillStyle = `rgb(${Math.min(255, r * k) | 0},${Math.min(255, g * k) | 0},${Math.min(255, b * k) | 0})`;
      ctx.fillRect(i * 16 + x, y, 1, 1);
    }
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}

// ---- Chunk çizimi ----
let group, material, hl;
const chunkMeshes = new Map();
const AOV = [0.5, 0.68, 0.84, 1.0];
const ORD_P = [[0, 0], [1, 0], [1, 1], [0, 1]];
const ORD_N = [[0, 0], [0, 1], [1, 1], [1, 0]];
const occ = (x, y, z) => opaque(get(x, y, z)) ? 1 : 0;

export function initRender(scene) {
  atlas.tex = buildAtlas();
  material = new THREE.MeshBasicMaterial({ map: atlas.tex, vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide });
  group = new THREE.Group();
  scene.add(group);
  hl = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01)),
    new THREE.LineBasicMaterial({ color: 0x000000 })
  );
  hl.visible = false;
  scene.add(hl);
  rebuild();
}

function buildChunk(cx, cz) {
  const pos = [], uv = [], col = [], ind = [];
  let vc = 0;
  const x0 = cx * CS, z0 = cz * CS;
  for (let y = 0; y < H; y++) for (let lz = 0; lz < CS; lz++) for (let lx = 0; lx < CS; lx++) {
    const x = x0 + lx, z = z0 + lz, t = get(x, y, z);
    if (!t || !FACE_TILES[t]) continue;
    const ft = FACE_TILES[t];

    if (t === SAPLING) {
      const tile = ft[1];
      const quads = [[x, z, x + 1, z + 1], [x + 1, z, x, z + 1]];
      for (const q of quads) {
        pos.push(q[0], y, q[1], q[2], y, q[3], q[2], y + 1, q[3], q[0], y + 1, q[1]);
        for (let k = 0; k < 4; k++) col.push(0.95, 0.95, 0.95);
        uv.push((tile + 0.02) / T, 0.02, (tile + 0.98) / T, 0.02, (tile + 0.98) / T, 0.98, (tile + 0.02) / T, 0.98);
        ind.push(vc, vc + 1, vc + 2, vc, vc + 2, vc + 3);
        vc += 4;
      }
      continue;
    }

    for (let a = 0; a < 3; a++) for (let s = -1; s <= 1; s += 2) {
      const b = [x, y, z]; b[a] += s;
      if (opaque(get(b[0], b[1], b[2]))) continue;
      const tile = a === 1 ? (s > 0 ? ft[0] : ft[2]) : ft[1];
      const shade = a === 1 ? (s > 0 ? 1 : 0.55) : a === 0 ? 0.82 : 0.68;
      const u = (a + 1) % 3, v = (a + 2) % 3;
      const order = s > 0 ? ORD_P : ORD_N;
      const aoS = [];
      for (let k = 0; k < 4; k++) {
        const cu = order[k][0], cv = order[k][1];
        const p = [x, y, z];
        if (s > 0) p[a] += 1;
        p[u] += cu; p[v] += cv;
        const du = cu ? 1 : -1, dv = cv ? 1 : -1;
        const q1 = [b[0], b[1], b[2]]; q1[u] += du;
        const q2 = [b[0], b[1], b[2]]; q2[v] += dv;
        const q3 = [b[0], b[1], b[2]]; q3[u] += du; q3[v] += dv;
        const s1 = occ(q1[0], q1[1], q1[2]), s2 = occ(q2[0], q2[1], q2[2]), s3 = occ(q3[0], q3[1], q3[2]);
        const ao = (s1 && s2) ? 0 : 3 - (s1 + s2 + s3);
        aoS.push(ao);
        const br = AOV[ao] * shade;
        pos.push(p[0], p[1], p[2]);
        col.push(br, br, br);
        const tu = a === 0 ? cv : cu, tv = a === 0 ? cu : cv;
        uv.push((tile + 0.02 + tu * 0.96) / T, 0.02 + tv * 0.96);
      }
      if (aoS[0] + aoS[2] >= aoS[1] + aoS[3]) ind.push(vc, vc + 1, vc + 2, vc, vc + 2, vc + 3);
      else ind.push(vc + 1, vc + 2, vc + 3, vc + 1, vc + 3, vc);
      vc += 4;
    }
  }
  const key = cz * NC + cx;
  let mesh = chunkMeshes.get(key);
  if (!vc) {
    if (mesh) { group.remove(mesh); mesh.geometry.dispose(); chunkMeshes.delete(key); }
    return;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(ind);
  g.computeBoundingSphere();
  if (mesh) { mesh.geometry.dispose(); mesh.geometry = g; }
  else { mesh = new THREE.Mesh(g, material); group.add(mesh); chunkMeshes.set(key, mesh); }
}

// Değişen chunk'ları yeniden çizer (boşsa hiçbir şey yapmaz)
export function rebuild() {
  if (!group || !dirty.size) return;
  for (const k of dirty) buildChunk(k % NC, Math.floor(k / NC));
  dirty.clear();
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
      prev = (lx === -1 && ly === -1 && lz === -1) ? null : [lx, ly, lz];
      break;
    }
    lx = x; ly = y; lz = z;
  }
  hl.visible = !!target;
  if (target) hl.position.set(target[0] + 0.5, target[1] + 0.5, target[2] + 0.5);
         }
