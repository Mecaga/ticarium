import { N, H, solid, get, WATER, SEA, spawnPos, losBlocked, surfaceY, worldKind } from '../world/world.js';
import { dropItems } from './items.js';

// send/remove: online.js doldurur (sadece oda sahibi hayvanları yönetir)
export const mhooks = { send: null, remove: null };

const KIND = { cow: { drop: 15, dmin: 1, dmax: 3 }, sheep: { drop: 16, dmin: 1, dmax: 2 } };
const want = () => (worldKind() === 'sky' ? { cow: 1, sheep: 1 } : { cow: 3, sheep: 3 });
const kindOf = id => (id.indexOf('sheep') === 0 ? 'sheep' : 'cow');

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
    box(1.0, 0.85, 1.25, wool, 0, 1.0, 0);
    box(1.04, 0.5, 0.8, woolD, 0, 1.12, 0.05);
    box(0.5, 0.5, 0.5, face, 0, 1.3, -0.85);
    box(0.56, 0.2, 0.56, wool, 0, 1.6, -0.82);
    box(0.08, 0.08, 0.04, dark, -0.13, 1.34, -1.11);
    box(0.08, 0.08, 0.04, dark, 0.13, 1.34, -1.11);
    addLegs(leg, null, 0.3, 0.42, 0.55, 0.55);
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
  return { mesh: g, legs, mats };
}

function createMob(id, x, y, z, f) {
  const kind = kindOf(id), mm = makeMob(kind);
  const m = {
    id, kind, mesh: mm.mesh, legs: mm.legs, mats: mm.mats,
    x, y, z, yaw: Math.random() * 6.28, vy: 0, grounded: false,
    tx: x, ty: y, tz: z, tyaw: 0,
    dir: Math.random() * 6.28, timer: Math.random() * 3, moving: false, speed: 0, phase: 0,
    hp: 6, kx: 0, kz: 0, panic: 0, f: f || 0, ft: 0, alive: true
  };
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

// Dünyadaki gerçek yüzeye bakar: çim/toprak/kum/kar üstü, üstü boş, suda değil
function landSpot() {
  const c = [];
  const normal = worldKind() === 'normal';
  for (let x = 2; x < N - 2; x++) for (let z = 2; z < N - 2; z++) {
    const y = surfaceY(x, z);
    if (y < 0 || y >= H - 3) continue;
    const t = get(x, y, z);
    if (t !== 1 && t !== 2 && t !== 6 && t !== 8) continue;
    if (normal && y < SEA + 1) continue;
    if (solid(x, y + 1, z) || solid(x, y + 2, z) || get(x, y + 1, z) === WATER) continue;
    c.push([x, y, z]);
  }
  if (!c.length) return null;
  const p = c[Math.floor(Math.random() * c.length)];
  return { x: p[0] + 0.5, y: p[1] + 1.05, z: p[2] + 0.5 };
}

export function spawnAnimals() {
  if (!group) return;
  const w = want();
  for (const kind in w) for (let i = 0; i < w[kind]; i++) {
    const id = kind + i;
    if (mobs.has(id)) continue;
    const p = landSpot();
    if (p) createMob(id, p.x, p.y, p.z);
  }
}

function topUp() {
  const w = want();
  for (const kind in w) {
    let n = 0;
    for (const m of mobs.values()) if (m.kind === kind) n++;
    if (n < w[kind]) {
      const p = landSpot();
      if (p) createMob(kind + Date.now().toString(36), p.x, p.y, p.z);
    }
  }
}

// data: { id: {x,y,z,yaw,f} }  snap=true: konumu hemen uygula (sahip ilk yükleme)
export function applyRemote(data, snap) {
  if (!group) return;
  for (const id in data) {
    const d = data[id];
    if (!d || typeof d.x !== 'number') continue;
    let m = mobs.get(id);
    if (!m) m = createMob(id, d.x, d.y, d.z, d.f || 0);
    m.tx = d.x; m.ty = d.y; m.tz = d.z; m.tyaw = d.yaw || 0;
    if (snap) { m.x = d.x; m.y = d.y; m.z = d.z; m.yaw = d.yaw || 0; }
    const f = d.f || 0;
    if (f !== m.f) { m.f = f; flashMob(m); }
  }
  if (!snap) for (const id of [...mobs.keys()]) if (!(id in data)) removeMob(id);
}

export function clearMobs() {
  if (group) for (const id of [...mobs.keys()]) removeMob(id);
  sendT = 0; respT = 15;
}

// Nişan çizgisindeki en yakın hayvan
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
  const arr = [];
  for (let i = 0; i < n; i++) {
    arr.push({ t: k.drop, c: 1, x: m.x, y: m.y + 0.8, z: m.z, vx: rnd(3), vy: 3 + Math.random() * 2, vz: rnd(3) });
  }
  dropItems(arr);
  dropMob(m);
}

// Hasarı sadece oda sahibi / tek oyunculu uygular
export function hurtMob(id, d, fx, fz) {
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
  const dec = Math.pow(0.02, dt);
  m.kx *= dec; m.kz *= dec;
  if (m.panic > 0) m.panic -= dt;
  m.timer -= dt;
  if (m.timer <= 0) {
    m.moving = Math.random() < 0.6;
    m.dir = Math.random() * Math.PI * 2;
    m.timer = 2 + Math.random() * 4;
  }
  const inW = get(Math.floor(m.x), Math.floor(m.y + 0.3), Math.floor(m.z)) === WATER;
  m.speed = m.moving ? (m.panic > 0 ? 2.6 : 1.1) : 0;
  const vx = (m.moving ? -Math.sin(m.dir) * m.speed : 0) + m.kx;
  const vz = (m.moving ? -Math.cos(m.dir) * m.speed : 0) + m.kz;
  if (Math.abs(vx) + Math.abs(vz) > 0.01) {
    const nx = m.x + vx * dt, nz = m.z + vz * dt;
    if (nx < 1.5 || nx > N - 1.5 || nz < 1.5 || nz > N - 1.5) {
      m.dir += Math.PI; m.kx = m.kz = 0;
    } else {
      const fx = Math.floor(nx), fz = Math.floor(nz), fy = Math.floor(m.y + 0.1);
      const wet = !inW && (get(fx, fy, fz) === WATER || get(fx, fy - 1, fz) === WATER);
      if (wet) { m.dir += Math.PI / 2 + Math.random(); m.timer = 1; m.kx = m.kz = 0; }
      else if (!solid(fx, fy, fz) && !solid(fx, fy + 1, fz)) { m.x = nx; m.z = nz; }
      else if (m.grounded && !solid(fx, fy + 1, fz) && !solid(fx, fy + 2, fz)) m.vy = 8;
      else { m.dir = Math.random() * Math.PI * 2; m.kx = m.kz = 0; }
    }
    if (m.moving) m.yaw += angDiff(m.dir, m.yaw) * Math.min(1, dt * 4);
  }
  if (inW) m.vy = 1.6; // suda yüzer
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
  for (const m of mobs.values()) {
    if (simulate) {
      sim(m, dt);
      if (!mobs.has(m.id)) continue;
    } else {
      const k = Math.min(1, dt * 8), ox = m.x, oz = m.z;
      m.x += (m.tx - m.x) * k; m.y += (m.ty - m.y) * k; m.z += (m.tz - m.z) * k;
      m.yaw += angDiff(m.tyaw, m.yaw) * k;
      m.speed = Math.hypot(m.x - ox, m.z - oz) / Math.max(dt, 0.001);
    }
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
      mobs.forEach((m, id) => { o[id] = { x: r2(m.x), y: r2(m.y), z: r2(m.z), yaw: r2(m.yaw), f: m.f }; });
      mhooks.send(o);
    }
  }
        }
