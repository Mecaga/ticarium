import { N } from '../world/idtable.js';
import { eco } from './economy.js';
import { isCreative } from './creative.js';

// Dayanıklılık (kaç kullanım). Aletler, kılıçlar ve zırhlar.
export const MAXDUR = {
  [N.AHSAP_KAZMA]: 59, [N.TAS_KAZMA]: 131, [N.DEMIR_KAZMA]: 250, [N.ELMAS_KAZMA]: 1561,
  [N.AHSAP_BALTA]: 59, [N.TAS_BALTA]: 131, [N.DEMIR_BALTA]: 250, [N.ELMAS_BALTA]: 1561,
  [N.AHSAP_KUREK]: 59, [N.TAS_KUREK]: 131, [N.DEMIR_KUREK]: 250, [N.ELMAS_KUREK]: 1561,
  [N.AHSAP_CAPA]: 59, [N.TAS_CAPA]: 131, [N.DEMIR_CAPA]: 250, [N.ELMAS_CAPA]: 1561,
  [N.AHSAP_KILIC]: 59, [N.TAS_KILIC]: 131, [N.DEMIR_KILIC]: 250, [N.ELMAS_KILIC]: 1561,
  [N.DEMIR_MIGFER]: 165, [N.DEMIR_ZIRH]: 240, [N.DEMIR_PANTOLON]: 225, [N.DEMIR_BOT]: 195,
  [N.ELMAS_MIGFER]: 363, [N.ELMAS_ZIRH]: 528, [N.ELMAS_PANTOLON]: 495, [N.ELMAS_BOT]: 429,
  [N.MAKAS]: 238
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

// Çantadan bir aleti çıkarır (yere atmak ya da giymek için), dayanıklılığını döndürür
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
