import { generate, initRender, rebuild, updateTarget, isWater, updateChunks, chunksReady } from './world/world.js';
import { P, updatePlayer, jump } from './entities/player.js';
import { eco, startPriceTicker } from './game/economy.js';
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
import { tickVitals } from './entities/vitals.js';
import { initPack } from './world/texturepack.js';

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

const panelsOpen = () => isDrawOpen() || isCraftOpen() || isFurnaceOpen();

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
initPack();
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
  camera.position.set(P.x, P.y + 1.6, P.z);
  camera.rotation.set(P.pitch, P.yaw, 0);
  const uw = isWater(Math.floor(camera.position.x), Math.floor(camera.position.y), Math.floor(camera.position.z));
  updateSky(dt, camera, uw);
  updateTarget(camera);
  updateMining(dt, !frozen && !!room);
  renderer.render(scene, camera);
}
requestAnimationFrame(loop);
