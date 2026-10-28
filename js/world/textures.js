// Doku atlası oluşturma ve renk tanımları
export const T = 16;
export const BASE = {
  grass: [95, 174, 69], dirt: [139, 90, 43], stone: [150, 148, 144], wood: [107, 68, 35],
  leaf: [47, 125, 50], sand: [230, 214, 144], brick: [181, 73, 58], snow: [245, 245, 245],
  glass: [159, 216, 232], goldB: [255, 215, 0], bedrock: [50, 50, 50], sapling: [76, 175, 80],
  woodb: [228, 224, 210], leafb: [143, 192, 96], meat: [196, 70, 79], wool: [236, 236, 236],
  water: [74, 144, 226], canvas: [217, 201, 160], lava: [232, 102, 26], obsidian: [27, 16, 48],
  coalO: [69, 69, 72], ironO: [212, 170, 140], goldO: [250, 214, 70], diamO: [90, 230, 230],
  lavender: [154, 95, 208], daisy: [245, 245, 245], poppy: [208, 34, 40], blueP: [48, 80, 205],
  orangeT: [243, 134, 31], pinkT: [240, 120, 172], apple: [200, 30, 30], whiteT: [240, 240, 240],
  pickW: [176, 136, 80], pickS: [154, 154, 154], pickI: [216, 216, 216], pickD: [77, 224, 208],
  axeI: [208, 208, 208], shovI: [200, 200, 200], axeW: [176, 136, 80], axeS: [154, 154, 154],
  shovW: [176, 136, 80], shovS: [154, 154, 154], hoeW: [176, 136, 80], hoeS: [154, 154, 154],
  hoeI: [216, 216, 216], hoeD: [77, 224, 208], swdW: [176, 136, 80], swdS: [154, 154, 154],
  swdI: [216, 216, 216], swdD: [77, 224, 208], axeD: [77, 224, 208], planks: [188, 152, 98],
  stick: [140, 100, 52], craft: [160, 124, 76], seed: [90, 138, 50], wheat: [200, 170, 60],
  bread: [200, 150, 80], furnace: [138, 138, 142], coal: [42, 42, 46], ironI: [208, 208, 218],
  goldI: [245, 201, 64], diamI: [80, 225, 215], cook: [150, 85, 47], shovD: [77, 224, 208],
  helmI: [208, 208, 218], chestI: [208, 208, 218], legI: [208, 208, 218], bootI: [208, 208, 218],
  helmD: [80, 225, 215], chestD: [80, 225, 215], legD: [80, 225, 215], bootD: [80, 225, 215],
  tall: [60, 160, 60], potato: [196, 160, 96], carrot: [240, 130, 30], tomato: [220, 50, 40],
  pepper: [60, 170, 60], onion: [235, 225, 235], cig: [168, 58, 32], ironB: [216, 216, 224],
  diamB: [80, 225, 215], salad: [220, 80, 50], maruls: [80, 200, 80], pancars: [180, 50, 80],
  doms: [220, 50, 40], kek: [240, 208, 160], sebzes: [210, 160, 80], patatesk: [240, 200, 80],
  hamur: [245, 225, 170], sut: [255, 255, 255], pancar: [220, 50, 80], marul: [80, 180, 80],
  salatalik: [60, 150, 60], glassEdge: [200, 230, 240]
};

export const FLOWERS = new Set(['lavender', 'daisy', 'poppy', 'blueP', 'orangeT', 'pinkT', 'whiteT', 'tulipw']);
export const ITEMS = new Set([
  'meat', 'apple', 'pickW', 'pickS', 'pickI', 'pickD', 'axeI', 'shovI', 'axeW', 'axeS',
  'shovW', 'shovS', 'hoeW', 'hoeS', 'hoeI', 'hoeD', 'swdW', 'swdS', 'swdI', 'swdD',
  'axeD', 'stick', 'seed', 'wheat', 'bread', 'coal', 'ironI', 'goldI', 'diamI',
  'cook', 'shovD', 'helmI', 'chestI', 'legI', 'bootI', 'helmD', 'chestD', 'legD',
  'bootD', 'potato', 'carrot', 'tomato', 'pepper', 'onion', 'cig', 'salad',
  'maruls', 'pancars', 'doms', 'kek', 'sebzes', 'patatesk', 'hamur', 'sut',
  'pancar', 'marul', 'salatalik', 'patatez', 'havucz', 'domatez', 'biberz', 'onione',
  'marulz', 'salatalikz', 'pancarz'
]);

for (let i = 0; i < 8; i++) ITEMS.add('dye' + i);
for (let i = 0; i < 8; i++) ITEMS.add('wc' + i);

const DYE_RGB = [
  [154, 95, 208], [242, 201, 30], [208, 34, 40], [48, 80, 205],
  [243, 134, 31], [240, 120, 172], [60, 160, 60], [240, 240, 240]
];

const TOOL = { pick: 3, axe: 3, shov: 3, hoe: 3, swd: 3 };
const ARM = { helm: 4, chest: 4, leg: 4, boot: 4 };

for (const k in TOOL) {
  const baseCol = BASE[k + 'W'];
  if (baseCol) {
    for (let i = 0; i < TOOL[k]; i++) {
      const key = k + ['S', 'I', 'D'][i];
      if (BASE[key]) {
        const mult = i === 0 ? 0.9 : i === 1 ? 1.1 : 1.3;
        BASE[key] = baseCol.map(v => Math.min(255, Math.round(v * mult)));
      }
    }
  }
}

for (const k in ARM) {
  const baseCol = BASE[k + 'I'];
  if (baseCol) {
    for (let i = 0; i < ARM[k]; i++) {
      const key = k + ['I', 'D'][i];
      if (BASE[key]) {
        const mult = i === 0 ? 1.0 : 1.3;
        BASE[key] = baseCol.map(v => Math.min(255, Math.round(v * mult)));
      }
    }
  }
}

for (let i = 0; i < 6; i++) { BASE['dye' + i] = DYE_RGB[i]; BASE['wc' + i] = DYE_RGB[i]; }

const NI = {
  patatez: [196, 160, 96], havucz: [240, 130, 30], domatez: [220, 50, 40],
  biberz: [60, 170, 60], onione: [235, 225, 235], marulz: [80, 180, 80],
  salatalikz: [60, 150, 60], pancarz: [220, 50, 80]
};

for (const n in NI) { BASE[n] = NI[n][0]; ITEMS.add(n); }
BASE.dye6 = [60, 160, 60]; BASE.dye7 = [240, 240, 240]; BASE.wc6 = [60, 160, 60]; BASE.wc7 = [240, 240, 240];
BASE.ironB = [215, 215, 222]; BASE.diamB = [80, 225, 215]; BASE.tulipw = [245, 245, 245];
for (let k = 5; k < 8; k++) for (let s = 0; s < 4; s++) BASE['cr' + k + '_' + s] = [80, 160, 60];

export const CROPC = [];
for (let k = 5; k < 8; k++) for (let s = 0; s < 4; s++) CROPC.push('cr' + k + '_' + s);

export function hash(x, z, s = 1) {
  let v = Math.sin(x * 12.9898 + z * 78.233 + s * 37.719) * 43758.5453123;
  return v - Math.floor(v);
}

export const isFlat = () => false;
export const addFlat = () => {};
export const tileNames = Object.keys(BASE);
export const clearIcons = () => {};
export const iconURL = (name) => '';

export const FACE_TILES = {};
export const atlas = { tex: null };

function newPix() {
  const cv = document.createElement('canvas');
  cv.width = T; cv.height = T;
  return { cv: cv, ctx: cv.getContext('2d') };
}

function itemPix(col) {
  const p = newPix(), ctx = p.ctx;
  ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
  ctx.fillRect(2, 2, 12, 12);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(2, 12, 12, 2);
  ctx.fillRect(12, 2, 2, 12);
  return p.cv;
}

export function initAtlas() {
  const keys = Object.keys(BASE);
  const cv = document.createElement('canvas');
  const len = keys.length;
  cv.width = T * len; 
  cv.height = T;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);

  keys.forEach((k, i) => {
    const c = BASE[k] || [255, 255, 255];
    let sub;
    if (k.startsWith('cr')) {
      sub = newPix();
      const s = parseInt(k.slice(-1)) || 0;
      sub.ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      sub.ctx.fillRect(2, 14 - s * 3, 12, s * 3 + 1);
    } else if (ITEMS.has(k)) {
      sub = itemPix(c);
    } else {
      sub = newPix();
      sub.ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      sub.ctx.fillRect(0, 0, T, T);
      sub.ctx.fillStyle = 'rgba(0,0,0,0.18)';
      sub.ctx.fillRect(0, 0, T, 2);
      sub.ctx.fillRect(0, 0, 2, T);
    }
    
    if (sub && sub.cv) {
      ctx.drawImage(sub.cv, i * T, 0);
    }
    FACE_TILES[k] = [i, i, i];
  });

  FACE_TILES.grass = [keys.indexOf('grass'), keys.indexOf('dirt'), keys.indexOf('grass')];
  FACE_TILES.wood = [keys.indexOf('woodb'), keys.indexOf('wood'), keys.indexOf('woodb')];
  FACE_TILES.leaf = [keys.indexOf('leafb'), keys.indexOf('leaf'), keys.indexOf('leafb')];

  if (!atlas.tex) {
    atlas.tex = new THREE.CanvasTexture(cv);
    atlas.tex.magFilter = THREE.NearestFilter;
    atlas.tex.minFilter = THREE.NearestFilter;
    atlas.tex.generateMipmaps = false;
  } else {
    atlas.tex.image = cv;
    atlas.tex.needsUpdate = true;
  }
}

try {
  if (typeof window !== 'undefined') {
    initAtlas();
  }
} catch (e) {}

export function tileOf(name) {
  return FACE_TILES[name] ? FACE_TILES[name][0] : 0;
}

export function sideTile(name) {
  return FACE_TILES[name] ? FACE_TILES[name][1] : 0;
}
