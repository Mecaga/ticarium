import { get, set, generate, initRender, rebuild, updateTarget, target, prev, TYPES, heightAt, N } from './world.js';
import { P, collides, updatePlayer, jump } from './player.js';
import { eco, resetEco, startPriceTicker } from './economy.js';
import { initInput } from './input.js';
import { drawHud, drawMarket, toast, toggleMarket, isMarketOpen, hooks } from './ui.js';
import { toggleBag, isBagOpen } from './bag.js';
import { initMenu, showMenu, isMenuOpen, leaveToMenu } from './menu.js';

const $ = id => document.getElementById(id);

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
let room = null;           // { code, name, isOwner, pvp, max, solo }
let settingsOpen = false;

hooks.bag = toggleBag;
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || isMenuOpen()) return;
  if (e.code === 'KeyB') toggleBag();
  if (e.code === 'KeyF') attack();
});

// ---------- Arayüz ----------
function drawHearts(hp, max) {
  const full = Math.ceil(hp / 2), tot = Math.ceil(max / 2);
  $('hearts').textContent = '❤️'.repeat(full) + '🖤'.repeat(Math.max(0, tot - full));
}

function applyRoomUI() {
  const online_ = !!(room && !room.solo);
  const pv = online_ && room.pvp;
  $('bAttack').style.display = pv ? 'flex' : 'none';
  $('hearts').style.display = pv ? 'block' : 'none';
  $('bSettings').style.display = (online_ && room.isOwner) ? 'flex' : 'none';
  $('roomInfo').textContent = !room ? '' : room.solo ? 'Tek oyunculu'
    : 'Oda: ' + room.code + ' · ' + room.name + (pv ? ' · ⚔️ PVP' : '');
}

function flash() {
  const f = $('flash');
  f.style.opacity = 0.45;
  setTimeout(() => f.style.opacity = 0, 160);
}

function drawSettings() {
  const pv = room.pvp;
  const maxBtns = [2, 4, 6, 8, 10].map(n =>
    `<button data-m="${n}" class="${room.max === n ? 'sell' : 'buy'}">${n}</button>`).join('');
  $('setBox').innerHTML = `<h2>⚙️ Oda ayarları</h2><small>Oda kodu: ${room.code}</small>
    <div class="row"><div class="n">PVP<small>Oyuncular birbirine vurabilir</small></div>
      <button id="setPvp" class="${pv ? 'sell' : 'buy'}">${pv ? 'Açık' : 'Kapalı'}</button></div>
    <div class="row"><div class="n">Oyuncu limiti<small>Yeni girişlerde geçerli</small></div>
      <div id="setMax">${maxBtns}</div></div>
    <button class="closeBtn">Kapat</button>`;
}

function toggleSettings() {
  if (!room || room.solo || !room.isOwner) return;
  settingsOpen = !settingsOpen;
  $('settings').style.display = settingsOpen ? 'flex' : 'none';
  if (settingsOpen) drawSettings();
}

$('setBox').addEventListener('click', async e => {
  const b = e.target.closest('button');
  if (!b || !room) return;
  if (b.classList.contains('closeBtn')) return toggleSettings();
  try {
    const r = await import('./rooms.js');
    if (b.id === 'setPvp') await r.updateSettings({ pvp: !room.pvp });
    if (b.dataset.m) await r.updateSettings({ max: +b.dataset.m });
  } catch (err) { toast('Ayar kaydedilemedi'); }
});

function bindBtn(id, fn) {
  const el = $(id);
  el.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false });
  el.addEventListener('mousedown', e => { e.stopPropagation(); fn(); });
}

// ---------- Eylemler ----------
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

function attack() {
  if (!online || !room || !room.pvp) return;
  const m = online.attack();
  if (m) toast(m);
}

function respawn(byName) {
  toast(byName + ' seni yendi 💀 (paranın %20\'si gitti)');
  P.x = N / 2 + 0.5; P.z = N / 2 + 0.5;
  P.y = heightAt(N / 2, N / 2) + 2; P.vy = 0;
  eco.coins = Math.floor(eco.coins * 0.8);
  drawHud();
}

// ---------- Odaya giriş / çıkış ----------
function enterGame(info) {
  if (online) { online.stopOnline(); online = null; }
  room = info;
  generate(info.seed);
  rebuild();
  P.x = N / 2 + 0.5; P.z = N / 2 + 0.5;
  P.y = heightAt(N / 2, N / 2) + 2; P.vy = 0;
  resetEco();
  drawHud();
  drawHearts(20, 20);
  applyRoomUI();

  if (!info.solo) {
    import('./online.js')
      .then(m => {
        online = m;
        m.startOnline(scene, info.code, {
          isOwner: info.isOwner,
          pvp: info.pvp,
          onPrices: () => { if (isMarketOpen()) drawMarket(); },
          onMeta: meta => {
            if (!room) return;
            room.pvp = meta.pvp; room.max = meta.max;
            applyRoomUI();
            if (settingsOpen) drawSettings();
          },
          onHp: drawHearts,
          onHurt: flash,
          onDie: respawn,
          onKill: name => {
            eco.coins += 15;
            toast(name + ' yendin! +15 🪙');
            drawHud();
          }
        });
      })
      .catch(e => { $('roomInfo').textContent = 'Online hata: ' + (e.message || e); });
  }
}

async function leave() {
  if (online) { online.stopOnline(); online = null; }
  room = null;
  if (settingsOpen) { settingsOpen = false; $('settings').style.display = 'none'; }
  applyRoomUI();
  await leaveToMenu();
}

// ---------- Başlat ----------
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

bindBtn('bLeave', leave);
bindBtn('bAttack', attack);
bindBtn('bSettings', toggleSettings);

initMenu(enterGame);
showMenu();
applyRoomUI();
startPriceTicker(() => { if (isMarketOpen()) drawMarket(); });
drawHud();

// ---------- Döngü ----------
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const frozen = isMarketOpen() || isMenuOpen() || isBagOpen() || settingsOpen || (online && online.isDead());
  updatePlayer(dt, frozen);
  if (online) online.updateOthers(dt);
  camera.position.set(P.x, P.y + 1.6, P.z);
  camera.rotation.set(P.pitch, P.yaw, 0);
  updateTarget(camera);
  renderer.render(scene, camera);
}
requestAnimationFrame(loop);
