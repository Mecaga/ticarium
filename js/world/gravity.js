import { get, set, atlas, sideTile, inBounds, H, SAPLING, WATER } from './world.js';
import { P, collides } from '../entities/player.js';

const FALLING = new Set([6, 8]); // kum, kar
export const isFalling = t => FALLING.has(t);

// main/actions doldurur: blok değişince kaydet / online gönder
export const ghooks = { onChange: null };

let group = null, mat = null;
const geos = {};
const pending = new Map();
const falling = [];

// Hava, fidan ve su: düşen blok buraya girer
const empty = (x, y, z) => { const t = get(x, y, z); return t === 0 || t === SAPLING || t === WATER; };

export function initGravity(scene) {
  group = new THREE.Group();
  scene.add(group);
  mat = new THREE.MeshBasicMaterial({ map: atlas.tex, color: 0xd0d0d0 });
  for (const t of FALLING) {
    const g = new THREE.BoxGeometry(1, 1, 1);
    const uv = g.attributes.uv, tile = sideTile(t);
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, (tile + 0.02 + uv.getX(i) * 0.96) / atlas.T, 0.02 + uv.getY(i) * 0.96);
    }
    geos[t] = g;
  }
}

// Bu hücredeki blok düşer mi diye bir süre sonra kontrol et
export function queueFall(x, y, z) {
  if (!inBounds(x, y, z)) return;
  pending.set(x + '_' + y + '_' + z, { x, y, z, at: Date.now() + 150 });
}

function change(x, y, z, t) {
  set(x, y, z, t);
  if (ghooks.onChange) ghooks.onChange(x, y, z, t);
}

function start(x, y, z, t) {
  change(x, y, z, 0);
  const mesh = new THREE.Mesh(geos[t], mat);
  mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
  group.add(mesh);
  falling.push({ t, x, y, z, vy: 0, mesh });
  queueFall(x, y + 1, z); // üstündeki blok da düşebilir
}

function landAt(f, cy) {
  let ly = cy + 1;
  while (ly < H && !empty(f.x, ly, f.z)) ly++;
  group.remove(f.mesh);
  if (ly >= H) return;
  change(f.x, ly, f.z, f.t);
  if (collides(P.x, P.y, P.z)) P.y = ly + 1.001; // altında kalan oyuncuyu yukarı it
}

function tryStart(p) {
  const t = get(p.x, p.y, p.z);
  if (FALLING.has(t) && p.y > 0 && empty(p.x, p.y - 1, p.z)) start(p.x, p.y, p.z, t);
}

export function updateGravity(dt) {
  if (!group) return;
  const now = Date.now();
  for (const [k, p] of pending) {
    if (now < p.at) continue;
    pending.delete(k);
    tryStart(p);
  }
  for (let i = falling.length - 1; i >= 0; i--) {
    const f = falling[i];
    f.vy = Math.min(30, f.vy + 22 * dt); // yerçekimi ivmesi
    const ny = f.y - f.vy * dt;
    const cy = Math.floor(ny);
    if (cy < 0 || !empty(f.x, cy, f.z)) {
      falling.splice(i, 1);
      landAt(f, cy);
    } else {
      f.y = ny;
      f.mesh.position.set(f.x + 0.5, f.y + 0.5, f.z + 0.5);
    }
  }
}

// Havadaki ve bekleyen blokları hemen yerleştir (çıkarken / kaydederken)
export function flushGravity() {
  if (!group) return;
  for (let g = 0; g < 200 && (pending.size || falling.length); g++) {
    for (const [k, p] of [...pending]) { pending.delete(k); tryStart(p); }
    for (const f of falling.splice(0)) {
      let cy = Math.floor(f.y);
      while (cy >= 0 && empty(f.x, cy, f.z)) cy--;
      landAt(f, cy);
    }
  }
}

export function clearGravity() {
  for (const f of falling) group.remove(f.mesh);
  falling.length = 0;
  pending.clear();
}
