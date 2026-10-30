
import { TYPES, CATS } from './world.js';
import { FACE_TILES } from './textures.js';

// Adım 3 için: eski kayıtlı numara -> yeni numara. Numara değiştirdikçe buraya yazılır.
export const ESKI = {};

// Eşya adından numara bulur: ID('Demir blok') -> 186
export function ID(ad) {
  const k = String(ad).toLowerCase();
  for (const id in TYPES) if (TYPES[id].name.toLowerCase() === k) return +id;
  return 0;
}

// Eski numarayı yeni numaraya çevirir (kayıt yüklerken kullanılacak)
export const yeniNo = t => (ESKI[t] !== undefined ? ESKI[t] : t);

// Denetim: sorunları liste olarak döndürür
export function denetle() {
  const sorun = [];
  const adlar = {};
  for (const id in TYPES) (adlar[TYPES[id].name] = adlar[TYPES[id].name] || []).push(id);
  for (const ad in adlar) if (adlar[ad].length > 1) sorun.push('KOPYA: "' + ad + '" numaraları ' + adlar[ad].join(', '));
  for (const id in TYPES) {
    const f = FACE_TILES[id];
    if (!f || f.some(v => !Number.isInteger(v))) sorun.push('DOKU YOK: ' + id + ' ' + TYPES[id].name);
  }
  CATS.forEach(c => {
    const gor = {};
    c[1].forEach(i => { gor[i] = (gor[i] || 0) + 1; if (!TYPES[i]) sorun.push('KATEGORİDE OLMAYAN NUMARA: ' + i + ' (' + c[0] + ')'); });
    for (const i in gor) if (gor[i] > 1) sorun.push('KATEGORİDE TEKRAR: ' + i + ' (' + c[0] + ')');
  });
  return sorun;
}

// Her şey yüklendikten sonra çalışır, sonucu 🐞 paneline yazar
setTimeout(() => {
  const s = denetle();
  if (s.length) console.warn('ids.js denetimi: ' + s.length + ' sorun\n' + s.join('\n'));
  else console.log('ids.js denetimi: sorun yok ✅ (' + Object.keys(TYPES).length + ' eşya)');
}, 3000);
