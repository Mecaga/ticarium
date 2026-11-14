import { N } from '../world/idtable.js';
import { TYPES, CATS, BOXES, get, set, rebuild, prev, solid, target } from '../world/world.js';
import { FACE_TILES, tileOf, addFlat } from '../world/textures.js';
import { eco } from './economy.js';
import { RECIPES } from './recipes.js';
import { toast, drawHud } from '../ui/ui.js';
import { P } from '../entities/player.js';
import { G } from '../core/state.js';
import { isCreative } from './creative.js';
import { recordChange } from './progress.js';
import { sfx } from '../core/sound.js';

const SL = [
  [N.BASAMAK_MESE, 'Meşe basamak', 'woodSide', N.TAHTA],
  [N.BASAMAK_HUS, 'Huş basamak', 'birchSide', N.HUS_ODUN],
  [N.BASAMAK_TAS, 'Taş basamak', 'stone', N.TAS]
];
for (const [id, name, tile, src] of SL) {
  TYPES[id] = { name, color: 0x999999, base: 6 };
  FACE_TILES[id] = [tileOf(tile), tileOf(tile), tileOf(tile)];
  eco.inv[id] = 0; eco.raw[id] = 6; eco.trend[id] = 0;
  if (!CATS[0][1].includes(id)) CATS[0][1].push(id);
  BOXES[id] = [0, 0, 0, 1, 0.5, 1];
  RECIPES.push({ out: [id, 6], pat: [[src, src, src]] });
}
export const isSlab = t => SL.some(s => s[0] === t);

const LAD = N.TIRMANMA_MERDIVEN;
TYPES[LAD] = { name: 'Merdiven', color: 0x8c6434, base: 8 };
FACE_TILES[LAD] = [tileOf('stick'), tileOf('stick'), tileOf('stick')];
eco.inv[LAD] = 0; eco.raw[LAD] = 8; eco.trend[LAD] = 0;
if (!CATS[0][1].includes(LAD)) CATS[0][1].push(LAD);
BOXES[LAD] = [0.1, 0, 0.1, 0.9, 1, 0.2];
const S = N.CUBUK;
RECIPES.push({ out: [LAD, 3], pat: [[S, 0, S], [S, S, S], [S, 0, S]] });

const commit = (x, y, z, t) => { recordChange(x, y, z, t); if (G.online) G.online.sendBlock(x, y, z, t); };

export function placeStair(t) {
  if (!prev) return;
  const [x, y, z] = prev;
  if (get(x, y, z) !== 0) return;
  if (!isCreative() && (eco.inv[t] || 0) < 1) return toast('Eşya yok');
  set(x, y, z, t); commit(x, y, z, t);
  if (!isCreative()) eco.inv[t]--;
  sfx.place(); rebuild(); drawHud();
}

// Merdivende ileri tuşuyla tırman (her karede çağrılır)
let last = performance.now();
(function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!G.room || P.fly) return;
  const bx = Math.floor(P.x), bz = Math.floor(P.z);
  const inLad = get(bx, Math.floor(P.y + 0.5), bz) === LAD || get(bx, Math.floor(P.y + 1.2), bz) === LAD;
  if (!inLad) return;
  P.fallY = P.y;
  if (P.sneak) { P.vy = 0; return; }
  const up = (window.__fwd || 0) > 0.2;
  P.vy = up ? 4 : -1.5;
  P.y += P.vy * dt;
})(last);
export const LADDER = LAD;
