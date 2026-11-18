import { N } from '../world/idtable.js';
import { TYPES, CATS, BOXES, get, set, rebuild, prev, target, solid, isLoaded, TALL } from '../world/world.js';
import { FACE_TILES, tileOf, addFlat } from '../world/textures.js';
import { eco } from './economy.js';
import { RECIPES } from './recipes.js';
import { toast, drawHud } from '../ui/ui.js';
import { P } from '../entities/player.js';
import { G } from '../core/state.js';
import { isCreative } from './creative.js';
import { recordChange } from './progress.js';
import { sfx } from '../core/sound.js';
import { input } from '../ui/input.js';
import { isDead } from '../entities/health.js';
import { setSneak } from './modes.js';

// Blok numaraları: ray (eksen belirsiz, komşuya bakılır), vagonlu ray (x ya da z ekseni)
export const RAY_X = 156, CART_Z = 157, CART_X = 158;
const RAY_Z = N.RAY;

function reg(id, name, color, base, tile, flat, cat) {
  TYPES[id] = { name, color, base };
  FACE_TILES[id] = [tileOf(tile), tileOf(tile), tileOf(tile)];
  eco.inv[id] = 0; eco.raw[id] = base; eco.trend[id] = 0;
  if (flat) addFlat(id);
  if (cat != null && !CATS[cat][1].includes(id)) CATS[cat][1].push(id);
}
reg(N.RAY, 'Ray', 0x9a9aa0, 20, 'ingotI', false, 0);
reg(N.VAGON, 'Vagon', 0xb0b0b8, 80, 'ironB', true, 3);
BOXES[RAY_Z] = BOXES[RAY_X] = [0, 0, 0, 1, 0.1, 1];
BOXES[CART_Z] = BOXES[CART_X] = [0.06, 0.1, 0.06, 0.94, 0.4, 0.94];

const I = N.DEMIR_KULCE, S = N.CUBUK;
RECIPES.push({ out: [N.RAY, 16], pat: [[I, 0, I], [I, S, I], [I, 0, I]] });
RECIPES.push({ out: [N.VAGON, 1], pat: [[I, 0, I], [I, I, I]] });

const commit = (x, y, z, t) => { recordChange(x, y, z, t); if (G.online) G.online.sendBlock(x, y, z, t); };
const isRail = t => t === RAY_Z || t === RAY_X;
const isCart = t => t === CART_Z || t === CART_X;
const isAnyRail = t => isRail(t) || isCart(t);
const axisOf = t => (t === RAY_X || t === CART_X ? 'x' : 'z');
const railOf = a => (a === 'x' ? RAY_X : RAY_Z);
const cartOf = a => (a === 'x' ? CART_X : CART_Z);
export const isCartBlock = isCart;

// Bir hücrenin hangi yönlere ray bağladığı (komşu ray/vagon varlığına göre)
// dirs: [dx, dz] listesi. Ekseni olmayan ray için komşulara bakar.
const DIRS = { '+x': [1, 0], '-x': [-1, 0], '+z': [0, 1], '-z': [0, -1] };
function links(x, y, z) {
  const out = [];
  for (const k in DIRS) {
    const [dx, dz] = DIRS[k];
    if (isAnyRail(get(x + dx, y, z + dz))) out.push(k);
  }
  return out;
}

// Ray: baktığın yöne göre konur. Komşu raylar hesaba katılmaz, eksen bakış yönüdür.
export function placeRail() {
  if (!prev) return;
  const [x, y, z] = prev, o = get(x, y, z);
  if ((o !== 0 && o !== TALL) || !solid(x, y - 1, z)) return toast('Ray sağlam zemine konur');
  if (!isCreative() && (eco.inv[N.RAY] || 0) < 1) return toast('Ray yok');
  const ax = Math.abs(Math.sin(P.yaw)) > Math.abs(Math.cos(P.yaw)) ? 'x' : 'z';
  set(x, y, z, railOf(ax)); commit(x, y, z, railOf(ax));
  if (!isCreative()) eco.inv[N.RAY]--;
  sfx.place(); rebuild(); drawHud();
}

// Vagon: rayın üstündeki hücreye, rayın eksenine göre konur
export function placeCart() {
  if (!target) return toast('Vagonu rayın üstüne bakarak koy');
  const [x, y, z] = target, t = get(x, y, z);
  if (!isRail(t)) return toast('Vagonu raya bakarak koy');
  if (!isCreative() && (eco.inv[N.VAGON] || 0) < 1) return toast('Vagon yok');
  set(x, y, z, cartOf(axisOf(t))); commit(x, y, z, cartOf(axisOf(t)));
  if (!isCreative()) eco.inv[N.VAGON]--;
  sfx.place(); rebuild(); drawHud();
}
export const useCart = placeCart;

// Sürüş durumu
let ride = null; // { x, y, z, px, pz, dir: [dx,dz] }
export function rideCart(p) {
  if (ride || !isCart(get(p[0], p[1], p[2]))) return;
  const ax = axisOf(get(p[0], p[1], p[2]));
  ride = { x: p[0], y: p[1], z: p[2], px: p[0] + 0.5, pz: p[2] + 0.5, dir: ax === 'x' ? [1, 0] : [0, 1] };
  P.riding = true; P.kx = P.kz = 0;
  toast('🚃 İleri tuşuyla ilerle, 🧎 ile in');
}
function dismount() {
  if (!ride) return;
  P.riding = false;
  P.x = ride.px; P.z = ride.pz; P.y = ride.y + 0.45; P.vy = 0; P.fallY = P.y; P.ground = false;
  ride = null;
  setSneak(false);
}

// Vagon hücreye varınca bağlı yönlerden birini seçer (bakış yönüne en yakın, geri dönüş dahil)
function pickDir(cx, cy, cz, came) {
  const opts = links(cx, cy, cz).map(k => DIRS[k]).filter(([dx, dz]) => !(dx === -came[0] && dz === -came[1]));
  if (!opts.length) {
    // Tek yön: geldiği yönün tersi (geri dönüş) tek seçenek olabilir
    const back = links(cx, cy, cz).map(k => DIRS[k]);
    return back.length ? back.find(([dx, dz]) => dx === -came[0] && dz === -came[1]) || null : null;
  }
  const fwd = [-Math.sin(P.yaw), -Math.cos(P.yaw)];
  opts.sort((a, b) => (b[0] * fwd[0] + b[1] * fwd[1]) - (a[0] * fwd[0] + a[1] * fwd[1]));
  return opts[0];
}

let last = performance.now();
(function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!ride) return;
  if (!G.room || isDead() || P.sneak) return dismount();
  if (!isCart(get(ride.x, ride.y, ride.z))) return dismount();

  // Bakış yönü ileri/geri yönünü belirler
  const f = -input.jy + (input.keys.KeyW ? 1 : 0) - (input.keys.KeyS ? 1 : 0);
  if (Math.abs(f) < 0.2) {
    ride.px = ride.x + 0.5; ride.pz = ride.z + 0.5;
  } else {
    const sgn = f > 0 ? 1 : -1;
    const step = 4 * dt * sgn;
    const [dx, dz] = ride.dir;
    let nx = ride.px + dx * step, nz = ride.pz + dz * step;
    const ox = ride.px, oz = ride.pz;
    const cx = Math.floor(nx), cz = Math.floor(nz);
    if (cx !== ride.x || cz !== ride.z) {
      // Yeni hücre: ray mi, boş mu? (vagonlu hücreye girilmez)
      const nt = get(cx, ride.y, cz);
      if (!isRail(nt) || !isLoaded(cx, cz)) {
        nx = ride.x + 0.5 + (cx === ride.x ? (dx * 0.45) : 0);
        nz = ride.z + 0.5 + (cz === ride.z ? (dz * 0.45) : 0);
        if (cx !== ride.x) nz = ride.z + 0.5; else nx = ride.x + 0.5;
        ride.px = nx; ride.pz = nz;
        // duvara çarptı: dur
      } else {
        // Geçiş yapılacak: hücre sınırında bağlantıya bak
        const from = [ride.x, ride.z];
        const came = [Math.sign(cx - ride.x), Math.sign(cz - ride.z)];
        const nd = pickDir(cx, ride.y, cz, came);
        if (!nd) { nx = ox; nz = oz; }
        else {
          const a2 = axisOf(nt);
          set(ride.x, ride.y, ride.z, railOf(axisOf(get(ride.x, ride.y, ride.z)))); commit(ride.x, ride.y, ride.z, railOf(axisOf(get(ride.x, ride.y, ride.z))));
          set(cx, ride.y, cz, cartOf(a2)); commit(cx, ride.y, cz, cartOf(a2));
          ride.x = cx; ride.z = cz; ride.dir = nd;
          void from;
          nx = cx + 0.5; nz = cz + 0.5;
        }
        ride.px = nx; ride.pz = nz;
      }
    } else {
      // Aynı hücrede: sadece eksende ilerle
      ride.px = nx; ride.pz = nz;
    }
  }
  P.x = ride.px; P.z = ride.pz; P.y = ride.y + 0.4; P.vy = 0; P.fallY = P.y; P.ground = true;
})(last);
