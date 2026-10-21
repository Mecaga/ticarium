import { target, get, BEDROCK } from '../world/world.js';
import { hash } from '../world/textures.js';
import { eco } from './economy.js';
import { isDead } from '../entities/health.js';
import { isCreative } from './creative.js';
import { sfx } from '../core/sound.js';

// Aletler: [tür, seviye, hız]  (seviye: 1 ahşap, 2 taş, 3 demir, 4 elmas, 5 netherit)
export const TOOLS = {
  50: ['pick', 1, 2], 51: ['pick', 2, 4], 52: ['pick', 3, 6], 53: ['pick', 4, 8], 54: ['pick', 5, 9],
  57: ['axe', 1, 2], 58: ['axe', 2, 4], 55: ['axe', 3, 6], 69: ['axe', 4, 8],
  59: ['shovel', 1, 2], 60: ['shovel', 2, 4], 56: ['shovel', 3, 6], 89: ['shovel', 4, 8],
  61: ['hoe', 1, 1], 62: ['hoe', 2, 1], 63: ['hoe', 3, 1], 64: ['hoe', 4, 1],
  65: ['sword', 1, 1], 66: ['sword', 2, 1], 67: ['sword', 3, 1], 68: ['sword', 4, 1]
};
export const isTool = t => !!TOOLS[t];

// Blok sertliği: [eli boş süre (sn), uygun alet, gereken alet seviyesi]
const HARD = {
  1: [0.9, 'shovel', 0], 2: [0.8, 'shovel', 0], 3: [4, 'pick', 0], 4: [3, 'axe', 0], 5: [0.3, null, 0],
  6: [0.8, 'shovel', 0], 7: [4.5, 'pick', 0], 8: [0.4, 'shovel', 0], 9: [0.5, null, 0], 10: [6, 'pick', 3],
  12: [0.05, null, 0], 13: [3, 'axe', 0], 14: [0.3, null, 0], 16: [1.2, null, 0], 32: [1, null, 0],
  34: [60, 'pick', 4], 35: [65, 'pick', 4],
  36: [3, 'pick', 1], 37: [3.5, 'pick', 2], 38: [3.5, 'pick', 3], 39: [4, 'pick', 3], 81: [3.5, 'pick', 1],
  40: [0.05, null, 0], 41: [0.05, null, 0], 42: [0.05, null, 0], 43: [0.05, null, 0], 44: [0.05, null, 0], 45: [0.05, null, 0],
  70: [2, 'axe', 0], 72: [2.5, 'axe', 0], 76: [0.6, 'shovel', 0],
  77: [0.05, null, 0], 78: [0.05, null, 0], 79: [0.05, null, 0], 80: [0.05, null, 0]
};

// Blok sertliği (aletin aşınıp aşınmayacağına karar vermek için)
export const hardTime = t => (HARD[t] || [1])[0];

export function breakInfo(t) {
  if (isCreative()) return { time: 0.15, drop: true };
  const h = HARD[t] || [1, null, 0];
  const own = TOOLS[eco.sel] && eco.inv[eco.sel] > 0 ? TOOLS[eco.sel] : null;
  let time = h[0];
  if (own && h[1] && own[0] === h[1]) time /= own[2];
  const okTool = h[2] === 0 || (own && own[0] === h[1] && own[1] >= h[2]);
  if (!okTool) time *= 3.3;
  return { time, drop: !!okTool };
}

// online.js: (x, y, z, aşama) kırarken, (null) bırakınca. Diğer oyuncular çatlağı canlı görür.
export const mineHooks = { onProgress: null };

let cvCache = null;
function crackCanvas() {
  if (cvCache) return cvCache;
  const cv = document.createElement('canvas');
  cv.width = 160; cv.height = 16;
  const g = cv.getContext('2d');
  const rays = [];
  for (let r = 0; r < 7; r++) {
    let x = 7.5 + (hash(r, 1, 9) - 0.5) * 3, y = 7.5 + (hash(r, 2, 9) - 0.5) * 3;
    let ang = r * Math.PI * 2 / 7 + hash(r, 3, 9);
    const path = [];
    for (let i = 0; i < 22; i++) {
      ang += (hash(r, i + 10, 9) - 0.5) * 0.9;
      x += Math.cos(ang) * 0.8; y += Math.sin(ang) * 0.8;
      path.push([Math.round(x), Math.round(y)]);
    }
    rays.push(path);
  }
  for (let s = 0; s < 10; s++) {
    const n = Math.ceil((s + 1) * 22 / 10);
    g.fillStyle = 'rgba(0,0,0,0.78)';
    for (const p of rays) {
      for (let i = 0; i < n && i < p.length; i++) {
        const px = p[i][0], py = p[i][1];
        if (px >= 0 && py >= 0 && px < 16 && py < 16) g.fillRect(s * 16 + px, py, 1, 1);
      }
    }
  }
  return (cvCache = cv);
}

// Çatlak katmanı (yerel kırma ve her uzaktaki oyuncu için ayrı kopya)
export function makeCrack(scene) {
  const tex = new THREE.CanvasTexture(crackCanvas());
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.repeat.set(0.1, 1);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.012, 1.012, 1.012), mat);
  mesh.visible = false;
  scene.add(mesh);
  return {
    show(x, y, z, stage) { tex.offset.x = stage * 0.1; mesh.position.set(x + 0.5, y + 0.5, z + 0.5); mesh.visible = true; },
    hide() { mesh.visible = false; },
    remove() { scene.remove(mesh); tex.dispose(); mat.dispose(); mesh.geometry.dispose(); }
  };
}

const M = { down: false, key: '', p: 0, cool: 0, tick: 0, bt: 0, sent: 0, last: -1 };
let crack = null, doBreak = null;

export function initMining(scene, onBreak) {
  doBreak = onBreak;
  crack = makeCrack(scene);
}

function stop() {
  M.key = ''; M.p = 0; M.tick = 0; M.bt = 0; M.last = -1;
  if (crack) crack.hide();
  if (M.sent) { M.sent = 0; if (mineHooks.onProgress) mineHooks.onProgress(null); }
}

export function breakDown() { M.down = true; }
export function breakUp() { M.down = false; stop(); }

export function updateMining(dt, active) {
  if (M.cool > 0) M.cool -= dt;
  if (!M.down || !active || isDead() || !target) { if (M.key || M.sent) stop(); return; }
  const [x, y, z] = target;
  const t = get(x, y, z);
  if (t === BEDROCK) {
    if (M.cool <= 0) { doBreak(true); M.cool = 0.8; }
    stop();
    return;
  }
  const key = x + '_' + y + '_' + z + '_' + t;
  if (key !== M.key) { stop(); M.key = key; }
  if (M.cool > 0) return;
  const info = breakInfo(t);
  M.p += dt; M.tick += dt; M.bt += dt;
  if (M.tick >= 0.35) { M.tick = 0; sfx.breakB(); }
  if (M.p >= info.time) {
    doBreak(info.drop);
    M.cool = 0.2;
    stop();
    return;
  }
  const stage = Math.min(9, Math.floor(M.p / info.time * 10));
  if (info.time > 0.25) {
    crack.show(x, y, z, stage);
    if (stage !== M.last || M.bt >= 0.4) {
      M.bt = 0; M.last = stage; M.sent = 1;
      if (mineHooks.onProgress) mineHooks.onProgress(x, y, z, stage);
    }
  }
}
