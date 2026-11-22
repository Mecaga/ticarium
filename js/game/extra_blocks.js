import { N } from '../world/idtable.js';
import { TYPES, CATS } from '../world/world.js';
import { eco } from './economy.js';
import { RECIPES } from './recipes.js';

// Kömür bloğu ve çam blokları: tanım ve tarif. Kırılınca kendileri düşer.
function reg(id, name, color, base) {
  TYPES[id] = { name, color, base };
  eco.inv[id] = 0; eco.raw[id] = base; eco.trend[id] = 0;
  if (!CATS[0][1].includes(id)) CATS[0][1].push(id);
}
reg(N.KOMUR_BLOK, 'Kömür bloğu', 0x222226, 120);
reg(N.SPRUCE_ODUN, 'Çam odun', 0x54381f, 25);
reg(N.SPRUCE_TAHTA, 'Çam tahta', 0x6e4a28, 8);
reg(N.SPRUCE_YAPRAK, 'Çam yaprağı', 0x1c4a28, 5);

const K = N.KOMUR;
RECIPES.push({ out: [N.KOMUR_BLOK, 1], pat: [[K, K, K], [K, K, K], [K, K, K]] }); // 9 kömür -> kömür bloğu
RECIPES.push({ out: [K, 9], shapeless: [N.KOMUR_BLOK] });                          // kömür bloğu -> 9 kömür
RECIPES.push({ out: [N.SPRUCE_TAHTA, 4], shapeless: [N.SPRUCE_ODUN] });             // çam odun -> 4 çam tahta

// Kar topu: kürekle kırılan kar katmanından düşer
TYPES[N.KAR_TOPU] = { name: 'Kar topu', color: 0xf0f6ff, base: 2 };
eco.inv[N.KAR_TOPU] = 0; eco.raw[N.KAR_TOPU] = 2; eco.trend[N.KAR_TOPU] = 0;
if (!CATS[4][1].includes(N.KAR_TOPU)) CATS[4][1].push(N.KAR_TOPU);
