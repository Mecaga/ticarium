import { get, set, generate, initRender, rebuild, updateTarget, target, prev } from './world.js';
import { P, collides, updatePlayer, jump } from './player.js';
import { eco, startPriceTicker } from './economy.js';
import { initInput } from './input.js';
import { drawHud, drawMarket, toast, toggleMarket, isMarketOpen } from './ui.js';
import { TYPES } from './world.js';

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

// Dünya
generate();
initRender(scene);

// Eylemler
function breakBlock() {
  if (!target || target[1] === 0) return;
  const t = get(...target);
  set(...target, 0);
  eco.inv[t]++;
  rebuild(); drawHud();
}

function placeBlock() {
  if (!prev) return;
  if (eco.inv[eco.sel] < 1) return toast(TYPES[eco.sel].name + ' yok. Pazardan al ya da topla.');
  const [x, y, z] = prev;
  set(x, y, z, eco.sel);
  if (collides(P.x, P.y, P.z)) { set(x, y, z, 0); return; }
  eco.inv[eco.sel]--;
  rebuild(); drawHud();
}

initInput(renderer.domElement, {
  jump,
  breakBlock,
  placeBlock,
  market: toggleMarket,
  select: n => { eco.sel = n; drawHud(); }
});

startPriceTicker(() => { if (isMarketOpen()) drawMarket(); });
drawHud();

// Döngü
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  updatePlayer(dt, isMarketOpen());
  camera.position.set(P.x, P.y + 1.6, P.z);
  camera.rotation.set(P.pitch, P.yaw, 0);
  updateTarget(camera);
  renderer.render(scene, camera);
}
requestAnimationFrame(loop);

// Firebase testi: sonuç ekranda kalır
const dbg = document.createElement('div');
dbg.style.cssText = 'position:fixed;top:56px;left:8px;right:8px;background:#000c;color:#fff;padding:8px;border-radius:8px;font-size:12px;z-index:50;word-break:break-all';
dbg.textContent = 'Firebase bağlanıyor...';
document.body.appendChild(dbg);
dbg.onclick = () => dbg.remove();

import('./firebase.js')
  .then(m => m.login())
  .then(id => { dbg.textContent = '✅ Online bağlandı: ' + id.slice(0, 8); setTimeout(() => dbg.remove(), 4000); })
  .catch(e => { dbg.style.background = '#b3261e'; dbg.textContent = '❌ ' + (e.code || '') + ' ' + (e.message || e); });
