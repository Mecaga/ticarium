// Blok yüz PNG'lerini yükler. Her dosya ayrı THREE.Texture olarak önbelleğe alınır.
// Dosya yoksa null döner; çağıran taraf mevcut atlas dokusunu kullanır.

const BASE = 'js/world/textures/blocks/';
const cache = new Map();   // "ad/yuz" -> THREE.Texture | null
const loading = new Set();

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

export const ICON_BLOCKS = Object.keys(BLOCK_FACES);

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
      if (hooks.onLoad) hooks.onLoad(key);
    };
    img.onerror = () => { loading.delete(key); cache.set(key, null); };
    img.src = path;
  }
  return null;
}

// Yükleme bitince çağrılır. world.js bunu chunk'ları yeniden çizmek için kullanır.
export const hooks = { onLoad: null };

export function faceTexture(block, face) {
  const tryKey = f => {
    const key = block + '/' + f;
    const v = cache.get(key);
    if (v !== undefined) return v;
    load(key, BASE + block + '/' + f + '.png');
    return undefined;
  };
  const primary = tryKey(face);
  if (primary) return primary;
  if (primary === undefined) return null;
  if (face !== 'side') {
    const side = tryKey('side');
    if (side) return side;
  }
  return null;
}

export function iconTexture(block) {
  return faceTexture(block, 'icon');
}

export function preloadBlocks() {
  for (const b in BLOCK_FACES) {
    for (const f of BLOCK_FACES[b]) load(b + '/' + f, BASE + b + '/' + f + '.png');
    load(b + '/icon', BASE + b + '/icon.png');
  }
}

export const PNG_NAME = {};
