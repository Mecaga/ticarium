import { hash, atlas, FACE_TILES, T, initAtlas, tileOf } from './textures.js';
import {
  BEDROCK, SAPLING, BIRCH_LOG, BIRCH_LEAF, WATER, GLASS, WATER_MAX, LAVA, LAVA_MAX, OBSIDIAN, NETHERITE,
  COAL_ORE, IRON_ORE, GOLD_ORE, DIAMOND_ORE, FLOWER_MIN, TALL, isPlant
} from './defs.js';
export * from './defs.js';
export { atlas, sideTile } from './textures.js';

export const BUILD = 23;
export const CW = 25, H = 32, RD = 3, SEA = 7, SNOW_H = 19;

const chunks = new Map();
const mods = new Map();
const urgent = new Set();
const ck = (cx, cz) => (cx + 4096) * 8192 + (cz + 4096);
let _seed = 1, _kind = 'normal', _sp = null, lcK = -1, lc = null;
let group = null, material, waterMat, lavaMat, glassMat, hl;

function chunkAt(x, z) {
  const cx = Math.floor(x / CW), cz = Math.floor(z / CW), k = ck(cx, cz);
  if (k !== lcK) { lcK = k; lc = chunks.get(k) || null; }
  return lc;
}
export const worldKind = () => _kind;
export const inBounds = (x, y, z) => y >= 0 && y < H;
export const isLoaded = (x, z) => !!chunkAt(x, z);
export const get = (x, y, z) => {
  if (y < 0 || y >= H) return 0;
  const c = chunkAt(x, z);
  return c ? c.b[(y * CW + (z - c.cz * CW)) * CW + (x - c.cx * CW)] : 0;
};
export const waterLvl = (x, y, z) => {
  if (y < 0 || y >= H) return 0;
  const c = chunkAt(x, z);
  return c ? c.l[(y * CW + (z - c.cz * CW)) * CW + (x - c.cx * CW)] : 0;
};
export const getRaw = (x, y, z) => {
  const t = get(x, y, z);
  return (t === WATER || t === LAVA) ? t + waterLvl(x, y, z) : t;
};
export const isWater = (x, y, z) => get(x, y, z) === WATER;
export const isLava = (x, y, z) => get(x, y, z) === LAVA;
export const BOXES = {};   // ince bloklar: id -> [x0,y0,z0,x1,y1,z1] (yatak, kapı)
export const tgtOpts = { sneak: false };
for (let i = 0; i < 3; i++) { BOXES[180 + i] = [0, 0, 0, 1, 0.25 * (i + 1), 1]; FACE_TILES[180 + i] = FACE_TILES[8]; }   // kar katmanları 1/4, 2/4, 3/4

export const solid = (x, y, z) => { const t = get(x, y, z); return t !== 0 && !BOXES[t] && !isPlant(t) && t !== WATER && t !== LAVA; };
// Kesin nokta çarpışması (ince bloklar için)
export function pointHit(px, py, pz) {
  const x = Math.floor(px), y = Math.floor(py), z = Math.floor(pz), b = BOXES[get(x, y, z)];
  if (!b) return false;
  const fx = px - x, fy = py - y, fz = pz - z;
  return fx >= b[0] && fx <= b[3] && fy >= b[1] && fy <= b[4] && fz >= b[2] && fz <= b[5];
}
const opaque = t => t !== 0 && !BOXES[t] && !isPlant(t) && t !== WATER && t !== LAVA && t !== GLASS;

export const wh = { fn: null };
export const wlHook = { fn: null };
export const ph = { fn: null };

function touch(c) { if (c.dirty === 0) { c.dirty = 2; urgent.add(ck(c.cx, c.cz)); } }
function markDirty(c, lx, lz) {
  touch(c);
  if (lx === 0) { const n = chunks.get(ck(c.cx - 1, c.cz)); if (n) touch(n); }
  if (lx === CW - 1) { const n = chunks.get(ck(c.cx + 1, c.cz)); if (n) touch(n); }
  if (lz === 0) { const n = chunks.get(ck(c.cx, c.cz - 1)); if (n) touch(n); }
  if (lz === CW - 1) { const n = chunks.get(ck(c.cx, c.cz + 1)); if (n) touch(n); }
}

export const set = (x, y, z, t) => {
  if (y < 0 || y >= H) return;
  const cx = Math.floor(x / CW), cz = Math.floor(z / CW), k = ck(cx, cz);
  const lx = x - cx * CW, lz = z - cz * CW, i = (y * CW + lz) * CW + lx;
  let m = mods.get(k);
  if (!m) { m = new Map(); mods.set(k, m); }
  m.set(i, t);
  const c = chunks.get(k);
  if (!c) return;
  let tt = t, lv = 0;
  if (tt > WATER && tt <= WATER_MAX) { lv = tt - WATER; tt = WATER; }
  else if (tt >= LAVA && tt <= LAVA_MAX) { lv = tt - LAVA; tt = LAVA; }
  if (c.b[i] === tt && c.l[i] === lv) return;
  const old = c.b[i];
  c.b[i] = tt; c.l[i] = lv;
  markDirty(c, lx, lz);
  if (old && isPlant(old) && (tt === WATER || tt === LAVA) && ph.fn) ph.fn(x, y, z, old);
  if (wh.fn) wh.fn(x, y, z);
};

export function eachBlock(ids, fn) {
  const m = new Uint8Array(256);
  for (const i of ids) m[i] = 1;
  for (const c of chunks.values()) {
    const b = c.b;
    for (let i = 0; i < b.length; i++) {
      if (m[b[i]]) fn(c.cx * CW + (i % CW), Math.floor(i / (CW * CW)), c.cz * CW + (Math.floor(i / CW) % CW), b[i]);
    }
  }
}

function vn(x, z, s) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi, s), b = hash(xi + 1, zi, s), c = hash(xi, zi + 1, s), d = hash(xi + 1, zi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function heightAt(x, z) {
  const f = 0.6 * vn(x / 38, z / 38, _seed) + 0.3 * vn(x / 17, z / 17, _seed + 1) + 0.1 * vn(x / 7, z / 7, _seed + 2);
  const g = Math.max(0, Math.min(1, 0.5 + (f - 0.5) * 1.7));
  return Math.max(3, Math.min(H - 9, Math.floor(3 + g * 21)));
}

function oreAt(x, y, z) {
  const cx = x >> 1, cy = y >> 1, cz = z >> 1;
  if (y <= 6 && hash(cx * 7 + cy, cz * 5 + 3, _seed + 31) < 0.0014 && hash(x * 3 + y, z * 11, _seed + 35) < 0.7) return DIAMOND_ORE;
  if (y <= 11 && hash(cx * 5 + cy * 3, cz * 7 + 1, _seed + 32) < 0.004 && hash(x * 5 + y * 2, z * 7, _seed + 36) < 0.7) return GOLD_ORE;
  if (y <= 15 && hash(cx * 3 + cy * 5, cz * 11 + 2, _seed + 33) < 0.008 && hash(x * 7 + y, z * 5, _seed + 37) < 0.7) return IRON_ORE;
  if (hash(cx * 11 + cy, cz * 3 + 4, _seed + 34) < 0.014 && hash(x * 2 + y * 3, z * 13, _seed + 38) < 0.7) return COAL_ORE;
  return 0;
}

export function treeCells(x, y, z, birch) {
  const th = birch ? 5 : 4, log = birch ? BIRCH_LOG : 4, leaf = birch ? BIRCH_LEAF : 5;
  const trunk = [], leaves = [];
  for (let i = 0; i < th; i++) trunk.push([x, y + i, z, log]);
  const top = y + th - 1;
  for (let L = top - 1; L <= top + 1; L++) for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
    const m = Math.abs(dx) + Math.abs(dz);
    if (m > 3 || (L === top + 1 && m > 1)) continue;
    if (dx === 0 && dz === 0 && L <= top) continue;
    leaves.push([x + dx, L, z + dz, leaf]);
  }
  return { trunk, leaves };
}
function treeAt(x, z) {
  if (hash(x, z, _seed + 7) > 0.012) return 0;
  const h = heightAt(x, z);
  if (h <= SEA || h >= SNOW_H) return 0;
  return hash(x, z, _seed + 8) < 0.3 ? 2 : 1;
}
function flowerAt(x, z) {
  const px = Math.floor(x / 8), pz = Math.floor(z / 8);
  if (hash(px, pz, _seed + 9) > 0.22 || hash(x, z, _seed + 10) > 0.45) return 0;
  const k = Math.floor(hash(px, pz, _seed + 11) * 7);
  return k === 6 ? 47 : FLOWER_MIN + k; // 47: Beyaz lale (defs.js içindeki karşılığına göre)
}
function grassAt(x, z) {
  return hash(x >> 1, z >> 1, _seed + 21) < 0.3 && hash(x, z, _seed + 22) < 0.65;
}
function ruinAt(rx, rz) {
  if (hash(rx, rz, _seed + 12) > 0.22) return null;
  const x = rx * 48 + 6 + Math.floor(hash(rx, rz, _seed + 13) * 36), z = rz * 48 + 6 + Math.floor(hash(rx, rz, _seed + 14) * 36);
  const hc = heightAt(x, z);
  return (hc < SEA + 2 || hc >= SNOW_H) ? null : { x, z, hc };
}
function ruinCells(r, put) {
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) put(r.x + dx, r.hc, r.z + dz, 7);
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) !== 2 || (dx === 0 && dz === 2)) continue;
    const x = r.x + dx, z = r.z + dz, hs = heightAt(x, z);
    const top = r.hc + 2 + (hash(x, z, _seed + 15) < 0.5 ? 1 : 0);
    for (let y = hs + 1; y <= top; y++) {
      if (hash(x + y * 3, z, _seed + 16) < 0.12) continue;
      const win = y === r.hc + 2 && (dx === 0 || dz === 0) && hash(x, z + y, _seed + 19) < 0.6;
      put(x, y, z, win ? 9 : 7);
    }
  }
}
const SKY_CUBES = [[-3, -3], [0, -3], [-3, 0]];
export function skyTops() {
  const a = [];
  for (const [ox, oz] of SKY_CUBES) for (let dx = 0; dx < 3; dx++) for (let dz = 0; dz < 3; dz++) a.push([ox + dx, 12, oz + dz]);
  return a;
}

export function surfaceY(x, z) {
  for (let y = H - 1; y >= 0; y--) {
    const t = get(x, y, z);
    if (t && !isPlant(t) && t !== WATER && t !== LAVA) return y;
  }
  return -1;
}

export function spawnPos() {
  if (_sp) return _sp;
  if (_kind === 'flat') return (_sp = { x: 0.5, y: 3.05, z: 0.5 });
  if (_kind === 'sky') return (_sp = { x: 1.5, y: 13.05, z: -1.5 });
  for (let r = 0; r < 200 && !_sp; r++) {
    for (let dx = -r; dx <= r && !_sp; dx++) for (let dz = -r; dz <= r; dz++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const h = heightAt(dx, dz);
      if (h >= SEA + 2 && h < SNOW_H) { _sp = { x: dx + 0.5, y: h + 2, z: dz + 0.5 }; break; }
    }
  }
  return _sp || { x: 0.5, y: 20, z: 0.5 };
}

export function planTree(x, y, z, birch) {
  const { trunk, leaves } = treeCells(x, y, z, birch);
  const out = [];
  for (const [tx, ty, tz, t] of trunk) {
    if (ty >= H) return null;
    const c = get(tx, ty, tz);
    if (c !== 0 && !isPlant(c) && c !== 5 && c !== BIRCH_LEAF) return null;
    out.push({ x: tx, y: ty, z: tz, t });
  }
  for (const [lx, ly, lz, t] of leaves) if (ly < H && get(lx, ly, lz) === 0) out.push({ x: lx, y: ly, z: lz, t });
  return out;
}

export function losBlocked(ex, ey, ez, dx, dy, dz, t) {
  for (let s = 0.3; s < t; s += 0.25) {
    if (solid(Math.floor(ex + dx * s), Math.floor(ey + dy * s), Math.floor(ez + dz * s))) return true;
  }
  return false;
}

function newChunk(cx, cz) {
  return { cx, cz, b: new Uint8Array(CW * H * CW), l: new Uint8Array(CW * H * CW), dirty: 1, mt: null, mw: null, ml: null, mg: null };
}

function genChunk(c) {
  const b = c.b, x0 = c.cx * CW, z0 = c.cz * CW;
  const put = (x, y, z, t) => {
    const lx = x - x0, lz = z - z0;
    if (y < 0 || y >= H || lx < 0 || lz < 0 || lx >= CW || lz >= CW) return;
    b[(y * CW + lz) * CW + lx] = t;
  };
  const at = (x, y, z) => {
    const lx = x - x0, lz = z - z0;
    if (y < 0 || y >= H || lx < 0 || lz < 0 || lx >= CW || lz >= CW) return -1;
    return b[(y * CW + lz) * CW + lx];
  };
  const trees = list => {
    for (const tr of list) for (const l of tr.leaves) if (at(l[0], l[1], l[2]) === 0) put(l[0], l[1], l[2], l[3]);
    for (const tr of list) for (const t of tr.trunk) put(t[0], t[1], t[2], t[3]);
  };

  if (_kind === 'sky') {
    for (const [ox, oz] of SKY_CUBES) for (let dx = 0; dx < 3; dx++) for (let dz = 0; dz < 3; dz++) for (let dy = 0; dy < 3; dy++) {
      put(ox + dx, 10 + dy, oz + dz, dy === 2 ? 1 : 2);
    }
    trees([treeCells(-2, 13, -2, false)]);
  } else if (_kind === 'flat') {
    for (let lz = 0; lz < CW; lz++) for (let lx = 0; lx < CW; lx++) {
      const x = x0 + lx, z = z0 + lz;
      put(x, 0, z, BEDROCK); put(x, 1, z, 2); put(x, 2, z, 1);
      const f = flowerAt(x, z);
      if (f) put(x, 3, z, f); else if (grassAt(x, z)) put(x, 3, z, TALL);
    }
  } else {
    const hs = new Int16Array(CW * CW);
    for (let lz = 0; lz < CW; lz++) for (let lx = 0; lx < CW; lx++) {
      const x = x0 + lx, z = z0 + lz, h = heightAt(x, z);
      hs[lz * CW + lx] = h;
      for (let y = 0; y <= h; y++) {
        let t;
        if (y === 0) t = BEDROCK;
        else if (y === 1 && hash(x, z, _seed + 17) < 0.5) t = BEDROCK;
        else if (y === h) t = h <= SEA ? 6 : h >= SNOW_H ? 8 : 1;
        else if (y >= h - 2) t = h <= SEA ? 6 : 2;
        else {
          t = 3;
          if (y >= 2 && y <= h - 3) {
            const o = oreAt(x, y, z);
            if (o) t = o;
            else if (y <= 3 && hash(x * 5 + y, z * 3, _seed + 6) < 0.004) t = OBSIDIAN;
            else if (y === 3 && h >= 9 && hash(x >> 1, z >> 1, _seed + 5) < 0.012) t = LAVA;
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
      if (f) b[ix] = f;
      else if (grassAt(x0 + lx, z0 + lz)) b[ix] = TALL;
    }
    for (let lz = 0; lz < CW; lz++) for (let lx = 0; lx < CW; lx++) {   // dağ tepesi: basamak basamak kar
      const h = hs[lz * CW + lx], d = h - SNOW_H;
      if (d < 0 || d > 2 || h + 1 >= H) continue;
      const ix = ((h + 1) * CW + lz) * CW + lx;
      if (b[ix] === 0 && b[(h * CW + lz) * CW + lx] === 8) b[ix] = 180 + d;
    }
  }

  const flows = [];
  const m = mods.get(ck(c.cx, c.cz));
  if (m) {
    m.forEach((raw, i) => {
      let tt = raw, lv = 0;
      if (tt > WATER && tt <= WATER_MAX) { lv = tt - WATER; tt = WATER; }
      else if (tt >= LAVA && tt <= LAVA_MAX) { lv = tt - LAVA; tt = LAVA; }
      b[i] = tt; c.l[i] = lv;
      if (lv > 0) flows.push(i);
    });
  }
  return flows;
}

function disposeChunk(c) {
  for (const f of ['mt', 'mw', 'ml', 'mg']) {
    if (c[f]) { if (group) group.remove(c[f]); c[f].geometry.dispose(); c[f] = null; }
  }
}

export function generate(seed = 1, kind = 'normal') {
  for (const c of chunks.values()) disposeChunk(c);
  chunks.clear(); mods.clear(); urgent.clear();
  lcK = -1; lc = null;
  _seed = (seed | 0) || 1;
  _kind = (kind === 'flat' || kind === 'sky') ? kind : 'normal';
  _sp = null;
}

export function eachFlow(fn) {
  for (const c of chunks.values()) {
    for (let i = 0; i < c.b.length; i++) {
      if ((c.b[i] === WATER || c.b[i] === LAVA) && c.l[i] > 0) {
        fn(c.cx * CW + (i % CW), Math.floor(i / (CW * CW)), c.cz * CW + (Math.floor(i / CW) % CW));
      }
    }
  }
}

export function updateChunks(px, pz, budgetMs = 6) {
  if (!group) return 0;
  const cx0 = Math.floor(px / CW), cz0 = Math.floor(pz / CW), t0 = performance.now();
  const want = [];
  for (let dx = -RD; dx <= RD; dx++) for (let dz = -RD; dz <= RD; dz++) want.push([cx0 + dx, cz0 + dz, dx * dx + dz * dz]);
  want.sort((a, b) => a[2] - b[2]);
  let did = 0;
  for (const [cx, cz] of want) {
    if (did >= 1 && performance.now() - t0 > budgetMs) break;
    const k = ck(cx, cz);
    let c = chunks.get(k);
    if (!c) {
      c = newChunk(cx, cz);
      const flows = genChunk(c);
      chunks.set(k, c); lcK = -1;
      if (wh.fn) for (const i of flows) wh.fn(cx * CW + (i % CW), Math.floor(i / (CW * CW)), cz * CW + (Math.floor(i / CW) % CW));
      did++;
    } else if (c.dirty === 1) { buildChunk(c); did++; }
  }
  for (const [k, c] of chunks) {
    if (Math.abs(c.cx - cx0) > RD + 1 || Math.abs(c.cz - cz0) > RD + 1) {
      disposeChunk(c); chunks.delete(k); urgent.delete(k); lcK = -1;
    }
  }
  return did;
}

export function chunksReady(px, pz) {
  const cx0 = Math.floor(px / CW), cz0 = Math.floor(pz / CW);
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
    const c = chunks.get(ck(cx0 + dx, cz0 + dz));
    if (!c || c.dirty === 1) return false;
  }
  return true;
}

const AOV = [0.5, 0.68, 0.84, 1.0];
const ORD_P = [[0, 0], [1, 0], [1, 1], [0, 1]];
const ORD_N = [[0, 0], [0, 1], [1, 1], [1, 0]];
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const occ = (x, y, z) => opaque(get(x, y, z)) ? 1 : 0;

export function setWorldLight(v) {
  if (material) material.color.setScalar(v);
  if (waterMat) waterMat.color.setScalar(v);
  if (glassMat) glassMat.color.setRGB(0.81 * v, 0.92 * v, 0.95 * v);
  if (wlHook.fn) wlHook.fn(v);
}

export function initRender(scene) {
  initAtlas();
  material = new THREE.MeshBasicMaterial({ map: atlas.tex, vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide });
  waterMat = new THREE.MeshBasicMaterial({
    map: atlas.tex, vertexColors: true, transparent: true, opacity: 0.62, depthWrite: false, side: THREE.DoubleSide
  });
  lavaMat = new THREE.MeshBasicMaterial({ map: atlas.tex, vertexColors: true, side: THREE.DoubleSide });
  glassMat = new THREE.MeshBasicMaterial({
    color: 0xcfeaf3, transparent: true, opacity: 0.05, depthWrite: false, side: THREE.DoubleSide
  });
  group = new THREE.Group();
  scene.add(group);
  hl = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01)),
    new THREE.LineBasicMaterial({ color: 0x000000 })
  );
  hl.visible = false;
  scene.add(hl);
}

function putMesh(c, f, pos, uv, col, ind, mat, order) {
  if (!ind.length) {
    if (c[f]) { group.remove(c[f]); c[f].geometry.dispose(); c[f] = null; }
    return;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(ind);
  g.computeBoundingSphere();
  if (c[f]) { c[f].geometry.dispose(); c[f].geometry = g; }
  else {
    const mesh = new THREE.Mesh(g, mat);
    if (order) mesh.renderOrder = order;
    group.add(mesh);
    c[f] = mesh;
  }
}

function fluidH(x, y, z, t) {
  if (get(x, y + 1, z) === t) return 1;
  const l = waterLvl(x, y, z);
  if (l === 0) return 0.88;
  return t === WATER ? Math.max(0.16, 0.86 - l * 0.13) : Math.max(0.25, 0.84 - l * 0.2);
}

const sink = () => ({ pos: [], uv: [], col: [], ind: [], n: 0 });
function pushQ(s, tile, p, sh) {
  for (let k = 0; k < 4; k++) {
    s.pos.push(p[k][0], p[k][1], p[k][2]);
    s.col.push(sh, sh, sh);
    s.uv.push((tile + 0.02 + (k === 1 || k === 2 ? 0.96 : 0)) / T, 0.02 + (k >= 2 ? 0.96 : 0));
  }
  s.ind.push(s.n, s.n + 1, s.n + 2, s.n, s.n + 2, s.n + 3);
  s.n += 4;
}

function boxMesh(mq, ft, b, x, y, z) {
  const X0 = x + b[0], Y0 = y + b[1], Z0 = z + b[2], X1 = x + b[3], Y1 = y + b[4], Z1 = z + b[5];
  mq(ft[0], [[X0, Y1, Z0], [X1, Y1, Z0], [X1, Y1, Z1], [X0, Y1, Z1]], 1);
  mq(ft[2], [[X0, Y0, Z0], [X1, Y0, Z0], [X1, Y0, Z1], [X0, Y0, Z1]], 0.55);
  mq(ft[1], [[X0, Y0, Z0], [X1, Y0, Z0], [X1, Y1, Z0], [X0, Y1, Z0]], 0.68);
  mq(ft[1], [[X0, Y0, Z1], [X1, Y0, Z1], [X1, Y1, Z1], [X0, Y1, Z1]], 0.68);
  mq(ft[1], [[X0, Y0, Z0], [X0, Y0, Z1], [X0, Y1, Z1], [X0, Y1, Z0]], 0.82);
  mq(ft[1], [[X1, Y0, Z0], [X1, Y0, Z1], [X1, Y1, Z1], [X1, Y1, Z0]], 0.82);
}

function buildChunk(c) {
  const pos = [], uv = [], col = [], ind = [];
  const wS = sink(), lS = sink(), gS = sink();
  let vc = 0;
  const WT = FACE_TILES[WATER][0], LT = FACE_TILES[LAVA][0], GE = tileOf('glassEdge');
  const mq = (tile, p, sh) => {
    for (let k = 0; k < 4; k++) {
      pos.push(p[k][0], p[k][1], p[k][2]);
      col.push(sh, sh, sh);
      uv.push((tile + 0.02 + (k === 1 || k === 2 ? 0.96 : 0)) / T, 0.02 + (k >= 2 ? 0.96 : 0));
    }
    ind.push(vc, vc + 1, vc + 2, vc, vc + 2, vc + 3);
    vc += 4;
  };
  const GW = 0.07, EPS = 0.004;
  const glass = (x, y, z) => {
    for (let a = 0; a < 3; a++) for (let s = -1; s <= 1; s += 2) {
      const n = [x, y, z]; n[a] += s;
      const nt = get(n[0], n[1], n[2]);
      if (nt === GLASS || opaque(nt)) continue;
      const u = (a + 1) % 3, v = (a + 2) % 3;
      const sh = a === 1 ? (s > 0 ? 1 : 0.55) : a === 0 ? 0.82 : 0.68;
      const pts = (u0, u1, v0, v1, off) => {
        const out = [];
        for (const [fu, fv] of [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]) {
          const p = [x, y, z];
          p[a] += (s > 0 ? 1 : 0) + s * off;
          p[u] += fu; p[v] += fv;
          out.push(p);
        }
        return out;
      };
      pushQ(gS, GE, pts(0, 1, 0, 1, 0), 1);
      for (const e of [u, v]) for (let d = -1; d <= 1; d += 2) {
        const A = [x, y, z]; A[e] += d;
        const B = [A[0], A[1], A[2]]; B[a] += s;
        const at = get(A[0], A[1], A[2]), bt = get(B[0], B[1], B[2]);
        if (at === GLASS && !(bt === GLASS || opaque(bt))) continue;
        const lo = d < 0 ? 0 : 1 - GW, hi = d < 0 ? GW : 1;
        if (e === u) mq(GE, pts(lo, hi, 0, 1, EPS), sh);
        else mq(GE, pts(0, 1, lo, hi, EPS), sh);
      }
    }
  };
  const x0 = c.cx * CW, z0 = c.cz * CW;
  for (let y = 0; y < H; y++) for (let lz = 0; lz < CW; lz++) for (let lx = 0; lx < CW; lx++) {
    const t = c.b[(y * CW + lz) * CW + lx];
    if (!t) continue;
    const x = x0 + lx, z = z0 + lz;

    if (t === WATER || t === LAVA) {
      const S = t === WATER ? wS : lS, tile = t === WATER ? WT : LT;
      const h = fluidH(x, y, z, t);
      const up = get(x, y + 1, z);
      if (up !== t && !opaque(up)) pushQ(S, tile, [[x, y + h, z], [x + 1, y + h, z], [x + 1, y + h, z + 1], [x, y + h, z + 1]], 1);
      for (const [dx, dz] of D4) {
        const nx = x + dx, nz = z + dz, nt = get(nx, y, nz);
        if (opaque(nt)) continue;
        let y0 = y;
        if (nt === t) {
          const hn = fluidH(nx, y, nz, t);
          if (hn >= h - 0.001) continue;
          y0 = y + hn;
        }
        const y1 = y + h;
        if (dx) { const xx = dx > 0 ? x + 1 : x; pushQ(S, tile, [[xx, y0, z], [xx, y0, z + 1], [xx, y1, z + 1], [xx, y1, z]], 0.86); }
        else { const zz = dz > 0 ? z + 1 : z; pushQ(S, tile, [[x, y0, zz], [x + 1, y0, zz], [x + 1, y1, zz], [x, y1, zz]], 0.74); }
      }
      continue;
    }

    if (t === GLASS) { glass(x, y, z); continue; }

    if (BOXES[t] && FACE_TILES[t]) { boxMesh(mq, FACE_TILES[t], BOXES[t], x, y, z); continue; }

    const ft = FACE_TILES[t];
    if (!ft) continue;

    if (isPlant(t)) {
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
  c.dirty = 0;
  putMesh(c, 'mt', pos, uv, col, ind, material, 0);
  putMesh(c, 'ml', lS.pos, lS.uv, lS.col, lS.ind, lavaMat, 1);
  putMesh(c, 'mw', wS.pos, wS.uv, wS.col, wS.ind, waterMat, 2);
  putMesh(c, 'mg', gS.pos, gS.uv, gS.col, gS.ind, glassMat, 3);
}

export function rebuild(max = 2) {
  if (!group || !urgent.size) return;
  let n = 0;
  for (const k of urgent) {
    urgent.delete(k);
    const c = chunks.get(k);
    if (c && c.dirty === 2) { buildChunk(c); if (++n >= max) break; }
  }
}

export let target = null, prev = null, wtarget = null, stgt = null;

export function updateTarget(camera) {
  const d = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
  const o = camera.position;
  let lx = -1e9, ly = -1e9, lz = -1e9;
  target = prev = wtarget = stgt = null;
  for (let s = 0; s < 6; s += 0.04) {
    const px = o.x + d.x * s, py = o.y + d.y * s, pz = o.z + d.z * s;
    const x = Math.floor(px), y = Math.floor(py), z = Math.floor(pz);
    const t = get(x, y, z), same = x === lx && y === ly && z === lz;
    let hit = false;
    if (t === WATER || t === LAVA) {
      if (!same && !wtarget && waterLvl(x, y, z) === 0) wtarget = [x, y, z];
    } else if (t) {
      if (isPlant(t)) {   // bitkiler içinden geçilir, sadece eğilirken hedeflenir
        if (tgtOpts.sneak && !target) { target = [x, y, z]; prev = lx === -1e9 ? null : [lx, ly, lz]; }
      } else if (BOXES[t]) hit = pointHit(px, py, pz);   // kapı, yatak: sadece gerçek şekline çarpar
      else hit = true;
    }
    if (hit) {
      if (!target) { target = [x, y, z]; prev = lx === -1e9 ? null : [lx, ly, lz]; }
      stgt = [x, y, z];
      if (stgt && !prev) prev = null;
      break;
    }
    if (!same) { lx = x; ly = y; lz = z; }
  }
  if (!hl) return;
  hl.visible = !!target;
  if (target) hl.position.set(target[0] + 0.5, target[1] + 0.5, target[2] + 0.5);
}
