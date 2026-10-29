import { hash } from './textures/util.js';
import * as base from './textures/base_blocks.js';
import * as func from './textures/functional_blocks.js';
import * as bld from './textures/building_blocks.js';
import * as min from './textures/minerals.js';
import * as flo from './textures/flora_dye.js';
import * as mob from './textures/mobs.js';
import * as ply from './textures/player.js';
import * as tls from './textures/tools.js';
import * as fod from './textures/foods.js';
import * as crp from './textures/crops.js';
import * as arm from './textures/armor.js';
import * as ui from './textures/ui_items.js';

export { hash };
// [klasör adı, Türkçe ad, modül]. PNG yolu: textures/<klasör>/<doku adı>.png
const MODS = [
  ['base_blocks', 'Temel bloklar', base], ['functional_blocks', 'İşleme giren bloklar', func],
  ['building_blocks', 'Yapı blokları', bld], ['minerals', 'Madenler', min], ['flora_dye', 'Çiçekler ve boyalar', flo],
  ['mobs', 'Mob görünümleri', mob], ['player', 'Oyuncu görünümü', ply], ['tools', 'Aletler ve ekipmanlar', tls],
  ['foods', 'Yemekler', fod], ['crops', 'Tarla ürünleri', crp], ['armor', 'Zırhlar', arm], ['ui_items', 'Kitaplar ve arayüz', ui]
];

const TILE_NAMES = [], DEF = {}, CAT = {}, TI = {};
export const CAT_NAMES = {};
for (const [dir, label, m] of MODS) {
  CAT_NAMES[dir] = label;
  for (const n in m.tiles) {
    if (DEF[n]) { console.warn('Çift doku adı: ' + n); continue; }
    DEF[n] = m.tiles[n]; CAT[n] = dir; TI[n] = TILE_NAMES.length; TILE_NAMES.push(n);
  }
}
export const T = TILE_NAMES.length;
export const tileOf = n => TI[n];
export const tileNames = TILE_NAMES;
export const categoryOf = n => CAT[n] || 'diger';

export const FACE_TILES = {};
const FLAT = new Set();
for (const [dir, , m] of MODS) {
  for (const id in m.faces) {
    const f = m.faces[id], a = typeof f === 'string' ? [f, f, f] : f, t = a.map(n => TI[n]);
    if (t.some(v => v === undefined)) console.warn('Eksik doku: ' + dir + ' id ' + id + ' -> ' + a.join(','));
    else FACE_TILES[id] = t;
  }
  (m.flat || []).forEach(i => FLAT.add(i));
}
export const isFlat = t => FLAT.has(t);
export const addFlat = (...a) => a.forEach(i => FLAT.add(i));

export const atlas = { tex: null, T, cv: null };
export const sideTile = t => FACE_TILES[t][1];

function buildAtlas() {
  const cv = document.createElement('canvas');
  cv.width = 16 * T; cv.height = 16;
  const ctx = cv.getContext('2d');
  TILE_NAMES.forEach((name, i) => {
    const d = DEF[name];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      let k = d.spr ? 0.93 + hash(x, y, i) * 0.14 : 0.86 + hash(x, y, i) * 0.28;
      let col = d.c;
      if (d.px) {
        const r = d.px(x, y, i, k);
        if (r === null) continue;
        if (r) { col = r; if (r.length > 3) k = r[3]; }
      }
      ctx.fillStyle = 'rgb(' + (Math.min(255, col[0] * k) | 0) + ',' + (Math.min(255, col[1] * k) | 0) + ',' + (Math.min(255, col[2] * k) | 0) + ')';
      ctx.fillRect(i * 16 + x, y, 1, 1);
    }
  });
  atlas.cv = cv;
  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}
export function initAtlas() { atlas.tex = buildAtlas(); return atlas.tex; }

const icons = new Map();
export const clearIcons = () => icons.clear();
export function iconURL(t) {
  if (icons.has(t)) return icons.get(t);
  if (!atlas.cv || !FACE_TILES[t]) return '';
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const ft = FACE_TILES[t];
  if (FLAT.has(t)) {
    g.drawImage(atlas.cv, ft[1] * 16, 0, 16, 16, 0, 0, 32, 32);
  } else {
    const face = (tile, m, shade) => {
      g.save();
      g.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
      g.drawImage(atlas.cv, tile * 16, 0, 16, 16, 0, 0, 16, 16);
      if (shade) { g.fillStyle = 'rgba(0,0,0,' + shade + ')'; g.fillRect(0, 0, 16, 16); }
      g.restore();
    };
    face(ft[0], [0.875, 0.4375, -0.875, 0.4375, 16, 2], 0);
    face(ft[1], [0.875, 0.4375, 0, 0.875, 2, 9], 0.22);
    face(ft[1], [0.875, -0.4375, 0, 0.875, 16, 16], 0.42);
  }
  const u = c.toDataURL();
  icons.set(t, u);
  return u;
}
