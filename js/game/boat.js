import { N } from '../world/idtable.js';
import { TYPES, CATS, BOXES, MBOX, get, set, rebuild, isLoaded, wtarget, WATER } from '../world/world.js';
import { FACE_TILES, tileOf, addFlat } from '../world/textures.js';
import { eco } from './economy.js';
import { RECIPES } from './recipes.js';
import { toast, drawHud } from '../ui/ui.js';
import { P, freeSpotNear } from '../entities/player.js';
import { G } from '../core/state.js';
import { isDead } from '../entities/health.js';
import { isCreative } from './creative.js';
import { recordChange } from './progress.js';
import { sfx } from '../core/sound.js';
import { input } from '../ui/input.js';
import { setSneak } from './modes.js';

// Kayık: suya bakıp Koy ile konur (dünyada blok 173). Blok değerinin yön bitleri burnun yönünü tutar.
export const BOAT_B = N.KAYIK_BLOK;
const DX = [0, 1, 0, -1], DZ = [-1, 0, 1, 0];
const SPEED = 2.5;      // hücre / saniye
const SEAT_H = 0.8;     // binince kamera yüksekliği (kenarların üstünden bakar)

function reg(id, name, color, base) {
  TYPES[id] = { name, color, base };
  eco.inv[id] = 0; eco.raw[id] = base; eco.trend[id] = 0;
}
reg(BOAT_B, 'Tekne blok', 0x8c6434, 10);
reg(N.KAYIK, 'Kayık', 0x8c6434, 60);
const WOOD = [tileOf('planks'), tileOf('planks'), tileOf('planks')];
BOXES[BOAT_B] = [0.05, 0, 0.05, 0.95, 0.3, 0.95];   // seçim ve çarpışma kutusu
FACE_TILES[BOAT_B] = WOOD;
addFlat(N.KAYIK);
if (!CATS[3][1].includes(N.KAYIK)) CATS[3][1].push(N.KAYIK);
RECIPES.push({ out: [N.KAYIK, 1], pat: [[N.TAHTA, 0, N.TAHTA], [N.TAHTA, N.TAHTA, N.TAHTA]] });

// Açık tekne modeli: taban (suyun altı), 4 kenar ve daha yüksek bir baş. f: burnun yönü.
const PROW = [[0.3, 0, 0.04, 0.7, 0.42, 0.16], [0.84, 0, 0.3, 0.96, 0.42, 0.7], [0.3, 0, 0.84, 0.7, 0.42, 0.96], [0.04, 0, 0.3, 0.16, 0.42, 0.7]];
MBOX[BOAT_B] = (x, y, z, f) => [
  [[0.06, -0.12, 0.06, 0.94, 0, 0.94], WOOD],   // taban (suyun altında kalır)
  [[0.04, 0, 0.04, 0.96, 0.28, 0.12], WOOD],    // kuzey kenar
  [[0.04, 0, 0.88, 0.96, 0.28, 0.96], WOOD],    // güney kenar
  [[0.04, 0, 0.12, 0.12, 0.28, 0.88], WOOD],    // batı kenar
  [[0.88, 0, 0.12, 0.96, 0.28, 0.88], WOOD],    // doğu kenar
  [PROW[f & 3], WOOD]                            // baş
];

const commit = (x, y, z, t) => { recordChange(x, y, z, t); if (G.online) G.online.sendBlock(x, y, z, t); };
const put = (x, y, z, t) => { set(x, y, z, t); commit(x, y, z, t); };
const boatVal = dir => BOAT_B | (dir << 8);
export const isBoat = t => t === BOAT_B;

let ride = null;   // { x, y, z: kayık hücresi, dir: burnun yönü, prog: hücre merkezinden ofset (-0.5..0.5) }

// Bakış yönüne en yakın hücre yönü. back: ters yön.
function dirToward(back) {
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
  let best = 0, bd = -9;
  for (let d = 0; d < 4; d++) {
    const dot = DX[d] * fx + DZ[d] * fz;
    if (dot > bd) { bd = dot; best = d; }
  }
  return back ? (best + 2) & 3 : best;
}

// Kayığı bir hücre taşır. Hedef su üstü ve boş olmalı.
function step(d) {
  const nx = ride.x + DX[d], nz = ride.z + DZ[d], y = ride.y;
  if (!isLoaded(nx, nz) || get(nx, y - 1, nz) !== WATER || get(nx, y, nz) !== 0) return false;
  put(ride.x, y, ride.z, 0);
  put(nx, y, nz, boatVal(ride.dir));
  ride.x = nx; ride.z = nz;
  return true;
}

// Oyuncuyu kayığın içine oturtur: hücre merkezi ve burna doğru ofset
function seat() {
  P.x = ride.x + 0.5 + DX[ride.dir] * ride.prog;
  P.z = ride.z + 0.5 + DZ[ride.dir] * ride.prog;
  P.y = ride.y + 0.02;
  P.vy = 0; P.ground = true; P.fallY = P.y;
}

// Yerleştirme: suya bakıp Koy. Kayık suyun üstüne oturur, burnu sana bakar.
export function placeBoat() {
  if (ride) return;
  if (!wtarget) return toast('Kayığı suya bakarak koy');
  const [x, y, z] = wtarget, by = y + 1;
  if (!isLoaded(x, z)) return;
  if (get(x, by, z) !== 0) return toast('Burada yer yok');
  if (!isCreative() && (eco.inv[N.KAYIK] || 0) < 1) return toast('Kayık yok');
  put(x, by, z, boatVal(dirToward(false)));
  if (!isCreative()) eco.inv[N.KAYIK]--;
  sfx.place(); rebuild(); drawHud();
}

// Binme: kayık bloğuna bakıp Koy
export function rideBoat(p) {
  if (ride || P.riding) return;
  const [x, y, z] = p;
  if (get(x, y, z) !== BOAT_B) return;
  ride = { x, y, z, dir: dirToward(false), prog: 0 };
  put(x, y, z, boatVal(ride.dir));   // burun bakış yönüne döner
  P.riding = true; P.seatH = SEAT_H; P.kx = P.kz = 0;
  seat();
  toast('🚤 İleri tuşuyla ilerle. 🧎 ile in');
}

function dismount() {
  if (!ride) return;
  const s = freeSpotNear(ride.x, ride.y, ride.z);   // kıyıda boş ve destekli yer
  P.seatH = 0; setSneak(false);
  if (s) { P.x = s.x; P.y = s.y; P.z = s.z; }
  else P.y = ride.y + 0.5;
  P.vy = 0; P.fallY = P.y; P.ground = false;
  ride = null;
}

let last = performance.now();
(function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!ride) return;
  if (!G.room || isDead() || P.sneak || get(ride.x, ride.y, ride.z) !== BOAT_B) return dismount();
  const f = -input.jy + (input.keys.KeyW ? 1 : 0) - (input.keys.KeyS ? 1 : 0);
  if (Math.abs(f) > 0.2) {
    const want = dirToward(f < 0);                  // geri tuşunda tersi: kayık geri gider
    if (want !== ride.dir) {                         // yön değişti: burun döner, sen ortalanırsın
      ride.dir = want; ride.prog = 0;
      put(ride.x, ride.y, ride.z, boatVal(want));
    }
    ride.prog += SPEED * dt;
    while (ride.prog >= 0.5) {
      if (!step(ride.dir)) { ride.prog = 0.49; break; }   // kıyıya geldi: dur
      ride.prog -= 1;
    }
  }
  seat();
})(last);
