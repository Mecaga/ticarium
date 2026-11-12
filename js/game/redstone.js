import { N } from '../world/idtable.js';
import { TYPES, CATS, BOXES, get, set, rebuild, prev, target, solid } from '../world/world.js';
import { FACE_TILES, tileOf, addFlat } from '../world/textures.js';
import { eco } from './economy.js';
import { RECIPES } from './recipes.js';
import { toast, drawHud } from '../ui/ui.js';
import { G } from '../core/state.js';
import { isCreative } from './creative.js';
import { recordChange } from './progress.js';
import { sfx } from '../core/sound.js';

export const LEVER_ON = 78;   // açık şalter (sadece blok)

function reg(id, name, color, base, tile, flat, cat) {
  TYPES[id] = { name, color, base };
  FACE_TILES[id] = [tileOf(tile), tileOf(tile), tileOf(tile)];
  eco.inv[id] = 0; eco.raw[id] = base; eco.trend[id] = 0;
  if (flat) addFlat(id);
  if (cat != null && !CATS[cat][1].includes(id)) CATS[cat][1].push(id);
}
reg(N.SALTER, 'Şalter', 0x888888, 15, 'stick', false, 0);
reg(N.REDSTONE_BLOK, 'Redstone blok', 0xc02020, 60, 'brick', false, 0);
FACE_TILES[LEVER_ON] = [tileOf('brick'), tileOf('brick'), tileOf('brick')];
BOXES[N.SALTER] = [0.35, 0, 0.35, 0.65, 0.5, 0.65];
BOXES[LEVER_ON] = [0.35, 0, 0.35, 0.65, 0.75, 0.65];

RECIPES.push({ out: [N.SALTER, 1], pat: [[N.CUBUK], [N.TAS]] });
RECIPES.push({ out: [N.REDSTONE_BLOK, 1], pat: [[N.KOMUR, N.KOMUR, N.KOMUR], [N.KOMUR, N.KOMUR, N.KOMUR], [N.KOMUR, N.KOMUR, N.KOMUR]] });

const commit = (x, y, z, t) => { recordChange(x, y, z, t); if (G.online) G.online.sendBlock(x, y, z, t); };

export function placeLever() {
  if (!prev) return;
  const [x, y, z] = prev;
  if (get(x, y, z) !== 0 || !solid(x, y - 1, z)) return toast('Şalter sağlam zemine konur');
  if (!isCreative() && (eco.inv[N.SALTER] || 0) < 1) return toast('Şalter yok');
  set(x, y, z, N.SALTER); commit(x, y, z, N.SALTER);
  if (!isCreative()) eco.inv[N.SALTER]--;
  sfx.place(); rebuild(); drawHud();
}

export function isLever(t) { return t === N.SALTER || t === LEVER_ON; }
export function toggleLever(p) {
  const [x, y, z] = p, on = get(x, y, z) === LEVER_ON, nt = on ? N.SALTER : LEVER_ON;
  set(x, y, z, nt); commit(x, y, z, nt);
  sfx.place(); rebuild();
  toast(on ? 'Şalter kapalı' : '🔴 Şalter açık');
    }
