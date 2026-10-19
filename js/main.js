import { generate, initRender, rebuild, updateTarget, isWater } from './world/world.js';
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
import { enterGame, leave } from './game/session.js';
import { applyRoomUI, drawHearts, panelOpen, toggleSettings, togglePlayers, phooks } from './ui/panels.js';
import { initChat, isChatOpen, toggleChat } from './ui/chat.js';
import { tickHunger, canRegen } from './entities/hunger.js';
import { sfx } from './core/sound.js';
import { updateFluids } from './world/fluids.js';
import { initPaints, updatePaints } from './world/paints.js';
import { isDrawOpen } from './ui/draw.js';
import { tickVitals } from './entities/vitals.js';

const $ = id => document.getElementById(id);

// Sahne
const scene = new THREE.Scene();
G.scene = scene;
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 30, 75);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 120);
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

// Bırak butonu
const bDrop = document.createElement('div');
bDrop.className = 'btn';
bDrop.id = 'bDrop';
bDrop.textContent = '⬇️';
document.body.appendChild(bDrop);

function bindBtn(id, fn) {
  const el = $(id);
  el.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false });
  el.addEventListener('mousedown', e => { e.stopPropagation(); fn(); });
}

hooks.bag = toggleBag;
phooks.leave = leave;
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || isMenuOpen() || isDrawOpen()) return;
  if (e.code === 'KeyB') toggleBag();
  if (e.code === 'KeyF') attack();
  if (e.code === 'KeyP') togglePlayers();
  if (e.code === 'KeyT' && G.room) { e.preventDefault(); toggleChat(); }
  if (e.code === 'KeyQ' && !isDead()) dropFromInventory(eco.sel, 1);
});

// Başlat
generate(1);
initRender(scene);
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

bindBtn('bLeave', leave);
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

// Döngü
let last = performance.now(), lastCoord = '', lx = P.x, lz = P.z, wasWater = false;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const frozen = isMarketOpen() || isMenuOpen() || isBagOpen() || panelOpen() || isChatOpen() || isDrawOpen() || isDead();
  updatePlayer(dt, frozen);
  if (!frozen && P.y < -15) { if (hp.god) toSpawn(); else killNow({ void: true }); }
  const room = G.room;
  if (room) {
    const moved = Math.hypot(P.x - lx, P.z - lz) / Math.max(dt, 0.001) > 0.5;
    tickHealth(dt, canRegen());
    tickHunger(dt, moved, !isDead());
    tickVitals(dt, !isDead());
    updateMobs(dt, room.solo || room.isOwner);
    updateGravity(dt);
    updateFluids(dt);
    updatePaints(dt);
    if (P.inWater && !wasWater) sfx.splash();
    const c = 'X ' + Math.floor(P.x) + '  Y ' + Math.floor(P.y) + '  Z ' + Math.floor(P.z) + '  ' + gameClock();
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
