import { N } from '../world/idtable.js';
import { TYPES, CATS, BOXES, get, set, rebuild, prev, target, solid, isLoaded, TALL, variantHook } from '../world/world.js';
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

// Dünyada saklanan numaralar. Eksen numaranın kendisinde:
// 151 ray (kuzey-güney), 156 ray (doğu-batı), 157 vagon (kuzey-güney), 158 vagon (doğu-batı).
// Ray şekli (düz / köşe) dünyada saklanmaz, komşulara bakılarak çizilir.
export const RAY_X = 156, CART_Z = 157, CART_X = 158;
const RAY = N.RAY;

const DX = [0, 1, 0, -1], DZ = [-1, 0, 1, 0];                          // 0 kuzey(-z) 1 doğu(+x) 2 güney(+z) 3 batı(-x)
const SHAPE_OPEN = [[0, 2], [1, 3], [0, 1], [0, 3], [2, 1], [2, 3]];   // 0 KG, 1 DB, 2 KD, 3 KB, 4 GD, 5 GB
const SHAPE_VAR = [159, 162, 163, 167, 168, 169];                       // görünüm numaraları (dünyada saklanmaz)
const SHAPE_TEX = ['railNS', 'railEW', 'railNE', 'railNW', 'railSE', 'railSW'];
const RAIL_BOX = [0, 0, 0, 1, 0.1, 1];
const CART_BOX = [0.06, 0.1, 0.06, 0.94, 0.4, 0.94];
const SPEED = 3.5;   // hücre / saniye

const tex = n => { const t = tileOf(n); return t === undefined ? tileOf('stone') : t; };

// Görünüm kayıtları
SHAPE_VAR.forEach((id, i) => { const t = tex(SHAPE_TEX[i]); FACE_TILES[id] = [t, t, t]; BOXES[id] = RAIL_BOX; });
const cT = tex('railCartTop'), cS = tex('railCartSide');
for (const id of [CART_Z, CART_X]) { FACE_TILES[id] = [cT, cS, cS]; BOXES[id] = CART_BOX; }
BOXES[RAY] = BOXES[RAY_X] = RAIL_BOX;

function reg(id, name, color, base, tile, flat, cat) {
  TYPES[id] = { name, color, base };
  FACE_TILES[id] = [tex(tile), tex(tile), tex(tile)];
  eco.inv[id] = 0; eco.raw[id] = base; eco.trend[id] = 0;
  if (flat) addFlat(id);
  if (cat != null && !CATS[cat][1].includes(id)) CATS[cat][1].push(id);
}
reg(RAY, 'Ray', 0x9a9aa0, 20, 'railNS', false, 0);
reg(N.VAGON, 'Vagon', 0xb0b0b8, 80, 'railCartSide', true, 3);
FACE_TILES[RAY_X] = FACE_TILES[RAY];

const I = N.DEMIR_KULCE, S = N.CUBUK;
RECIPES.push({ out: [RAY, 16], pat: [[I, 0, I], [I, S, I], [I, 0, I]] });
RECIPES.push({ out: [N.VAGON, 1], pat: [[I, 0, I], [I, I, I]] });

const isCart = t => t === CART_Z || t === CART_X;
const isRail = t => t === RAY || t === RAY_X || isCart(t);
const axisOf = t => (t === RAY_X || t === CART_X ? 1 : 0);   // 1 = doğu-batı
export const isCartBlock = isCart;

const commit = (x, y, z, t) => { recordChange(x, y, z, t); if (G.online) G.online.sendBlock(x, y, z, t); };
const put = (x, y, z, t) => { set(x, y, z, t); commit(x, y, z, t); };

// Komşu bitmaskesi: bit 0 kuzey, 1 doğu, 2 güney, 3 batı (ray ya da vagon varsa)
function mask(x, y, z) {
  let m = 0;
  for (let d = 0; d < 4; d++) if (isRail(get(x + DX[d], y, z + DZ[d]))) m |= 1 << d;
  return m;
}

// Şekil komşulardan hesaplanır. Hiç komşu yoksa koyulduğu eksen kullanılır.
function shapeOf(x, y, z, raw) {
  const m = mask(x, y, z), n = m & 1, e = m & 2, s = m & 4, w = m & 8;
  if (n && s) return 0;                                              // düz (kavşakta da düz)
  if (e && w) return 1;
  if ((n || s) && (e || w)) return n ? (e ? 2 : 3) : (e ? 4 : 5);   // köşe
  if (n || s) return 0;
  if (e || w) return 1;
  return axisOf(raw);
}

// Çizim: ray şekline göre görünüm, vagon için sabit kutu
variantHook.fn = (raw, x, y, z) => {
  if (raw === RAY || raw === RAY_X) return SHAPE_VAR[shapeOf(x, y, z, raw)];
  if (raw === CART_X) return CART_Z;
  return raw;
};

// Ray: baktığın yöne göre konur (komşu yoksa eksen bakış yönüdür)
export function placeRail() {
  if (!prev) return;
  const [x, y, z] = prev, o = get(x, y, z);
  if ((o !== 0 && o !== TALL) || !solid(x, y - 1, z)) return toast('Ray sağlam zemine konur');
  if (!isCreative() && (eco.inv[RAY] || 0) < 1) return toast('Ray yok');
  const ax = Math.abs(Math.sin(P.yaw)) > Math.abs(Math.cos(P.yaw)) ? 1 : 0;
  put(x, y, z, ax ? RAY_X : RAY);
  if (!isCreative()) eco.inv[RAY]--;
  sfx.place(); rebuild(); drawHud();
}

// Vagon: rayın üstüne konur (rayın ekseniyle aynı)
export function placeCart() {
  if (!target) return toast('Vagonu rayın üstüne bakarak koy');
  const [x, y, z] = target, t = get(x, y, z);
  if (isCart(t)) return toast('Burada zaten vagon var');
  if (t !== RAY && t !== RAY_X) return toast('Vagonu raya bakarak koy');
  if (!isCreative() && (eco.inv[N.VAGON] || 0) < 1) return toast('Vagon yok');
  put(x, y, z, axisOf(t) ? CART_X : CART_Z);
  if (!isCreative()) eco.inv[N.VAGON]--;
  sfx.place(); rebuild(); drawHud();
}
export const useCart = placeCart;

// Sürüş durumu. u: 0 (ea kenarı) ile 1 (eb kenarı) arası konum. base: ileri tuşuna basınca gidilen yön (+1 eb'ye, -1 ea'ya).
let ride = null;

export function rideCart(p) {
  if (ride) return;
  const [x, y, z] = p, t = get(x, y, z);
  if (!isCart(t)) return;
  const o = SHAPE_OPEN[shapeOf(x, y, z, t)];
  ride = { x, y, z, ea: o[0], eb: o[1], u: 0.5, base: 1, moving: false };
  P.riding = true; P.kx = P.kz = 0;
  seat();
  toast('🚃 İleri tuşuyla ilerle, 🧎 ile in');
}

// Oyuncuyu vagonun yol üzerindeki konumuna koyar
function seat() {
  const cx = ride.x + 0.5, cz = ride.z + 0.5, u = ride.u, a = ride.ea, b = ride.eb;
  let px, pz;
  if (b === ((a + 2) & 3)) {                       // düz yol
    px = cx + DX[a] * (0.5 - u); pz = cz + DZ[a] * (0.5 - u);
  } else if (u <= 0.5) {                           // köşe: giriş kenarından merkeze
    const k = 0.5 * (1 - u * 2); px = cx + DX[a] * k; pz = cz + DZ[a] * k;
  } else {                                         // köşe: merkezden çıkış kenarına
    const k = 0.5 * (u - 0.5) * 2; px = cx + DX[b] * k; pz = cz + DZ[b] * k;
  }
  P.x = px; P.z = pz; P.y = ride.y + 0.4; P.vy = 0; P.fallY = P.y; P.ground = true;
}

// Hareket başlarken bakış yönüne en yakın çıkışı seç
function chooseBase() {
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
  const cx = DX[ride.eb] - DX[ride.ea], cz = DZ[ride.eb] - DZ[ride.ea];
  return fx * cx + fz * cz >= 0 ? 1 : -1;
}

// Vagonu komşu hücreye geçirir. Geçemezse false (duvar, boşluk, başka vagon, yüklü değil).
function step(side, over, forward) {
  const nx = ride.x + DX[side], nz = ride.z + DZ[side], y = ride.y;
  const nt = get(nx, y, nz);
  if (!isRail(nt) || isCart(nt) || !isLoaded(nx, nz)) return false;
  const entry = (side + 2) & 3;
  const o = SHAPE_OPEN[shapeOf(nx, y, nz, nt)];
  if (o[0] !== entry && o[1] !== entry) return false;
  const other = o[0] === entry ? o[1] : o[0];
  put(ride.x, y, ride.z, axisOf(get(ride.x, y, ride.z)) ? RAY_X : RAY);   // eski hücre ray olur
  put(nx, y, nz, axisOf(nt) ? CART_X : CART_Z);                          // yeni hücre vagon olur
  ride.x = nx; ride.z = nz;
  if (forward) { ride.ea = entry; ride.eb = other; ride.u = over; }
  else { ride.eb = entry; ride.ea = other; ride.u = 1 - over; }
  return true;
}

function advance(d) {
  ride.u += d;
  if (ride.u > 1) { if (!step(ride.eb, ride.u - 1, true)) ride.u = 1; }
  else if (ride.u < 0) { if (!step(ride.ea, -ride.u, false)) ride.u = 0; }
}

function dismount() {
  if (!ride) return;
  seat();
  P.riding = false;
  P.y = ride.y + 0.45;
  ride = null;
  setSneak(false);
}

let last = performance.now();
(function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!ride) return;
  if (!G.room || isDead() || P.sneak || !isCart(get(ride.x, ride.y, ride.z))) return dismount();
  const f = -input.jy + (input.keys.KeyW ? 1 : 0) - (input.keys.KeyS ? 1 : 0);
  const mv = Math.abs(f) > 0.2;
  if (mv && !ride.moving) ride.base = chooseBase();
  ride.moving = mv;
  if (mv) advance((f > 0 ? ride.base : -ride.base) * SPEED * dt);
  seat();
})(last);
