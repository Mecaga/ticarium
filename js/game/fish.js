import { N } from '../world/idtable.js';
import { get, isLoaded, WATER } from '../world/world.js';
import { P } from '../entities/player.js';
import { G } from '../core/state.js';

// Su altı balıkları. Yalnızca görsel: oyuncunun yakınındaki sularda yüzer, olta şamandırasına yaklaşır.
// Her cihaz kendi balıklarını görür. Balık senkronu yok, yakalama bu cihazda hesaplanır.

const KINDS = [
  { item: N.HAMSI, color: 0xaab4c8, len: 0.22, w: 35 },
  { item: N.SOMON, color: 0xe8836a, len: 0.32, w: 30 },
  { item: N.BALON_BALIGI, color: 0xd8d070, len: 0.2, w: 20 },
  { item: N.KIRPI_BALIGI, color: 0xb89a50, len: 0.26, w: 15 }
];
const TOTAL = 12, RANGE = 14;
const geos = new Map(), mats = new Map();
const lure = { on: false, x: 0, z: 0 };
let root = null, fishes = [];

const cellWater = (x, y, z) => isLoaded(x, z) && get(x, y, z) === WATER;

function randomKind() {
  let r = Math.random() * 100;
  for (const k of KINDS) { r -= k.w; if (r < 0) return k; }
  return KINDS[0];
}

function makeFish(k, x, y, z) {
  if (!geos.has(k.item)) {
    geos.set(k.item, {
      body: new THREE.BoxGeometry(0.12, 0.1, k.len),
      tail: new THREE.BoxGeometry(0.08, 0.14, 0.05)
    });
    mats.set(k.item, new THREE.MeshLambertMaterial({ color: k.color }));
  }
  const gm = geos.get(k.item), m = mats.get(k.item);
  const g = new THREE.Group();
  const tail = new THREE.Mesh(gm.tail, m);
  tail.position.z = -k.len / 2 - 0.025;
  g.add(new THREE.Mesh(gm.body, m), tail);
  g.position.set(x, y, z);
  root.add(g);
  return { item: k.item, g, x, y, z, tx: x, tz: z, speed: 0.45, idle: 0 };
}

function spawnNear() {
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(P.x + (Math.random() * 2 - 1) * RANGE);
    const z = Math.floor(P.z + (Math.random() * 2 - 1) * RANGE);
    if (!isLoaded(x, z)) continue;
    const top = Math.floor(P.y) + 2;
    for (let y = top; y >= top - 14; y--) {
      if (get(x, y, z) === WATER) { fishes.push(makeFish(randomKind(), x + 0.5, y + 0.45, z + 0.5)); return; }
    }
  }
}

// Yeni hedef: olta yakınındaysa şamandıraya doğru, değilse etrafında dolaş. Yalnızca su hücresi seçilir.
function pick(f, now) {
  const hunt = lure.on && Math.hypot(f.x - lure.x, f.z - lure.z) < 7;
  const cx = hunt ? lure.x : f.x, cz = hunt ? lure.z : f.z, r = hunt ? 0.7 : 2.5;
  for (let i = 0; i < 6; i++) {
    const tx = cx + (Math.random() * 2 - 1) * r, tz = cz + (Math.random() * 2 - 1) * r;
    if (cellWater(Math.floor(tx), Math.floor(f.y), Math.floor(tz))) {
      f.tx = tx; f.tz = tz; f.speed = hunt ? 0.9 : 0.45;
      f.idle = now + (hunt ? 300 : 1500 + Math.random() * 2000);
      return;
    }
  }
  f.tx = f.x; f.tz = f.z; f.idle = now + 600;
}

function step(dt, now) {
  for (const f of fishes) {
    const dx = f.tx - f.x, dz = f.tz - f.z, d = Math.hypot(dx, dz);
    if (d < 0.05) {
      if (now >= f.idle) pick(f, now);
    } else {
      const s = Math.min(d, f.speed * dt);
      const nx = f.x + (dx / d) * s, nz = f.z + (dz / d) * s;
      if (cellWater(Math.floor(nx), Math.floor(f.y), Math.floor(nz))) {
        f.x = nx; f.z = nz; f.g.rotation.y = Math.atan2(dx, dz);
      } else pick(f, now);
    }
    f.g.position.set(f.x, f.y + Math.sin(now / 400 + f.x * 3) * 0.012, f.z);
  }
}

// Olta şamandırasını ayarlar. Balık 1,2 blok içine girerse onun ürünü döner, yoksa 0.
export function setLure(on, x, z) {
  lure.on = !!on;
  if (on) { lure.x = x + 0.5; lure.z = z + 0.5; }
}
export function lureBite() {
  if (!lure.on) return 0;
  let best = null, bd = 1.2;
  for (const f of fishes) {
    const d = Math.hypot(f.x - lure.x, f.z - lure.z);
    if (d < bd) { bd = d; best = f; }
  }
  return best ? best.item : 0;
}

// Her saniye: balık sayısını tamamla, uzaklaşanları kaldır. Dünyada değilsen gizle.
setInterval(() => {
  if (!G.scene) return;
  if (!root) { root = new THREE.Group(); G.scene.add(root); }
  root.visible = !!G.room;
  if (!G.room) return;
  fishes = fishes.filter(f => {
    if (Math.hypot(f.x - P.x, f.z - P.z) < RANGE + 10) return true;
    root.remove(f.g);
    return false;
  });
  for (let i = 0; i < 4 && fishes.length < TOTAL; i++) spawnNear();
}, 1000);

let last = performance.now();
(function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (root && G.room) step(dt, now);
})(last);
