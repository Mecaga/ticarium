import { TYPES, CATS } from '../world/world.js';
import { FACE_TILES, tileOf, addFlat } from '../world/textures.js';
import { eco } from './economy.js';
import { RECIPES, WOOLANY } from './recipes.js';
import { SMELT } from '../ui/furnace.js';

const same = n => [tileOf(n), tileOf(n), tileOf(n)];
function reg(id, name, color, base, tile, cat) {
  TYPES[id] = { name, color, base };
  FACE_TILES[id] = same(tile);
  eco.inv[id] = 0; eco.raw[id] = base; eco.trend[id] = 0;
  if (cat != null) CATS[cat][1].push(id);
}
reg(186, 'Demir blok', 0xd8d8de, 150, 'ironB', 0);
reg(187, 'Elmas blok', 0x50e1d7, 500, 'diamB', 0);
reg(188, 'Beyaz lale', 0xf5f5f5, 8, 'tulipw', 1);
reg(116, 'Yeşil boya', 0x3ca03c, 8, 'dye6', 4);
reg(117, 'Beyaz boya', 0xf0f0f0, 8, 'dye7', 4);
reg(126, 'Yeşil yün', 0x3ca03c, 16, 'wc6', 0);
reg(127, 'Beyaz yün', 0xf0f0f0, 16, 'wc7', 0);
reg(189, 'Yumurta', 0xf5f0e1, 6, 'eggI', 4);
reg(190, 'Süt kovası', 0xf5f5fa, 50, 'milkB', 4);
reg(191, 'Hamur', 0xebd7aa, 14, 'dough', 2);
reg(192, 'Kek', 0xf0c8d2, 40, 'cake', 2);
reg(193, 'Marul', 0x78c850, 6, 'lettuce', 2);
reg(194, 'Pancar', 0x961e46, 6, 'beet', 2);
reg(195, 'Salatalık', 0x3c963c, 6, 'cucumber', 2);
reg(196, 'Salatalık salatası', 0xd23c32, 25, 'saladC', 2);
reg(197, 'Marul salatası', 0x82c85a, 22, 'saladL', 2);
reg(198, 'Pancar çorbası', 0x961e46, 28, 'soupB', 2);
reg(199, 'Domates çorbası', 0xd74628, 28, 'soupT', 2);
reg(200, 'Sebze çorbası', 0xe69632, 32, 'soupV', 2);
reg(201, 'Patates kızartması', 0xebbe46, 30, 'fries', 2);

// Yeni ekinlerin büyüme aşamaları (marul 210-213, pancar 214-217, salatalık 218-221)
for (let k = 5; k < 8; k++) for (let s = 0; s < 4; s++) FACE_TILES[210 + (k - 5) * 4 + s] = same('cr' + k + '_' + s);
for (let i = 6; i < 8; i++) { FACE_TILES[110 + i] = same('dye' + i); FACE_TILES[120 + i] = same('wc' + i); }
addFlat(116, 117);
for (let i = 188; i <= 201; i++) addFlat(i);
for (let i = 210; i <= 221; i++) addFlat(i);

export const FOODX = { 192: 10, 193: 2, 194: 3, 195: 2, 196: 6, 197: 5, 198: 7, 199: 7, 200: 9, 201: 8 };
export const NOPX = [189, 190, 191];

SMELT[150] = 201;   // çiğ patates -> patates kızartması

const R = (out, shapeless) => RECIPES.push({ out, shapeless });

// Demir ve elmas bloklar için 3x3 şekilli matris tarifleri
RECIPES.push({ out: [186, 1], pat: [[83, 83, 83], [83, 83, 83], [83, 83, 83]] });
RECIPES.push({ out: [187, 1], pat: [[85, 85, 85], [85, 85, 85], [85, 85, 85]] });

R([83, 9], [186]);
R([85, 9], [187]);
R([117, 2], [188]);                 // beyaz lale -> 2 beyaz boya
R([116, 2], [111, 113]);            // sarı + mavi = yeşil
R([114, 2], [111, 112]);            // sarı + kırmızı = turuncu
R([110, 2], [112, 113]);            // kırmızı + mavi = mor
R([115, 2], [117, 112]);            // beyaz + kırmızı = pembe
R([126, 1], [116, WOOLANY]);
R([127, 1], [117, WOOLANY]);
R([191, 1, 30], [74, 74, 74, 31]);  // 3 buğday + su kovası = hamur (+ boş kova)
R([192, 1, 30], [190, 191, 189]);   // süt kovası + hamur + yumurta = kek (+ boş kova)
R([196, 1], [152, 195]);
R([197, 1], [193, 154]);
R([198, 1], [194, 194, 154]);
R([199, 1], [152, 152, 154]);
R([200, 1], [151, 154, 150]);
CATS.forEach(c => { c[1] = [...new Set(c[1])]; });
