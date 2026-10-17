import { get, set, generate, initRender, rebuild, updateTarget, target, prev, TYPES, heightAt, N, H, inBounds, BEDROCK, SAPLING, planTree } from './world.js';
import { P, collides, updatePlayer, jump, pHooks } from './player.js';
import { eco, resetEco, startPriceTicker } from './economy.js';
import { initInput } from './input.js';
import { drawHud, drawMarket, toast, toggleMarket, isMarketOpen, hooks, MARKET_ON } from './ui.js';
import { toggleBag, isBagOpen } from './bag.js';
import { initMenu, showMenu, isMenuOpen, leaveToMenu } from './menu.js';
import { initItems, updateItems, clearItems, dropItems, dropFromInventory, hooks as itemHooks } from './items.js';
import { hhooks, hurt, killNow, respawnHealth, resetHealth, tickHealth, isDead } from './health.js';
import { initSky, updateSky } from './sky.js';
import { initMobs, spawnCows, updateMobs, clearMobs } from './mobs.js';
import { saveSolo, loadSolo, clearSolo } from './save.js';
import { initGravity, updateGravity, queueFall, flushGravity, clearGravity, ghooks, isFalling } from './gravity.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

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
const sunL = new THREE.DirectionalLight(0xffffff, 0.55);
sunL.position.set(0.5, 0.75, 0.4);
scene.add(sunL);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

let online = null;
let room = null;           // { code, name, isOwner, pvp, max, keep, count, solo, seed, playerName }
let settingsOpen = false, playersOpen = false, plTimer = null;
let deathTimer = null;
let soloChanges = {};
const saplings = new Map();

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

// Ölüm ekranı
const deathEl = document.createElement('div');
deathEl.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#200;opacity:0;pointer-events:none;transition:opacity .4s;z-index:7;display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:700';
deathEl.textContent = 'Öldün 💀';
document.body.appendChild(deathEl);

hooks.bag = toggleBag;
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || isMenuOpen()) return;
  if (e.code === 'KeyB') toggleBag();
  if (e.code === 'KeyF') attack();
  if (e.code === 'KeyP') togglePlayers();
  if (e.code === 'KeyQ' && !isDead()) dropFromInventory(eco.sel, 1);
});

// ---------- Arayüz ----------
function drawHearts(cur, max) {
  const full = Math.ceil(cur / 2), tot = Math.ceil(max / 2);
  $('hearts').textContent = '❤️'.repeat(full) + '🖤'.repeat(Math.max(0, tot - full));
}

function updateInfo() {
  if (!room) { $('roomInfo').textContent = ''; return; }
  if (room.solo) { $('roomInfo').textContent = 'Tek oyunculu · 💾'; return; }
  $('roomInfo').textContent = 'Oda: ' + room.code + ' · ' + room.name + ' · 👥 ' + room.count + '/' + room.max +
    (room.pvp ? ' · ⚔️' : '') + (room.keep ? ' · 🎒' : '');
  $('bPlayers').textContent = '👥 ' + room.count + '/' + room.max;
}

function applyRoomUI() {
  const on = !!(room && !room.solo);
  $('bAttack').style.display = (on && room.pvp) ? 'flex' : 'none';
  $('hearts').style.display = room ? 'block' : 'none';
  $('bSettings').style.display = room ? 'flex' : 'none';
  $('bPlayers').style.display = on ? 'flex' : 'none';
  $('bLeave').style.display = room ? 'flex' : 'none';
  $('coord').style.display = room ? 'block' : 'none';
  updateInfo();
}

function flash() {
  const f = $('flash');
  f.style.opacity = 0.45;
  setTimeout(() => f.style.opacity = 0, 160);
}

// ---------- Ayarlar ----------
function drawSettings() {
  const on = (v, id) => `<button id="${id}" class="${v ? 'sell' : 'buy'}">${v ? 'Açık' : 'Kapalı'}</button>`;
  const flag = v => v ? 'Açık' : 'Kapalı';
  let h = '<h2>⚙️ Ayarlar</h2>';
  if (room.solo) {
    h += '<small>Tek oyunculu dünya</small>';
  } else {
    h += `<small>Oda kodu: ${esc(room.code)} · ${room.count}/${room.max} kişilik</small>`;
    if (room.isOwner) {
      const maxBtns = [2, 4, 6, 8, 10].map(n =>
        `<button data-m="${n}" class="${room.max === n ? 'sell' : 'buy'}">${n}</button>`).join('');
      h += `<div class="row"><div class="n">PVP<small>Oyuncular birbirine vurabilir</small></div>${on(room.pvp, 'setPvp')}</div>
        <div class="row"><div class="n">Envanteri koru<small>Ölünce eşyalar düşmez</small></div>${on(room.keep, 'setKeep')}</div>
        <div class="row"><div class="n">Oyuncu limiti<small>Yeni girişlerde geçerli</small></div><div id="setMax">${maxBtns}</div></div>`;
    } else {
      h += `<div class="row"><div class="n">Oda kuralları<small>PVP: ${flag(room.pvp)} · Envanteri koru: ${flag(room.keep)} · Limit: ${room.max}</small></div></div>`;
    }
  }
  h += `<div class="row"><div class="n">Kaydet<small>Otomatik: 15 sn'de bir</small></div><button id="setSave" class="buy">💾 Kaydet</button></div>`;
  if (room.solo) {
    h += `<div class="row"><div class="n">Dünyayı sil<small>Kayıt kalıcı silinir</small></div><button id="setDel" style="background:#b3261e">🗑 Sil</button></div>`;
  }
  h += '<button class="closeBtn">Kapat</button>';
  $('setBox').innerHTML = h;
}

function toggleSettings() {
  if (!room) return;
  settingsOpen = !settingsOpen;
  $('settings').style.display = settingsOpen ? 'flex' : 'none';
  if (settingsOpen) drawSettings();
}

$('setBox').addEventListener('click', async e => {
  const b = e.target.closest('button');
  if (!b || !room) return;
  if (b.classList.contains('closeBtn')) return toggleSettings();
  if (b.id === 'setSave') return autosave(true);
  if (b.id === 'setDel') {
    if (confirm('Dünya kalıcı olarak silinecek. Emin misin?')) {
      clearSolo();
      soloChanges = {};
      room.noSave = true;
      leave();
    }
    return;
  }
  try {
    const r = await import('./rooms.js');
    if (b.id === 'setPvp') await r.updateSettings({ pvp: !room.pvp });
    if (b.id === 'setKeep') await r.updateSettings({ keep: !room.keep });
    if (b.dataset.m) await r.updateSettings({ max: +b.dataset.m });
  } catch (err) { toast('Ayar kaydedilemedi'); }
});

// ---------- Oyuncular ----------
function drawPlayers() {
  if (!online || !room || room.solo) return;
  const list = online.getPlayers(room.playerName || 'Sen')
    .sort((a, b) => (b.me ? 1 : 0) - (a.me ? 1 : 0) || a.dist - b.dist);
  let h = `<h2>👥 Oyuncular (${list.length}/${room.max})</h2>`;
  for (const p of list) {
    h += `<div class="row"><div class="n">${p.owner ? '👑 ' : ''}${esc(p.name)}${p.me ? ' (sen)' : ''}
      <small>${p.dead ? '💀 öldü' : '❤️ hayatta'}${p.me ? '' : ' · ' + Math.round(p.dist) + ' blok uzakta'}</small></div></div>`;
  }
  h += '<button class="closeBtn">Kapat</button>';
  $('plBox').innerHTML = h;
}

function togglePlayers() {
  if (!room || room.solo) return;
  playersOpen = !playersOpen;
  $('players').style.display = playersOpen ? 'flex' : 'none';
  clearInterval(plTimer);
  if (playersOpen) { drawPlayers(); plTimer = setInterval(drawPlayers, 1000); }
}
$('plBox').addEventListener('click', e => {
  if (e.target.closest('.closeBtn')) togglePlayers();
});

function closePanels() {
  settingsOpen = false; $('settings').style.display = 'none';
  playersOpen = false; $('players').style.display = 'none';
  clearInterval(plTimer);
}

function bindBtn(id, fn) {
  const el = $(id);
  el.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false });
  el.addEventListener('mousedown', e => { e.stopPropagation(); fn(); });
}

// ---------- Fidanlar ----------
function recordChange(x, y, z, t) {
  if (room && room.solo) soloChanges[x + '_' + y + '_' + z] = t;
}

// Düşen kum/kar da kaydedilsin ve odadaki herkese gitsin
ghooks.onChange = (x, y, z, t) => {
  recordChange(x, y, z, t);
  if (online) online.sendBlock(x, y, z, t);
};

function trackSapling(x, y, z) {
  if (room && !room.solo && !room.isOwner) return; // odada büyütmeyi oda sahibi yapar
  saplings.set(x + '_' + y + '_' + z, { x, y, z, at: Date.now() + 45000 + Math.random() * 45000 });
}

function growSaplings() {
  if (!room) return;
  const now = Date.now();
  for (const [k, s] of saplings) {
    if (get(s.x, s.y, s.z) !== SAPLING || !get(s.x, s.y - 1, s.z)) { saplings.delete(k); continue; }
    if (now < s.at) continue;
    const plan = planTree(s.x, s.y, s.z, Math.random() < 0.35);
    if (!plan) { s.at = now + 20000; continue; }
    saplings.delete(k);
    for (const b of plan) {
      set(b.x, b.y, b.z, b.t);
      recordChange(b.x, b.y, b.z, b.t);
      if (online) online.sendBlock(b.x, b.y, b.z, b.t);
    }
    rebuild();
  }
}
setInterval(growSaplings, 2000);

// ---------- Eylemler ----------
function breakBlock() {
  if (isDead() || !target) return;
  const [x, y, z] = target;
  const t = get(x, y, z);
  if (t === BEDROCK) return toast('Katman kayası kırılamaz');
  set(x, y, z, 0);
  recordChange(x, y, z, 0);
  eco.inv[t]++;
  if ((t === 5 || t === 14) && Math.random() < 0.25) {
    eco.inv[SAPLING]++;
    toast('🌱 Fidan buldun!');
  }
  if (online) online.sendBlock(x, y, z, 0);
  queueFall(x, y + 1, z); // üstündeki kum/kar düşsün
  rebuild(); drawHud();
}

function placeBlock() {
  if (isDead() || !prev) return;
  const t = eco.sel;
  if (eco.inv[t] < 1) return toast(TYPES[t].name + ' yok.');
  const [x, y, z] = prev;
  if (!inBounds(x, y, z)) return toast(y >= H ? 'Yükseklik sınırı (' + H + ')' : 'Dünya sınırı');
  if (t === SAPLING && ![1, 2, 6, 8].includes(get(x, y - 1, z))) {
    return toast('Fidan çimene, toprağa, kuma ya da kara dikilir');
  }
  set(x, y, z, t);
  if (collides(P.x, P.y, P.z)) { set(x, y, z, 0); return; }
  recordChange(x, y, z, t);
  if (online) online.sendBlock(x, y, z, t);
  if (t === SAPLING) trackSapling(x, y, z);
  if (isFalling(t)) queueFall(x, y, z); // altı boşsa düşer
  eco.inv[t]--;
  rebuild(); drawHud();
}

function attack() {
  if (isDead() || !online || !room || !room.pvp) return;
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

function loseOnDeath(px, py, pz) {
  if (room && !room.solo && room.keep) return false;
  return scatter(px, py, pz) > 0;
}

function toSpawn() {
  P.x = N / 2 + 0.5; P.z = N / 2 + 0.5;
  P.y = heightAt(N / 2, N / 2) + 2; P.vy = 0; P.ground = false;
  P.kx = 0; P.kz = 0;
  P.sx = P.x; P.sy = P.y; P.sz = P.z; P.fallY = P.y;
}

function clearDeath() {
  if (deathTimer) { clearTimeout(deathTimer); deathTimer = null; }
  deathEl.style.opacity = 0;
}

hhooks.onChange = drawHearts;
hhooks.onHurt = flash;
hhooks.onDeath = src => {
  const pos = src.void ? [P.sx, P.sy, P.sz] : [P.x, P.y, P.z];
  const lost = loseOnDeath(pos[0], pos[1], pos[2]);
  const why = src.name ? src.name + ' seni yendi' : src.void ? 'Boşluğa düştün' : 'Çok yüksekten düştün';
  toast(why + ' 💀' + (lost ? ' Eşyaların düştü' : ''));
  if (online) online.reportDeath(src.id || '');
  autosave(false, true); // ölünce envanteri hemen kaydet (eşya kopyalanmasın)
  deathEl.style.opacity = 1;
  deathTimer = setTimeout(() => {
    deathTimer = null;
    toSpawn();
    respawnHealth();
    if (online) online.setDead(false);
    deathEl.style.opacity = 0;
    toast('Canlandın');
  }, 2000);
};

pHooks.onFall = d => { if (d > 0) hurt(d, { fall: true }); };

// ---------- Kayıt ----------
function snapshotState() {
  const inv = {};
  for (const t in TYPES) inv['t' + t] = eco.inv[t] || 0;
  const r = n => +n.toFixed(2);
  return { inv, hotbar: eco.hotbar.slice(), hsel: eco.hsel, x: r(P.x), y: r(P.y), z: r(P.z), yaw: r(P.yaw), pitch: r(P.pitch), t: Date.now() };
}

function applyState(s) {
  if (!s) return;
  if (s.inv) for (const t in TYPES) { const v = +s.inv['t' + t]; if (v > 0) eco.inv[t] = Math.floor(v); }
  if (Array.isArray(s.hotbar) && s.hotbar.length === eco.hotbar.length && s.hotbar.every(t => TYPES[t])) {
    eco.hotbar = s.hotbar.map(Number);
  }
  eco.hsel = Math.min(Math.max(0, s.hsel | 0), eco.hotbar.length - 1);
  eco.sel = eco.hotbar[eco.hsel];
  if (typeof s.x === 'number' && inBounds(Math.floor(s.x), Math.floor(s.y), Math.floor(s.z)) && !collides(s.x, s.y, s.z)) {
    P.x = s.x; P.y = s.y; P.z = s.z; P.vy = 0; P.kx = 0; P.kz = 0;
    P.yaw = s.yaw || 0; P.pitch = s.pitch || 0;
    P.sx = P.x; P.sy = P.y; P.sz = P.z; P.fallY = P.y;
  }
  drawHud();
}

function autosave(manual, force) {
  if (!room || room.noSave) return;
  if (isDead() && !force) return;
  flushGravity(); // havada kalan kum/kar kaybolmasın
  const st = snapshotState();
  if (room.solo) {
    st.seed = room.seed;
    st.changes = soloChanges;
    const ok = saveSolo(st);
    if (manual) toast(ok ? '💾 Kaydedildi' : 'Kaydedilemedi (depolama dolu)');
  } else if (online) {
    online.saveProgress(st);
    if (manual) toast('💾 Kaydedildi (dünya otomatik kayıtlı)');
  }
}
setInterval(() => autosave(false), 15000);
addEventListener('pagehide', () => autosave(false));
document.addEventListener('visibilitychange', () => { if (document.hidden) autosave(false); });

// ---------- Odaya giriş / çıkış ----------
function enterGame(info) {
  if (online) { online.stopOnline(); online = null; }
  clearItems(); clearMobs(); clearGravity(); clearDeath(); closePanels();
  saplings.clear(); soloChanges = {};
  itemHooks.push = itemHooks.take = itemHooks.expire = null; itemHooks.myId = '';
  const my = room = { ...info, count: 1, max: info.max || 8 };
  resetEco();
  resetHealth();
  generate(info.seed);

  let saved = null;
  if (info.solo) {
    if (info.resume) {
      saved = loadSolo();
      if (saved && saved.changes) {
        soloChanges = saved.changes;
        for (const k in soloChanges) {
          const [x, y, z] = k.split('_').map(Number);
          set(x, y, z, soloChanges[k]);
          if (soloChanges[k] === SAPLING) trackSapling(x, y, z);
        }
      }
    } else clearSolo();
  }
  rebuild();
  toSpawn();
  if (saved) applyState(saved);
  drawHud();
  applyRoomUI();

  if (info.solo) {
    spawnCows();
  } else {
    import('./online.js')
      .then(m => {
        if (room !== my) return;
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
          onCount: n => {
            if (!room) return;
            room.count = n;
            updateInfo();
            if (playersOpen) drawPlayers();
          },
          onBlock: (x, y, z, t) => { if (t === SAPLING) trackSapling(x, y, z); },
          onKill: name => {
            if (MARKET_ON) { eco.coins += 15; drawHud(); }
            toast(name + ' yendin!');
          }
        });
        m.loadProgress().then(s => { if (s && room === my) applyState(s); });
      })
      .catch(e => { $('roomInfo').textContent = 'Online hata: ' + (e.message || e); });
  }
}

async function leave() {
  flushGravity();
  autosave(false);
  if (online) { online.stopOnline(); online = null; }
  clearItems(); clearMobs(); clearGravity(); clearDeath(); closePanels();
  saplings.clear();
  room = null;
  applyRoomUI();
  await leaveToMenu();
}

// ---------- Başlat ----------
generate(1);
initRender(scene);
initItems(scene);
initMobs(scene);
initSky(scene);
initGravity(scene);

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

// ---------- Döngü ----------
let last = performance.now(), lastCoord = '';
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const frozen = isMarketOpen() || isMenuOpen() || isBagOpen() || settingsOpen || playersOpen || isDead();
  updatePlayer(dt, frozen);
  if (!frozen && P.y < -15) killNow({ void: true });
  if (room) {
    tickHealth(dt);
    updateMobs(dt, room.solo || room.isOwner);
    updateGravity(dt);
    const c = 'X ' + Math.floor(P.x) + '  Y ' + Math.floor(P.y) + '  Z ' + Math.floor(P.z);
    if (c !== lastCoord) { $('coord').textContent = c; lastCoord = c; }
  }
  if (online) online.updateOthers(dt);
  updateItems(dt, !frozen);
  rebuild();
  camera.position.set(P.x, P.y + 1.6, P.z);
  camera.rotation.set(P.pitch, P.yaw, 0);
  updateSky(dt, camera);
  updateTarget(camera);
  renderer.render(scene, camera);
}
requestAnimationFrame(loop);
