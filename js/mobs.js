import { N, H, solid } from './world.js';

// send: online.js doldurur (oda sahibi inek konumlarını gönderir)
export const mhooks = { send: null };

let group = null, sendT = 0;
const cows = new Map();
const r2 = n => Math.round(n * 100) / 100;
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

function groundY(x, z) {
  for (let y = H - 1; y >= 0; y--) if (solid(Math.floor(x), y, Math.floor(z))) return y + 1;
  return 0;
}

function makeCow() {
  const g = new THREE.Group();
  const M = c => new THREE.MeshLambertMaterial({ color: c });
  const white = M(0xf3f3f3), dark = M(0x2a2a2a), pink = M(0xe8a0a0), tan = M(0xd9c9a0);
  const box = (w, h, d, m, x, y, z, parent = g) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    parent.add(b);
    return b;
  };
  box(0.9, 0.7, 1.4, white, 0, 0.95, 0);
  box(0.94, 0.32, 0.42, dark, 0, 1.05, 0.25);
  box(0.5, 0.72, 0.4, dark, 0.25, 0.95, -0.4);
  box(0.55, 0.5, 0.5, white, 0, 1.25, -0.95);
  box(0.38, 0.22, 0.12, pink, 0, 1.13, -1.24);
  box(0.08, 0.08, 0.04, dark, -0.15, 1.35, -1.21);
  box(0.08, 0.08, 0.04, dark, 0.15, 1.35, -1.21);
  box(0.1, 0.16, 0.1, tan, -0.28, 1.58, -0.95);
  box(0.1, 0.16, 0.1, tan, 0.28, 1.58, -0.95);
  const legs = [];
  for (const [sx, sz] of [[-0.28, -0.5], [0.28, -0.5], [-0.28, 0.5], [0.28, 0.5]]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx, 0.6, sz);
    box(0.22, 0.6, 0.22, white, 0, -0.3, 0, pivot);
    box(0.22, 0.1, 0.22, dark, 0, -0.55, 0, pivot);
    g.add(pivot);
    legs.push(pivot);
  }
  return { mesh: g, legs };
}

function createCow(id, x, y, z) {
  const m = makeCow();
  const c = {
    id, mesh: m.mesh, legs: m.legs,
    x, y, z, yaw: Math.random() * 6.28, vy: 0, grounded: false,
    tx: x, ty: y, tz: z, tyaw: 0,
    dir: Math.random() * 6.28, timer: Math.random() * 3, moving: false, speed: 0, phase: 0
  };
  m.mesh.position.set(x, y, z);
  group.add(m.mesh);
  cows.set(id, c);
  return c;
}

export function spawnCows() {
  if (!group) return;
  const pts = [[N / 2 + 5.5, N / 2 - 4], [N / 2 - 5.5, N / 2 + 4.5]];
  pts.forEach((p, i) => {
    if (cows.has('cow' + i)) return;
    createCow('cow' + i, p[0], groundY(p[0], p[1]) + 0.05, p[1]);
  });
}

// data: { cow0: {x,y,z,yaw}, ... }  snap=true: konumu hemen uygula (sahip ilk yükleme)
export function applyRemote(data, snap) {
  if (!group) return;
  for (const id in data) {
    const d = data[id];
    if (!d || typeof d.x !== 'number') continue;
    let c = cows.get(id);
    if (!c) c = createCow(id, d.x, d.y, d.z);
    c.tx = d.x; c.ty = d.y; c.tz = d.z; c.tyaw = d.yaw || 0;
    if (snap) { c.x = d.x; c.y = d.y; c.z = d.z; c.yaw = d.yaw || 0; }
  }
}

export function clearMobs() {
  for (const c of cows.values()) group.remove(c.mesh);
  cows.clear();
  sendT = 0;
}

function sim(c, dt) {
  c.timer -= dt;
  if (c.timer <= 0) {
    c.moving = Math.random() < 0.6;
    c.dir = Math.random() * Math.PI * 2;
    c.timer = 2 + Math.random() * 4;
  }
  c.speed = c.moving ? 1.1 : 0;
  if (c.moving) {
    const nx = c.x - Math.sin(c.dir) * c.speed * dt;
    const nz = c.z - Math.cos(c.dir) * c.speed * dt;
    if (nx < 1.5 || nx > N - 1.5 || nz < 1.5 || nz > N - 1.5) {
      c.dir += Math.PI;
    } else {
      const fx = Math.floor(nx), fz = Math.floor(nz), fy = Math.floor(c.y + 0.1);
      if (!solid(fx, fy, fz) && !solid(fx, fy + 1, fz)) { c.x = nx; c.z = nz; }
      else if (c.grounded && !solid(fx, fy + 1, fz) && !solid(fx, fy + 2, fz)) c.vy = 8;
      else c.dir = Math.random() * Math.PI * 2;
    }
    c.yaw += angDiff(c.dir, c.yaw) * Math.min(1, dt * 4);
  }
  c.vy = Math.max(-30, c.vy - 22 * dt);
  const ny = c.y + c.vy * dt;
  if (c.vy <= 0 && solid(Math.floor(c.x), Math.floor(ny), Math.floor(c.z))) {
    c.y = Math.floor(ny) + 1; c.vy = 0; c.grounded = true;
  } else { c.y = ny; c.grounded = false; }
  if (c.y < -5) { c.x = N / 2 + 3; c.z = N / 2 + 3; c.y = groundY(c.x, c.z) + 0.05; c.vy = 0; }
}

export function updateMobs(dt, simulate) {
  if (!group) return;
  for (const c of cows.values()) {
    if (simulate) sim(c, dt);
    else {
      const k = Math.min(1, dt * 8), ox = c.x, oz = c.z;
      c.x += (c.tx - c.x) * k; c.y += (c.ty - c.y) * k; c.z += (c.tz - c.z) * k;
      c.yaw += angDiff(c.tyaw, c.yaw) * k;
      c.speed = Math.hypot(c.x - ox, c.z - oz) / Math.max(dt, 0.001);
    }
    c.mesh.position.set(c.x, c.y, c.z);
    c.mesh.rotation.y = c.yaw;
    c.phase += dt * c.speed * 5;
    const sw = Math.min(1, c.speed / 1.0) * 0.6;
    c.legs.forEach((l, i) => { l.rotation.x = Math.sin(c.phase + (i === 0 || i === 3 ? 0 : Math.PI)) * sw; });
  }
  if (simulate && mhooks.send && cows.size) {
    sendT += dt;
    if (sendT >= 0.25) {
      sendT = 0;
      const o = {};
      cows.forEach((c, id) => { o[id] = { x: r2(c.x), y: r2(c.y), z: r2(c.z), yaw: r2(c.yaw) }; });
      mhooks.send(o);
    }
  }
}
