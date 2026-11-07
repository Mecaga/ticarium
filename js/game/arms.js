import { N } from '../world/idtable.js';
import { TYPES, CATS } from '../world/world.js';
import { FACE_TILES, tileOf, addFlat } from '../world/textures.js';
import { eco } from './economy.js';
import { RECIPES } from './recipes.js';
import { MAXDUR } from './gear.js';
import { ARMOR } from './armor.js';

function reg(id, name, color, base, tile, flat, cat) {
  TYPES[id] = { name, color, base };
  FACE_TILES[id] = [tileOf(tile), tileOf(tile), tileOf(tile)];
  eco.inv[id] = 0; eco.raw[id] = base; eco.trend[id] = 0;
  if (flat) addFlat(id);
  if (cat != null && !CATS[cat][1].includes(id)) CATS[cat][1].push(id);
}
reg(N.YAY, 'Yay', 0x8c6434, 50, 'stick', true, 3);
reg(N.OK, 'Ok', 0xcccccc, 4, 'stick', true, 3);
reg(N.DERI_MIGFER, 'Deri miğfer', 0x8a5a2a, 40, 'helmI', true, 3);
reg(N.DERI_ZIRH, 'Deri zırh', 0x8a5a2a, 70, 'chestI', true, 3);
reg(N.DERI_PANTOLON, 'Deri pantolon', 0x8a5a2a, 60, 'legI', true, 3);
reg(N.DERI_BOT, 'Deri bot', 0x8a5a2a, 35, 'bootI', true, 3);
MAXDUR[N.YAY] = 384;
Object.assign(MAXDUR, { [N.DERI_MIGFER]: 55, [N.DERI_ZIRH]: 80, [N.DERI_PANTOLON]: 75, [N.DERI_BOT]: 65 });
Object.assign(ARMOR, {
  [N.DERI_MIGFER]: ['head', 1], [N.DERI_ZIRH]: ['chest', 3], [N.DERI_PANTOLON]: ['legs', 2], [N.DERI_BOT]: ['feet', 1]
});

const S = N.CUBUK, I = N.IP, D = N.DERI, C = N.CAKIL, W = N.YUN;
RECIPES.push({ out: [N.YAY, 1], pat: [[0, S, I], [S, 0, I], [0, S, I]] });
RECIPES.push({ out: [N.OK, 4], pat: [[C], [S], [W]] });
RECIPES.push({ out: [N.DERI_MIGFER, 1], pat: [[D, D, D], [D, 0, D]] });
RECIPES.push({ out: [N.DERI_ZIRH, 1], pat: [[D, 0, D], [D, D, D], [D, D, D]] });
RECIPES.push({ out: [N.DERI_PANTOLON, 1], pat: [[D, D, D], [D, 0, D], [D, 0, D]] });
RECIPES.push({ out: [N.DERI_BOT, 1], pat: [[D, 0, D], [D, 0, D]] });
