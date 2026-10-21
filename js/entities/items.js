import { solid, atlas, sideTile, TYPES, isLoaded } from '../world/world.js';
import { isFlat } from '../world/textures.js';
import { eco } from '../game/economy.js';
import { P } from './player.js';
import { drawHud, toast } from '../ui/ui.js';
import { canAdd, addItem } from '../game/inventory.js';
import { isCreative } from '../game/creative.js';

// online.js bunları doldurur; boşsa eşyalar sadece bu cihazda yaşar
export const hooks = { push: null, take: null, expire: null, myId: '' };

const st = document.createElement('style');
st.textContent = '#bDrop{right:18px;bottom:234px;font-size:22px;background:#6a1b9acc}';
document.head.appendChild(st);

let group, cubeMat, sprMat, lastFull = 0;
const cubeGeo = {}, sprGeo = {};
const list = new Map();
let seq = 0;

export function initItems(scene) {
  group = new THREE.Group();
  scene.add(group);
  cubeMat = new THREE.MeshLambertMaterial({ map: atlas.tex, alphaTest: 0.5 });
  sprMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
}

// Bloklar: küçük küp
function cubeGeometry(t) {
  if (cubeGeo[t]) return cubeGeo[t];
  const g = new THREE.BoxGeometry(0.32, 0.32, 0.32);
  const uv = g.attributes.uv, tile = sideTile(t);
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (tile + 0.02 + uv.getX(i) * 0.96) / atlas.T, 0.02 + uv.getY(i) * 0.96);
  }
  return (cubeGeo[t] = g);
}

// Aletler, yiyecekler, çiçekler: 16x16 pikselden çıkarılmış ince sprite (MCPE gibi)
function spriteGeometry(t) {
  if (sprGeo[t]) return sprGeo[t];
  const tile = sideTile(t);
  const px = atlas.cv.getContext('2d').getImageData(tile * 16, 0, 16, 16).data;
  const on = (x, y) => x >= 0 && y >= 0 && x < 16 && y < 16 && px[(y * 16 + x) * 4 + 3] > 100;
  const S = 0.5 / 16, D = S * 2, pos = [], col = [], ind = [];
  let n = 0;
  const quad = (a, b, c, d, r, g, bl, sh) => {
    for (const p of [a, b, c, d]) { pos.push(p[0], p[1], p[2]); col.push(r * sh, g * sh, bl * sh); }
    ind.push(n, n + 1, n + 2, n, n + 2, n + 3);
    n += 4;
  };
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (!on(x, y)) continue;
    const i = (y * 16 + x) * 4, r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255;
    const x0 = (x - 8) * S, x1 = x0 + S, y1 = (8 - y) * S, y0 = y1 - S, z0 = -D / 2, z1 = D / 2;
    quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], r, g, b, 1);        // ön
    quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], r, g, b, 0.75);     // arka
    if (!on(x - 1, y)) quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], r, g, b, 0.85);
    if (!on(x + 1, y)) quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], r, g, b, 0.85);
    if (!on(x, y - 1)) quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], r, g, b, 0.95);
    if (!on(x, y + 1)) quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], r, g, b, 0.6);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(ind);
  geo.computeVertexNormals();
  return (sprGeo[t] = geo);
}

export function spawnItem(id, d) {
  if (!group || list.has(id) || !TYPES[d.t]) return;
  const flat = isFlat(+d.t);
  const mesh = new THREE.Mesh(flat ? spriteGeometry(+d.t) : cubeGeometry(+d.t), flat ? sprMat : cubeMat);
  if (d.c > 1) mesh.scale.setScalar(1.3);
  mesh.position.set(d.x, d.y, d.z);
  group.add(mesh);
  list.set(id, {
    id, mesh, flat, t: d.t, c: d.c, by: d.by || '',
    x: d.x, y: d.y, z: d.z, vx: d.vx || 0, vy: d.vy || 0, vz: d.vz || 0,
    born: Date.now(), n: d.n || Date.now(), ground: false, taking: false, cool: 0, ph: Math.random() * 6.28
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

// Envanterden eşyayı önüne atar (yaratıcı modda eşya harcanmaz)
export function dropFromInventory(t, n) {
  const cre = isCreative();
  n = Math.min(n, cre ? 64 : (eco.inv[t] || 0));
  if (n < 1) { toast('Bırakacak eşya yok'); return 0; }
  if (!cre) eco.inv[t] -= n;
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
  const cre = isCreative();
  if (!cre && !canAdd(it.t, it.c)) {   // çanta doluysa eşya yerde kalır
    it.cool = Date.now() + 1500;
    if (Date.now() - lastFull > 2500) { lastFull = Date.now(); toast('🎒 Çanta dolu'); }
    return;
  }
  it.taking = true;
  let ok = true;
  if (hooks.take) {
    try { ok = await hooks.take(it.id); }
    catch (e) { it.taking = false; return; }
  }
  if (ok && !cre) {
    const a = addItem(it.t, it.c);
    drawHud();
    toast('+' + a + ' ' + TYPES[it.t].name);
  }
  removeItem(it.id);
}

export function updateItems(dt, canPick) {
  const now = Date.now(), tm = now / 1000, R = 0.16;
  for (const it of list.values()) {
    // Yüklü olmayan chunk'taki eşya donar: düşüp yok olmaz
    if (!isLoaded(Math.floor(it.x), Math.floor(it.z))) { it.mesh.visible = false; continue; }
    it.mesh.visible = true;

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
    it.mesh.position.set(it.x, it.y + (it.flat ? 0.1 : 0) + (it.ground ? 0.06 + Math.sin(tm * 2 + it.ph) * 0.05 : 0), it.z);
    it.mesh.rotation.y += dt * 1.6;   // kendi etrafında döner

    if (it.y < -15 || now - it.n > 300000) {
      if (hooks.expire) hooks.expire(it.id);
      removeItem(it.id);
      continue;
    }
    if (canPick && !it.taking && now >= it.cool && now - it.born > (it.by === hooks.myId ? 1500 : 300)) {
      const dx = P.x - it.x, dy = P.y + 0.9 - it.y, dz = P.z - it.z;
      if (dx * dx + dy * dy + dz * dz < 2.25) tryTake(it);
    }
  }
        }
