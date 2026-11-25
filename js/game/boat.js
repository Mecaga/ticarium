import { N } from '../world/idtable.js';
import { TYPES, CATS, BOXES, get, set, rebuild, isLoaded, wtarget, WATER } from '../world/world.js';
import { FACE_TILES, tileOf, addFlat } from '../world/textures.js';
import { PNG_NAME } from '../world/textures/blockmap.js';
import { eco } from './economy.js';
import { RECIPES } from './recipes.js';
import { toast, drawHud } from '../ui/ui.js';
import { P } from '../entities/player.js';
import { G } from '../core/state.js';
import { isDead } from '../entities/health.js';
import { isCreative } from './creative.js';
import { recordChange } from './progress.js';
import { sfx } from '../core/sound.js';
import { input } from '../ui/input.js';
import { setSneak } from './modes.js';

// Kayık: suya bakıp Koy ile konur (dünyada blok, 173). Binince bakış yönüne süzülür.
export const BOAT_B = N.KAYIK_BLOK;
const DX = [0, 1, 0, -1], DZ = [-1, 0, 1, 0];                 // 0 kuzey, 1 doğu, 2 güney, 3 batı
const SPEED = 2.5;                                             // hücre / saniye
const BOAT_BOX = [0.05, -0.12, 0.05, 0.95, 0.28, 0.95];       // alt kısım su yüzeyinin altına iner

function reg(id, name, color, base) {
  TYPES[id] = { name, color, base };
  eco.inv[id] = 0; eco.raw[id] = base; eco.trend[id] = 0;
}
reg(BOAT_B, 'Tekne blok', 0x8c6434, 10);
reg(N.KAYIK, 'Kayık', 0x8c6434, 60);
BOXES[BOAT_B] = BOAT_BOX;
FACE_TILES[BOAT_B] = [tileOf('planks'), tileOf('planks'), tileOf('planks')];
PNG_NAME[BOAT_B] = 'oak_planks';
addFlat(N.KAYIK);
if (!CATS[3][1].includes(N.KAYIK)) CATS[3][1].push(N.KAYIK);
RECIPES.push({ out: [N.KAYIK, 1], pat: [[N.TAHTA, 0, N.TAHTA], [N.TAHTA, N.TAHTA, N.TAHTA]] });

const commit = (x, y, z, t) => { recordChange(x, y, z, t); if (G.online) G.online.sendBlock(x, y, z, t); };
const put = (x, y, z, t) => { set(x, y, z, t); commit(x, y, z, t); };
export const isBoat = t => t === BOAT_B;

let ride = null;   // { x, y, z: kayık hücresi, dir: yön, prog: hücre merkezinden ofset (-0.5..0.5) }

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
  put(nx, y, nz, BOAT_B);
  ride.x = nx; ride.z = nz;
  return true;
}

// Oyuncuyu kayığın içine koyar (hücre merkezi + ofset)
function seat() {
  P.x = ride.x + 0.5 + DX[ride.dir] * ride.prog;
  P.z = ride.z + 0.5 + DZ[ride.dir] * ride.prog;
  P.y = ride.y + 0.3;
  P.vy = 0; P.ground = true; P.fallY = P.y;
}

function dismount() {
  if (!ride) return;
  seat();
  P.riding = false;
  ride = null;
  setSneak(false);
}

// Yerleştirme: suya bakıp Koy. Kayık suyun hemen üstüne oturur.
export function placeBoat() {
  if (ride) return;
  if (!wtarget) return toast('Kayığı suya bakarak koy');
  const [x, y, z] = wtarget, by = y + 1;
  if (!isLoaded(x, z)) return;
  if (get(x, by, z) !== 0) return toast('Burada yer yok');
  if (!isCreative() && (eco.inv[N.KAYIK] || 0) < 1) return toast('Kayık yok');
  put(x, by, z, BOAT_B);
  if (!isCreative()) eco.inv[N.KAYIK]--;
  sfx.place(); rebuild(); drawHud();
}

// Binme: kayık bloğuna bakıp Koy
export function rideBoat(p) {
  if (ride || P.riding) return;
  const [x, y, z] = p;
  if (get(x, y, z) !== BOAT_B) return;
  ride = { x, y, z, dir: dirToward(false), prog: 0 };
  P.riding = true; P.kx = P.kz = 0;
  seat();
  toast('🚤 İleri tuşuyla ilerle, bakışınla yönü seç. 🧎 ile in');
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
    const want = dirToward(f < 0);
    if ((want & 1) !== (ride.dir & 1)) { ride.dir = want; ride.prog = 0; }   // dik yöne dönünce ortala
    ride.prog += (want === ride.dir ? 1 : -1) * SPEED * dt;
    while (ride.prog >= 0.5) {                 // ileri: kenara gelince kayık bir hücre kayar
      if (!step(ride.dir)) { ride.prog = 0.49; break; }
      ride.prog -= 1;
    }
    while (ride.prog < -0.5) {                 // geri
      if (!step((ride.dir + 2) & 3)) { ride.prog = -0.49; break; }
      ride.prog += 1;
    }
  }
  seat();
})(last);
