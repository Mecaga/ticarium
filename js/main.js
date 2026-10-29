// ==========================================
// 1. HAYALET VE KOPYA İTEM TEMİZLEME FONKSİYONU
// ==========================================
function sanitizeAndFixItemIDs(playerInventory, worldChests) {
  const validIDs = new Set([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 25,
    30, 31, 32, 33, 34, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47,
    50, 51, 52, 53, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71,
    70, 72, 73, 74, 75, 76, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 107, 108, 109,
    176, 186, 187, 188
  ]);
  
  for (let i = 110; i <= 117; i++) validIDs.add(i);
  for (let i = 120; i <= 127; i++) validIDs.add(i);
  for (let i = 130; i <= 149; i++) validIDs.add(i);
  for (let i = 210; i <= 240; i++) validIDs.add(i);

  let removedCount = 0;

  // Envanter temizliği
  if (playerInventory && Array.isArray(playerInventory)) {
    for (let i = 0; i < playerInventory.length; i++) {
      let item = playerInventory[i];
      if (item && item.id !== undefined && item.id !== null) {
        if (!validIDs.has(Number(item.id))) {
          console.warn(`[ID Fixer] Geçersiz/Kopya item temizlendi: ID ${item.id}`);
          playerInventory[i] = null; // Bozuk slotu boşalt
          removedCount++;
        }
      }
    }
  }

  // Sandık temizliği (Eğer sandıklar varsa)
  if (worldChests && typeof worldChests === 'object') {
    for (let key in worldChests) {
      let chest = worldChests[key];
      if (chest && Array.isArray(chest.items)) {
        for (let i = 0; i < chest.items.length; i++) {
          let item = chest.items[i];
          if (item && item.id !== undefined && item.id !== null && !validIDs.has(Number(item.id))) {
            chest.items[i] = null;
            removedCount++;
          }
        }
      }
    }
  }

  if (removedCount > 0) {
    console.log(`[ID Fixer] Toplam ${removedCount} adet bozuk/kopya hayalet öğe temizlendi ve slotlar düzeltildi!`);
  }
}

// ==========================================
// 2. OYUNU YÜKLEME ANINDA ÇALIŞTIRMA
// ==========================================
// Projendeki load / init fonksiyonunun içine bunu entegre et:
function loadGameData() {
  try {
    let savedData = JSON.parse(localStorage.getItem('game_save')) || {}; // (localStorage anahtar kelimen neyse buraya onu yaz)
    
    let playerInv = savedData.inventory || savedData.player?.inventory; 
    let chests = savedData.chests || savedData.worldChests;

    // KOPYA VE HAYALET İTEMLERİ BURADA TEMİZLETİYORUZ:
    sanitizeAndFixItemIDs(playerInv, chests);

    // Oyun verilerini yüklemeye devam et...
    return savedData;
  } catch (e) {
    console.error("Kayıt yüklenirken hata:", e);
  }
}

// Oyun başlarken bu fonksiyonu tetikle:
loadGameData();

import { eco, startPriceTicker } from './game/economy.js';
import { generate, initRender, rebuild, updateTarget, isWater, updateChunks, chunksReady } from './world/world.js';
import { P, updatePlayer, jump } from './entities/player.js';
import { initInput } from './ui/input.js';
import { drawHud, drawMarket, toggleMarket, isMarketOpen, hooks, MARKET_ON } from './ui/ui.js';
import { toggleBag, isBagOpen } from './ui/bag.js';
import { initMenu, showMenu, isMenuOpen } from './ui/menu.js';
import { initItems, updateItems, dropFromInventory } from './entities/items.js';
import { killNow, tickHealth, isDead, hp } from './entities/health.js';
import { initSky, updateSky, setLights, gameClock } from './world/sky.js';
import { initMobs, updateMobs } from './entities/mobs.js';
import { initGravity, updateGravity } from './world/gravity.js';
import { G } from './core/state.js';
import { initAutosave } from './game/progress.js';
import { initActions, breakBlock, placeBlock, attack } from './game/actions.js';
import { initMining, breakDown, breakUp, updateMining } from './game/mining.js';
import { initDeath, toSpawn } from './game/death.js';
import { enterGame, leave, requestLeave } from './game/session.js';
import { applyRoomUI, drawHearts, panelOpen, toggleSettings, togglePlayers, phooks } from './ui/panels.js';
import { initChat, isChatOpen, toggleChat } from './ui/chat.js';
import { tickHunger, canRegen } from './entities/hunger.js';
import { sfx } from './core/sound.js';
import { updateFluids } from './world/fluids.js';
import { initPaints, updatePaints } from './world/paints.js';
import { isDrawOpen } from './ui/draw.js';
import { isCraftOpen } from './ui/craft.js';
import { updateFurnace, isFurnaceOpen } from './ui/furnace.js';
import { isChestOpen } from './game/chests.js';
import { tickVitals } from './entities/vitals.js';
import { initPack } from './world/texturepack.js';
import './game/looks.js';
import './game/modes.js';
import './game/content.js'; // İçerik tanımlarının erkenden yüklenmesini sağlar


const $ = id => document.getElementById(id);

const scene = new THREE.Scene();
G.scene = scene;
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 36, 72);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 140);
camera.rotation.order = 'YXZ';
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.prepend(renderer.domElement);
const amb = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(amb);
const sunL = new THREE.DirectionalLight(0xffffff, 0.55);
sunL.position.set(0.5, 0.75, 0.4);
scene.add(sunL);
setLights(amb, sunL);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

if (!MARKET_ON) {
  $('bMarket').style.display = 'none';
  $('coins').style.display = 'none';
}

const bDrop = document.createElement('div');
bDrop.className = 'btn';
bDrop.id = 'bDrop';
bDrop.textContent = '⬇️';
document.body.appendChild(bDrop);

const loadEl = document.createElement('div');
loadEl.textContent = '🌍 Dünya yükleniyor...';
loadEl.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#000a;color:#fff;font-size:20px;font-weight:700;display:none;align-items:center;justify-content:center;z-index:9;pointer-events:none';
document.body.appendChild(loadEl);

function bindBtn(id, fn) {
  const el = $(id);
  el.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false });
  el.addEventListener('mousedown', e => { e.stopPropagation(); fn(); });
}

const panelsOpen = () => isDrawOpen() || isCraftOpen() || isFurnaceOpen() || isChestOpen();

hooks.bag = toggleBag;
phooks.leave = leave;
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || isMenuOpen() || panelsOpen()) return;
  if (e.code === 'KeyB') toggleBag();
  if (e.code === 'KeyF') attack();
  if (e.code === 'KeyP') togglePlayers();
  if (e.code === 'KeyT' && G.room) { e.preventDefault(); toggleChat(); }
  if (e.code === 'KeyQ' && !isDead()) dropFromInventory(eco.sel, 1);
});

generate(1);
initRender(scene);
initPack();
initItems(scene);
initMobs(scene);
initSky(scene);
initGravity(scene);
initPaints(scene);
initActions();
initMining(scene, breakBlock);
initDeath();
initAutosave();
initChat();

initInput(renderer.domElement, {
  jump, breakDown, breakUp, placeBlock,
  market: toggleMarket,
  select: n => {
    if (n < 1 || n > eco.hotbar.length) return;
    eco.hsel = n - 1; eco.sel = eco.hotbar[n - 1]; drawHud();
  }
});

bindBtn('bLeave', requestLeave);
bindBtn('bAttack', attack);
bindBtn('bSettings', toggleSettings);
bindBtn('bPlayers', togglePlayers);
bindBtn('bDrop', () => { if (!isDead()) dropFromInventory(eco.sel, 1); });

initMenu(enterGame);
showMenu();
applyRoomUI();
if (MARKET_ON) startPriceTicker(() => { if (isMarketOpen()) drawMarket(); });
drawHud();
drawHearts(20, 20);

let last = performance.now(), lastCoord = '', lx = P.x, lz = P.z, wasWater = false;
let fpsN = 0, fpsT = 0, fps = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const raw = (now - last) / 1000;
  const dt = Math.min(0.05, raw);
  last = now;
  fpsN++; fpsT += raw;
  if (fpsT >= 0.5) { fps = Math.round(fpsN / fpsT); fpsN = 0; fpsT = 0; }

  const room = G.room;
  let ready = true;
  if (room) {
    updateChunks(P.x, P.z, 6);
    ready = chunksReady(P.x, P.z);
  }
  loadEl.style.display = room && !ready ? 'flex' : 'none';

  const frozen = isMarketOpen() || isMenuOpen() || isBagOpen() || panelOpen() || isChatOpen() || panelsOpen() || isDead() || (!!room && !ready);
  updatePlayer(dt, frozen);
  if (!frozen && P.y < -15) { if (hp.god) toSpawn(); else killNow({ void: true }); }
  if (room) {
    const moved = Math.hypot(P.x - lx, P.z - lz) / Math.max(dt, 0.001) > 0.5;
    tickHealth(dt, canRegen());
    tickHunger(dt, moved, !isDead());
    tickVitals(dt, !isDead());
    updateMobs(dt, !!room.sim);
    updateGravity(dt);
    updateFluids(dt);
    updatePaints(dt);
    updateFurnace(dt);
    if (P.inWater && !wasWater) sfx.splash();
    const c = 'X ' + Math.floor(P.x) + '  Y ' + Math.floor(P.y) + '  Z ' + Math.floor(P.z) + '  ' + gameClock() + '  ' + fps + ' FPS';
    if (c !== lastCoord) { $('coord').textContent = c; lastCoord = c; }
  }
  wasWater = P.inWater; lx = P.x; lz = P.z;
  if (G.online) G.online.updateOthers(dt);
  updateItems(dt, !frozen);
  rebuild();
  camera.position.set(P.x, P.y + (P.sneak ? 1.3 : 1.6), P.z);
  camera.rotation.set(P.pitch, P.yaw, 0);
  const uw = isWater(Math.floor(camera.position.x), Math.floor(camera.position.y), Math.floor(camera.position.z));
  updateSky(dt, camera, uw);
  updateTarget(camera);
  updateMining(dt, !frozen && !!room && !P.ghost);
  renderer.render(scene, camera);
}
requestAnimationFrame(loop);

// Debug panel için global atamalar
window.P = P; window.eco = eco; window.G = G;
