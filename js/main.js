import { generate, initRender, rebuild, updateTarget } from './world.js';
import { P, updatePlayer, jump } from './player.js';
import { eco, startPriceTicker } from './economy.js';
import { initInput } from './input.js';
import { drawHud, drawMarket, toggleMarket, isMarketOpen, hooks, MARKET_ON } from './ui.js';
import { toggleBag, isBagOpen } from './bag.js';
import { initMenu, showMenu, isMenuOpen } from './menu.js';
import { initItems, updateItems, dropFromInventory } from './items.js';
import { killNow, tickHealth, isDead } from './health.js';
import { initSky, updateSky } from './sky.js';
import { initMobs, updateMobs } from './mobs.js';
import { initGravity, updateGravity } from './gravity.js';
import { G } from './state.js';
import { initAutosave } from './progress.js';
import { initActions, breakBlock, placeBlock, attack } from './actions.js';
import { initDeath } from './death.js';
import { enterGame, leave } from './session.js';
import { applyRoomUI, drawHearts, panelOpen, toggleSettings, togglePlayers, phooks } from './panels.js';

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
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const sunL = new THREE.DirectionalLight(0xffffff, 0.55);
sunL.position.set(0.5, 0.75, 0.4);
scene.add(sunL);

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
  if (e.target.tagName === 'INPUT' || isMenuOpen()) return;
  if (e.code === 'KeyB') toggleBag();
  if (e.code === 'KeyF') attack();
  if (e.code === 'KeyP') togglePlayers();
  if (e.code === 'KeyQ' && !isDead()) dropFromInventory(eco.sel, 1);
});

// Başlat
generate(1);
initRender(scene);
initItems(scene);
initMobs(scene);
initSky(scene);
initGravity(scene);
initActions();
initDeath();
initAutosave();

initInput(renderer.domElement, {
  jump, breakBlock, placeBlock,
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
let last = performance.now(), lastCoord = '';
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const frozen = isMarketOpen() || isMenuOpen() || isBagOpen() || panelOpen() || isDead();
  updatePlayer(dt, frozen);
  if (!frozen && P.y < -15) killNow({ void: true });
  const room = G.room;
  if (room) {
    tickHealth(dt);
    updateMobs(dt, room.solo || room.isOwner);
    updateGravity(dt);
    const c = 'X ' + Math.floor(P.x) + '  Y ' + Math.floor(P.y) + '  Z ' + Math.floor(P.z);
    if (c !== lastCoord) { $('coord').textContent = c; lastCoord = c; }
  }
  if (G.online) G.online.updateOthers(dt);
  updateItems(dt, !frozen);
  rebuild();
  camera.position.set(P.x, P.y + 1.6, P.z);
  camera.rotation.set(P.pitch, P.yaw, 0);
  updateSky(dt, camera);
  updateTarget(camera);
  renderer.render(scene, camera);
}
requestAnimationFrame(loop);
