import { N } from '../idtable.js';

// Blok yüz ve ikon PNG'lerini yükler. Her dosya ayrı THREE.Texture olarak önbelleğe alınır.
// Dosya yoksa null döner; çağıran taraf atlas dokusunu kullanır.

const BASE = 'js/world/textures/blocks/';
const cache = new Map();   // "ad/yuz" -> THREE.Texture | null (404 ise null)
const loading = new Set();
const listeners = [];

// Bir dosya yüklendiğinde (ya da yüklenemediğinde) fn(anahtar) çağrılır
export function onBlockLoad(fn) { listeners.push(fn); }

// Oyun blok numarası -> PNG klasör adı
export const PNG_NAME = {
  [N.ODUN]: 'oak_log', [N.YAPRAK]: 'oak_leaves', [N.TAHTA]: 'oak_planks',
  [N.HUS_ODUN]: 'birch_log', [N.HUS_YAPRAK]: 'birch_leaves',
  [N.KUM]: 'sand', [N.CAKIL]: 'gravel', [N.TUGLA]: 'brick', [N.KAR]: 'snow',
  [N.KOMUR_CEVHERI]: 'coal_ore', [N.DEMIR_CEVHERI]: 'iron_ore', [N.ALTIN_CEVHERI]: 'gold_ore', [N.ELMAS_CEVHERI]: 'diamond_ore',
  [N.ALTIN_BLOK]: 'gold_block', [N.DEMIR_BLOK]: 'iron_block', [N.ELMAS_BLOK]: 'diamond_block', [N.REDSTONE_BLOK]: 'redstone_block',
  [N.SANDIK]: 'chest', [N.OCAK]: 'furnace', [N.MUZIK_KUTUSU]: 'jukebox',
  // Oyunun 8 yün rengi, 16 renkli dosya listesinden eşlendi (istersen buradan değiştirebilirsin)
  [N.YUN]: 'wool_white', [N.BEYAZ_YUN]: 'wool_white', [N.MOR_YUN]: 'wool_purple', [N.SARI_YUN]: 'wool_yellow',
  [N.KIRMIZI_YUN]: 'wool_red', [N.MAVI_YUN]: 'wool_blue', [N.TURUNCU_YUN]: 'wool_orange',
  [N.PEMBE_YUN]: 'wool_pink', [N.YESIL_YUN]: 'wool_green',
  [N.BASAMAK_MESE]: 'oak_slab', [N.BASAMAK_HUS]: 'birch_slab',
  [N.KAR_1]: 'snow', [N.KAR_2]: 'snow', [N.KAR_3]: 'snow'
};

// Blok adı -> dosyası olabilecek yüzler (ön yükleme için)
export const BLOCK_FACES = {
  oak_log: ['top', 'side'], oak_planks: ['side'], oak_slab: ['side'], oak_leaves: ['side'],
  birch_log: ['top', 'side'], birch_planks: ['side'], birch_slab: ['side'], birch_leaves: ['side'],
  spruce_log: ['top', 'side'], spruce_planks: ['side'], spruce_slab: ['side'], spruce_leaves: ['side'],
  sand: ['side'], gravel: ['side'], brick: ['side'], snow: ['side'],
  coal_block: ['side'], iron_block: ['side'], gold_block: ['side'], diamond_block: ['side'], redstone_block: ['side'],
  coal_ore: ['side'], iron_ore: ['side'], gold_ore: ['side'], diamond_ore: ['side'],
  chest: ['top', 'bottom', 'side', 'front'],
  furnace: ['top', 'bottom', 'side', 'front'],
  jukebox: ['top', 'bottom', 'side'],
  wool_white: ['side'], wool_orange: ['side'], wool_magenta: ['side'], wool_light_blue: ['side'],
  wool_yellow: ['side'], wool_lime: ['side'], wool_pink: ['side'], wool_gray: ['side'],
  wool_light_gray: ['side'], wool_cyan: ['side'], wool_purple: ['side'], wool_blue: ['side'],
  wool_brown: ['side'], wool_green: ['side'], wool_red: ['side'], wool_black: ['side']
};

function load(key, path) {
  if (cache.has(key)) return cache.get(key);
  if (!loading.has(key)) {
    loading.add(key);
    const img = new Image();
    img.onload = () => {
      loading.delete(key);
      const tex = new THREE.Texture(img);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      cache.set(key, tex);
      listeners.forEach(f => f(key));
    };
    img.onerror = () => {
      loading.delete(key);
      cache.set(key, null);
      listeners.forEach(f => f(key));
    };
    img.src = path;
  }
  return null;
}

export function faceTexture(block, face) {
  const have = BLOCK_FACES[block] || ['side'];
  const f = have.includes(face) ? face : 'side';
  const get = k => {
    const key = block + '/' + k;
    const v = cache.get(key);
    if (v !== undefined) return v;
    load(key, BASE + key + '.png');
    return undefined;
  };
  const v = get(f);
  if (v) return v;
  if (v === undefined) return null;                               // yükleniyor
  if (f !== 'side') { const s = get('side'); if (s) return s; }   // dosya yok: yan yüze düş
  return null;
}

// Blok ikonu (envanter). İkon dosyası yoksa yan yüze DÜŞMEZ, null döner.
export function iconTexture(block) {
  const key = block + '/icon';
  const v = cache.get(key);
  if (v !== undefined) return v;
  load(key, BASE + key + '.png');
  return null;
}

export function preloadBlocks() {
  for (const b in BLOCK_FACES) {
    for (const f of BLOCK_FACES[b]) faceTexture(b, f);
    iconTexture(b);
  }
}
