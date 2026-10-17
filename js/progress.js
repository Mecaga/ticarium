import { TYPES, inBounds } from './world.js';
import { P, collides } from './player.js';
import { eco } from './economy.js';
import { drawHud, toast } from './ui.js';
import { saveSolo } from './save.js';
import { flushGravity } from './gravity.js';
import { isDead } from './health.js';
import { G } from './state.js';

// Başkasının odasında envanter/konum kaydı tutulsun mu? (false: sadece kendi dünyan kaydolur)
const SAVE_GUEST = false;

let changes = {};
export const getChanges = () => changes;
export function setChanges(c) { changes = c || {}; }
export function recordChange(x, y, z, t) {
  if (G.room && G.room.solo) changes[x + '_' + y + '_' + z] = t;
}

export function canSave() {
  const r = G.room;
  return !!r && !r.noSave && (r.solo || r.isOwner || SAVE_GUEST);
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
  return { inv, hotbar: eco.hotbar.slice(), hsel: eco.hsel, x: r(P.x), y: r(P.y), z: r(P.z), yaw: r(P.yaw), pitch: r(P.pitch), t: Date.now() };
}

export function applyState(s) {
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
    st.seed = room.seed;
    st.changes = changes;
    const ok = saveSolo(st);
    if (ok) flashSaved();
    if (manual) toast(ok ? '💾 Kaydedildi' : 'Kaydedilemedi (depolama dolu)');
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
