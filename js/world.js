import { hash, atlas, FACE_TILES, T, initAtlas } from './textures.js';
export { atlas, sideTile } from './textures.js';

export const N = 48, H = 32, CS = 16;
const NC = N / CS;
export const SEA = 7;
export const BEDROCK = 11, SAPLING = 12, BIRCH_LOG = 13, BIRCH_LEAF = 14, MEAT = 15, WOOL = 16, WATER = 17;
export const WATER_MAX = 24;   // 17 kaynak su, 18..24 akan su (yayılma seviyesi)
export const BUCKET = 30, WBUCKET = 31, CANVAS = 32;

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
  14: { name: 'Huş yaprak', color: 0x8fc060, base: 5 },
  15: { name: 'Et',     color: 0xc4464f, base: 18 },
  16: { name: 'Yün',    color: 0xececec, base: 14 },
  30: { name: 'Kova',   color: 0x9aa0a6, base: 40 },
  31: { name: 'Su kovası', color: 0x4a90e2, base: 45 },
  32: { name: 'Tuval',  color: 0xd9c9a0, base: 35 }
};

// ---- Dünya verisi ----
const world = new Uint8Array(N * H * N);
const wl = new Uint8Array(N * H * N);   // su seviyesi: 0 kaynak, 1..7 akan su
const idx = (x, y, z) => (y * N + z) * N + x;
const inb = (x, y, z) => x >= 0 && x < N && y >= 0 && y < H && z >= 0 && z < N;
export const inBounds = inb;
export const get = (x, y, z) => inb(x, y, z) ? world[idx(x, y, z)] : 0;   // her su 17 döner
export const waterLvl = (x, y, z) => inb(x, y, z) ? wl[idx(x, y, z)] : 0;
// Kayıt/senkron için: su 17..24 (seviyeli), diğerleri normal
export const getRaw = (x, y, z) => { const t = get(x, y, z); return t === WATER ? WATER + wl[idx(x, y, z)] : t; };
export const isWater = (x, y, z) => get(x, y, z) === WATER;
// Fidan ve suyun içinden geçilir, diğer bloklar katıdır
export const solid = (x, y, z) => { const t = get(x, y, z); return t !== 0 && t !== SAPLING && t !== WATER; };
const opaque = t => t !== 0 && t !== SAPLING && t !== WATER;

export const wh = { fn: null };       // water.js: blok değişince haber alır
export const wlHook = { fn: null };   // paints.js: gündüz/gece ışığı
let _gen = false, _kind = 'normal', _sp = null;
export const worldKind = () => _kind;

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

// t: blok türü. 18..24 verilirse akan su (seviye = t - 17)
export const set = (x, y, z, t) => {
  if (!inb(x, y, z)) return;
  const i = idx(x, y, z);
  let lv = 0;
  if (t > WATER && t <= WATER_MAX) { lv = t - WATER; t = WATER; }
  if (world[i] === t && wl[i] === lv) return;
  world[i] = t; wl[i] = lv;
  markDirty(x, z);
  if (!_gen && wh.fn) wh.fn(x, y, z);
};

export function heightAt(x, z) {
  const h = 10 + 4 * Math.sin(x * 0.15) + 4 * Math.cos(z * 0.13) + 3 * Math.sin((x + z) * 0.08);
  return Math.max(3, Math.min(H - 9, Math.floor(h)));
}

// En üstteki katı (su olmayan) blok, yoksa -1
export function surfaceY(x, z) {
  for (let y = H - 1; y >= 0; y--) {
    const t = get(x, y, z);
    if (t && t !== SAPLING && t !== WATER) return y;
  }
  return -1;
}

// Doğma noktası (dünya türüne göre)
export function spawnPos() {
  if (_sp) return _sp;
  const c = N / 2;
  if (_kind === 'flat') return (_sp = { x: c + 0.5, y: 3.05, z: c + 0.5 });
  if (_kind === 'sky') return (_sp = { x: c + 1.5, y: 13.05, z: c - 1.5 });
  for (let r = 0; r < N / 2 && !_sp; r++) {
    for (let dx = -r; dx <= r && !_sp; dx++) for (let dz = -r; dz <= r; dz++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const x = c + dx, z = c + dz;
      if (x < 2 || z < 2 || x >= N - 2 || z >= N - 2) continue;
      if (heightAt(x, z) >= SEA + 2) { _sp = { x: x + 0.5, y: heightAt(x, z) + 2, z: z + 0.5 }; break; }
    }
  }
  return _sp || { x: c + 0.5, y: H - 2, z: c + 0.5 };
}

function mulberry(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// (x,y,z): gövdenin ilk bloğu. Yer yoksa null, varsa yerleştirilecek bloklar.
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

// Işın boyunca katı blok var mı (vuruşta duvar arkasını engeller)
export function losBlocked(ex, ey, ez, dx, dy, dz, t) {
  for (let s = 0.3; s < t; s += 0.25) {
    if (solid(Math.floor(ex + dx * s), Math.floor(ey + dy * s), Math.floor(ez + dz * s))) return true;
  }
  return false;
}

function genFlat() {
  for (let x = 0; x < N; x++) for (let z = 0; z < N; z++) {
    set(x, 0, z, BEDROCK);
    set(x, 1, z, 2);
    set(x, 2, z, 1);
  }
}

function genSky() {
  const cube = (ox, oz) => {
    for (let dx = 0; dx < 3; dx++) for (let dz = 0; dz < 3; dz++) for (let dy = 0; dy < 3; dy++) {
      set(ox + dx, 10 + dy, oz + dz, dy === 2 ? 1 : 2);
    }
  };
  const o = N / 2 - 3;
  cube(o, o);        // köşe küp
  cube(o + 3, o);    // yanındaki küp (doğma noktası)
  cube(o, o + 3);    // altındaki küp (L şekli)
  const plan = planTree(o + 1, 13, o + 1, false);   // köşe küpün üst ortası
  if (plan) for (const b of plan) set(b.x, b.y, b.z, b.t);
}

function genNormal(seed) {
  const rnd = mulberry(seed);
  const sp = spawnPos();

  // Arazi: alt katman kayası, alçakta kum + deniz, tepede kar
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
    for (let y = h + 1; y <= SEA; y++) set(x, y, z, WATER);
  }

  // Rastgele kum yamaları
  for (let i = 0; i < 4; i++) {
    const cx = 4 + Math.floor(rnd() * (N - 8)), cz = 4 + Math.floor(rnd() * (N - 8));
    const r = 3 + Math.floor(rnd() * 3);
    if (Math.abs(cx - sp.x) < r + 3 && Math.abs(cz - sp.z) < r + 3) continue;
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
    if (Math.abs(x - sp.x) < 3 && Math.abs(z - sp.z) < 3) continue;
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

  // Tuğla harabeler (cam pencereli), sadece karada
  let placed = 0;
  for (let tries = 0; tries < 80 && placed < 4; tries++) {
    const cx = 6 + Math.floor(rnd() * (N - 12)), cz = 6 + Math.floor(rnd() * (N - 12));
    if (Math.abs(cx - sp.x) < 7 && Math.abs(cz - sp.z) < 7) continue;
    const hc = heightAt(cx, cz);
    if (hc < SEA + 2) continue;
    placed++;
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

  // Huş ağaçları (ayrı rastgele akış)
  const rnd2 = mulberry((seed ^ 0x5bd1e995) >>> 0);
  let birches = 0;
  for (let tries = 0; tries < 90 && birches < 12; tries++) {
    const x = 3 + Math.floor(rnd2() * (N - 6)), z = 3 + Math.floor(rnd2() * (N - 6));
    if (Math.abs(x - sp.x) < 3 && Math.abs(z - sp.z) < 3) continue;
    const h = heightAt(x, z);
    if (get(x, h, z) !== 1 || get(x, h + 1, z) !== 0) continue;
    const plan = planTree(x, h + 1, z, true);
    if (!plan) continue;
    for (const b of plan) set(b.x, b.y, b.z, b.t);
    birches++;
  }
}

// kind: 'normal' | 'flat' | 'sky'
export function generate(seed = 1, kind = 'normal') {
  _gen = true;
  _kind = (kind === 'flat' || kind === 'sky') ? kind : 'normal';
  _sp = null;
  world.fill(0); wl.fill(0);
  for (let cx = 0; cx < NC; cx++) for (let cz = 0; cz < NC; cz++) addDirty(cx, cz);
  if (_kind === 'flat') genFlat();
  else if (_kind === 'sky') genSky();
  else genNormal(seed);
  _gen = false;
}

// ---- Chunk çizimi ----
let group, material, waterMat, hl;
const chunkMeshes = new Map();
const waterMeshes = new Map();
const AOV = [0.5, 0.68, 0.84, 1.0];
const ORD_P = [[0, 0], [1, 0], [1, 1], [0, 1]];
const ORD_N = [[0, 0], [0, 1], [1, 1], [1, 0]];
const occ = (x, y, z) => opaque(get(x, y, z)) ? 1 : 0;

// Gündüz/gece parlaklığı (sky.js çağırır)
export function setWorldLight(v) {
  if (material) material.color.setScalar(v);
  if (waterMat) waterMat.color.setScalar(v);
  if (wlHook.fn) wlHook.fn(v);
}

export function initRender(scene) {
  initAtlas();
  material = new THREE.MeshBasicMaterial({ map: atlas.tex, vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide });
  waterMat = new THREE.MeshBasicMaterial({
    map: atlas.tex, vertexColors: true, transparent: true, opacity: 0.62, depthWrite: false, side: THREE.DoubleSide
  });
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

function putMesh(map, key, pos, uv, col, ind, mat, order) {
  let mesh = map.get(key);
  if (!ind.length) {
    if (mesh) { group.remove(mesh); mesh.geometry.dispose(); map.delete(key); }
    return;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(ind);
  g.computeBoundingSphere();
  if (mesh) { mesh.geometry.dispose(); mesh.geometry = g; }
  else {
    mesh = new THREE.Mesh(g, mat);
    if (order) mesh.renderOrder = order;
    group.add(mesh);
    map.set(key, mesh);
  }
}

// Su yüksekliği: üstünde su varsa tam, kaynak 0.88, akan su seviyeye göre alçalır
function waterH(x, y, z) {
  if (get(x, y + 1, z) === WATER) return 1;
  const l = wl[idx(x, y, z)];
  return l === 0 ? 0.88 : Math.max(0.16, 0.86 - l * 0.1);
}

const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function buildChunk(cx, cz) {
  const pos = [], uv = [], col = [], ind = [];
  const wpos = [], wuv = [], wcol = [], wind = [];
  let vc = 0, wvc = 0;
  const WT = FACE_TILES[WATER][0];
  const wq = (p, sh) => {
    for (let k = 0; k < 4; k++) {
      wpos.push(p[k][0], p[k][1], p[k][2]);
      wcol.push(sh, sh, sh);
      wuv.push((WT + 0.02 + (k === 1 || k === 2 ? 0.96 : 0)) / T, 0.02 + (k >= 2 ? 0.96 : 0));
    }
    wind.push(wvc, wvc + 1, wvc + 2, wvc, wvc + 2, wvc + 3);
    wvc += 4;
  };
  const x0 = cx * CS, z0 = cz * CS;
  for (let y = 0; y < H; y++) for (let lz = 0; lz < CS; lz++) for (let lx = 0; lx < CS; lx++) {
    const x = x0 + lx, z = z0 + lz, t = get(x, y, z);
    if (!t) continue;

    if (t === WATER) {
      const h = waterH(x, y, z);
      const up = get(x, y + 1, z);
      if (up !== WATER && !opaque(up)) wq([[x, y + h, z], [x + 1, y + h, z], [x + 1, y + h, z + 1], [x, y + h, z + 1]], 1);
      for (const [dx, dz] of D4) {
        const nx = x + dx, nz = z + dz;
        if (!inb(nx, y, nz)) continue;
        const nt = get(nx, y, nz);
        if (opaque(nt)) continue;
        let y0 = y;
        if (nt === WATER) {
          const hn = waterH(nx, y, nz);
          if (hn >= h - 0.001) continue;
          y0 = y + hn;
        }
        const y1 = y + h;
        if (dx) { const xx = dx > 0 ? x + 1 : x; wq([[xx, y0, z], [xx, y0, z + 1], [xx, y1, z + 1], [xx, y1, z]], 0.86); }
        else { const zz = dz > 0 ? z + 1 : z; wq([[x, y0, zz], [x + 1, y0, zz], [x + 1, y1, zz], [x, y1, zz]], 0.74); }
      }
      continue;
    }

    const ft = FACE_TILES[t];
    if (!ft) continue;

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
  putMesh(chunkMeshes, key, pos, uv, col, ind, material, 0);
  putMesh(waterMeshes, key, wpos, wuv, wcol, wind, waterMat, 2);
}

// Değişen chunk'ları yeniden çizer (boşsa hiçbir şey yapmaz)
export function rebuild() {
  if (!group || !dirty.size) return;
  for (const k of dirty) buildChunk(k % NC, Math.floor(k / NC));
  dirty.clear();
}

// ---- Hedef bulma: target/prev su olmayan blok, wtarget bakılan ilk su ----
export let target = null, prev = null, wtarget = null;

export function updateTarget(camera) {
  const d = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
  const o = camera.position;
  let lx = -1, ly = -1, lz = -1;
  target = prev = wtarget = null;
  for (let s = 0; s < 6; s += 0.04) {
    const x = Math.floor(o.x + d.x * s), y = Math.floor(o.y + d.y * s), z = Math.floor(o.z + d.z * s);
    if (x === lx && y === ly && z === lz) continue;
    const t = get(x, y, z);
    if (t === WATER) { if (!wtarget) wtarget = [x, y, z]; }
    else if (t) {
      target = [x, y, z];
      prev = (lx === -1 && ly === -1 && lz === -1) ? null : [lx, ly, lz];
      break;
    }
    lx = x; ly = y; lz = z;
  }
  hl.visible = !!target;
  if (target) hl.position.set(target[0] + 0.5, target[1] + 0.5, target[2] + 0.5);
         }
