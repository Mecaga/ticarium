import { H, solid, get, WATER, LAVA, SEA, losBlocked, surfaceY, worldKind, isLoaded, skyTops, WOOLC_MIN, DYE_COL } from '../world/world.js';
import { dropItems } from './items.js';
import { P } from './player.js';

// send/remove: online.js doldurur (sadece oda yönetimi sende olan cihaz hayvanları yönetir)
export const mhooks = { send: null, remove: null };

const KIND = {
  cow: { drop: 15, dmin: 1, dmax: 3 },
  sheep: { drop: 16, dmin: 1, dmax: 2 },
  chicken: { drop: 15, dmin: 1, dmax: 1 }
};
const want = () => (worldKind() === 'sky' ? { cow: 1, sheep: 1, chicken: 1 } : { cow: 3, sheep: 3, chicken: 3 });
const kindOf = id => (id.indexOf('sheep') === 0 ? 'sheep' : id.indexOf('chicken') === 0 ? 'chicken' : 'cow');
const shadeHex = (c, k) => (((c >> 16 & 255) * k) << 16) | (((c >> 8 & 255) * k) << 8) | ((c & 255) * k);

let group = null, sendT = 0, respT = 15;
const mobs = new Map();
const r2 = n => Math.round(n * 100) / 100;
const rnd = a => (Math.random() - 0.5) * a;
const angDiff = (a, b) => {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
};

export function initMobs(scene) {
  group = new THREE.Group();
  scene.add(group);
}

function makeMob(kind) {
  const g = new THREE.Group(), mats = [];
  let woolMats = null;
  const M = c => { const m = new THREE.MeshLambertMaterial({ color: c }); mats.push(m); return m; };
  const box = (w, h, d, m, x, y, z, parent = g) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    parent.add(b);
    return b;
  };
  const legs = [];
  const addLegs = (lm, dm, x, z, pivotY, h) => {
    for (const [sx, sz] of [[-x, -z], [x, -z], [-x, z], [x, z]]) {
      const pivot = new THREE.Group();
      pivot.position.set(sx, pivotY, sz);
      box(0.22, h, 0.22, lm, 0, -h / 2, 0, pivot);
      if (dm) box(0.22, 0.1, 0.22, dm, 0, -h + 0.05, 0, pivot);
      g.add(pivot);
      legs.push(pivot);
    }
  };
  if (kind === 'sheep') {
    const wool = M(0xeeeeea), woolD = M(0xdcdcd6), face = M(0xb9a28f), leg = M(0x6f6258), dark = M(0x2a2a2a);
    woolMats = [wool, woolD];
    box(1.0, 0.85, 1.25, wool, 0, 1.0, 0);
    box(1.04, 0.5, 0.8, woolD, 0, 1.12, 0.05);
    box(0.5, 0.5, 0.5, face, 0, 1.3, -0.85);
    box(0.56, 0.2, 0.56, wool, 0, 1.6, -0.82);
    box(0.08, 0.08, 0.04, dark, -0.13, 1.34, -1.11);
    box(0.08, 0.08, 0.04, dark, 0.13, 1.34, -1.11);
    addLegs(leg, null, 0.3, 0.42, 0.55, 0.55);
  } else if (kind === 'chicken') {
    const w = M(0xf5f5f0), red = M(0xd02828), beak = M(0xf0a020), dark = M(0x2a2a2a), leg = M(0xe0a030);
    box(0.4, 0.35, 0.55, w, 0, 0.5, 0);
    box(0.22, 0.26, 0.22, w, 0, 0.82, -0.3);
    box(0.06, 0.08, 0.1, red, 0, 1.0, -0.3);
    box(0.1, 0.07, 0.12, beak, 0, 0.8, -0.46);
    box(0.05, 0.05, 0.03, dark, -0.07, 0.86, -0.42);
    box(0.05, 0.05, 0.03, dark, 0.07, 0.86, -0.42);
    box(0.3, 0.22, 0.12, w, 0, 0.55, 0.32);
    addLegs(leg, null, 0.1, 0.05, 0.32, 0.32);
  } else {
    const white = M(0xf3f3f3), dark = M(0x2a2a2a), pink = M(0xe8a0a0), tan = M(0xd9c9a0);
    box(0.9, 0.7, 1.4, white, 0, 0.95, 0);
    box(0.94, 0.32, 0.42, dark, 0, 1.05, 0.25);
    box(0.5, 0.72, 0.4, dark, 0.25, 0.95, -0.4);
    box(0.55, 0.5, 0.5, white, 0, 1.25, -0.95);
    box(0.38, 0.22, 0.12, pink, 0, 1.13, -1.24);
    box(0.08, 0.08, 0.04, dark, -0.15, 1.35, -1.21);
    box(0.08, 0.08, 0.04, dark, 0.15, 1.35, -1.21);
    box(0.1, 0.16, 0.1, tan, -0.28, 1.58, -0.95);
    box(0.1, 0.16, 0.1, tan, 0.28, 1.58, -0.95);
    addLegs(white, dark, 0.28, 0.5, 0.6, 0.6);
  }
  return { mesh: g, legs, mats, wool: woolMats };
}

// Koyun rengi: idx -1 beyaz, 0..5 boya rengi
function setColor(m, idx) {
  m.col = idx;
  if (!m.wool) return;
  const c = idx >= 0 ? DYE_COL[idx] : 0xeeeeea;
  m.wool[0].color.setHex(c);
  m.wool[1].color.setHex(idx >= 0 ? shadeHex(c, 0.88) : 0xdcdcd6);
}

function createMob(id, x, y, z, f, col) {
  const kind = kindOf(id), mm = makeMob(kind);
  const m = {
    id, kind, mesh: mm.mesh, legs: mm.legs, mats: mm.mats, wool: mm.wool, col: -1,
    x, y, z, yaw: Math.random() * 6.28, vy: 0, grounded: false,
    tx: x, ty: y, tz: z, tyaw: 0,
    dir: Math.random() * 6.28, timer: Math.random() * 3, moving: false, speed: 0, phase: 0,
    hp: 6, egg: 60 + Math.random() * 60, kx: 0, kz: 0, panic: 0, f: f || 0, ft: 0, alive: true, lavaT: 0
  };
  if (col >= 0) setColor(m, col);
  mm.mesh.position.set(x, y, z);
  group.add(mm.mesh);
  mobs.set(id, m);
  return m;
}

function removeMob(id) {
  const m = mobs.get(id);
  if (!m) return;
  group.remove(m.mesh);
  mobs.delete(id);
}

function dropMob(m) {
  removeMob(m.id);
  if (mhooks.remove) mhooks.remove(m.id);
}

function flashMob(m) {
  m.mats.forEach(x => x.emissive.setHex(0xff0000));
  clearTimeout(m.ft);
  m.ft = setTimeout(() => m.mats.forEach(x => x.emissive.setHex(0x000000)), 260);
}

export function mobKind(id) { const m = mobs.get(id); return m ? m.kind : null; }
export function mobCol(id) { const m = mobs.get(id); return m ? m.col : -1; }

// Koyunu boyar (sadece oda yönetimi olan cihaz çağırır, renk durum güncellemesiyle herkese gider)
export function dyeMob(id, idx) {
  const m = mobs.get(id);
  if (!m || m.kind !== 'sheep') return;
  setColor(m, idx);
}

// Oyuncunun yakınında, yüklü chunk içinde, kuru ve boş bir yüzey
function landSpot() {
  const sky = worldKind() === 'sky', normal = worldKind() === 'normal';
  const minD = sky ? 2 : 6;
  const ok = (x, z) => {
    if (!isLoaded(x, z)) return null;
    const y = surfaceY(x, z);
    if (y < 0 || y >= H - 3) return null;
    const t = get(x, y, z);
    if (t !== 1 && t !== 2 && t !== 6 && t !== 8) return null;
    if (normal && y < SEA + 1) return null;
    const a = get(x, y + 1, z);
    if (solid(x, y + 1, z) || solid(x, y + 2, z) || a === WATER || a === LAVA) return null;
    if (Math.hypot(x + 0.5 - P.x, z + 0.5 - P.z) < minD) return null;
    return { x: x + 0.5, y: y + 1.05, z: z + 0.5 };
  };
  if (sky) {
    const tops = skyTops().sort(() => Math.random() - 0.5);
    for (const [x, , z] of tops) { const p = ok(x, z); if (p) return p; }
    return null;
  }
  for (let i = 0; i < 80; i++) {
    const p = ok(Math.floor(P.x + (Math.random() - 0.5) * 70), Math.floor(P.z + (Math.random() - 0.5) * 70));
    if (p) return p;
  }
  return null;
}

export function spawnMob(kind, x, y, z) {
  if (!group) return;
  createMob(kind + Date.now().toString(36) + Math.floor(Math.random() * 99), x, y, z, 0, -1);
}

export function spawnAnimals() {
  if (!group) return;
  const w = want();
  for (const kind in w) for (let i = 0; i < w[kind]; i++) {
    const id = kind + i;
    if (mobs.has(id)) continue;
    const p = landSpot();
    if (p) createMob(id, p.x, p.y, p.z, 0, -1);
  }
}

function topUp() {
  const w = want();
  for (const kind in w) {
    let n = 0;
    for (const m of mobs.values()) if (m.kind === kind && Math.hypot(m.x - P.x, m.z - P.z) < 90) n++;
    for (; n < w[kind]; n++) {
      const p = landSpot();
      if (!p) break;
      createMob(kind + Date.now().toString(36) + n, p.x, p.y, p.z, 0, -1);
    }
  }
  for (const m of [...mobs.values()]) if (Math.hypot(m.x - P.x, m.z - P.z) > 140) dropMob(m);
}

export function applyRemote(data, snap) {
  if (!group) return;
  for (const id in data) {
    const d = data[id];
    if (!d || typeof d.x !== 'number') continue;
    let m = mobs.get(id);
    if (!m) m = createMob(id, d.x, d.y, d.z, d.f || 0, typeof d.c === 'number' ? d.c : -1);
    m.tx = d.x; m.ty = d.y; m.tz = d.z; m.tyaw = d.yaw || 0;
    if (snap) { m.x = d.x; m.y = d.y; m.z = d.z; m.yaw = d.yaw || 0; }
    if (typeof d.c === 'number' && d.c !== m.col) setColor(m, d.c);
    const f = d.f || 0;
    if (f !== m.f) { m.f = f; flashMob(m); }
  }
  if (!snap) for (const id of [...mobs.keys()]) if (!(id in data)) removeMob(id);
}

export function clearMobs() {
  if (group) for (const id of [...mobs.keys()]) removeMob(id);
  sendT = 0; respT = 15;
}

export function findMob(ex, ey, ez, dx, dy, dz, range) {
  let best = null, bt = 99;
  for (const m of mobs.values()) {
    const vx = m.x - ex, vy = m.y + 0.8 - ey, vz = m.z - ez;
    const t = vx * dx + vy * dy + vz * dz;
    if (t < 0.2 || t > range) continue;
    if (Math.hypot(vx - dx * t, vy - dy * t, vz - dz * t) > 0.85) continue;
    if (losBlocked(ex, ey, ez, dx, dy, dz, t)) continue;
    if (t < bt) { bt = t; best = m.id; }
  }
  return best ? { id: best, t: bt } : null;
}

function killMob(m) {
  m.alive = false;
  const k = KIND[m.kind];
  const n = k.dmin + Math.floor(Math.random() * (k.dmax - k.dmin + 1));
  const dropT = (m.kind === 'sheep' && m.col >= 0) ? WOOLC_MIN + m.col : k.drop;
  const arr = [];
  for (let i = 0; i < n; i++) {
    arr.push({ t: dropT, c: 1, x: m.x, y: m.y + 0.8, z: m.z, vx: rnd(3), vy: 3 + Math.random() * 2, vz: rnd(3) });
  }
  dropItems(arr);
  dropMob(m);
}

export function hurtMob(id, d, fx, fz) {
  if (d < 0) return dyeMob(id, -d - 1);
  const m = mobs.get(id);
  if (!m || !m.alive) return;
  m.hp -= d; m.f++;
  flashMob(m);
  const dx = m.x - fx, dz = m.z - fz, l = Math.hypot(dx, dz) || 1;
  m.kx = dx / l * 5; m.kz = dz / l * 5;
  if (m.grounded) m.vy = 5.5;
  m.panic = 3; m.dir = Math.atan2(-dx / l, -dz / l);
  m.moving = true; m.timer = 3;
  if (m.hp <= 0) killMob(m);
}

function sim(m, dt) {
  const fx0 = Math.floor(m.x), fz0 = Math.floor(m.z);
  if (!isLoaded(fx0, fz0)) { m.speed = 0; return; }
  if (m.kind === 'chicken') {
    m.egg -= dt;
    if (m.egg <= 0) {
      m.egg = 60 + Math.random() * 60;
      dropItems([{ t: 189, c: 1, x: m.x, y: m.y + 0.4, z: m.z, vx: 0, vy: 1.5, vz: 0 }]);
    }
  }
  const dec = Math.pow(0.02, dt);
  m.kx *= dec; m.kz *= dec;
  if (m.panic > 0) m.panic -= dt;
  m.timer -= dt;
  if (m.timer <= 0) {
    m.moving = Math.random() < 0.6;
    m.dir = Math.random() * Math.PI * 2;
    m.timer = 2 + Math.random() * 4;
  }
  const inW = get(fx0, Math.floor(m.y + 0.3), fz0) === WATER;
  const inL = get(fx0, Math.floor(m.y + 0.3), fz0) === LAVA;
  if (inL) {
    m.hp -= dt * 2.5; m.lavaT += dt;
    if (m.lavaT > 0.5) { m.lavaT = 0; m.f++; flashMob(m); }
    if (m.hp <= 0) { killMob(m); return; }
  }
  m.speed = m.moving ? (m.panic > 0 ? 2.6 : 1.1) : 0;
  const vx = (m.moving ? -Math.sin(m.dir) * m.speed : 0) + m.kx;
  const vz = (m.moving ? -Math.cos(m.dir) * m.speed : 0) + m.kz;
  if (Math.abs(vx) + Math.abs(vz) > 0.01) {
    const nx = m.x + vx * dt, nz = m.z + vz * dt;
    const fx = Math.floor(nx), fz = Math.floor(nz), fy = Math.floor(m.y + 0.1);
    const wet = !inW && !inL && (get(fx, fy, fz) === WATER || get(fx, fy - 1, fz) === WATER || get(fx, fy, fz) === LAVA || get(fx, fy - 1, fz) === LAVA);
    if (!isLoaded(fx, fz)) { m.dir += Math.PI; m.kx = m.kz = 0; }
    else if (wet) { m.dir += Math.PI / 2 + Math.random(); m.timer = 1; m.kx = m.kz = 0; }
    else if (!solid(fx, fy, fz) && !solid(fx, fy + 1, fz)) { m.x = nx; m.z = nz; }
    else if (m.grounded && !solid(fx, fy + 1, fz) && !solid(fx, fy + 2, fz)) m.vy = 8;
    else { m.dir = Math.random() * Math.PI * 2; m.kx = m.kz = 0; }
    if (m.moving) m.yaw += angDiff(m.dir, m.yaw) * Math.min(1, dt * 4);
  }
  if (inW) m.vy = 1.6;
  else if (inL) m.vy = 1.0;
  else m.vy = Math.max(-30, m.vy - 22 * dt);
  const ny = m.y + m.vy * dt;
  if (m.vy <= 0 && solid(Math.floor(m.x), Math.floor(ny), Math.floor(m.z))) {
    m.y = Math.floor(ny) + 1; m.vy = 0; m.grounded = true;
  } else { m.y = ny; m.grounded = false; }
  if (m.y < -5) {
    const p = landSpot();
    if (p) { m.x = p.x; m.y = p.y; m.z = p.z; m.vy = 0; }
    else dropMob(m);
  }
}

export function updateMobs(dt, simulate) {
  if (!group) return;
  if (simulate) {
    respT += dt;
    if (respT >= 20) { respT = 0; topUp(); }
  }
  for (const m of [...mobs.values()]) {
    if (simulate) {
      sim(m, dt);
      if (!mobs.has(m.id)) continue;
    } else {
      const k = Math.min(1, dt * 8), ox = m.x, oz = m.z;
      m.x += (m.tx - m.x) * k; m.y += (m.ty - m.y) * k; m.z += (m.tz - m.z) * k;
      m.yaw += angDiff(m.tyaw, m.yaw) * k;
      m.speed = Math.hypot(m.x - ox, m.z - oz) / Math.max(dt, 0.001);
    }
    m.mesh.visible = isLoaded(Math.floor(m.x), Math.floor(m.z));
    m.mesh.position.set(m.x, m.y, m.z);
    m.mesh.rotation.y = m.yaw;
    m.phase += dt * m.speed * 5;
    const sw = Math.min(1, m.speed / 1.0) * 0.6;
    m.legs.forEach((l, i) => { l.rotation.x = Math.sin(m.phase + (i === 0 || i === 3 ? 0 : Math.PI)) * sw; });
  }
  if (simulate && mhooks.send && mobs.size) {
    sendT += dt;
    if (sendT >= 0.25) {
      sendT = 0;
      const o = {};
      mobs.forEach((m, id) => { o[id] = { x: r2(m.x), y: r2(m.y), z: r2(m.z), yaw: r2(m.yaw), f: m.f, c: m.col }; });
      mhooks.send(o);
    }
  }
}
