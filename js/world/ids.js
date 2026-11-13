import { TYPES, CATS } from './world.js';
import { FACE_TILES } from './textures.js';
import { RECIPES } from '../game/recipes.js';
import { N, ESKI, BLOK } from './idtable.js';

export { N, ESKI, BLOK };

export function ID(ad) {
  const k = String(ad).toLowerCase();
  for (const id in TYPES) if (TYPES[id].name.toLowerCase() === k) return +id;
  return 0;
}
export const yeniNo = t => (ESKI[t] !== undefined ? ESKI[t] : t);

// Çıktısı ya da malzemesi olmayan eşya olan tarifleri listeden siler
function yetimTarifleriSil() {
  const gec = tok => typeof tok === 'string' || tok === 0 || !!TYPES[tok];
  let silinen = [];
  for (let i = RECIPES.length - 1; i >= 0; i--) {
    const r = RECIPES[i], girdi = r.pat ? [].concat(...r.pat) : r.shapeless;
    if (!TYPES[r.out[0]] || !girdi.every(gec)) { silinen.push(r.out[0]); RECIPES.splice(i, 1); }
  }
  return silinen;
}

const ATLA = [
  'SU', 'LAV', 'KATMAN_KAYASI', 'YATAK_SONU', 'BUGDAY_0', 'BUGDAY_1', 'BUGDAY_2', 'BUGDAY_3', 'KAR_1', 'KAR_2', 'KAR_3',
  'REDSTONE_CEVHERI', 'AMBER', 'SEKER_KAMISI', 'KAGIT', 'SEKER', 'CAKMAK_TASI', 'KOFTE_PATATES', 'SOMON', 'HAMSI',
  'KIRPI_BALIGI', 'BALON_BALIGI', 'PISMIS_SOMON', 'PISMIS_HAMSI', 'PISMIS_BALON_BALIGI', 'RENK_KITABI', 'DEFTER', 'YENILEYICI',
  'TNT', 'OLTA', 'CANTA_BOGCA', 'ALTIN_MIGFER', 'ALTIN_ZIRH', 'ALTIN_PANTOLON', 
  'ALTIN_BOT', 'AKASYA_ODUN', 'AKASYA_YAPRAK', 'BUYUK_ORMAN_ODUN', 'BUYUK_ORMAN_YAPRAK', 'SAMANLIK', 'ORUMCEK_YUMURTASI'
  // KIL_BLOK, KIL ve PISMIS_TUGLA clay.js'te kayıtlı olduğu için ATLA'ya gerek yok.
];

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
  // numara tablosu (idtable.js) ile gerçek kayıt uyuşuyor mu
  const kul = {};
  for (const ad in BLOK) kul[BLOK[ad]] = ad;
  for (const ad in N) {
    if (kul[N[ad]]) sorun.push('TABLODA ÇAKIŞMA: ' + ad + ' ve ' + kul[N[ad]] + ' aynı numara ' + N[ad]);
    kul[N[ad]] = ad;
    if (!TYPES[N[ad]] && !(N[ad] >= 180 && N[ad] <= 182) && !ATLA.includes(ad)) sorun.push('TABLODA VAR, OYUNDA YOK: ' + ad + ' = ' + N[ad]);
  }
  for (const id in TYPES) if (!kul[id]) sorun.push('TABLODA YOK: ' + id + ' ' + TYPES[id].name + ' (idtable.js\'e ekle)');
  return sorun;
}

setTimeout(() => {
  const sil = yetimTarifleriSil();
  if (sil.length) console.warn('ids.js: eski eşyaya ait ' + sil.length + ' yetim tarif silindi (çıktı numaraları: ' + sil.join(', ') + ')');
  const s = denetle();
  if (s.length) console.warn('ids.js denetimi: ' + s.length + ' sorun\n' + s.join('\n'));
  else console.log('ids.js denetimi: sorun yok ✅ (' + Object.keys(TYPES).length + ' eşya)');
}, 3000);
