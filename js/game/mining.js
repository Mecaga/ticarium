import { N } from '../world/idtable.js';
import { target, get, BEDROCK } from '../world/world.js';
import { hash } from '../world/textures.js';
import { eco } from './economy.js';
import { isDead } from '../entities/health.js';
import { isCreative } from './creative.js';
import { sfx } from '../core/sound.js';

// Aletler: [tür, seviye, hız]  (seviye: 1 ahşap, 2 taş, 3 demir, 4 elmas)
export const TOOLS = {
  [N.AHSAP_KAZMA]: ['pick', 1, 2], [N.TAS_KAZMA]: ['pick', 2, 4], [N.DEMIR_KAZMA]: ['pick', 3, 6], [N.ELMAS_KAZMA]: ['pick', 4, 8],
  [N.AHSAP_BALTA]: ['axe', 1, 2], [N.TAS_BALTA]: ['axe', 2, 4], [N.DEMIR_BALTA]: ['axe', 3, 6], [N.ELMAS_BALTA]: ['axe', 4, 8],
  [N.AHSAP_KUREK]: ['shovel', 1, 2], [N.TAS_KUREK]: ['shovel', 2, 4], [N.DEMIR_KUREK]: ['shovel', 3, 6], [N.ELMAS_KUREK]: ['shovel', 4, 8],
  [N.AHSAP_CAPA]: ['hoe', 1, 1], [N.TAS_CAPA]: ['hoe', 2, 1], [N.DEMIR_CAPA]: ['hoe', 3, 1], [N.ELMAS_CAPA]: ['hoe', 4, 1],
  [N.AHSAP_KILIC]: ['sword', 1, 1], [N.TAS_KILIC]: ['sword', 2, 1], [N.DEMIR_KILIC]: ['sword', 3, 1], [N.ELMAS_KILIC]: ['sword', 4, 1]
};
export const isTool = t => !!TOOLS[t];

// Blok sertliği: [eli boş süre (sn), uygun alet, gereken alet seviyesi]
const HARD = {
  [N.RAY]: [0.2, 'pick', 0],
  [N.CIM]: [0.9, 'shovel', 0], [N.TOPRAK]: [0.8, 'shovel', 0], [N.TAS]: [4, 'pick', 0], [N.ODUN]: [3, 'axe', 0], [N.YAPRAK]: [0.3, null, 0],
  [N.KUM]: [0.8, 'shovel', 0], [N.TUGLA]: [4.5, 'pick', 0], [N.KAR]: [0.4, 'shovel', 0], [N.CAM]: [0.5, null, 0],
  [N.ALTIN_BLOK]: [6, 'pick', 3], [N.FIDAN]: [0.05, null, 0], [N.HUS_ODUN]: [3, 'axe', 0], [N.HUS_YAPRAK]: [0.3, null, 0],
  [N.YUN]: [1.2, null, 0], [N.TUVAL]: [1, null, 0], [N.OBSIDIYEN]: [60, 'pick', 4],
  [N.KOMUR_CEVHERI]: [3, 'pick', 1], [N.DEMIR_CEVHERI]: [3.5, 'pick', 2], [N.ALTIN_CEVHERI]: [3.5, 'pick', 3], [N.ELMAS_CEVHERI]: [4, 'pick', 3],
  [N.OCAK]: [3.5, 'pick', 1], [N.TAHTA]: [2, 'axe', 0], [N.CALISMA_MASASI]: [2.5, 'axe', 0], [75]: [0.6, 'shovel', 0],
  [N.DEMIR_BLOK]: [5, 'pick', 2], [N.ELMAS_BLOK]: [5, 'pick', 3], [76]: [0.05, null, 0],
  [N.SANDIK]: [2.5, 'axe', 0], [N.MUZIK_KUTUSU]: [2.5, 'axe', 0], [N.SEMA_BLOGU]: [2.5, 'axe', 0], [N.YATAK_BASI]: [0.8, null, 0], [N.YATAK_SONU]: [0.8, null, 0],
  [N.TNT]: [0.05, null, 0], [N.CAKIL]: [1.5, 'shovel', 0],
  [N.SALTER]: [0.1, null, 0], [78]: [0.1, null, 0], [N.REDSTONE_BLOK]: [3, 'pick', 1],
  [N.HUNI]: [3, 'pick', 1] // 🔄 Paket 14: Huni sertliği (Demir kazma veya dengi ile kazılır)
};
for (let i = N.LAVANTA; i <= N.AMBER; i++) HARD[i] = [0.05, null, 0];
for (let i = N.BUGDAY_0; i <= N.BUGDAY_3; i++) HARD[i] = [0.05, null, 0];
for (let i = 204; i <= 235; i++) HARD[i] = [0.05, null, 0];
for (let i = N.MOR_YUN; i <= N.BEYAZ_YUN; i++) HARD[i] = [1.2, null, 0];
for (let i = 170; i <= 172; i++) HARD[i] = [0.3, 'shovel', 0];
for (let i = 240; i <= 255; i++) HARD[i] = [1.5, 'axe', 0];

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
  if (t === BEDROCK && !isCreative()) {
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
