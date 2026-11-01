import { N } from '../world/idtable.js';
import { eco } from './economy.js';
import { TYPES } from '../world/world.js';
import { takeInstance } from './gear.js';
import { addItem, canAdd } from './inventory.js';
import { drawHud, toast } from '../ui/ui.js';
import { isCreative } from './creative.js';

// tür: [yuva, savunma puanı]
export const ARMOR = {
  [N.DEMIR_MIGFER]: ['head', 2], [N.DEMIR_ZIRH]: ['chest', 6], [N.DEMIR_PANTOLON]: ['legs', 5], [N.DEMIR_BOT]: ['feet', 2],
  [N.ELMAS_MIGFER]: ['head', 3], [N.ELMAS_ZIRH]: ['chest', 8], [N.ELMAS_PANTOLON]: ['legs', 6], [N.ELMAS_BOT]: ['feet', 3]
};
export const SLOTS4 = ['head', 'chest', 'legs', 'feet'];
export const isArmor = t => !!ARMOR[t];

export function defense() {
  let d = 0;
  for (const s of SLOTS4) { const t = eco.armor[s]; if (t) d += ARMOR[t][1]; }
  return d;
}

// Çantadaki zırhı giyer (p: aynı türün kaçıncı parçası). Eski parça çantaya döner.
export function equip(t, p = 0) {
  const a = ARMOR[t];
  if (!a || isCreative() || (eco.inv[t] || 0) < 1) return false;
  const slot = a[0], old = eco.armor[slot], oldD = eco.armDur[slot];
  const d = takeInstance(t, p);
  if (old) addItem(old, 1, oldD);
  eco.armor[slot] = t; eco.armDur[slot] = d;
  toast('🛡 ' + TYPES[t].name + ' giyildi');
  drawHud();
  return true;
}

export function unequip(slot) {
  const t = eco.armor[slot];
  if (!t) return;
  if (!canAdd(t, 1)) return toast('🎒 Çanta dolu');
  addItem(t, 1, eco.armDur[slot]);
  eco.armor[slot] = 0; eco.armDur[slot] = 0;
  drawHud();
}

// Gelen hasarı azaltır (düşme, boğulma, açlık ve boşluk hariç). Zırh parçaları aşınır.
export function reduce(d, src) {
  if (src.void || src.starve || src.drown || src.fall) return d;
  const def = defense();
  if (!def) return d;
  const w = Math.max(1, Math.floor(d / 4));
  for (const s of SLOTS4) {
    const t = eco.armor[s];
    if (!t) continue;
    eco.armDur[s] -= w;
    if (eco.armDur[s] <= 0) { toast('💥 ' + TYPES[t].name + ' kırıldı!'); eco.armor[s] = 0; eco.armDur[s] = 0; }
  }
  return d * (1 - Math.min(0.8, def * 0.04));
}
