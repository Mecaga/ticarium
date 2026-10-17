export function hash(x, y, s) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

const TILE_NAMES = ['grassTop', 'grassSide', 'dirt', 'stone', 'woodSide', 'woodTop', 'leaves', 'sand', 'brick', 'snow',
  'glass', 'gold', 'bedrock', 'sapling', 'birchSide', 'birchTop', 'birchLeaf', 'meat', 'wool', 'water'];
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
  17: [TI.water, TI.water, TI.water]
};

export const atlas = { tex: null, T };
export const sideTile = t => FACE_TILES[t][1];

const BASE = {
  grassTop: [95, 174, 69], grassSide: [139, 90, 43], dirt: [139, 90, 43], stone: [150, 148, 144],
  woodSide: [107, 68, 35], woodTop: [150, 110, 62], leaves: [47, 125, 50], sand: [230, 214, 144],
  brick: [181, 73, 58], snow: [245, 245, 245], glass: [159, 216, 232], gold: [255, 215, 0],
  bedrock: [62, 62, 66], sapling: [60, 170, 70], birchSide: [226, 223, 212], birchTop: [196, 178, 128],
  birchLeaf: [132, 184, 84], meat: [196, 70, 80], wool: [236, 236, 232], water: [50, 115, 205]
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
