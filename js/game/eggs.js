import { N } from '../world/idtable.js';
import { prev, target } from '../world/world.js';
import { eco } from './economy.js';
import { RECIPES } from './recipes.js';
import { toast, drawHud } from '../ui/ui.js';
import { spawnMob } from '../entities/mobs.js';
import { isCreative } from './creative.js';
import { G } from '../core/state.js';

const E = [[N.INEK_YUMURTASI, 'cow', N.ET], [N.KOYUN_YUMURTASI, 'sheep', N.YUN], [N.TAVUK_YUMURTASI, 'chicken', N.BUGDAY_TOHUMU]];
E.forEach(([id, , ing]) => RECIPES.push({ out: [id, 1], shapeless: [N.YUMURTA, ing] }));
export const isEgg = t => E.some(e => e[0] === t);

export function useEgg(t) {
  const r = G.room;
  if (!r) return;
  if (!(r.solo || r.sim)) return toast('Yumurtayı odada sadece oda yönetimi olan oyuncu kullanabilir');
  if (!isCreative() && (eco.inv[t] || 0) < 1) return toast('Yumurta yok');
  const p = prev || (target ? [target[0], target[1] + 1, target[2]] : null);
  if (!p) return toast('Yere bakıp Koy\'a bas');
  spawnMob(E.find(e => e[0] === t)[1], p[0] + 0.5, p[1] + 0.05, p[2] + 0.5);
  if (!isCreative()) eco.inv[t]--;
  drawHud();
}
