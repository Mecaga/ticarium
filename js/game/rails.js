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

// Blok numaraları: doğu-batı ray, vagonlu kuzey-güney ray, vagonlu doğu-batı ray
export const RAY_X = 156, CART_Z = 157, CART_X = 158;

function reg(id, name, color, base, tile, flat, cat) {
  TYPES[id] = { name, color, base };
  FACE_TILES[id] = [tileOf(tile), tileOf(tile), tileOf(tile)];
  eco.inv[id] = 0; eco.raw[id] = base; eco.trend[id] = 0;
  if (flat) addFlat(id);
  if (cat != null && !CATS[cat][1].includes(id)) CATS[cat][1].push(id);
}
reg(N.RAY, 'Ray', 0x9a9aa0, 20, 'ingotI', false, 0);
reg(N.VAGON, 'Vagon', 0xb0b0b8, 80, 'ironB', true, 3);
BOXES[N.RAY] = BOXES[RAY_X] = [0, 0, 0, 1, 0.1, 1];
// Vagon: rayın hemen üstünde alçak platform (yüzüyormuş gibi değil, raya oturur)
BOXES[CART_Z] = BOXES[CART_X] = [0.06, 0.1, 0.06, 0.94, 0.4, 0.94];

const I = N.DEMIR_KULCE, S = N.CUBUK;
RECIPES.push({ out: [N.RAY, 16], pat: [[I, 0, I], [I, S, I], [I, 0, I]] });
RECIPES.push({ out: [N.VAGON, 1], pat: [[I, 0, I], [I, I, I]] });

const commit = (x, y, z, t) => { recordChange(x, y, z, t); if (G.online) G.online.sendBlock(x, y, z, t); };
const isRail = t => t === N.RAY || t === RAY_X;
export const isCartBlock = t => t === CART_Z || t === CART_X;
const axisOf = t => (t === RAY_X || t === CART_X ? 'x' : 'z');
const railOf = a => (a === 'x' ? RAY_X : N.RAY);
const cartOf = a => (a === 'x' ? CART_X : CART_Z);

// Ray: baktığın yöne göre konur. Eksen = baktığın yön.
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

// Vagon: rayın üstündeki hücreye konur. Dolu hücreye (başka vagon ya da blok) konmaz.
export function placeCart() {
  if (!target) return toast('Vagonu rayın üstüne bakarak koy');
  const [x, y, z] = target, t = get(x, y, z);
  if (!isRail(t)) return toast('Vagonu raya bakarak koy');
  if (!isCreative() && (eco.inv[N.VAGON] || 0) < 1) return toast('Vagon yok');
  const cur = get(x, y, z);
  if (isCartBlock(cur)) return toast('Burada zaten vagon var');
  set(x, y, z, cartOf(axisOf(t))); commit(x, y, z, cartOf(axisOf(t)));
  if (!isCreative()) eco.inv[N.VAGON]--;
  sfx.place(); rebuild(); drawHud();
}
export const useCart = placeCart;

// Sürüş: vagon, bulunduğu rayın ekseni boyunca hareket eder
let ride = null;   // { x, z, y, px, pz, sign }
export function rideCart(p) {
  if (ride || !isCartBlock(get(p[0], p[1], p[2]))) return;
  ride = { x: p[0], y: p[1], z: p[2], px: p[0] + 0.5, pz: p[2] + 0.5, sign: 1 };
  P.riding = true; P.kx = P.kz = 0;
  toast('🚃 İleri tuşuyla ilerle, 🧎 ile in');
}
function dismount() {
  if (!ride) return;
  P.riding = false;
  // İnerken önündeki boş ve zemini olan yere in
  P.x = ride.px; P.z = ride.pz; P.y = ride.y + 0.45; P.vy = 0; P.fallY = P.y; P.ground = false;
  ride = null;
  setSneak(false);
}

let last = performance.now();
(function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!ride) return;
  if (!G.room || isDead() || P.sneak) return dismount();
  const cur = get(ride.x, ride.y, ride.z);
  if (!isCartBlock(cur)) return dismount();   // vagon kırıldı

  const ax = axisOf(cur);
  // Bakış yönü ray ekseninde hangi tarafa bakıyorsa oraya git
  const comp = ax === 'x' ? -Math.sin(P.yaw) : -Math.cos(P.yaw);
  if (Math.abs(comp) > 0.15) ride.sign = comp > 0 ? 1 : -1;
  const f = -input.jy + (input.keys.KeyW ? 1 : 0) - (input.keys.KeyS ? 1 : 0);

  if (Math.abs(f) > 0.2) {
    const step = 4 * dt * (f > 0 ? 1 : -1) * ride.sign;
    let nx = ride.px, nz = ride.pz;
    if (ax === 'x') nx += step; else nz += step;
    const cx = Math.floor(nx), cz = Math.floor(nz);
    if (cx !== ride.x || cz !== ride.z) {
      const nt = get(cx, ride.y, cz);
      // Sadece ray olan ve boş (vagonsuz) hücreye geç; duvar ya da başka vagon varsa dur
      if (isRail(nt) && isLoaded(cx, cz)) {
        const a2 = axisOf(nt);
        set(ride.x, ride.y, ride.z, railOf(ax)); commit(ride.x, ride.y, ride.z, railOf(ax));
        set(cx, ride.y, cz, cartOf(a2)); commit(cx, ride.y, cz, cartOf(a2));
        ride.x = cx; ride.z = cz;
        if (a2 !== ax) { nx = cx + 0.5; nz = cz + 0.5; }
      } else {
        nx = ride.px; nz = ride.pz;   // duvar ya da ray bitti: dur
      }
    }
    ride.px = nx; ride.pz = nz;
  }
  // Vagon eksende hizalı kalır
  if (axisOf(get(ride.x, ride.y, ride.z)) === 'x') ride.pz = ride.z + 0.5; else ride.px = ride.x + 0.5;
  P.x = ride.px; P.z = ride.pz; P.y = ride.y + 0.4; P.vy = 0; P.fallY = P.y; P.ground = true;
})(last);
