import { TYPES, CATS, get, set, rebuild, isLoaded, isPlant, target, prev, WOOLC_MIN } from '../world/world.js';
import { FACE_TILES, tileOf, addFlat } from '../world/textures.js';
import { eco } from './economy.js';
import { RECIPES } from './recipes.js';
import { MAXDUR, wear } from './gear.js';
import { toast, drawHud } from '../ui/ui.js';
import { P } from '../entities/player.js';
import { dropItems } from '../entities/items.js';
import { findMob, mobKind, mobCol } from '../entities/mobs.js';
import { isCreative } from './creative.js';
import { G } from '../core/state.js';
import { recordChange } from './progress.js';
import { sfx } from '../core/sound.js';

export const JUKE = 101, DISC_MIN = 102, DISC_MAX = 104, SHEARS = 105, BPRINT = 107;
export const isDisc = t => t >= DISC_MIN && t <= DISC_MAX;

function reg(id, name, color, base, top, side, bot, cat) {
  TYPES[id] = { name, color, base };
  FACE_TILES[id] = [tileOf(top), tileOf(side), tileOf(bot)];
  eco.inv[id] = 0; eco.raw[id] = base; eco.trend[id] = 0;
  if (cat != null) CATS[cat][1].push(id);
}
reg(JUKE, 'Müzik kutusu', 0x6b4423, 60, 'furnaceTop', 'planks', 'planks', 0);
reg(102, 'Disk: Neşe', 0x222222, 40, 'obsidian', 'obsidian', 'obsidian', 4);
reg(103, 'Disk: Gece', 0x6a2040, 50, 'netherite', 'netherite', 'netherite', 4);
reg(104, 'Disk: Macera', 0xd4a020, 70, 'gold', 'gold', 'gold', 4);
reg(SHEARS, 'Makas', 0xd8d8d8, 60, 'hoeI', 'hoeI', 'hoeI', 3);
reg(BPRINT, 'Şema bloğu (ev)', 0x4a90e2, 50, 'craftTop', 'craftSide', 'planks', 0);
MAXDUR[SHEARS] = 238;
for (const d of [102, 103, 104]) FACE_TILES[d] = [tileOf('disc'), tileOf('disc'), tileOf('disc')];
FACE_TILES[SHEARS] = [tileOf('shears'), tileOf('shears'), tileOf('shears')];
addFlat(102, 103, 104, SHEARS);

const C = 82;
RECIPES.push({ out: [JUKE, 1], pat: [[70, 70, 70], [70, 85, 70], [70, 70, 70]] });
RECIPES.push({ out: [102, 1], pat: [[C, C, C], [C, 83, C], [C, C, C]] });
RECIPES.push({ out: [103, 1], pat: [[C, C, C], [C, 84, C], [C, C, C]] });
RECIPES.push({ out: [104, 1], pat: [[C, C, C], [C, 85, C], [C, C, C]] });
RECIPES.push({ out: [SHEARS, 1], pat: [[0, 83], [83, 0]] });
RECIPES.push({ out: [BPRINT, 1], pat: [[70, 70, 70], [70, 71, 70], [70, 70, 70]] });

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
  dropItems([{ t: col >= 0 ? WOOLC_MIN + col : 16, c: n, x: P.x + 0, y: P.y + 1.3, z: P.z, vx: 0, vy: 2, vz: 0 }]);
  sfx.hit();
  if (wear(SHEARS, 1)) toast('💥 Makas kırıldı!');
  drawHud();
}

// ---------- Müzik kutusu ----------
const TUNES = {
  102: { bpm: 170, n: [72, 74, 76, 72, 76, 74, 72, 67, 72, 74, 76, 77, 76, 74, 72, 0] },
  103: { bpm: 100, n: [57, 0, 60, 0, 64, 0, 60, 0, 55, 0, 59, 0, 62, 0, 59, 0] },
  104: { bpm: 140, n: [60, 64, 67, 72, 71, 67, 64, 67, 62, 65, 69, 74, 72, 69, 65, 0] }
};
let ac = null, gain = null, play = null;
function stopTune(giveBack) {
  if (!play) return;
  clearTimeout(play.timer); clearInterval(play.chk);
  if (giveBack) give(play.disc, 1);
  play = null;
}
export function useJuke(t, sel) {
  const key = t.join('_');
  if (play && play.key === key) { stopTune(true); return toast('⏹ Müzik durdu'); }
  if (!isDisc(sel) || (!isCreative() && (eco.inv[sel] || 0) < 1)) return toast('Çalmak için elinde disk olsun');
  stopTune(true);
  if (!isCreative()) eco.inv[sel]--;
  ac = ac || new (window.AudioContext || window.webkitAudioContext)();
  if (ac.state === 'suspended') ac.resume();
  gain = gain || ac.createGain();
  gain.connect(ac.destination);
  const tune = TUNES[sel];
  play = { key, disc: sel, i: 0 };
  const step = 60 / tune.bpm;
  const tick = () => {
    const m = tune.n[play.i++ % tune.n.length];
    if (m) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'triangle'; o.frequency.value = 440 * Math.pow(2, (m - 69) / 12);
      g.gain.setValueAtTime(0.35, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + step * 0.9);
      o.connect(g); g.connect(gain);
      o.start(); o.stop(ac.currentTime + step);
    }
    play.timer = setTimeout(tick, step * 1000);
  };
  play.chk = setInterval(() => {   // uzaklaştıkça kısılır, blok kırılırsa durur
    if (!play) return;
    if (isLoaded(t[0], t[2]) && get(t[0], t[1], t[2]) !== JUKE) { stopTune(true); return; }
    const d = Math.hypot(P.x - t[0], P.y - t[1], P.z - t[2]);
    gain.gain.value = Math.max(0, 1 - d / 24);
  }, 200);
  tick();
  toast('🎵 ' + TYPES[sel].name);
  drawHud();
}

// ---------- Şema evi (5x5, 3 yüksek + çatı) ----------
const cells = [];
for (let x = 0; x < 5; x++) for (let z = 0; z < 5; z++) {
  const edge = x === 0 || x === 4 || z === 0 || z === 4;
  for (let y = 0; y < 3; y++) {
    if (!edge) { cells.push([x, y, z, 0]); continue; }
    if (x === 2 && z === 0 && y < 2) { cells.push([x, y, z, 0]); continue; }   // kapı
    const win = y === 1 && ((x === 0 && z === 2) || (x === 4 && z === 2) || (x === 2 && z === 4));
    cells.push([x, y, z, win ? 9 : 70]);
  }
  cells.push([x, 3, z, 70]);   // çatı
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
      '<button data-g="' + t + '" style="padding:8px 12px;border:0;border-radius:8px;background:#1565c0;color:#fff;font-weight:700">Ver</button></div>';
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
