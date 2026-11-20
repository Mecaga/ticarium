import { solid, atlas, TYPES, isLoaded } from '../world/world.js';
import { isFlat, FACE_TILES } from '../world/textures.js';
import { TOOL_MAP, toolImage } from '../world/textures/map.js';
import { eco } from '../game/economy.js';
import { P } from './player.js';
import { drawHud, toast } from '../ui/ui.js';
import { canAdd, addItem } from '../game/inventory.js';
import { isCreative } from '../game/creative.js';
import { isGear, MAXDUR, takeInstance } from '../game/gear.js';

export const hooks = { push: null, take: null, expire: null, myId: '' };

const st = document.createElement('style');
st.textContent = '#bDrop{right:18px;bottom:234px;font-size:22px;background:#6a1b9acc}';
document.head.appendChild(st);

let group, cubeMat, sprMat, lastFull = 0;
const cubeGeo = {}, sprGeo = {};
const list = new Map();
let seq = 0;

// PNG önbelleği: eşya numarası -> { mat, geo } (hacimli geometri, bir kez üretilir)
const pngPlane = new Map();
const pngLoading = new Set();

const sideTile = t => { const f = FACE_TILES[t], v = f ? f[1] : undefined; return Number.isInteger(v) ? v : 0; };

export function initItems(scene) {
  group = new THREE.Group();
  scene.add(group);
  cubeMat = new THREE.MeshLambertMaterial({ map: atlas.tex, alphaTest: 0.5 });
  sprMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
}

function cubeGeometry(t) {
  if (cubeGeo[t]) return cubeGeo[t];
  const g = new THREE.BoxGeometry(0.32, 0.32, 0.32);
  const uv = g.attributes.uv, tile = sideTile(t);
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (tile + 0.02 + uv.getX(i) * 0.96) / atlas.T, 0.02 + uv.getY(i) * 0.96);
  }
  return (cubeGeo[t] = g);
}

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
    quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], r, g, b, 1);
    quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], r, g, b, 0.75);
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

// PNG piksellerinden kalınlıklı (1 piksel derinlikli) geometri üretir.
// Ön ve arka yüz PNG dokusunu kullanır (UV piksel merkezine hizalı), kenar yüzler renksiz gölgeli.
function buildThickGeometry(img) {
  const W = 128, H = 128;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g2 = cv.getContext('2d');
  g2.drawImage(img, 0, 0, W, H);
  const px = g2.getImageData(0, 0, W, H).data;
  const on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && px[(y * W + x) * 4 + 3] > 100;

  const S = 0.42 / W;           // bir piksel dünya birimi
  const D = S;                  // kalınlık: 1 piksel
  const pos = [], uv = [], ind = [];
  let n = 0;
  const quad = (a, b, c, d, u0, v0, u1, v1, flip) => {
    // a,b,c,d sırası: sol-alt, sağ-alt, sağ-üst, sol-üst (CCW)
    const ps = [a, b, c, d];
    const uvs = flip
      ? [[u1, v1], [u0, v1], [u0, v0], [u1, v0]]
      : [[u0, v1], [u1, v1], [u1, v0], [u0, v0]];
    for (let k = 0; k < 4; k++) { pos.push(ps[k][0], ps[k][1], ps[k][2]); uv.push(uvs[k][0], uvs[k][1]); }
    ind.push(n, n + 1, n + 2, n, n + 2, n + 3);
    n += 4;
  };
  const shade = [];

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!on(x, y)) continue;
    const x0 = (x - W / 2) * S, x1 = x0 + S;
    const y1 = (H / 2 - y) * S, y0 = y1 - S;
    const z0 = -D / 2, z1 = D / 2;
    const u0 = x / W, u1 = (x + 1) / W, v0 = 1 - (y + 1) / H, v1 = 1 - y / H;

    // Ön yüz (+z) ve arka yüz (-z): PNG dokusu
    quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], u0, v0, u1, v1, false);
    quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], u0, v0, u1, v1, true);
    shade.push(1, 1);
    // Kenar yüzler: sadece komşu şeffafsa. Doku aynı piksel, çok koyu gölge.
    const sideUV = [u0 + 0.001, v0 + 0.001, u1 - 0.001, v1 - 0.001];
    if (!on(x - 1, y)) quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], sideUV[0], sideUV[1], sideUV[2], sideUV[3], false);
    if (!on(x + 1, y)) quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], sideUV[0], sideUV[1], sideUV[2], sideUV[3], false);
    if (!on(x, y - 1)) quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], sideUV[0], sideUV[1], sideUV[2], sideUV[3], false);
    if (!on(x, y + 1)) quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], sideUV[0], sideUV[1], sideUV[2], sideUV[3], false);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(ind);
  geo.computeVertexNormals();
  return geo;
}

function pngPlaneFor(t) {
  if (pngPlane.has(t)) return pngPlane.get(t);
  if (!TOOL_MAP[t]) return null;
  if (!pngLoading.has(t)) {
    pngLoading.add(t);
    toolImage(t).then(img => {
      pngLoading.delete(t);
      if (!img) return;
      const tex = new THREE.Texture(img);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      const mat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });
      const geo = buildThickGeometry(img);
      pngPlane.set(t, { mat, geo });
      for (const it of list.values()) if (it.t === t && !it.png) swapToPlane(it);
    }).catch(() => { pngLoading.delete(t); });
  }
  return null;
}

function swapToPlane(it) {
  const p = pngPlane.get(it.t);
  if (!p || it.png) return;
  const pm = new THREE.Mesh(p.geo, p.mat);
  pm.position.copy(it.mesh.position);
  pm.rotation.copy(it.mesh.rotation);
  pm.scale.copy(it.mesh.scale);
  group.remove(it.mesh);
  group.add(pm);
  it.mesh = pm;
  it.png = true;
}

const encC = a => ((a.d != null && isGear(a.t)) ? 100000 + Math.max(1, Math.round(a.d)) : a.c);

export function spawnItem(id, d) {
  if (!d || !FACE_TILES[d.t]) return;
  if (!group || list.has(id) || !TYPES[d.t]) return;
  let c = d.c, dur = null;
  if (c >= 100000) { dur = c - 100000; c = 1; }
  const flat = isFlat(+d.t);
  const mesh = new THREE.Mesh(flat ? spriteGeometry(+d.t) : cubeGeometry(+d.t), flat ? sprMat : cubeMat);
  if (c > 1) mesh.scale.setScalar(1.3);
  mesh.position.set(d.x, d.y, d.z);
  group.add(mesh);
  const it = {
    id, mesh, flat, t: d.t, c, dur, by: d.by || '', png: false,
    x: d.x, y: d.y, z: d.z, vx: d.vx || 0, vy: d.vy || 0, vz: d.vz || 0,
    born: Date.now(), n: d.n || Date.now(), ground: false, taking: false, cool: 0, ph: Math.random() * 6.28
  };
  list.set(id, it);
  if (TOOL_MAP[+d.t]) pngPlaneFor(+d.t);
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

export function dropItems(arr) {
  const by = hooks.myId;
  if (hooks.push) hooks.push(arr.map(a => ({ ...a, by, c: encC(a) })));
  else arr.forEach(a => spawnItem('l' + (++seq), { ...a, by, c: encC(a), n: Date.now() }));
}

export function dropFromInventory(t, n, p = 0) {
  const cre = isCreative();
  n = Math.min(n, cre ? 64 : (eco.inv[t] || 0));
  if (n < 1) { toast('Bırakacak eşya yok'); return 0; }
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
  const base = () => ({
    x: P.x + fx * 0.5, y: P.y + 1.3, z: P.z + fz * 0.5,
    vx: fx * 4 + (Math.random() - 0.5), vy: 2.5 + Math.random(), vz: fz * 4 + (Math.random() - 0.5)
  });
  const arr = [];
  if (isGear(t)) {
    for (let k = 0; k < n; k++) arr.push({ t: +t, c: 1, d: cre ? MAXDUR[t] : takeInstance(t, k === 0 ? p : 0), ...base() });
  } else {
    if (!cre) eco.inv[t] -= n;
    const stack = Math.max(16, Math.ceil(n / 12));
    let left = n;
    while (left > 0) {
      const c = Math.min(stack, left); left -= c;
      arr.push({ t: +t, c, ...base() });
    }
  }
  dropItems(arr);
  drawHud();
  return n;
}

async function tryTake(it) {
  const cre = isCreative();
  if (!cre && !canAdd(it.t, it.c)) {
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
    const a = addItem(it.t, it.c, it.dur);
    drawHud();
    toast('+' + a + ' ' + TYPES[it.t].name);
  }
  removeItem(it.id);
}

export function updateItems(dt, canPick) {
  const now = Date.now(), tm = now / 1000, R = 0.16;
  for (const it of list.values()) {
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
    it.mesh.rotation.y += dt * 1.6;

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
