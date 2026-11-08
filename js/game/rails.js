import { N } from '../world/idtable.js';
import { TYPES, CATS, BOXES, get, set, rebuild, prev, target, solid } from '../world/world.js';
import { FACE_TILES, tileOf, addFlat } from '../world/textures.js';
import { eco } from './economy.js';
import { RECIPES } from './recipes.js';
import { toast, drawHud } from '../ui/ui.js';
import { P } from '../entities/player.js';
import { G } from '../core/state.js';
import { isCreative } from './creative.js';
import { recordChange } from './progress.js';
import { sfx } from '../core/sound.js';

function reg(id, name, color, base, tile, flat, cat) {
  TYPES[id] = { name, color, base };
  FACE_TILES[id] = [tileOf(tile), tileOf(tile), tileOf(tile)];
  eco.inv[id] = 0; eco.raw[id] = base; eco.trend[id] = 0;
  if (flat) addFlat(id);
  if (cat != null && !CATS[cat][1].includes(id)) CATS[cat][1].push(id);
}
reg(N.RAY, 'Ray', 0x9a9aa0, 20, 'ingotI', false, 0);
reg(N.VAGON, 'Vagon', 0xb0b0b8, 80, 'ironB', true, 3);
BOXES[N.RAY] = [0, 0, 0, 1, 0.1, 1];   // ince levha: üstünden yürünür

const I = N.DEMIR_KULCE, S = N.CUBUK;
RECIPES.push({ out: [N.RAY, 16], pat: [[I, 0, I], [I, S, I], [I, 0, I]] });
RECIPES.push({ out: [N.VAGON, 1], pat: [[I, 0, I], [I, I, I]] });

const commit = (x, y, z, t) => { recordChange(x, y, z, t); if (G.online) G.online.sendBlock(x, y, z, t); };

export function placeRail() {
  if (!prev) return;
  const [x, y, z] = prev;
  if (get(x, y, z) !== 0 || !solid(x, y - 1, z)) return toast('Ray sağlam zemine konur');
  if (!isCreative() && (eco.inv[N.RAY] || 0) < 1) return toast('Ray yok');
  set(x, y, z, N.RAY); commit(x, y, z, N.RAY);
  if (!isCreative()) eco.inv[N.RAY]--;
  sfx.place(); rebuild(); drawHud();
}

// Vagon: raya bakıp Koy ile biner, ray boyunca ilerler, eğilince iner
let ride = null;
export function useCart() {
  if (ride) return;
  if (!target || get(target[0], target[1], target[2]) !== N.RAY) return toast('Vagonu raya bakarak kullan');
  ride = { x: target[0] + 0.5, y: target[1], z: target[2] + 0.5, dx: -Math.sin(P.yaw), dz: -Math.cos(P.yaw) };
  if (Math.abs(ride.dx) > Math.abs(ride.dz)) { ride.dx = Math.sign(ride.dx); ride.dz = 0; } else { ride.dz = Math.sign(ride.dz); ride.dx = 0; }
  toast('🚃 Vagondasın. İnmek için 🧎');
}
let last = performance.now();
(function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (t - last) / 1000); last = t;
  if (!ride) return;
  if (P.sneak || !G.room) { ride = null; return; }
  const nx = ride.x + ride.dx * 6 * dt, nz = ride.z + ride.dz * 6 * dt;
  if (get(Math.floor(nx), Math.floor(ride.y), Math.floor(nz)) !== N.RAY) { ride = null; toast('Ray bitti'); return; }
  ride.x = nx; ride.z = nz;
  P.x = nx; P.z = nz; P.y = ride.y + 0.15; P.vy = 0; P.fallY = P.y;
})(last);
