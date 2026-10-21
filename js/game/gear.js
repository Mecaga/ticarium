import { eco } from './economy.js';
import { isCreative } from './creative.js';

// Dayanıklılık (kaç kullanım). Alet, kılıç ve ileride zırh buraya eklenir.
export const MAXDUR = {
  50: 59, 51: 131, 52: 250, 53: 1561, 54: 2031,
  55: 250, 56: 250, 57: 59, 58: 131, 59: 59, 60: 131,
  61: 59, 62: 131, 63: 250, 64: 1561,
  65: 59, 66: 131, 67: 250, 68: 1561
};
export const isGear = t => !!MAXDUR[t];
export const stackOf = t => (MAXDUR[t] ? 1 : 64);   // aletler üst üste dizilmez

// Her alet kendi dayanıklılığını taşır: eco.dur[tür] = [birinci alet, ikinci alet, ...]
// Sayı uyuşmazsa eksikler tam dayanıklılıkla tamamlanır, fazlalar atılır.
export function durList(t) {
  let a = eco.dur[t];
  if (!a) a = eco.dur[t] = [];
  if (!isCreative()) {
    const n = eco.inv[t] || 0;
    while (a.length < n) a.push(MAXDUR[t]);
    if (a.length > n) a.length = n;
  }
  return a;
}

export function durFrac(t, i = 0) {
  if (!MAXDUR[t] || isCreative()) return 1;
  const a = durList(t);
  return a.length > i ? Math.max(0, a[i] / MAXDUR[t]) : 1;
}

// Kullanılan alet aşınır. true döner: alet kırıldı.
export function wear(t, amt = 1) {
  if (!MAXDUR[t] || isCreative() || (eco.inv[t] || 0) < 1) return false;
  const a = durList(t);
  a[0] -= amt;
  if (a[0] > 0) return false;
  a.shift();
  eco.inv[t]--;
  return true;
}

// Çantadan bir aleti çıkarır (yere atmak için), dayanıklılığını döndürür
export function takeInstance(t, idx = 0) {
  const a = durList(t);
  const d = a.splice(idx, 1)[0];
  eco.inv[t] = Math.max(0, (eco.inv[t] || 0) - 1);
  return d != null ? d : MAXDUR[t];
}

// Yeşil (tam) → sarı → kırmızı (bitmek üzere)
export const barColor = f => 'hsl(' + Math.round(Math.max(0, Math.min(1, f)) * 120) + ',85%,45%)';

// Kayıt için: gerçek çanta sayısına göre dayanıklılık listeleri
export function durSnapshot(real) {
  const o = {};
  for (const k in MAXDUR) {
    const t = +k, n = real[t] || 0;
    if (n < 1) continue;
    const a = (eco.dur[t] || []).slice(0, n);
    while (a.length < n) a.push(MAXDUR[t]);
    o['t' + t] = a;
  }
  return o;
}
