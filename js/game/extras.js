import { N } from '../world/idtable.js';
import { TYPES, CATS, get, set, rebuild, isLoaded, isPlant, target, prev } from '../world/world.js';
import { eco } from './economy.js';
import { RECIPES } from './recipes.js';
import { wear } from './gear.js';
import { toast, drawHud } from '../ui/ui.js';
import { P } from '../entities/player.js';
import { dropItems } from '../entities/items.js';
import { findMob, mobKind, mobCol } from '../entities/mobs.js';
import { isCreative } from './creative.js';
import { G } from '../core/state.js';
import { recordChange } from './progress.js';
import { sfx } from '../core/sound.js';
import { addItem } from './inventory.js';

export const JUKE = N.MUZIK_KUTUSU, DISC_MIN = N.DISK_1, DISC_MAX = N.DISK_3, SHEARS = N.MAKAS, BPRINT = N.SEMA_BLOGU;
export const isDisc = t => t >= DISC_MIN && t <= DISC_MAX;

const C = N.KOMUR;
RECIPES.push({ out: [JUKE, 1], pat: [[N.TAHTA, N.TAHTA, N.TAHTA], [N.TAHTA, N.ELMAS, N.TAHTA], [N.TAHTA, N.TAHTA, N.TAHTA]] });
RECIPES.push({ out: [N.DISK_1, 1], pat: [[C, C, C], [C, N.DEMIR_KULCE, C], [C, C, C]] });
RECIPES.push({ out: [N.DISK_2, 1], pat: [[C, C, C], [C, N.ALTIN_KULCE, C], [C, C, C]] });
RECIPES.push({ out: [N.DISK_3, 1], pat: [[C, C, C], [C, N.ELMAS, C], [C, C, C]] });
RECIPES.push({ out: [SHEARS, 1], pat: [[0, N.DEMIR_KULCE], [N.DEMIR_KULCE, 0]] });
RECIPES.push({ out: [BPRINT, 1], pat: [[N.TAHTA, N.TAHTA, N.TAHTA], [N.TAHTA, N.CUBUK, N.TAHTA], [N.TAHTA, N.TAHTA, N.TAHTA]] });

const commit = (x, y, z, t) => { recordChange(x, y, z, t); if (G.online) G.online.sendBlock(x, y, z, t); };
const give = (t, n) => dropItems([{ t, c: n, x: P.x, y: P.y + 1.3, z: P.z, vx: 0, vy: 2, vz: 0 }]);

// ---------- Makas ----------
const cool = new Map();
export function useShears() {
  if (!isCreative() && (eco.inv[SHEARS] || 0) < 1) return toast('Makas yok');
  const cp = Math.cos(P.pitch);
  const m = findMob(P.x, P.y + 1.6, P.z, -Math.sin(P.yaw) * cp, Math.sin(P.pitch), -Math.cos(P.yaw) * cp, 4.5);
  if (!m || mobKind(m.id) !== 'sheep') return toast('Makası bir koyuna bakarak kullan');
  if (Date.now() - (cool.get(m.id) || 0) < 60000) return toast('Bu koyun yeni kırpıldı');
  cool.set(m.id, Date.now());
  const col = mobCol(m.id), n = 1 + Math.floor(Math.random() * 3);
  dropItems([{ t: col >= 0 ? N.MOR_YUN + col : N.YUN, c: n, x: P.x + 0, y: P.y + 1.3, z: P.z, vx: 0, vy: 2, vz: 0 }]);
  sfx.hit();
  if (wear(SHEARS, 1)) toast('💥 Makas kırıldı!');
  drawHud();
}

// ---------- Müzik kutusu ----------
const TUNES = {
  [N.DISK_1]: { bpm: 170, n: [72, 74, 76, 72, 76, 74, 72, 67, 72, 74, 76, 77, 76, 74, 72, 0] },
  [N.DISK_2]: { bpm: 100, n: [57, 0, 60, 0, 64, 0, 60, 0, 55, 0, 59, 0, 62, 0, 59, 0] },
  [N.DISK_3]: { bpm: 140, n: [60, 64, 67, 72, 71, 67, 64, 67, 62, 65, 69, 74, 72, 69, 65, 0] }
};
let ac = null;
const plays = new Map();   // her müzik kutusu kendi diskiyle bağımsız çalar
function stopTune(key, giveBack) {
  const p = plays.get(key);
  if (!p) return;
  clearTimeout(p.timer);
  try { p.gain.disconnect(); } catch (e) {}
  plays.delete(key);
  if (giveBack) give(p.disc, 1);
}
setInterval(() => {   // uzaklaştıkça kısılır, kutu kırılırsa durur, dünyadan çıkınca susar
  for (const [key, p] of plays) {
    if (!G.room) { stopTune(key, false); continue; }
    const [x, y, z] = p.pos;
    if (isLoaded(x, z) && get(x, y, z) !== JUKE) { stopTune(key, true); continue; }
    const d = Math.hypot(P.x - x - 0.5, P.y - y, P.z - z - 0.5);
    p.gain.gain.value = Math.max(0, 1 - d / 24) * 0.9;
  }
}, 200);
export function useJuke(t, sel) {
  const key = t.slice(0, 3).join('_');
  if (plays.has(key)) { stopTune(key, true); return toast('⏹ Müzik durdu'); }
  if (!isDisc(sel) || (!isCreative() && (eco.inv[sel] || 0) < 1)) return toast('Çalmak için elinde disk olsun');
  if (!isCreative()) eco.inv[sel]--;
  ac = ac || new (window.AudioContext || window.webkitAudioContext)();
  if (ac.state === 'suspended') ac.resume();
  const gain = ac.createGain();
  gain.connect(ac.destination);
  const tune = TUNES[sel], step = 60 / tune.bpm;
  const p = { disc: sel, i: 0, gain, pos: t.slice(0, 3), timer: 0 };
  plays.set(key, p);
  const tick = () => {
    if (!plays.has(key)) return;
    const m = tune.n[p.i++ % tune.n.length];
    if (m) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'triangle'; o.frequency.value = 440 * Math.pow(2, (m - 69) / 12);
      g.gain.setValueAtTime(0.35, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + step * 0.9);
      o.connect(g); g.connect(gain);
      o.start(); o.stop(ac.currentTime + step);
    }
    p.timer = setTimeout(tick, step * 1000);
  };
  tick();
  toast('🎵 ' + TYPES[sel].name);
  drawHud();
}

// ---------- Şema evi (5x5, zemin + 3 yüksek + çatı) ----------
const cells = [];
for (let x = 0; x < 5; x++) for (let z = 0; z < 5; z++) {
  const edge = x === 0 || x === 4 || z === 0 || z === 4;
  for (let y = 0; y < 3; y++) {
    if (!edge) { cells.push([x, y, z, 0]); continue; }
    if (x === 2 && z === 0 && y < 2) { cells.push([x, y, z, 0]); continue; }   // kapı
    const win = y === 1 && ((x === 0 && z === 2) || (x === 4 && z === 2) || (x === 2 && z === 4));
    cells.push([x, y, z, win ? N.CAM : N.TAHTA]);
  }
  cells.push([x, 3, z, N.TAHTA]);   // çatı
  cells.push([x, -1, z, N.TAHTA]);   // zemin
}
export const BLUEPRINT = { name: 'Küçük Ahşap Ev', size: [5, 4, 5], cells };
const REQ = {};
cells.forEach(c => { if (c[3]) REQ[c[3]] = (REQ[c[3]] || 0) + 1; });
const needTypes = Object.keys(REQ).map(Number);

const sk = p => 'bd_bp_' + p.join('_');
const getStock = p => { try { return JSON.parse(localStorage.getItem(sk(p))) || {}; } catch (e) { return {}; } };
const putStock = (p, s) => { try { localStorage.setItem(sk(p), JSON.stringify(s)); } catch (e) {} };
const done = s => needTypes.every(t => (s[t] || 0) >= REQ[t]);

let panel = null, bpPos = null, building = false;
const col = f => (f >= 1 ? '#4caf50' : f > 0 ? '#e6b800' : '#e53935');

function drawPanel() {
  const s = getStock(bpPos), ok = done(s);
  let h = '<div style="background:#1d2330;color:#fff;border-radius:14px;padding:14px;width:min(92vw,380px)"><h3 style="margin:0 0 8px">🏠 ' + BLUEPRINT.name + '</h3>';
  needTypes.forEach(t => {
    const have = Math.min(s[t] || 0, REQ[t]), f = have / REQ[t];
    h += '<div style="display:flex;align-items:center;gap:8px;margin:6px 0"><div style="flex:1">' + TYPES[t].name +
      '</div><b style="color:' + col(f) + '">' + have + ' / ' + REQ[t] + '</b>' +
      '<button data-g="' + t + '" style="padding:8px 12px;border:0;border-radius:8px;background:#1565c0;color:#fff;font-weight:700">Ver</button>' +
      '<button data-t="' + t + '" style="padding:8px 12px;border:0;border-radius:8px;background:#6a1b9a;color:#fff;font-weight:700">Al</button></div>';
  });
  h += '<button data-b="1" ' + (ok && !building ? '' : 'disabled') + ' style="width:100%;margin-top:10px;padding:12px;border:0;border-radius:8px;font-weight:700;color:#fff;background:' +
    (ok ? '#2e7d32' : '#555') + '">' + (building ? '⏳ İnşa ediliyor...' : '🔨 Bina Kur') + '</button>' +
    '<button data-x="1" style="width:100%;margin-top:8px;padding:10px;border:0;border-radius:8px;background:#b3261e;color:#fff;font-weight:700">Kapat</button></div>';
  panel.innerHTML = h;
}

function build() {
  const [ox, oy, oz] = bpPos;
  if (!isLoaded(ox, oz) || !isLoaded(ox + 4, oz + 4)) { building = false; drawPanel(); return toast('Alan yüklenmedi, yaklaş'); }
  for (const [dx, dy, dz, t] of cells) {
    const x = ox + dx, y = oy + dy, z = oz + dz;
    if (!t && !isPlant(get(x, y, z)) && get(x, y, z) === 0) continue;
    set(x, y, z, t); commit(x, y, z, t);
  }
  putStock(bpPos, {});
  building = false;
  panel.style.display = 'none';
  rebuild(); sfx.place();
  toast('🏠 Ev kuruldu!');
}

export function useBlueprint(t) {
  if (!panel) {
    panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;inset:0;background:#000b;z-index:27;display:none;align-items:center;justify-content:center';
    document.body.appendChild(panel);
    panel.addEventListener('click', e => {
      const g = e.target.closest('[data-g]');
      if (g) {
        const ty = +g.dataset.g, s = getStock(bpPos);
        const n = Math.min(REQ[ty] - (s[ty] || 0), isCreative() ? 999 : (eco.inv[ty] || 0));
        if (n < 1) return toast(n < 0 || (s[ty] || 0) >= REQ[ty] ? 'Bu malzeme tamam' : 'Çantanda yok');
        if (!isCreative()) eco.inv[ty] -= n;
        s[ty] = (s[ty] || 0) + n; putStock(bpPos, s);
        drawHud(); drawPanel();
      } else if (e.target.closest('[data-t]')) {
        const ty = +e.target.closest('[data-t]').dataset.t, s = getStock(bpPos), n = s[ty] || 0;
        if (n < 1) return;
        const a = isCreative() ? n : addItem(ty, n);
        s[ty] = n - a; putStock(bpPos, s);
        if (a < n) toast('🎒 Çanta dolu');
        drawHud(); drawPanel();
      } else if (e.target.closest('[data-b]') && !building && done(getStock(bpPos))) {
        building = true; drawPanel();
        setTimeout(build, 3000);
      } else if (e.target.closest('[data-x]') && !building) panel.style.display = 'none';
    });
  }
  bpPos = t.slice(0, 3);
  panel.style.display = 'flex';
  drawPanel();
}

// Hayali önizleme: eldeki şema bloğu ya da bakılan şema bloğu için 5x4x5 çerçeve
let ghost = null;
setInterval(() => {
  const sc = G.scene;
  if (!sc) return;
  if (!ghost) {
    ghost = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(5, 4, 5)),
      new THREE.LineBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.75 }));
    ghost.visible = false; sc.add(ghost);
  }
  let o = null, ok = false;
  if (target && get(target[0], target[1], target[2]) === BPRINT) { o = target; ok = done(getStock(o)); }
  else if (eco.sel === BPRINT && prev) o = prev;
  ghost.visible = !!o && !!G.room;
  if (o) {
    ghost.position.set(o[0] + 2.5, o[1] + 2, o[2] + 2.5);
    ghost.material.color.setHex(ok ? 0x44ff66 : 0x44aaff);
  }
}, 120);
