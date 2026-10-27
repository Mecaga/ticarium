export function hash(x, y, s) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

const TILE_NAMES = ['grassTop', 'grassSide', 'dirt', 'stone', 'woodSide', 'woodTop', 'leaves', 'sand', 'brick', 'snow',
  'glass', 'gold', 'bedrock', 'sapling', 'birchSide', 'birchTop', 'birchLeaf', 'meat', 'wool', 'water',
  'bucket', 'wbucket', 'paint', 'lava', 'lbucket', 'apple',
  'lavender', 'daisy', 'poppy', 'bpoppy', 'tulipo', 'tulipp',
  'obsidian', 'netherite', 'pickW', 'pickS', 'pickI', 'pickD', 'pickN', 'axe', 'shovel',
  'planks', 'craftTop', 'craftSide', 'farmTop', 'wheat0', 'wheat1', 'wheat2', 'wheat3',
  'seeds', 'wheatI', 'bread', 'stick',
  'axeW', 'axeS', 'shovelW', 'shovelS', 'hoeW', 'hoeS', 'hoeI', 'hoeD', 'swordW', 'swordS', 'swordI', 'swordD',
  'coalOre', 'ironOre', 'goldOre', 'diamondOre', 'furnaceTop', 'furnaceSide', 'coal', 'ingotI', 'ingotG', 'gem', 'cooked',
  'axeD', 'shovelD', 'helmI', 'chestI', 'legI', 'bootI', 'helmD', 'chestD', 'legD', 'bootD',
  'tomato0', 'tomato1', 'tomato2', 'tomato3', 'tomato',
  'pepper0', 'pepper1', 'pepper2', 'pepper3', 'pepper',
  'potato0', 'potato1', 'potato2', 'potato3', 'potato',
  'onion0', 'onion1', 'onion2', 'onion3', 'onion',
  'carrot0', 'carrot1', 'carrot2', 'carrot3', 'carrot',
  'cigkofte', 'doorC', 'doorO', 'disc', 'shears'];

const FLOWERS = new Set(['lavender', 'daisy', 'poppy', 'bpoppy', 'tulipo', 'tulipp']);
const ITEMS = new Set(['seeds', 'wheatI', 'bread', 'stick', 'coal', 'ingotI', 'ingotG', 'gem', 'cooked', 'tomato', 'pepper', 'potato', 'onion', 'carrot', 'cigkofte', 'disc', 'shears']);
const WOOD = [176, 136, 72], STONE = [150, 150, 150], IRON = [222, 222, 228], DIAM = [80, 225, 215], NETH = [92, 76, 88];

// Aletler: [tür, kafa rengi]
const TOOL = {
  pickW: ['pick', WOOD], pickS: ['pick', STONE], pickI: ['pick', IRON], pickD: ['pick', DIAM], pickN: ['pick', NETH],
  axeW: ['axe', WOOD], axeS: ['axe', STONE], axe: ['axe', IRON], axeD: ['axe', DIAM],
  shovelW: ['shovel', WOOD], shovelS: ['shovel', STONE], shovel: ['shovel', IRON], shovelD: ['shovel', DIAM],
  hoeW: ['hoe', WOOD], hoeS: ['hoe', STONE], hoeI: ['hoe', IRON], hoeD: ['hoe', DIAM],
  swordW: ['sword', WOOD], swordS: ['sword', STONE], swordI: ['sword', IRON], swordD: ['sword', DIAM]
};
const ARM = {
  helmI: ['helm', IRON], chestI: ['chest', IRON], legI: ['leg', IRON], bootI: ['boot', IRON],
  helmD: ['helm', DIAM], chestD: ['chest', DIAM], legD: ['leg', DIAM], bootD: ['boot', DIAM]
};
const ORE_COL = { coalOre: [40, 40, 46], ironOre: [216, 172, 140], goldOre: [250, 214, 70], diamondOre: [90, 232, 232] };
const TI = {};
TILE_NAMES.forEach((n, i) => { TI[n] = i; });
export const T = TILE_NAMES.length;

const same = n => [TI[n], TI[n], TI[n]];
// [üst, yan, alt]
export const FACE_TILES = {
  1: [TI.grassTop, TI.grassSide, TI.dirt],
  2: [TI.dirt, TI.dirt, TI.dirt],
  3: [TI.stone, TI.stone, TI.stone],
  4: [TI.woodTop, TI.woodSide, TI.woodTop],
  5: same('leaves'), 6: same('sand'), 7: same('brick'), 8: same('snow'), 9: same('glass'), 10: same('gold'),
  11: same('bedrock'), 12: same('sapling'),
  13: [TI.birchTop, TI.birchSide, TI.birchTop],
  14: same('birchLeaf'), 15: same('meat'), 16: same('wool'), 17: same('water'), 25: same('lava'),
  30: same('bucket'), 31: same('wbucket'), 32: same('paint'), 33: same('lbucket'),
  34: same('obsidian'), 35: same('netherite'),
  36: same('coalOre'), 37: same('ironOre'), 38: same('goldOre'), 39: same('diamondOre'),
  40: same('lavender'), 41: same('daisy'), 42: same('poppy'), 43: same('bpoppy'), 44: same('tulipo'), 45: same('tulipp'),
  46: same('apple'),
  50: same('pickW'), 51: same('pickS'), 52: same('pickI'), 53: same('pickD'), 54: same('pickN'),
  55: same('axe'), 56: same('shovel'), 57: same('axeW'), 58: same('axeS'), 59: same('shovelW'), 60: same('shovelS'),
  61: same('hoeW'), 62: same('hoeS'), 63: same('hoeI'), 64: same('hoeD'),
  65: same('swordW'), 66: same('swordS'), 67: same('swordI'), 68: same('swordD'),
  69: same('axeD'),
  70: same('planks'), 71: same('stick'),
  72: [TI.craftTop, TI.craftSide, TI.planks],
  73: same('seeds'), 74: same('wheatI'), 75: same('bread'),
  76: [TI.farmTop, TI.dirt, TI.dirt],
  77: same('wheat0'), 78: same('wheat1'), 79: same('wheat2'), 80: same('wheat3'),
  81: [TI.furnaceTop, TI.furnaceSide, TI.stone],
  82: same('coal'), 83: same('ingotI'), 84: same('ingotG'), 85: same('gem'), 86: same('cooked'),
  89: same('shovelD'),
  91: same('helmI'), 92: same('chestI'), 93: same('legI'), 94: same('bootI'),
  95: same('helmD'), 96: same('chestD'), 97: same('legD'), 98: same('bootD'),
  99: same('tomato0'), 100: same('tomato1'), 101: same('tomato2'), 102: same('tomato3'), 103: same('tomato'),
  104: same('pepper0'), 105: same('pepper1'), 106: same('pepper2'), 107: same('pepper3'), 108: same('pepper'),
  109: same('potato0'), 110: same('potato1'), 111: same('potato2'), 112: same('potato3'), 113: same('potato'),
  114: same('onion0'), 115: same('onion1'), 116: same('onion2'), 117: same('onion3'), 118: same('onion'),
  119: same('carrot0'), 120: same('carrot1'), 121: same('carrot2'), 122: same('carrot3'), 123: same('carrot'),
  124: same('cigkofte'),
  125: same('doorC'), 126: same('doorO'),
  127: same('disc'), 128: same('shears')
};

// Blok olmayan eşyalar: yerde ve ikonda düz sprite olarak görünür
const FLAT = new Set([12, 15, 30, 31, 33, 40, 41, 42, 43, 44, 45, 46, 71, 73, 74, 75, 103, 108, 113, 118, 123, 124, 127, 128]);
for (let i = 50; i <= 68; i++) FLAT.add(i);
for (const i of [69, 82, 83, 84, 85, 86, 89, 91, 92, 93, 94, 95, 96, 97, 98]) FLAT.add(i);
for (let i = TI.tomato0; i <= TI.cigkofte; i++) FLAT.add(i);
export const isFlat = t => FLAT.has(t);

export const atlas = { tex: null, T, cv: null };
export const sideTile = t => FACE_TILES[t] ? FACE_TILES[t][1] : t;

export function tileOf(t, face = 1) {
  if (FACE_TILES[t]) {
    return FACE_TILES[t][face];
  }
  return t;
}

const BASE = {
  grassTop: [95, 174, 69], grassSide: [139, 90, 43], dirt: [139, 90, 43], stone: [150, 148, 144],
  woodSide: [107, 68, 35], woodTop: [150, 110, 62], leaves: [47, 125, 50], sand: [230, 214, 144],
  brick: [181, 73, 58], snow: [245, 245, 245], glass: [159, 216, 232], gold: [255, 215, 0],
  bedrock: [62, 62, 66], sapling: [60, 170, 70], birchSide: [226, 223, 212], birchTop: [196, 178, 128],
  birchLeaf: [132, 184, 84], meat: [196, 70, 80], wool: [236, 236, 232], water: [50, 115, 205],
  bucket: [170, 175, 182], wbucket: [170, 175, 182], lbucket: [170, 175, 182], paint: [188, 152, 98],
  lava: [240, 100, 20], apple: [200, 30, 30],
  lavender: [150, 90, 205], daisy: [248, 248, 248], poppy: [208, 34, 40],
  bpoppy: [48, 82, 205], tulipo: [243, 134, 32], tulipp: [240, 120, 172],
  obsidian: [26, 16, 44], netherite: [74, 64, 70],
  planks: [188, 152, 98], craftTop: [160, 124, 76], craftSide: [170, 134, 84], farmTop: [110, 75, 45],
  wheat0: [100, 190, 65], wheat1: [90, 175, 55], wheat2: [160, 190, 60], wheat3: [220, 190, 70],
  seeds: [95, 140, 55], wheatI: [215, 175, 70], bread: [195, 135, 70], stick: [140, 100, 52],
  coalOre: [150, 148, 144], ironOre: [150, 148, 144], goldOre: [150, 148, 144], diamondOre: [150, 148, 144],
  furnaceTop: [128, 128, 132], furnaceSide: [140, 140, 144],
  coal: [40, 40, 44], ingotI: [205, 205, 214], ingotG: [248, 204, 60], gem: [80, 225, 215], cooked: [150, 85, 50],
  tomato0: [100, 190, 65], tomato1: [90, 175, 55], tomato2: [150, 190, 55], tomato3: [220, 50, 40], tomato: [220, 40, 30],
  pepper0: [90, 180, 50], pepper1: [80, 165, 45], pepper2: [140, 180, 45], pepper3: [50, 180, 50], pepper: [210, 40, 40],
  potato0: [100, 190, 65], potato1: [95, 180, 60], potato2: [145, 170, 90], potato3: [185, 140, 90], potato: [185, 140, 90],
  onion0: [90, 185, 60], onion1: [85, 170, 55], onion2: [170, 140, 170], onion3: [210, 160, 180], onion: [210, 160, 180],
  carrot0: [85, 185, 50], carrot1: [90, 190, 45], carrot2: [180, 140, 40], carrot3: [240, 130, 40], carrot: [240, 130, 40],
  cigkofte: [145, 65, 35],
  disc: [30, 30, 36],
  shears: [215, 215, 225]
};
for (const n in TOOL) BASE[n] = TOOL[n][1];
for (const n in ARM) BASE[n] = ARM[n][1];
BASE.doorC = [150, 100, 50]; BASE.doorO = [150, 100, 50];

// Kaldırım taşı için hücre noktaları
const SEEDS = Array.from({ length: 8 }, (_, i) => [hash(i, 1, 50) * 16, hash(i, 2, 50) * 16]);
function cobble(x, y) {
  let d1 = 99, d2 = 99, id = 0;
  for (let i = 0; i < SEEDS.length; i++) {
    let dx = Math.abs(x + 0.5 - SEEDS[i][0]); dx = Math.min(dx, 16 - dx);
    let dy = Math.abs(y + 0.5 - SEEDS[i][1]); dy = Math.min(dy, 16 - dy);
    const d = Math.hypot(dx, dy);
    if (d < d1) { d2 = d1; d1 = d; id = i; } else if (d < d2) d2 = d;
  }
  return { id, edge: d2 - d1 };
}

function plantPix(name, x, y) {
  if (name === 'apple') {
    if (y >= 2 && y <= 4 && x === 8) return [95, 60, 30];
    if (y === 3 && x >= 9 && x <= 11) return [70, 150, 60];
    const r = Math.hypot((x - 7.5) * 0.95, y - 9.5);
    if (r < 5.2) return (x === 5 && y === 7) ? [250, 150, 150] : [200, 30, 30];
    return null;
  }
  const stem = (x === 7 || x === 8) && y >= 8;
  const leaf = (y === 11 && (x === 6 || x === 9)) || (y === 12 && (x === 5 || x === 10));
  if (stem || leaf) return [70, 150, 60];
  const r = Math.hypot(x - 7.5, y - 4.5);
  switch (name) {
    case 'daisy': if (r < 1.4) return [250, 205, 40]; if (r < 3.8) return [248, 248, 248]; break;
    case 'poppy': if (r < 1.4) return [25, 25, 25]; if (r < 3.8) return [208, 34, 40]; break;
    case 'bpoppy': if (r < 1.4) return [14, 20, 90]; if (r < 3.8) return [48, 82, 205]; break;
    case 'lavender':
      if (x >= 6 && x <= 9 && y >= 1 && y <= 8 && ((x + y) % 2 === 0 || x === 7 || x === 8)) return y < 3 ? [190, 140, 235] : [150, 90, 205];
      break;
    case 'tulipo': case 'tulipp': {
      const e = Math.pow((x - 7.5) / 2.8, 2) + Math.pow((y - 5.5) / 3.2, 2);
      if (e < 1 || ((x === 6 || x === 9) && y === 2)) return name === 'tulipo' ? [243, 134, 32] : [240, 120, 172];
      break;
    }
  }
  return null;
}

// Buğday büyüme aşamaları (0..3)
function wheatPix(s, x, y) {
  const h = [4, 8, 12, 15][s];
  for (const c of [3, 7, 11, 13]) {
    if (x === c && y >= 16 - h) {
      if (s === 3 && y < 16 - h + 5) return [240, 210, 90];
      return s === 0 ? [100, 190, 65] : s === 1 ? [90, 175, 55] : s === 2 ? [165, 195, 65] : [220, 190, 70];
    }
    if (s === 3 && Math.abs(x - c) === 1 && y >= 16 - h + 1 && y < 16 - h + 5) return [250, 225, 110];
    if (s === 2 && Math.abs(x - c) === 1 && y >= 16 - h + 4 && y < 16 - h + 8) return [130, 185, 50];
  }
  return null;
}

// Domates büyüme aşamaları (0..3)
function tomatoPix(s, x, y) {
  const h = [4, 8, 12, 15][s];
  for (const c of [4, 8, 12]) {
    if (x === c && y >= 16 - h) return [70, 140, 45];
  }
  if (s >= 2) {
    const tomatoes = s === 2 ? [[7, 10], [9, 8]] : [[6, 10], [9, 8], [8, 5], [10, 6]];
    for (const [tx, ty] of tomatoes) {
      if (Math.hypot(x - tx, y - ty) <= (s === 2 ? 1.2 : 1.7)) {
        return (x === tx && y === ty + 1) ? [255, 120, 110] : [220, 40, 30];
      }
    }
  }
  return null;
}

// Biber büyüme aşamaları (0..3)
function pepperPix(s, x, y) {
  const h = [4, 8, 12, 15][s];
  for (const c of [4, 8, 12]) {
    if (x === c && y >= 16 - h) return [60, 150, 50];
  }
  if (s >= 2) {
    const peppers = s === 2 ? [[7, 9], [9, 7]] : [[6, 10], [9, 8], [8, 5], [11, 6]];
    for (const [px, py] of peppers) {
      if (Math.abs(x - px) <= 1 && y >= py && y <= py + (s === 2 ? 2 : 3)) {
        return (px % 2 === 0) ? [210, 40, 40] : [50, 180, 50];
      }
    }
  }
  return null;
}

// Patates büyüme aşamaları (0..3)
function potatoPix(s, x, y) {
  const h = [4, 8, 12, 15][s];
  for (const c of [4, 8, 12]) {
    if (x === c && y >= 16 - h) return [95, 160, 50];
  }
  if (s >= 2 && y >= 12) {
    if (x >= 5 && x <= 11) return [170, 130, 80];
  }
  return null;
}

// Soğan büyüme aşamaları (0..3)
function onionPix(s, x, y) {
  const h = [4, 8, 12, 15][s];
  for (const c of [4, 8, 12]) {
    if (x === c && y >= 16 - h) return [110, 180, 70];
  }
  if (s >= 2 && y >= 11) {
    const dx = Math.abs(x - 7.5);
    if (dx <= 3) return [200, 150, 170];
  }
  return null;
}

// Havuç büyüme aşamaları (0..3)
function carrotPix(s, x, y) {
  const h = [4, 8, 12, 15][s];
  for (const c of [4, 8, 12]) {
    if (x === c && y >= 16 - h) return [80, 170, 40];
  }
  return null;
}

function ingotPix(col, x, y) {
  if (y < 6 || y > 10) return null;
  const s = 10 - y;
  if (x < 3 + s || x > 10 + s) return null;
  return y <= 7 ? col.map(v => Math.min(255, v + 30)) : col;
}

function itemPix(name, x, y) {
  if (name === 'disc') {
    const r = Math.hypot(x - 7.5, y - 7.5);
    if (r > 6.5) return null;
    if (r < 1.6) return [200, 200, 205];
    if (r < 3) return [190, 60, 70];
    return r > 5.6 ? [60, 60, 70] : [24, 24, 30];
  }
  if (name === 'shears') {
    const a = (x + y === 15 || x + y === 16) && x >= 5 && x <= 11;
    const b = (x === y || x === y + 1) && x >= 5 && x <= 11;
    if (a || b) return [215, 215, 225];
    if (y >= 11 && y <= 14 && (x <= 4 || x >= 11) && (x >= 2 && x <= 4 || x >= 11 && x <= 13)) return [190, 50, 50];
    return null;
  }
  if (name === 'stick') return ((x + y === 16 || x + y === 17) && x >= 4 && x <= 12) ? [140, 100, 52] : null;
  if (name === 'seeds') {
    const e = Math.pow((x - 7.5) / 3.5, 2) + Math.pow((y - 8.5) / 4.5, 2);
    if (e >= 1) return null;
    return (x + y) % 2 === 0 ? [110, 160, 60] : [80, 120, 45];
  }
  if (name === 'wheatI') {
    for (const c of [5, 8, 11]) {
      const sx = c + Math.floor((14 - y) / 6);
      if (y >= 6 && y <= 14 && x === sx) return [200, 160, 60];
      if (y >= 2 && y <= 6 && Math.abs(x - c) <= 1) return [235, 205, 90];
    }
    if (y === 10 && x >= 6 && x <= 10) return [210, 185, 130];
    return null;
  }
  if (name === 'bread') {
    const e = Math.pow((x - 7.5) / 5.5, 2) + Math.pow((y - 8.5) / 3.2, 2);
    if (e >= 1) return null;
    if (y === 6 && (x === 6 || x === 10)) return [150, 95, 45];
    return y < 7 ? [210, 155, 85] : [175, 115, 60];
  }
  if (name === 'tomato') {
    const e = Math.pow((x - 7.5) / 5.0, 2) + Math.pow((y - 8.5) / 5.0, 2);
    if (e >= 1) return null;
    if (x === 7 && y <= 4) return [70, 150, 50];
    return (x === 6 && y === 7) ? [255, 120, 110] : [220, 40, 30];
  }
  if (name === 'pepper') {
    const e = Math.pow((x - 7.5) / 3.0, 2) + Math.pow((y - 8.5) / 5.5, 2);
    if (e >= 1) return null;
    if (y <= 4 && x >= 7 && x <= 9) return [70, 150, 50];
    return [210, 40, 40];
  }
  if (name === 'potato') {
    const e = Math.pow((x - 7.5) / 4.5, 2) + Math.pow((y - 8.5) / 3.8, 2);
    if (e >= 1) return null;
    return (hash(x, y, 200) < 0.2) ? [130, 95, 60] : [185, 140, 90];
  }
  if (name === 'onion') {
    const e = Math.pow((x - 7.5) / 4.2, 2) + Math.pow((y - 8.5) / 4.2, 2);
    if (e >= 1) return null;
    if (y <= 3 && x >= 7 && x <= 9) return [80, 160, 50];
    return [210, 160, 180];
  }
  if (name === 'carrot') {
    if (y <= 3 && x >= 6 && x <= 10) return [70, 170, 50];
    const dx = Math.abs(x - 7.5);
    if (y >= 4 && y <= 14 && dx <= (15 - y) * 0.45) {
      return (y % 3 === 0) ? [220, 110, 30] : [240, 130, 40];
    }
    return null;
  }
  if (name === 'cigkofte') {
    const lettuce = Math.pow((x - 7.5) / 6.5, 2) + Math.pow((y - 8.5) / 6.0, 2);
    if (lettuce <= 1) {
      const isEdge = (x <= 2 || x >= 13 || y <= 2 || y >= 13);
      if (isEdge) return [90, 170, 50];
      const kofte = Math.pow((x - 7.5) / 3.5, 2) + Math.pow((y - 8.5) / 3.0, 2);
      if (kofte <= 1) {
        return (hash(x, y, 300) < 0.25) ? [120, 50, 25] : [145, 65, 35];
      }
      return [110, 190, 60];
    }
    return null;
  }
  if (name === 'coal') {
    const e = Math.pow((x - 7.5) / 5.2, 2) + Math.pow((y - 8.5) / 4.2, 2);
    if (e >= 1) return null;
    return (hash(x, y, 120) < 0.18 || (x === 5 && y === 6)) ? [105, 105, 118] : [38, 38, 44];
  }
  if (name === 'ingotI') return ingotPix([205, 205, 214], x, y);
  if (name === 'ingotG') return ingotPix([248, 204, 60], x, y);
  if (name === 'gem') {
    const e = Math.abs(x - 7.5) / 6 + Math.abs(y - 8) / 5.5;
    if (e >= 1) return null;
    return (x + y < 12 && x < 8) ? [170, 250, 245] : (x > 8 ? [48, 180, 175] : [80, 225, 215]);
  }
  if (name === 'cooked') {
    const e = Math.pow((x - 7.5) / 6, 2) + Math.pow((y - 8.5) / 4.6, 2);
    if (e >= 1) return null;
    return (x + y) % 5 === 0 ? [215, 130, 75] : (y < 8 ? [168, 100, 56] : [128, 72, 40]);
  }
  return null;
}

function toolPix(kind, col, x, y) {
  if (kind === 'axe') {
    const e = Math.pow((x - 10.5) / 3.2, 2) + Math.pow((y - 5) / 3.4, 2);
    if (e < 1) return col;
  } else if (kind === 'shovel') {
    const e = Math.pow((x - 11.5) / 2.6, 2) + Math.pow((y - 4.5) / 3.6, 2);
    if (e < 1) return col;
  } else if (kind === 'hoe') {
    if ((y === 3 || y === 4) && x >= 6 && x <= 12) return col;
    if ((x === 11 || x === 12) && (y === 5 || y === 6)) return col;
  } else if (kind === 'sword') {
    if ((x + y === 16 || x + y === 17) && x >= 7 && x <= 13) return col;
    if (x - y === -3 && x >= 5 && x <= 8) return [90, 90, 98];
    if ((x + y === 16 || x + y === 17) && x >= 3 && x <= 5) return [122, 86, 42];
    return null;
  } else {
    const dx = x - 5.5, dy = y - 10.5, r = Math.hypot(dx, dy);
    if (r >= 5.2 && r <= 7.2 && dx >= -1 && dy <= 1) return col;
  }
  if ((x + y === 16 || x + y === 17) && x >= 3 && x <= 11) return [122, 86, 42];
  return null;
}

function armorPix(kind, col, x, y) {
  const dx = Math.abs(x - 7.5);
  let on;
  if (kind === 'helm') on = y >= 3 && y <= 10 && dx <= (y < 5 ? 3.5 : 5) && !(y >= 8 && dx <= 2);
  else if (kind === 'chest') on = (y >= 3 && y <= 5 && dx >= 2 && dx <= 6.5) || (y >= 6 && y <= 13 && dx <= 4.5) || (y >= 6 && y <= 9 && dx > 4.5 && dx <= 6.5);
  else if (kind === 'leg') on = (y >= 3 && y <= 5 && dx <= 4.5) || (y >= 6 && y <= 13 && dx >= 0.9 && dx <= 4.5);
  else on = (y >= 8 && y <= 12 && dx >= 0.9 && dx <= 5.5) || (y === 13 && dx >= 0.9 && dx <= 6.5);
  if (!on) return null;
  const rim = (y === 3 || y === 13) ? 0.78 : 1;
  return col.map(v => Math.round(v * rim));
}

function buildAtlas() {
  const cv = document.createElement('canvas');
  cv.width = 16 * T; cv.height = 16;
  const ctx = cv.getContext('2d');
  TILE_NAMES.forEach((name, i) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      let [r, g, b] = BASE[name];
      let k = 0.86 + hash(x, y, i) * 0.28;
      if (name === 'doorO' && x > 3) continue;
      if (name === 'doorC' && (y % 8 === 0 || x === 0 || x === 15)) k *= 0.6;
      if (name === 'sapling') {
        const stalk = (x === 7 || x === 8) && y >= 8;
        const dxx = (x - 7.5) / 4.5, dyy = (y - 5) / 3.6;
        const crown = dxx * dxx + dyy * dyy < 1 && hash(x, y, 31) < 0.9;
        if (!stalk && !crown) continue;
        if (stalk) { r = 96; g = 140; b = 60; }
      } else if (FLOWERS.has(name) || name === 'apple') {
        const c = plantPix(name, x, y);
        if (!c) continue;
        [r, g, b] = c;
        k = 0.93 + hash(x, y, i) * 0.14;
      } else if (/^wheat[0-3]$/.test(name)) {
        const c = wheatPix(+name.slice(5), x, y);
        if (!c) continue;
        [r, g, b] = c;
        k = 0.92 + hash(x, y, i) * 0.16;
      } else if (/^tomato[0-3]$/.test(name)) {
        const c = tomatoPix(+name.slice(6), x, y);
        if (!c) continue;
        [r, g, b] = c;
        k = 0.92 + hash(x, y, i) * 0.16;
      } else if (/^pepper[0-3]$/.test(name)) {
        const c = pepperPix(+name.slice(6), x, y);
        if (!c) continue;
        [r, g, b] = c;
        k = 0.92 + hash(x, y, i) * 0.16;
      } else if (/^potato[0-3]$/.test(name)) {
        const c = potatoPix(+name.slice(6), x, y);
        if (!c) continue;
        [r, g, b] = c;
        k = 0.92 + hash(x, y, i) * 0.16;
      } else if (/^onion[0-3]$/.test(name)) {
        const c = onionPix(+name.slice(5), x, y);
        if (!c) continue;
        [r, g, b] = c;
        k = 0.92 + hash(x, y, i) * 0.16;
      } else if (/^carrot[0-3]$/.test(name)) {
        const c = carrotPix(+name.slice(6), x, y);
        if (!c) continue;
        [r, g, b] = c;
        k = 0.92 + hash(x, y, i) * 0.16;
      } else if (ITEMS.has(name) || name === 'disc' || name === 'shears') {
        const c = itemPix(name, x, y);
        if (!c) continue;
        [r, g, b] = c;
        k = 0.93 + hash(x, y, i) * 0.14;
      } else if (TOOL[name]) {
        const c = toolPix(TOOL[name][0], TOOL[name][1], x, y);
        if (!c) continue;
        [r, g, b] = c;
        k = 0.94 + hash(x, y, i) * 0.12;
      } else if (ARM[name]) {
        const c = armorPix(ARM[name][0], ARM[name][1], x, y);
        if (!c) continue;
        [r, g, b] = c;
        k = 0.94 + hash(x, y, i) * 0.12;
      } else if (name === 'bucket' || name === 'wbucket' || name === 'lbucket') {
        const w = y < 5 ? 6 : (y < 12 ? 5 : 4);
        const body = y >= 3 && y <= 14 && Math.abs(x - 7.5) <= w;
        const handle = (y <= 2 && y >= 1 && x >= 4 && x <= 11) || ((x === 4 || x === 11) && y >= 2 && y <= 4);
        if (!body && !handle) continue;
        if (handle) { r = 85; b = 92; }
        else if (name !== 'bucket' && y >= 4 && y <= 7 && Math.abs(x - 7.5) <= w - 1) {
          if (name === 'wbucket') { r = 55; g = 125; b = 225; } else { r = 240; g = 110; b = 20; }
        }
        else if (y === 3 || y === 14 || Math.abs(x - 7.5) > w - 1) { r = 120; g = 124; b = 132; }
      } else {
        switch (name) {
          case 'grassSide':
            if (y < 3 || (y === 3 && hash(x, y, 99) < 0.5)) [r, g, b] = [95, 174, 69];
            break;
          case 'stone': {
            const c = cobble(x, y);
            k = 0.78 + hash(c.id, 3, 51) * 0.42 + (hash(x, y, 8) - 0.5) * 0.08;
            if (c.edge < 0.9) k *= 0.55;
            break;
          }
          case 'coalOre': case 'ironOre': case 'goldOre': case 'diamondOre': {
            const c = cobble(x, y);
            k = 0.78 + hash(c.id, 3, 51) * 0.42 + (hash(x, y, 8) - 0.5) * 0.08;
            if (c.edge < 0.9) k *= 0.55;
            if (hash(x >> 1, y >> 1, i + 200) < 0.5 && hash(x, y, i + 201) < 0.85) {
              [r, g, b] = ORE_COL[name];
              k = 0.85 + hash(x, y, i + 202) * 0.3;
            }
            break;
          }
          case 'furnaceTop':
            k = 0.9 + hash(x, y, 121) * 0.2;
            if (x < 1 || y < 1 || x > 14 || y > 14) { r = 80; g = 80; b = 84; k = 1; }
            else if (x > 3 && x < 12 && y > 3 && y < 12) { r = 55; g = 55; b = 60; k = 1; }
            break;
          case 'furnaceSide': {
            const c = cobble(x, y);
            k = 0.8 + hash(c.id, 3, 52) * 0.35;
            if (c.edge < 0.9) k *= 0.6;
            if (x >= 4 && x <= 11 && y >= 6 && y <= 12) {
              r = 28; g = 28; b = 32; k = 1;
              if (y >= 10 && hash(x, y, 122) < 0.8) { r = 235; g = 125; b = 30; }
            }
            break;
          }
          case 'bedrock': {
            const h = hash(x, y, 21);
            k = 0.45 + hash(x, y, 22) * 0.9;
            if (h < 0.18) { r = 22; g = 22; b = 24; k = 1; }
            else if (h > 0.93) { r = 120; g = 120; b = 126; k = 1; }
            break;
          }
          case 'obsidian':
            k = 0.8 + hash(x, y, 101) * 0.4;
            if (hash(x, y, 102) < 0.09) { r = 92; g = 52; b = 150; k = 1; }
            else if (hash(x, y, 103) < 0.08) { r = 8; g = 4; b = 16; k = 1; }
            break;
          case 'netherite':
            k = 0.9 + hash(x, y, 104) * 0.2;
            if (x % 8 === 0 || y % 8 === 0) { r = 40; g = 34; b = 38; k = 1; }
            else if (hash(x, y, 105) < 0.07) { r = 130; g = 104; b = 92; k = 1; }
            break;
          case 'woodSide': if (x % 4 === 0) k *= 0.78; break;
          case 'woodTop': {
            const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
            if (Math.floor(d) % 2 === 0) k *= 0.82;
            break;
          }
          case 'birchSide':
            k = 0.94 + hash(x, y, 41) * 0.1;
            if (y % 4 === 1 && hash(x >> 1, y, 42) < 0.55) { r = 45; g = 42; b = 40; k = 1; }
            break;
          case 'birchTop': {
            const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
            if (Math.floor(d) % 2 === 0) k *= 0.85;
            break;
          }
          case 'birchLeaf': if (hash(x, y, 43) < 0.25) k *= 0.7; break;
          case 'leaves': if (hash(x, y, 5) < 0.25) k *= 0.65; break;
          case 'brick': {
            const row = Math.floor(y / 4);
            if (y % 4 === 3 || x % 8 === (row % 2 ? 3 : 7)) { [r, g, b] = [200, 195, 185]; k = 0.95 + hash(x, y, 3) * 0.1; }
            break;
          }
          case 'glass':
            if (x === 0 || y === 0 || x === 15 || y === 15) [r, g, b] = [230, 245, 250];
            else if (hash(x, y, 4) < 0.06) k = 1.25;
            break;
          case 'gold': if (hash(x, y, 6) < 0.15) k = 1.2; break;
          case 'meat': {
            if ((x + y * 2) % 6 === 0 && hash(x, y, 61) < 0.7) { r = 238; g = 214; b = 204; k = 1; }
            if (x === 0 || y === 0 || x === 15 || y === 15) k *= 0.78;
            break;
          }
          case 'wool':
            k = 0.93 + hash(x, y, 62) * 0.1;
            if ((x + y) % 4 === 0) k *= 0.95;
            break;
          case 'water':
            k = 0.88 + hash(x, y, 71) * 0.24;
            if ((x + y * 2) % 7 === 0 && hash(x, y, 72) < 0.5) k *= 1.18;
            break;
          case 'lava':
            k = 0.88 + hash(x, y, 91) * 0.24;
            if (hash(x, y, 92) < 0.16) { r = 255; g = 215; b = 70; k = 1; }
            else if (hash(x, y, 93) < 0.12) { r = 150; g = 30; b = 0; k = 1; }
            break;
          case 'paint':
            if (y >= 8) {
              r = 188; g = 152; b = 98;
              k = 0.9 + hash(x, y, 111) * 0.2;
              if (y === 8 || y === 12) k *= 0.72;
            } else {
              k = 0.97 + hash(x, y, 82) * 0.06;
              if ((x * 3 + y * 5) % 13 === 0) { r = 214; g = 72; b = 72; }
              else if ((x * 5 + y * 2) % 17 === 0) { r = 60; g = 110; b = 210; }
              else { r = 245; g = 240; b = 225; }
            }
            break;
          case 'planks':
            k = 0.9 + hash(x, y, 111) * 0.2;
            if (y % 4 === 3) k *= 0.72;
            if (x % 4 === 0 && hash(y >> 2, x >> 2, 112) < 0.2) k *= 0.82;
            break;
          case 'craftTop':
            k = 0.9 + hash(x, y, 113) * 0.2;
            if (x < 1 || y < 1 || x > 14 || y > 14) { r = 100; g = 70; b = 40; k = 1; }
            else if (x === 5 || x === 10 || y === 5 || y === 10) { r = 95; g = 66; b = 38; k = 1; }
            break;
          case 'craftSide':
            k = 0.9 + hash(x, y, 114) * 0.2;
            if (y < 3) { r = 110; g = 78; b = 44; k = 1; }
            else if (x % 5 === 0) k *= 0.78;
            if (y >= 5 && y <= 9 && x >= 3 && x <= 12 && hash(x, y, 115) < 0.35) { r = 160; g = 160; b = 170; k = 1; }
            break;
          case 'farmTop':
            k = 0.85 + hash(x, y, 116) * 0.2;
            if (y % 4 === 0 || y % 4 === 1) k *= 0.55;
            break;
        }
      }
      ctx.fillStyle = `rgb(${Math.min(255, r * k) | 0},${Math.min(255, g * k) | 0},${Math.min(255, b * k) | 0})`;
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

export function initAtlas() {
  atlas.tex = buildAtlas();
  return atlas.tex;
}

const icons = new Map();
export function iconURL(t) {
  if (icons.has(t)) return icons.get(t);
  if (!atlas.cv || !FACE_TILES[t]) return '';
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const ft = FACE_TILES[t];
  
  if (!Number.isInteger(ft[1])) {   // doku yoksa düz renkli kare
    g.fillStyle = '#8a8a8a'; g.fillRect(6, 6, 20, 20);
    const u0 = c.toDataURL(); icons.set(t, u0); return u0;
  }

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
export const tileNames = TILE_NAMES;
export const clearIcons = () => icons.clear();

export const addFlat = (...a) => a.forEach(i => FLAT.add(i));
