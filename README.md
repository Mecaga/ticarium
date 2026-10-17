<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>Ticarium 3D</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<style>
*{box-sizing:border-box;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
html,body{margin:0;height:100%;overflow:hidden;background:#87ceeb;font-family:system-ui,sans-serif;touch-action:none}
canvas{display:block}
#coins{position:fixed;top:8px;left:8px;background:#000a;color:#ffd84a;padding:6px 12px;border-radius:8px;font-weight:700;font-size:16px}
#cross{position:fixed;top:50%;left:50%;width:18px;height:18px;margin:-9px 0 0 -9px;pointer-events:none}
#cross:before,#cross:after{content:"";position:absolute;background:#fff;mix-blend-mode:difference}
#cross:before{left:8px;top:0;width:2px;height:18px}#cross:after{top:8px;left:0;height:2px;width:18px}
#hotbar{position:fixed;bottom:8px;left:50%;transform:translateX(-50%);display:flex;gap:4px}
.slot{width:54px;height:54px;border:3px solid #fff6;border-radius:8px;background:#0008;color:#fff;font-size:11px;display:flex;flex-direction:column;align-items:center;justify-content:center}
.slot.sel{border-color:#ffd84a}
.slot i{width:20px;height:20px;border-radius:3px;display:block;margin-bottom:2px}
#joy{position:fixed;left:0;bottom:0;width:45%;height:55%}
#look{position:fixed;right:0;top:0;width:55%;height:100%}
#joyBase{position:fixed;width:100px;height:100px;border-radius:50%;background:#fff3;border:2px solid #fff6;display:none;pointer-events:none}
#joyKnob{position:absolute;width:44px;height:44px;border-radius:50%;background:#fffa;left:28px;top:28px}
.btn{position:fixed;width:62px;height:62px;border-radius:50%;background:#000a;color:#fff;border:2px solid #fff8;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;z-index:5}
#bJump{right:18px;bottom:90px}#bBreak{right:92px;bottom:70px;background:#b3261eaa}
#bPlace{right:18px;bottom:162px;background:#2e7d32aa}#bMarket{top:8px;right:8px;width:auto;height:40px;border-radius:10px;padding:0 14px}
#market{position:fixed;inset:0;background:#000b;display:none;z-index:20;align-items:center;justify-content:center}
#panel{background:#1d2330;color:#fff;border-radius:14px;padding:14px;width:min(94vw,460px);max-height:90vh;overflow:auto}
#panel h2{margin:0 0 4px;font-size:18px}
.row{display:flex;align-items:center;gap:8px;padding:8px 0;border-top:1px solid #fff2}
.row .n{flex:1}.row small{display:block;opacity:.7}
.row button{padding:8px 12px;border:0;border-radius:8px;font-weight:700;color:#fff}
.sell{background:#2e7d32}.buy{background:#1565c0}
#close{background:#444;color:#fff;border:0;padding:10px;border-radius:8px;width:100%;margin-top:8px;font-weight:700}
.up{color:#6f6}.down{color:#f77}
#msg{position:fixed;top:56px;left:50%;transform:translateX(-50%);background:#000a;color:#fff;padding:6px 12px;border-radius:8px;opacity:0;transition:opacity .3s;pointer-events:none;font-size:13px}
</style>
</head>
<body>
<div id="coins">🪙 50</div>
<div id="cross"></div>
<div id="msg"></div>
<div id="hotbar"></div>
<div id="look"></div>
<div id="joy"></div>
<div id="joyBase"><div id="joyKnob"></div></div>
<div class="btn" id="bJump">Zıpla</div>
<div class="btn" id="bBreak">Kır</div>
<div class="btn" id="bPlace">Koy</div>
<div class="btn" id="bMarket">🏪 Pazar</div>
<div id="market"><div id="panel"></div></div>

<script>
// ---------- DÜNYA ----------
const N = 40, H = 24;
const world = new Uint8Array(N * H * N);
const idx = (x, y, z) => (y * N + z) * N + x;
const inb = (x, y, z) => x >= 0 && x < N && y >= 0 && y < H && z >= 0 && z < N;
const get = (x, y, z) => inb(x, y, z) ? world[idx(x, y, z)] : 0;
const set = (x, y, z, t) => { if (inb(x, y, z)) world[idx(x, y, z)] = t; };

// 1 çim, 2 toprak, 3 taş, 4 odun, 5 yaprak
const TYPES = {
  1: { name: 'Çim',    color: 0x5fae45, base: 3 },
  2: { name: 'Toprak', color: 0x8b5a2b, base: 2 },
  3: { name: 'Taş',    color: 0x8a8a8a, base: 5 },
  4: { name: 'Odun',   color: 0x6b4423, base: 8 },
  5: { name: 'Yaprak', color: 0x2f7d32, base: 2 }
};
const css = c => '#' + c.toString(16).padStart(6, '0');

function heightAt(x, z) {
  const h = 6 + 3 * Math.sin(x * 0.21) + 3 * Math.cos(z * 0.17) + 2 * Math.sin((x + z) * 0.11);
  return Math.max(2, Math.min(H - 8, Math.floor(h)));
}
const tops = [];
for (let x = 0; x < N; x++) for (let z = 0; z < N; z++) {
  const h = heightAt(x, z); tops.push(h);
  for (let y = 0; y <= h; y++) set(x, y, z, y === h ? 1 : y >= h - 2 ? 2 : 3);
}
for (let i = 0; i < 28; i++) {
  const x = 3 + Math.floor(Math.random() * (N - 6)), z = 3 + Math.floor(Math.random() * (N - 6));
  if (Math.abs(x - N / 2) < 3 && Math.abs(z - N / 2) < 3) continue;
  const h = heightAt(x, z);
  for (let y = 1; y <= 4; y++) set(x, h + y, z, 4);
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = 3; dy <= 5; dy++) {
    if (Math.abs(dx) + Math.abs(dz) > 3 || (dy === 5 && Math.abs(dx) + Math.abs(dz) > 1)) continue;
    if (!get(x + dx, h + dy, z + dz)) set(x + dx, h + dy, z + dz, 5);
  }
}

// ---------- SAHNE ----------
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
const sun = new THREE.DirectionalLight(0xffffff, 0.6); sun.position.set(0.5, 1, 0.3); scene.add(sun);

const geo = new THREE.BoxGeometry(1, 1, 1);
const meshes = {};
const MAXI = 9000;
for (const t in TYPES) {
  const m = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: TYPES[t].color }), MAXI);
  m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXI * 3), 3);
  m.frustumCulled = false; scene.add(m); meshes[t] = m;
}
const dummy = new THREE.Object3D(), col = new THREE.Color();
function exposed(x, y, z) {
  return !get(x + 1, y, z) || !get(x - 1, y, z) || !get(x, y + 1, z) || !get(x, y - 1, z) || !get(x, y, z + 1) || !get(x, y, z - 1);
}
function rebuild() {
  const c = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (let y = 0; y < H; y++) for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const t = get(x, y, z);
    if (!t || !exposed(x, y, z) || c[t] >= MAXI) continue;
    dummy.position.set(x + 0.5, y + 0.5, z + 0.5); dummy.updateMatrix();
    const m = meshes[t], i = c[t]++;
    m.setMatrixAt(i, dummy.matrix);
    const v = 0.88 + ((x * 7 + y * 13 + z * 17) % 5) * 0.03;
    col.setRGB(v, v, v); m.setColorAt(i, col);
  }
  for (const t in meshes) {
    const m = meshes[t]; m.count = c[t];
    m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true;
  }
}
rebuild();

const hl = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01)), new THREE.LineBasicMaterial({ color: 0x000000 }));
hl.visible = false; scene.add(hl);

// ---------- OYUNCU ----------
const P = { x: N / 2 + 0.5, y: heightAt(N / 2, N / 2) + 2, z: N / 2 + 0.5, vy: 0, ground: false, yaw: 0, pitch: 0 };
const R = 0.3, PH = 1.7;
function collides(x, y, z) {
  for (const dx of [-R, R]) for (const dz of [-R, R]) for (const dy of [0.05, 0.9, PH - 0.05])
    if (get(Math.floor(x + dx), Math.floor(y + dy), Math.floor(z + dz))) return true;
  return false;
}

// ---------- EKONOMİ ----------
const inv = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
let coins = 50, sel = 1;
const price = {}, trend = {};
for (const t in TYPES) { price[t] = TYPES[t].base; trend[t] = 0; }
setInterval(() => {
  for (const t in TYPES) {
    const b = TYPES[t].base, old = price[t];
    price[t] = Math.max(1, Math.min(Math.round(b * 1.9), Math.round(old + (Math.random() - 0.5) * b * 0.6 + (b - old) * 0.1)));
    trend[t] = price[t] - old;
  }
  if (marketOpen) drawMarket();
}, 8000);

function toast(s) { const m = document.getElementById('msg'); m.textContent = s; m.style.opacity = 1; clearTimeout(toast.t); toast.t = setTimeout(() => m.style.opacity = 0, 1400); }
function drawHud() {
  document.getElementById('coins').textContent = '🪙 ' + coins;
  const hb = document.getElementById('hotbar'); hb.innerHTML = '';
  for (const t in TYPES) {
    const d = document.createElement('div'); d.className = 'slot' + (t == sel ? ' sel' : '');
    d.innerHTML = `<i style="background:${css(TYPES[t].color)}"></i>${TYPES[t].name} ${inv[t]}`;
    const pick = e => { e.preventDefault(); e.stopPropagation(); sel = +t; drawHud(); };
    d.addEventListener('touchstart', pick, { passive: false }); d.addEventListener('mousedown', pick);
    hb.appendChild(d);
  }
}
let marketOpen = false;
function drawMarket() {
  let h = `<h2>🏪 Pazar</h2><div>Bakiye: 🪙 ${coins} &nbsp; <small>Fiyatlar 8 sn'de bir değişir</small></div>`;
  for (const t in TYPES) {
    const tr = trend[t] > 0 ? `<span class="up">▲${trend[t]}</span>` : trend[t] < 0 ? `<span class="down">▼${-trend[t]}</span>` : '';
    h += `<div class="row"><div class="n">${TYPES[t].name} <small>Fiyat: 🪙 ${price[t]} ${tr} · Sende: ${inv[t]}</small></div>
      <button class="sell" onclick="sell(${t})">Sat</button><button class="buy" onclick="buy(${t})">Al</button></div>`;
  }
  h += `<button id="close" onclick="toggleMarket()">Kapat</button>`;
  document.getElementById('panel').innerHTML = h;
}
function sell(t) { if (inv[t] > 0) { inv[t]--; coins += price[t]; drawMarket(); drawHud(); } }
function buy(t) { if (coins >= price[t] + 1) { coins -= price[t] + 1; inv[t]++; drawMarket(); drawHud(); } else toast('Yetersiz bakiye (alış: fiyat+1)'); }
function toggleMarket() {
  marketOpen = !marketOpen;
  document.getElementById('market').style.display = marketOpen ? 'flex' : 'none';
  if (marketOpen) drawMarket();
}
drawHud();

// ---------- HEDEF / KIR / KOY ----------
let target = null, prev = null;
function raycast() {
  const d = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
  const o = camera.position.clone(); let lx = -1, ly = -1, lz = -1;
  for (let s = 0; s < 6; s += 0.04) {
    const x = Math.floor(o.x + d.x * s), y = Math.floor(o.y + d.y * s), z = Math.floor(o.z + d.z * s);
    if (x === lx && y === ly && z === lz) continue;
    if (get(x, y, z)) { target = [x, y, z]; prev = lx < 0 ? null : [lx, ly, lz]; return; }
    lx = x; ly = y; lz = z;
  }
  target = prev = null;
}
function doBreak() {
  if (!target || target[1] === 0) return;
  const t = get(...target); set(...target, 0); inv[t]++; rebuild(); drawHud();
}
function doPlace() {
  if (!prev || inv[sel] < 1) { if (prev) toast(TYPES[sel].name + ' yok. Pazardan al ya da topla.'); return; }
  const [x, y, z] = prev; set(x, y, z, sel);
  if (collides(P.x, P.y, P.z)) { set(x, y, z, 0); return; }
  inv[sel]--; rebuild(); drawHud();
}

// ---------- GİRDİ ----------
const keys = {}; let jx = 0, jy = 0;
addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'KeyE') toggleMarket(); if (e.code >= 'Digit1' && e.code <= 'Digit5') { sel = +e.code.slice(5); drawHud(); } });
addEventListener('keyup', e => keys[e.code] = false);
renderer.domElement.addEventListener('click', () => { if (!('ontouchstart' in window)) renderer.domElement.requestPointerLock(); });
addEventListener('mousemove', e => { if (document.pointerLockElement) { P.yaw -= e.movementX * 0.002; P.pitch = Math.max(-1.5, Math.min(1.5, P.pitch - e.movementY * 0.002)); } });
addEventListener('mousedown', e => { if (!document.pointerLockElement) return; if (e.button === 0) doBreak(); if (e.button === 2) doPlace(); });
addEventListener('contextmenu', e => e.preventDefault());

const joy = document.getElementById('joy'), base = document.getElementById('joyBase'), knob = document.getElementById('joyKnob');
let joyId = null, jox = 0, joy0 = 0;
joy.addEventListener('touchstart', e => {
  e.preventDefault(); const t = e.changedTouches[0]; joyId = t.identifier; jox = t.clientX; joy0 = t.clientY;
  base.style.display = 'block'; base.style.left = (jox - 50) + 'px'; base.style.top = (joy0 - 50) + 'px';
}, { passive: false });
joy.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) if (t.identifier === joyId) {
    let dx = t.clientX - jox, dy = t.clientY - joy0; const l = Math.hypot(dx, dy), m = 50;
    if (l > m) { dx = dx / l * m; dy = dy / l * m; }
    jx = dx / m; jy = dy / m; knob.style.left = (28 + dx) + 'px'; knob.style.top = (28 + dy) + 'px';
  }
}, { passive: false });
const endJoy = e => { for (const t of e.changedTouches) if (t.identifier === joyId) { joyId = null; jx = jy = 0; base.style.display = 'none'; knob.style.left = knob.style.top = '28px'; } };
joy.addEventListener('touchend', endJoy); joy.addEventListener('touchcancel', endJoy);

const look = document.getElementById('look'); let lookId = null, lx0 = 0, ly0 = 0;
look.addEventListener('touchstart', e => { e.preventDefault(); const t = e.changedTouches[0]; lookId = t.identifier; lx0 = t.clientX; ly0 = t.clientY; }, { passive: false });
look.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) if (t.identifier === lookId) {
    P.yaw -= (t.clientX - lx0) * 0.006; P.pitch = Math.max(-1.5, Math.min(1.5, P.pitch - (t.clientY - ly0) * 0.006));
    lx0 = t.clientX; ly0 = t.clientY;
  }
}, { passive: false });
look.addEventListener('touchend', e => { for (const t of e.changedTouches) if (t.identifier === lookId) lookId = null; });

function bind(id, fn) {
  const el = document.getElementById(id);
  el.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false });
  el.addEventListener('mousedown', e => { e.stopPropagation(); fn(); });
}
bind('bJump', () => { if (P.ground) { P.vy = 8; P.ground = false; } });
bind('bBreak', doBreak); bind('bPlace', doPlace); bind('bMarket', toggleMarket);
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

// ---------- DÖNGÜ ----------
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!marketOpen) {
    let f = -jy, s = jx;
    if (keys.KeyW) f += 1; if (keys.KeyS) f -= 1; if (keys.KeyD) s += 1; if (keys.KeyA) s -= 1;
    if (keys.Space && P.ground) { P.vy = 8; P.ground = false; }
    const sp = 4.5, sn = Math.sin(P.yaw), cs = Math.cos(P.yaw);
    const vx = (-sn * f + cs * s) * sp, vz = (-cs * f - sn * s) * sp;
    if (!collides(P.x + vx * dt, P.y, P.z)) P.x += vx * dt;
    if (!collides(P.x, P.y, P.z + vz * dt)) P.z += vz * dt;
    P.vy -= 22 * dt; const ny = P.y + P.vy * dt;
    if (!collides(P.x, ny, P.z)) { P.y = ny; P.ground = false; } else { if (P.vy < 0) P.ground = true; P.vy = 0; }
    P.x = Math.max(0.5, Math.min(N - 0.5, P.x)); P.z = Math.max(0.5, Math.min(N - 0.5, P.z));
    if (P.y < -10) { P.x = N / 2 + 0.5; P.z = N / 2 + 0.5; P.y = H; P.vy = 0; }
  }
  camera.position.set(P.x, P.y + 1.6, P.z);
  camera.rotation.set(P.pitch, P.yaw, 0);
  raycast();
  hl.visible = !!target;
  if (target) hl.position.set(target[0] + 0.5, target[1] + 0.5, target[2] + 0.5);
  renderer.render(scene, camera);
}
requestAnimationFrame(loop);
</script>
</body>
</html>
