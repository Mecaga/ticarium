import { TYPES, CATS, prev, target, get } from '../world/world.js';
import { FACE_TILES, tileOf, addFlat } from '../world/textures.js';
import { eco } from './economy.js';
import { RECIPES } from './recipes.js';
import { toast, drawHud } from '../ui/ui.js';
import { spawnMob } from '../entities/mobs.js';
import { isCreative } from './creative.js';
import { G } from '../core/state.js';

const E = [[230, 'cow', 'İnek yumurtası', 0x9a6a3a, 15], [231, 'sheep', 'Koyun yumurtası', 0xeeeeee, 16], [232, 'chicken', 'Tavuk yumurtası', 0xf2d25a, 73]];
E.forEach(([id, , name, color, ing], i) => {
  TYPES[id] = { name, color, base: 30 };
  const t = tileOf('egg' + i);
  FACE_TILES[id] = [t, t, t];
  eco.inv[id] = 0; eco.raw[id] = 30; eco.trend[id] = 0;
  CATS[4][1].push(id);
  addFlat(id);
  RECIPES.push({ out: [id, 1], shapeless: [189, ing] });
});

export const isEgg = t => t >= 230 && t <= 232;

export function useEgg(t) {
  const r = G.room;
  if (!r) return;
  if (!(r.solo || r.sim)) return toast('Yumurtayı odada sadece oda yönetimi olan oyuncu kullanabilir');
  if (!isCreative() && (eco.inv[t] || 0) < 1) return toast('Yumurta yok');
  const p = prev || (target ? [target[0], target[1] + 1, target[2]] : null);
  if (!p) return toast('Yere bakıp Koy\'a bas');
  const kind = E.find(e => e[0] === t)[1];
  spawnMob(kind, p[0] + 0.5, p[1] + 0.05, p[2] + 0.5);
  if (!isCreative()) eco.inv[t]--;
  drawHud();
}
