import { solid, atlas, sideTile, TYPES } from './world.js';
import { eco } from './economy.js';
import { P } from './player.js';
import { drawHud, toast } from './ui.js';

// online.js bunları doldurur; boşsa eşyalar sadece bu cihazda yaşar
export const hooks = { push: null, take: null, expire: null, myId: '' };

const st = document.createElement('style');
st.textContent = '#bDrop{right:18px;bottom:234px;font-size:22px;background:#6a1b9acc}';
document.head.appendChild(st);

let group, mat;
const geos = {};
const list = new Map();
let seq = 0;

export function initItems(scene) {
  group = new THREE.Group();
  scene.add(group);
  mat = new THREE.MeshLambertMaterial({ map: atlas.tex, alphaTest: 0.5 });
  for (const t in TYPES) {
    const g = new THREE.BoxGeometry(0.32, 0.32, 0.32);
    const uv = g.attributes.uv, tile = sideTile(+t);
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, (tile + 0.02 + uv.getX(i) * 0.96) / atlas.T, 0.02 + uv.getY(i) * 0.96);
    }
    geos[t] = g;
  }
}

export function spawnItem(id, d) {
  if (!group || list.has(id) || !geos[d.t]) return;
  const mesh = new THREE.Mesh(geos[d.t], mat);
  if (d.c > 1) mesh.scale.setScalar(1.3);
  mesh.position.set(d.x, d.y, d.z);
  group.add(mesh);
  list.set(id, {
    id, mesh, t: d.t, c: d.c, by: d.by || '',
    x: d.x, y: d.y, z: d.z, vx: d.vx || 0, vy: d.vy || 0, vz: d.vz || 0,
    born: Date.now(), n: d.n || Date.now(), ground: false, taking: false, ph: Math.random() * 6.28
  });
}

export function removeItem(id) {
  const it = list.get(id);
  if (!it) return;
  group.remove(it.mesh);
  list.delete(id);
}

export function clearItems() {
  for (const id of [...list.keys()]) removeItem(id);
}

// arr: [{t, c, x, y, z, vx, vy, vz}]
export function dropItems(arr) {
  const by = hooks.myId;
  if (hooks.push) hooks.push(arr.map(a => ({ ...a, by })));
  else arr.forEach(a => spawnItem('l' + (++seq), { ...a, by, n: Date.now() }));
}

// Envanterden bloğu önüne atar
export function dropFromInventory(t, n) {
  n = Math.min(n, eco.inv[t] || 0);
  if (n < 1) { toast('Bırakacak blok yok'); return 0; }
  eco.inv[t] -= n;
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
  const stack = Math.max(16, Math.ceil(n / 12));
  const arr = [];
  let left = n;
  while (left > 0) {
    const c = Math.min(stack, left); left -= c;
    arr.push({
      t: +t, c,
      x: P.x + fx * 0.5, y: P.y + 1.3, z: P.z + fz * 0.5,
      vx: fx * 4 + (Math.random() - 0.5), vy: 2.5 + Math.random(), vz: fz * 4 + (Math.random() - 0.5)
    });
  }
  dropItems(arr);
  drawHud();
  return n;
}

async function tryTake(it) {
  it.taking = true;
  let ok = true;
  if (hooks.take) {
    try { ok = await hooks.take(it.id); }
    catch (e) { it.taking = false; return; }
  }
  if (ok) {
    eco.inv[it.t] += it.c;
    drawHud();
    toast('+' + it.c + ' ' + TYPES[it.t].name);
  }
  removeItem(it.id);
}

export function updateItems(dt, canPick) {
  const now = Date.now(), tm = now / 1000, R = 0.16;
  for (const it of list.values()) {
    it.vy = Math.max(-30, it.vy - 18 * dt);
    let nx = it.x + it.vx * dt, ny = it.y + it.vy * dt, nz = it.z + it.vz * dt;
    if (solid(Math.floor(nx), Math.floor(it.y), Math.floor(it.z))) { it.vx *= -0.3; nx = it.x; }
    if (solid(Math.floor(it.x), Math.floor(it.y), Math.floor(nz))) { it.vz *= -0.3; nz = it.z; }
    it.ground = false;
    if (it.vy <= 0 && solid(Math.floor(nx), Math.floor(ny - R), Math.floor(nz))) {
      ny = Math.floor(ny - R) + 1 + R;
      it.vy = it.vy < -3 ? -it.vy * 0.3 : 0;
      it.ground = true;
      const f = Math.pow(0.03, dt);
      it.vx *= f; it.vz *= f;
    } else if (it.vy > 0 && solid(Math.floor(nx), Math.floor(ny + R), Math.floor(nz))) {
      it.vy = 0; ny = it.y;
    }
    it.x = nx; it.y = ny; it.z = nz;
    it.mesh.position.set(it.x, it.y + (it.ground ? 0.06 + Math.sin(tm * 2 + it.ph) * 0.05 : 0), it.z);
    it.mesh.rotation.y += dt * 1.6;

    // Boşluğa düştü ya da süresi doldu (5 dk)
    if (it.y < -15 || now - it.n > 300000) {
      if (hooks.expire) hooks.expire(it.id);
      removeItem(it.id);
      continue;
    }
    // Toplama
    if (canPick && !it.taking && now - it.born > (it.by === hooks.myId ? 1500 : 300)) {
      const dx = P.x - it.x, dy = P.y + 0.9 - it.y, dz = P.z - it.z;
      if (dx * dx + dy * dy + dz * dz < 2.25) tryTake(it);
    }
  }
                    }
