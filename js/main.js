import { get, set, generate, initRender, rebuild, updateTarget, target, prev, TYPES, heightAt, N, H, inBounds } from './world.js';
import { P, collides, updatePlayer, jump } from './player.js';
import { eco, resetEco, startPriceTicker } from './economy.js';
import { initInput } from './input.js';
import { drawHud, drawMarket, toast, toggleMarket, isMarketOpen, hooks } from './ui.js';
import { toggleBag, isBagOpen } from './bag.js';
import { initMenu, showMenu, isMenuOpen, leaveToMenu } from './menu.js';
import { initItems, updateItems, clearItems, dropItems, dropFromInventory, hooks as itemHooks } from './items.js';

const $ = id => document.getElementById(id);

// Sahne
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 30, 75);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 120);
camera.rotation.order = 'YXZ';
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.prepend(renderer.domElement);
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const sun = new THREE.DirectionalLight(0xffffff, 0.5);
sun.position.set(0.5, 1, 0.3);
scene.add(sun);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

let online = null;
let room = null;           // { code, name, isOwner, pvp, max, keep, solo }
let settingsOpen = false;

// Bırak butonu (index.html'e dokunmadan eklenir)
const bDrop = document.createElement('div');
bDrop.className = 'btn';
bDrop.id = 'bDrop';
bDrop.textContent = '⬇️';
document.body.appendChild(bDrop);

hooks.bag = toggleBag;
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || isMenuOpen()) return;
  if (e.code === 'KeyB') toggleBag();
  if (e.code === 'KeyF') attack();
  if (e.code === 'KeyQ') dropFromInventory(eco.sel, 1);
});

// ---------- Arayüz ----------
function drawHearts(hp, max) {
  const full = Math.ceil(hp / 2), tot = Math.ceil(max / 2);
  $('hearts').textContent = '❤️'.repeat(full) + '🖤'.repeat(Math.max(0, tot - full));
}

function applyRoomUI() {
  const on = !!(room && !room.solo);
  const pv = on && room.pvp;
  $('bAttack').style.display = pv ? 'flex' : 'none';
  $('hearts').style.display = pv ? 'block' : 'none';
  $('bSettings').style.display = (on && room.isOwner) ? 'flex' : 'none';
  $('roomInfo').textContent = !room ? '' : room.solo ? 'Tek oyunculu'
    : 'Oda: ' + room.code + ' · ' + room.name + (pv ? ' · ⚔️' : '') + (room.keep ? ' · 🎒' : '');
}

function flash() {
  const f = $('flash');
  f.style.opacity = 0.45;
  setTimeout(() => f.style.opacity = 0, 160);
}

function drawSettings() {
  const on = (v, id) => `<button id="${id}" class="${v ? 'sell' : 'buy'}">${v ? 'Açık' : 'Kapalı'}</button>`;
  const maxBtns = [2, 4, 6, 8, 10].map(n =>
    `<button data-m="${n}" class="${room.max === n ? 'sell' : 'buy'}">${n}</button>`).join('');
  $('setBox').innerHTML = `<h2>⚙️ Oda ayarları</h2><small>Oda kodu: ${room.code}</small>
    <div class="row"><div class="n">PVP<small>Oyuncular birbirine vurabilir</small></div>${on(room.pvp, 'setPvp')}</div>
    <div class="row"><div class="n">Envanteri koru<small>Ölünce eşyalar düşmez</small></div>${on(room.keep, 'setKeep')}</div>
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
    if (b.id === 'setKeep') await r.updateSettings({ keep: !room.keep });
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
  if (!inBounds(x, y, z)) return toast(y >= H ? 'Yükseklik sınırı (' + H + ')' : 'Dünya sınırı');
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

// ---------- Ölüm ----------
function scatter(px, py, pz) {
  let total = 0;
  for (const t in eco.inv) total += eco.inv[t];
  if (!total) return 0;
  const stack = Math.max(16, Math.ceil(total / 24));
  const arr = [];
  for (const t in eco.inv) {
    let n = eco.inv[t];
    eco.inv[t] = 0;
    while (n > 0) {
      const c = Math.min(stack, n); n -= c;
      const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 3;
      arr.push({ t: +t, c, x: px, y: py + 1, z: pz, vx: Math.cos(a) * sp, vy: 4 + Math.random() * 3, vz: Math.sin(a) * sp });
    }
  }
  dropItems(arr);
  drawHud();
  return total;
}

// true döner: eşya kaybedildi
function loseOnDeath(px, py, pz) {
  if (room && !room.solo && room.keep) return false;
  const n = scatter(px, py, pz);
  eco.coins = Math.floor(eco.coins * 0.8);
  drawHud();
  return n > 0;
}

function toSpawn() {
  P.x = N / 2 + 0.5; P.z = N / 2 + 0.5;
  P.y = heightAt(N / 2, N / 2) + 2; P.vy = 0;
  P.sx = P.x; P.sy = P.y; P.sz = P.z;
}

function voidDeath() {
  const lost = loseOnDeath(P.sx, P.sy, P.sz);
  toSpawn();
  toast('Boşluğa düştün 💀' + (lost ? ' Eşyaların kenarda kaldı' : ''));
}

// ---------- Odaya giriş / çıkış ----------
function enterGame(info) {
  if (online) { online.stopOnline(); online = null; }
  clearItems();
  itemHooks.push = itemHooks.take = itemHooks.expire = null; itemHooks.myId = '';
  room = info;
  generate(info.seed);
  rebuild();
  toSpawn();
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
            room.pvp = meta.pvp; room.max = meta.max; room.keep = meta.keep;
            applyRoomUI();
            if (settingsOpen) drawSettings();
          },
          onHp: drawHearts,
          onHurt: flash,
          onDeath: name => {
            const lost = loseOnDeath(P.x, P.y, P.z);
            toast(name + ' seni yendi 💀' + (lost ? ' Eşyaların düştü' : ''));
          },
          onDie: () => { toSpawn(); toast('Canlandın'); },
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
  clearItems();
  room = null;
  if (settingsOpen) { settingsOpen = false; $('settings').style.display = 'none'; }
  applyRoomUI();
  await leaveToMenu();
}

// ---------- Başlat ----------
generate(1);
initRender(scene);
initItems(scene);

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
bindBtn('bDrop', () => dropFromInventory(eco.sel, 1));

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
  if (!frozen && P.y < -15) voidDeath();
  if (online) online.updateOthers(dt);
  updateItems(dt, !frozen && !isMenuOpen());
  rebuild();
  camera.position.set(P.x, P.y + 1.6, P.z);
  camera.rotation.set(P.pitch, P.yaw, 0);
  updateTarget(camera);
  renderer.render(scene, camera);
}
requestAnimationFrame(loop);
