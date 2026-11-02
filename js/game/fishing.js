import { N } from '../world/idtable.js';
import { TYPES, CATS, get, set, rebuild, wtarget, target, prev, isLoaded } from '../world/world.js';
import { eco } from './economy.js';
import { RECIPES } from './recipes.js';
import { SMELT } from '../ui/furnace.js';
import { toast, drawHud } from '../ui/ui.js';
import { addItem } from './inventory.js';
import { isCreative } from './creative.js';
import { hurt } from '../entities/health.js';
import { P } from '../entities/player.js';
import { G } from '../core/state.js';
import { recordChange } from './progress.js';
import { sfx } from '../core/sound.js';
import { MAXDUR } from './gear.js';
import { FOODX } from './content.js';

function reg(id, name, color, base, cat) {
  TYPES[id] = { name, color, base };
  eco.inv[id] = 0; eco.raw[id] = base; eco.trend[id] = 0;
  if (cat != null) CATS[cat][1].push(id);
}
reg(N.OLTA, 'Olta', 0x8c6434, 40, 3);
reg(N.SOMON, 'Somon', 0xe8836a, 12, 2);
reg(N.HAMSI, 'Hamsi', 0xaab4c8, 8, 2);
reg(N.KIRPI_BALIGI, 'Kirpi balığı', 0xb89a50, 6, 2);
reg(N.BALON_BALIGI, 'Balon balığı', 0xd8d070, 10, 2);
reg(N.PISMIS_SOMON, 'Pişmiş somon', 0xc86a40, 24, 2);
reg(N.PISMIS_HAMSI, 'Pişmiş hamsi', 0x8a8a98, 16, 2);
reg(N.PISMIS_BALON_BALIGI, 'Pişmiş balon balığı', 0xb8b050, 20, 2);
reg(N.CAKMAK_TASI, 'Çakmaktaşı', 0x444448, 20, 4);
reg(N.TNT, 'TNT', 0xd03030, 60, 0);
MAXDUR[N.OLTA] = 64; MAXDUR[N.CAKMAK_TASI] = 64;

Object.assign(FOODX, { [N.SOMON]: 3, [N.HAMSI]: 2, [N.BALON_BALIGI]: 2, [N.PISMIS_SOMON]: 9, [N.PISMIS_HAMSI]: 6, [N.PISMIS_BALON_BALIGI]: 7 });
Object.assign(SMELT, { [N.SOMON]: N.PISMIS_SOMON, [N.HAMSI]: N.PISMIS_HAMSI, [N.BALON_BALIGI]: N.PISMIS_BALON_BALIGI });

const S = N.CUBUK, I = N.IP;
RECIPES.push({ out: [N.OLTA, 1], pat: [[0, 0, S], [0, S, I], [S, 0, I]] });
RECIPES.push({ out: [N.CAKMAK_TASI, 1], shapeless: [N.CAKIL, N.DEMIR_KULCE] });
RECIPES.push({ out: [N.TNT, 1], pat: [[N.KUM, N.CAKIL, N.KUM], [N.CAKIL, N.KUM, N.CAKIL], [N.KUM, N.CAKIL, N.KUM]] });

// Balık tutma: suya bakıp Koy
let fishing = 0;
export function useRod() {
  if (fishing) return;
  if (!wtarget) return toast('Oltayı suya bakarak kullan');
  fishing = 1;
  toast('🎣 Balık bekleniyor...');
  setTimeout(() => {
    fishing = 0;
    const r = Math.random();
    const t = r < 0.4 ? N.HAMSI : r < 0.75 ? N.SOMON : r < 0.9 ? N.BALON_BALIGI : N.KIRPI_BALIGI;
    addItem(t, 1);
    sfx.splash(); drawHud();
    toast('🐟 ' + TYPES[t].name + ' tuttun!');
  }, 3000);
}

// TNT: çakmaktaşıyla yakılır, 3 sn sonra patlar
const commit = (x, y, z, t) => { recordChange(x, y, z, t); if (G.online) G.online.sendBlock(x, y, z, t); };
function boom(x, y, z) {
  if (get(x, y, z) !== N.TNT) return;
  set(x, y, z, 0); commit(x, y, z, 0);
  const R = 3;
  for (let dx = -R; dx <= R; dx++) for (let dy = -R; dy <= R; dy++) for (let dz = -R; dz <= R; dz++) {
    if (dx * dx + dy * dy + dz * dz > R * R + 1) continue;
    const bx = x + dx, by = y + dy, bz = z + dz, t = get(bx, by, bz);
    if (!t || t === N.KATMAN_KAYASI || t === N.OBSIDIYEN) continue;
    if (t === N.TNT) { fuse(bx, by, bz, 0.4); continue; }
    set(bx, by, bz, 0); commit(bx, by, bz, 0);
  }
  const d = Math.hypot(P.x - x, P.y - y, P.z - z);
  if (d < 6) hurt(Math.round((6 - d) * 2), { name: 'TNT' });
  sfx.hit(); rebuild();
}
function fuse(x, y, z, sec) { setTimeout(() => boom(x, y, z), sec * 1000); }

export function useFlint(tb) {
  if (!tb || get(tb[0], tb[1], tb[2]) !== N.TNT) return false;
  toast('💥 3 saniye!');
  fuse(tb[0], tb[1], tb[2], 3);
  return true;
}
