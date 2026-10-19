export function hash(x, y, s) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

const TILE_NAMES = ['grassTop', 'grassSide', 'dirt', 'stone', 'woodSide', 'woodTop', 'leaves', 'sand', 'brick', 'snow',
  'glass', 'gold', 'bedrock', 'sapling', 'birchSide', 'birchTop', 'birchLeaf', 'meat', 'wool', 'water',
  'bucket', 'wbucket', 'paint', 'lava', 'lbucket', 'apple',
  'lavender', 'daisy', 'poppy', 'bpoppy', 'tulipo', 'tulipp',
  'obsidian', 'netherite', 'pickW', 'pickS', 'pickI', 'pickD', 'pickN', 'axe', 'shovel'];
const FLOWERS = new Set(['lavender', 'daisy', 'poppy', 'bpoppy', 'tulipo', 'tulipp']);
const HEAD = {
  pickW: [176, 136, 72], pickS: [150, 150, 150], pickI: [222, 222, 228], pickD: [80, 225, 215],
  pickN: [92, 76, 88], axe: [222, 222, 228], shovel: [222, 222, 228]
};
const TI = {};
TILE_NAMES.forEach((n, i) => { TI[n] = i; });
export const T = TILE_NAMES.length;

// [üst, yan, alt]
export const FACE_TILES = {
  1: [TI.grassTop, TI.grassSide, TI.dirt],
  2: [TI.dirt, TI.dirt, TI.dirt],
  3: [TI.stone, TI.stone, TI.stone],
  4: [TI.woodTop, TI.woodSide, TI.woodTop],
  5: [TI.leaves, TI.leaves, TI.leaves],
  6: [TI.sand, TI.sand, TI.sand],
  7: [TI.brick, TI.brick, TI.brick],
  8: [TI.snow, TI.snow, TI.snow],
  9: [TI.glass, TI.glass, TI.glass],
  10: [TI.gold, TI.gold, TI.gold],
  11: [TI.bedrock, TI.bedrock, TI.bedrock],
  12: [TI.sapling, TI.sapling, TI.sapling],
  13: [TI.birchTop, TI.birchSide, TI.birchTop],
  14: [TI.birchLeaf, TI.birchLeaf, TI.birchLeaf],
  15: [TI.meat, TI.meat, TI.meat],
  16: [TI.wool, TI.wool, TI.wool],
  17: [TI.water, TI.water, TI.water],
  25: [TI.lava, TI.lava, TI.lava],
  30: [TI.bucket, TI.bucket, TI.bucket],
  31: [TI.wbucket, TI.wbucket, TI.wbucket],
  32: [TI.paint, TI.paint, TI.paint],
  33: [TI.lbucket, TI.lbucket, TI.lbucket],
  34: [TI.obsidian, TI.obsidian, TI.obsidian],
  35: [TI.netherite, TI.netherite, TI.netherite],
  40: [TI.lavender, TI.lavender, TI.lavender],
  41: [TI.daisy, TI.daisy, TI.daisy],
  42: [TI.poppy, TI.poppy, TI.poppy],
  43: [TI.bpoppy, TI.bpoppy, TI.bpoppy],
  44: [TI.tulipo, TI.tulipo, TI.tulipo],
  45: [TI.tulipp, TI.tulipp, TI.tulipp],
  46: [TI.apple, TI.apple, TI.apple],
  50: [TI.pickW, TI.pickW, TI.pickW],
  51: [TI.pickS, TI.pickS, TI.pickS],
  52: [TI.pickI, TI.pickI, TI.pickI],
  53: [TI.pickD, TI.pickD, TI.pickD],
  54: [TI.pickN, TI.pickN, TI.pickN],
  55: [TI.axe, TI.axe, TI.axe],
  56: [TI.shovel, TI.shovel, TI.shovel]
};

export const atlas = { tex: null, T };
export const sideTile = t => FACE_TILES[t][1];

const BASE = {
  grassTop: [95, 174, 69], grassSide: [139, 90, 43], dirt: [139, 90, 43], stone: [150, 148, 144],
  woodSide: [107, 68, 35], woodTop: [150, 110, 62], leaves: [47, 125, 50], sand: [230, 214, 144],
  brick: [181, 73, 58], snow: [245, 245, 245], glass: [159, 216, 232], gold: [255, 215, 0],
  bedrock: [62, 62, 66], sapling: [60, 170, 70], birchSide: [226, 223, 212], birchTop: [196, 178, 128],
  birchLeaf: [132, 184, 84], meat: [196, 70, 80], wool: [236, 236, 232], water: [50, 115, 205],
  bucket: [170, 175, 182], wbucket: [170, 175, 182], lbucket: [170, 175, 182], paint: [245, 240, 225],
  lava: [240, 100, 20], apple: [200, 30, 30],
  lavender: [150, 90, 205], daisy: [248, 248, 248], poppy: [208, 34, 40],
  bpoppy: [48, 82, 205], tulipo: [243, 134, 32], tulipp: [240, 120, 172],
  obsidian: [26, 16, 44], netherite: [74, 64, 70],
  pickW: [176, 136, 72], pickS: [150, 150, 150], pickI: [222, 222, 228], pickD: [80, 225, 215],
  pickN: [92, 76, 88], axe: [222, 222, 228], shovel: [222, 222, 228]
};

// Kaldırım taşı için hücre noktaları (kenarlar birleşsin diye sarmalı)
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

// Çiçek ve elma pikselleri (null = şeffaf)
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

// Kazma, balta, kürek pikselleri (null = şeffaf)
function toolPix(name, x, y) {
  if (name === 'axe') {
    const e = Math.pow((x - 10.5) / 3.2, 2) + Math.pow((y - 5) / 3.4, 2);
    if (e < 1) return HEAD[name];
  } else if (name === 'shovel') {
    const e = Math.pow((x - 11.5) / 2.6, 2) + Math.pow((y - 4.5) / 3.6, 2);
    if (e < 1) return HEAD[name];
  } else {
    const dx = x - 5.5, dy = y - 10.5, r = Math.hypot(dx, dy);
    if (r >= 5.2 && r <= 7.2 && dx >= -1 && dy <= 1) return HEAD[name];
  }
  if ((x + y === 16 || x + y === 17) && x >= 3 && x <= 11) return [122, 86, 42];
  return null;
}

function buildAtlas() {
  const cv = document.createElement('canvas');
  cv.width = 16 * T; cv.height = 16;
  const ctx = cv.getContext('2d');
  TILE_NAMES.forEach((name, i) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      let [r, g, b] = BASE[name];
      let k = 0.86 + hash(x, y, i) * 0.28;
      if (name === 'sapling') {
        const stalk = (x === 7 || x === 8) && y >= 8;
        const dxx = (x - 7.5) / 4.5, dyy = (y - 5) / 3.6;
        const crown = dxx * dxx + dyy * dyy < 1 && hash(x, y, 31) < 0.9;
        if (!stalk && !crown) continue; // şeffaf kalır
        if (stalk) { r = 96; g = 140; b = 60; }
      } else if (FLOWERS.has(name) || name === 'apple') {
        const c = plantPix(name, x, y);
        if (!c) continue;
        [r, g, b] = c;
        k = 0.93 + hash(x, y, i) * 0.14;
      } else if (HEAD[name]) {
        const c = toolPix(name, x, y);
        if (!c) continue;
        [r, g, b] = c;
        k = 0.94 + hash(x, y, i) * 0.12;
      } else if (name === 'bucket' || name === 'wbucket' || name === 'lbucket') {
        const w = y < 5 ? 6 : (y < 12 ? 5 : 4);
        const body = y >= 3 && y <= 14 && Math.abs(x - 7.5) <= w;
        const handle = (y <= 2 && y >= 1 && x >= 4 && x <= 11) || ((x === 4 || x === 11) && y >= 2 && y <= 4);
        if (!body && !handle) continue;
        if (handle) { r = 85; g = 85; b = 92; }
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
            if (x < 2 || y < 2 || x > 13 || y > 13) { r = 112; g = 80; b = 48; k = 0.9 + hash(x, y, 81) * 0.2; }
            else {
              k = 0.97 + hash(x, y, 82) * 0.06;
              if ((x * 3 + y * 5) % 13 === 0) { r = 214; g = 72; b = 72; k = 1; }
              else if ((x * 5 + y * 2) % 17 === 0) { r = 60; g = 110; b = 210; k = 1; }
            }
            break;
        }
      }
      ctx.fillStyle = `rgb(${Math.min(255, r * k) | 0},${Math.min(255, g * k) | 0},${Math.min(255, b * k) | 0})`;
      ctx.fillRect(i * 16 + x, y, 1, 1);
    }
  });
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
