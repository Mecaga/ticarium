import { eco } from './economy.js';
import { TYPES } from '../world/world.js';
import { hp, healFull } from '../entities/health.js';
import { drawHud } from '../ui/ui.js';

const mode = { creative: false, saved: null };
export const isCreative = () => mode.creative;

// Yaratıcı: tüm eşyalar çantada, hasar yok. Normale dönünce eski çanta geri gelir.
export function setCreative(on) {
  if (on === mode.creative) return;
  if (on) {
    mode.saved = Object.assign({}, eco.inv);
    for (const t in TYPES) eco.inv[t] = 64;
    hp.god = true;
    healFull();
  } else {
    if (mode.saved) for (const t in TYPES) eco.inv[t] = mode.saved[t] || 0;
    mode.saved = null;
    hp.god = false;
  }
  mode.creative = on;
  drawHud();
}

// Kayıt için gerçek (survival) çanta
export const survivalInv = () => (mode.creative && mode.saved ? mode.saved : eco.inv);

export function resetMode() {
  mode.creative = false;
  mode.saved = null;
  hp.god = false;
}
