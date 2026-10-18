import { TYPES, inBounds } from './world.js';
import { P, collides } from './player.js';
import { eco } from './economy.js';
import { drawHud, toast } from './ui.js';
import { flushGravity } from './gravity.js';
import { isDead } from './health.js';
import { food, setFood } from './hunger.js';
import { G } from './state.js';
import { stack } from './paints.js';

// Başkasının odasında envanter/konum kaydı tutulsun mu? (false: sadece kendi dünyan/odan kaydolur)
const SAVE_GUEST = false;

let CL = null;   // cloud.js (tek oyunculu dünyalar için)
export function bindCloud(m) { CL = m; }
const key = (x, y, z) => x + '_' + y + '_' + z;

// Eski çağrılar için (panels.js)
export const setChanges = () => {};
export const getChanges = () => ({});

export function recordChange(x, y, z, t) {
  const r = G.room;
  if (CL && r && r.solo && r.wid) CL.queueChange(key(x, y, z), t);
}

export function recordPaint(x, y, z, data) {
  const r = G.room;
  if (!r) return;
  if (r.solo) { if (CL && r.wid) CL.queuePaint(key(x, y, z), data || null); }
  else if (G.online) G.online.sendPaint(key(x, y, z), data || null);
}

export function canSave() {
  const r = G.room;
  return !!r && !r.noSave && ((r.solo && !!r.wid) || r.isOwner || SAVE_GUEST);
}

// "Kaydedildi" rozeti
const badge = document.createElement('div');
badge.textContent = '💾 Kaydedildi';
badge.style.cssText = 'position:fixed;top:92px;left:8px;background:#1b5e20cc;color:#fff;padding:3px 10px;border-radius:8px;font-size:12px;opacity:0;transition:opacity .3s;pointer-events:none;z-index:6';
document.body.appendChild(badge);
let bt = 0;
function flashSaved() {
  badge.style.opacity = 1;
  clearTimeout(bt);
  bt = setTimeout(() => { badge.style.opacity = 0; }, 1600);
}

function snapshotState() {
  const inv = {};
  for (const t in TYPES) inv['t' + t] = eco.inv[t] || 0;
  const r = n => +n.toFixed(2);
  return {
    inv, hotbar: eco.hotbar.slice(), hsel: eco.hsel, food: food.cur, stack: stack.slice(),
    x: r(P.x), y: r(P.y), z: r(P.z), yaw: r(P.yaw), pitch: r(P.pitch), t: Date.now()
  };
}

export function applyState(s) {
  if (!s) return;
  if (s.inv) {
    for (const t in TYPES) {
      const k = 't' + t;
      if (k in s.inv) eco.inv[t] = Math.max(0, Math.floor(+s.inv[k] || 0));
    }
  }
  if (Array.isArray(s.hotbar) && s.hotbar.length === eco.hotbar.length && s.hotbar.every(t => TYPES[t])) {
    eco.hotbar = s.hotbar.map(Number);
  }
  eco.hsel = Math.min(Math.max(0, s.hsel | 0), eco.hotbar.length - 1);
  eco.sel = eco.hotbar[eco.hsel];
  if (typeof s.food === 'number') setFood(s.food);
  stack.length = 0;
  if (Array.isArray(s.stack)) s.stack.slice(0, 12).forEach(d => { if (typeof d === 'string') stack.push(d); });
  if (typeof s.x === 'number' && inBounds(Math.floor(s.x), Math.floor(s.y), Math.floor(s.z)) && !collides(s.x, s.y, s.z)) {
    P.x = s.x; P.y = s.y; P.z = s.z; P.vy = 0; P.kx = 0; P.kz = 0;
    P.yaw = s.yaw || 0; P.pitch = s.pitch || 0;
    P.sx = P.x; P.sy = P.y; P.sz = P.z; P.fallY = P.y;
  }
  drawHud();
}

export function autosave(manual, force) {
  const room = G.room;
  if (!room) return;
  if (!canSave()) {
    if (manual) toast('Başkasının odasında ilerleme kaydedilmez');
    return;
  }
  if (isDead() && !force) return;
  flushGravity(); // havada kalan kum/kar kaybolmasın
  const st = snapshotState();
  if (room.solo) {
    if (!CL) return;
    CL.saveState(room.wid, st).then(ok => {
      if (ok) flashSaved();
      if (manual) toast(ok ? '💾 Kaydedildi' : 'Kaydedilemedi (bağlantıyı kontrol et)');
    });
    CL.flush();
  } else if (G.online) {
    G.online.saveProgress(st);
    flashSaved();
    if (manual) toast('💾 Kaydedildi (dünya otomatik kayıtlı)');
  }
}

export function initAutosave() {
  setInterval(() => autosave(false), 15000);
  addEventListener('pagehide', () => autosave(false));
  document.addEventListener('visibilitychange', () => { if (document.hidden) autosave(false); });
}
