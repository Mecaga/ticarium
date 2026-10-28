import { TYPES, inBounds } from '../world/world.js';
import { P, collides } from '../entities/player.js';
import { eco } from './economy.js';
import { drawHud, toast } from '../ui/ui.js';
import { flushGravity } from '../world/gravity.js';
import { isDead } from '../entities/health.js';
import { food, setFood } from '../entities/hunger.js';
import { G } from '../core/state.js';
import { stack } from '../world/paints.js';
import { survivalInv } from './creative.js';
import { layout, SLOTS } from './inventory.js';
import { MAXDUR, durSnapshot } from './gear.js';
import { ARMOR, SLOTS4 } from './armor.js';
import { returnCraft, isCraftOpen } from '../ui/craft.js';
import { returnFurnace, isFurnaceOpen } from '../ui/furnace.js';

// Odadaki herkesin envanteri kendi hesabına kaydedilir
const SAVE_GUEST = true;

let CL = null;   // cloud.js (tek oyunculu dünya ve oda sahibi için)
export function bindCloud(m) { CL = m; }
const key = (x, y, z) => x + '_' + y + '_' + z;

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
  if (!r || r.noSave) return false;
  return r.solo ? !!r.wid : SAVE_GUEST;
}

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
  const real = survivalInv();
  const inv = {};
  for (const t in TYPES) inv['t' + t] = real[t] || 0;
  const armor = {}, armD = {};
  for (const s of SLOTS4) { armor[s] = eco.armor[s] || 0; armD[s] = Math.round(eco.armDur[s] || 0); }
  const r = n => +n.toFixed(2);
  return {
    inv, dur: durSnapshot(real), armor, armD, layout: layout().slice(), hotbar: eco.hotbar.slice(), hsel: eco.hsel,
    food: food.cur, stack: stack.slice(),
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
  if (s.dur) {
    for (const k in s.dur) {
      const t = +k.slice(1);
      if (MAXDUR[t] && s.dur[k]) eco.dur[t] = Object.values(s.dur[k]).map(Number);
    }
  }
  if (s.armor) {
    for (const sl of SLOTS4) {
      const t = +s.armor[sl] || 0;
      if (t && ARMOR[t] && ARMOR[t][0] === sl) {
        eco.armor[sl] = t;
        eco.armDur[sl] = Math.max(1, +(s.armD && s.armD[sl]) || MAXDUR[t]);
      }
    }
  }
  if (Array.isArray(s.layout) && s.layout.length === SLOTS) eco.layout = s.layout.map(t => (TYPES[t] ? +t : 0));
  if (Array.isArray(s.hotbar) && s.hotbar.length === eco.hotbar.length) {
    eco.hotbar = s.hotbar.map(t => (TYPES[t] ? Number(t) : 1));
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
  if (!canSave()) { if (manual) toast('Bu dünyada kayıt kapalı'); return; }
  if (isDead() && !force) return;
  // Üretim ya da ocak paneli açıkken malzemeler çantadan çıkmıştır: zorunlu kayıtta geri verilir
  if (isCraftOpen() || isFurnaceOpen()) {
    if (!force) return;
    returnCraft(); returnFurnace();
  }
  flushGravity();
  const st = snapshotState();
  // Tek oyunculu dünya ve oda sahibi: dünyanın kendi kaydı. Diğer oyuncular: kendi hesabındaki oda kaydı.
  if (room.solo || (room.isOwner && room.wid)) {
    if (!CL) return;
    CL.saveState(room.wid, st).then(ok => {
      if (ok) flashSaved();
      if (manual) toast(ok ? '💾 Kaydedildi' : 'Kaydedilemedi (bağlantıyı kontrol et)');
    });
    if (room.solo) CL.flush();
  } else if (G.online) {
    G.online.saveProgress(st);
    flashSaved();
    if (manual) toast('💾 Kaydedildi');
  }
}

export function initAutosave() {
  setInterval(() => autosave(false), 15000);
  addEventListener('pagehide', () => autosave(false, true));
  document.addEventListener('visibilitychange', () => { if (document.hidden) autosave(false, true); });
}
