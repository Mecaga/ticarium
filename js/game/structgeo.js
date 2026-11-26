import { N } from '../world/idtable.js';

// Yapı geometrisi (saf fonksiyonlar). structures.js ve structwire.js ortak kullanır.
// ax:'corner' yapılar: blok taban alanının bir köşesidir. Blok değerinin yön bitleri (0-3) yapıyı döndürür.
// Kanonik ön yüz kuzeydedir; yön r ise ön yüz r yönüne (oyuncuya) bakar.
// ax yoksa (eski yapılar): blok merkezde kalır, dönmez.

export const DX = [0, 1, 0, -1], DZ = [-1, 0, 1, 0];   // 0 kuzey, 1 doğu, 2 güney, 3 batı
export const DIR_NAME = ['kuzey', 'doğu', 'güney', 'batı'];

// Kanonik (x,z) hücresinin bloğa göre saat yönünde r × 90° döndürülmüş konumu.
// Blok (0,0) hücresidir ve dönüşte kendi köşesinde kalır.
export function toRel(x, z, r) {
  if (r === 1) return [-z, x];
  if (r === 2) return [-x, -z];
  if (r === 3) return [z, -x];
  return [x, z];
}

// Kanonik hücre -> bloğa göre konum (ortalı yapılarda eski merkez ofseti)
export function relOf(sp, x, z, r) {
  if (sp.ax !== 'corner') return [x - Math.floor(sp.W / 2), z - Math.floor(sp.D / 2)];
  return toRel(x, z, r);
}

// Taban alanı: bloğa göre hücre indeksleri (uç hücreler dahil)
export function footprint(sp, r) {
  if (sp.ax !== 'corner') {
    const x0 = -Math.floor(sp.W / 2), z0 = -Math.floor(sp.D / 2);
    return { x0, x1: x0 + sp.W - 1, z0, z1: z0 + sp.D - 1 };
  }
  const p = [[0, 0], [sp.W - 1, 0], [0, sp.D - 1], [sp.W - 1, sp.D - 1]].map(([x, z]) => toRel(x, z, r));
  const xs = p.map(q => q[0]), zs = p.map(q => q[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
}

// Kapı (240-255) ve sandık/ocak yönü (kanonik kuzey = 0) r kez döner
export function rotVal(v, r) {
  if (!r) return v;
  if (v >= 240 && v <= 255) return (v & ~3) | ((v + r) & 3);
  if (v === N.SANDIK || v === N.OCAK) return v | ((r & 3) << 8);
  return v;
}
