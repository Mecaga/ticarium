import { eco } from './economy.js';
import { TYPES } from '../world/world.js';
import { isCreative } from './creative.js';

export const SLOTS = 27, STACK = 64;

// Çanta yerleşimi: her hücre bir eşya türü (0 = boş). Sayılar eco.inv'den gelir.
export function layout() {
  if (!Array.isArray(eco.layout) || eco.layout.length !== SLOTS) eco.layout = new Array(SLOTS).fill(0);
  return eco.layout;
}

const need = t => Math.ceil((eco.inv[t] || 0) / STACK);

export function usedSlots() {
  let n = 0;
  for (const t in TYPES) n += need(+t);
  return n;
}

export function canAdd(t, n = 1) {
  const cur = eco.inv[t] || 0;
  return usedSlots() - need(t) + Math.ceil((cur + n) / STACK) <= SLOTS;
}

// Sığan kadarını ekler, eklenen sayıyı döndürür
export function addItem(t, n = 1) {
  const cur = eco.inv[t] || 0;
  const room = (SLOTS - usedSlots() + need(t)) * STACK - cur;
  const a = Math.max(0, Math.min(n, room));
  eco.inv[t] = cur + a;
  return a;
}

// Yerleşimi sayılarla uyumlu tutar: fazla slotları boşaltır, eksikleri ilk boş yere koyar
export function syncLayout() {
  if (isCreative()) return;
  const L = layout(), have = {};
  for (let i = 0; i < SLOTS; i++) {
    const t = L[i];
    if (!t) continue;
    if ((have[t] || 0) >= need(t)) L[i] = 0;
    else have[t] = (have[t] || 0) + 1;
  }
  for (const k in TYPES) {
    const t = +k, n = need(t);
    let h = have[t] || 0;
    while (h < n) {
      const j = L.indexOf(0);
      if (j < 0) break;
      L[j] = t; h++;
    }
  }
}

// 27 elemanlı dizi: { t, n } ya da null (boş slot)
export function slotInfo() {
  syncLayout();
  const L = layout(), seen = {}, out = [];
  for (let i = 0; i < SLOTS; i++) {
    const t = L[i];
    if (!t) { out.push(null); continue; }
    const p = seen[t] = (seen[t] || 0) + 1;
    const total = eco.inv[t] || 0, nn = need(t);
    out.push({ t, n: p < nn ? STACK : total - STACK * (nn - 1) });
  }
  return out;
}

export function swapSlots(a, b) {
  const L = layout(), x = L[a];
  L[a] = L[b]; L[b] = x;
}
