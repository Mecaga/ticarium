import { N } from '../world/idtable.js';
import { TYPES, CATS } from '../world/world.js';
import { FACE_TILES, tileOf, addFlat } from '../world/textures.js';
import { eco } from './economy.js';
import { RECIPES } from './recipes.js';
import { SMELT } from '../ui/furnace.js';

function reg(id, name, color, base, tile, flat, cat) {
  TYPES[id] = { name, color, base };
  FACE_TILES[id] = [tileOf(tile), tileOf(tile), tileOf(tile)];
  eco.inv[id] = 0; eco.raw[id] = base; eco.trend[id] = 0;
  if (flat) addFlat(id);
  if (!CATS[cat][1].includes(id)) CATS[cat][1].push(id);
}
reg(N.KIL_BLOK, 'Kil blok', 0x9aa5b8, 10, 'sand', false, 0);
reg(N.KIL, 'Kil', 0x8a96aa, 5, 'coal', true, 4);
reg(N.PISMIS_TUGLA, 'Pişmiş tuğla', 0xb5493a, 12, 'ingotI', true, 4);

SMELT[N.KIL] = N.PISMIS_TUGLA;
const T = N.PISMIS_TUGLA;
RECIPES.push({ out: [N.TUGLA, 1], pat: [[T, T], [T, T]] });
RECIPES.push({ out: [N.KIL_BLOK, 1], pat: [[N.KIL, N.KIL], [N.KIL, N.KIL]] });
