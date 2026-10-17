import { get, set, generate, initRender, rebuild, updateTarget, target, prev, TYPES, heightAt, N } from './world.js';
import { P, collides, updatePlayer, jump } from './player.js';
import { eco, resetEco, startPriceTicker } from './economy.js';
import { initInput } from './input.js';
import { drawHud, drawMarket, toast, toggleMarket, isMarketOpen, hooks } from './ui.js';
import { toggleBag, isBagOpen } from './bag.js';
import { initMenu, showMenu, isMenuOpen, leaveToMenu } from './menu.js';

// Sahne
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 25, 60);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 100);
camera.rotation.order = 'YXZ';
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.prepend(renderer.domElement);
scene.add(new THREE.AmbientLight(0xffffff, 0.65));
const sun = new THREE.DirectionalLight(0xffffff, 0.6);
sun.position.set(0.5, 1, 0.3);
scene.add(sun);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

let online = null;
hooks.bag = toggleBag;
addEventListener('keydown', e => {
  if (e.code === 'KeyB' && e.target.tagName !== 'INPUT' && !isMenuOpen()) toggleBag();
});

// Eylemler
function breakBlock() {
  if (!target || target[1] === 0) return;
  const [x, y, z] = target;
  const t = get(x, y, z);
  set(x, y, z, 0);
  eco.inv[t]++;
  if (online) online.sendBlock(x, y, z, 0);
  rebuild(); drawHud();
}

function placeBlock() {
  if (!prev) return;
  if (eco.inv[eco.sel] < 1) return toast(TYPES[eco.sel].name + ' yok. Pazardan al ya da topla.');
  const [x, y, z] = prev;
  set(x, y, z, eco.sel);
  if (collides(P.x, P.y, P.z)) { set(x, y, z, 0); return; }
  if (online) online.sendBlock(x, y, z, eco.sel);
  eco.inv[eco.sel]--;
  rebuild(); drawHud();
}

// Odaya / oyuna giriş
function enterGame(info) {
  if (online) { online.stopOnline(); online = null; }
  generate(info.seed);
  rebuild();
  P.x = N / 2 + 0.5; P.z = N / 2 + 0.5;
  P.y = heightAt(N / 2, N / 2) + 2; P.vy = 0;
  resetEco();
  const ri = document.getElementById('roomInfo');
  ri.textContent = info.solo ? 'Tek oyunculu' : 'Oda: ' + info.code + ' · ' + info.name;
  drawHud();

  if (!info.solo) {
    import('./online.js')
      .then(m => {
        online = m;
        m.startOnline(scene, info.code, {
          isOwner: info.isOwner,
          onPrices: () => { if (isMarketOpen()) drawMarket(); }
        });
      })
      .catch(e => { ri.textContent = 'Online hata: ' + (e.message || e); });
  }
}

async function leave() {
  if (online) { online.stopOnline(); online = null; }
  await leaveToMenu();
}

// Başlat
generate(1);
initRender(scene);

initInput(renderer.domElement, {
  jump, breakBlock, placeBlock,
  market: toggleMarket,
  select: n => {
    if (n < 1 || n > eco.hotbar.length) return;
    eco.hsel = n - 1; eco.sel = eco.hotbar[n - 1]; drawHud();
  }
});

const bLeave = document.getElementById('bLeave');
bLeave.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); leave(); }, { passive: false });
bLeave.addEventListener('mousedown', e => { e.stopPropagation(); leave(); });

initMenu(enterGame);
showMenu();
startPriceTicker(() => { if (isMarketOpen()) drawMarket(); });
drawHud();

// Döngü
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  updatePlayer(dt, isMarketOpen() || isMenuOpen() || isBagOpen());
  if (online) online.updateOthers(dt);
  camera.position.set(P.x, P.y + 1.6, P.z);
  camera.rotation.set(P.pitch, P.yaw, 0);
  updateTarget(camera);
  renderer.render(scene, camera);
}
requestAnimationFrame(loop);
