import { TYPES, CATS, get, isLoaded } from '../world/world.js';
import { FACE_TILES, tileOf } from '../world/textures.js';
import { eco } from './economy.js';
import { RECIPES, WOOLANY } from './recipes.js';
import { clock } from '../world/sky.js';
import { toast } from '../ui/ui.js';
import { G } from '../core/state.js';

export const BED = 100;
TYPES[BED] = { name: 'Yatak', color: 0xc03030, base: 60 };
FACE_TILES[BED] = [tileOf('wc2'), tileOf('planks'), tileOf('planks')];
CATS[0][1].push(BED);
eco.inv[BED] = 0; eco.raw[BED] = 60; eco.trend[BED] = 0;
RECIPES.push({ out: [BED, 1], pat: [[WOOLANY, WOOLANY, WOOLANY], [70, 70, 70]] });

const key = () => 'bd_bed_' + (G.room ? (G.room.wid || G.room.code || 'x') : 'x');

function setSpawn(x, y, z) {
  try { localStorage.setItem(key(), JSON.stringify([x, y, z])); } catch (e) {}
}

// Yatak doğma noktası (yoksa ya da yatak kırılmışsa null)
export function bedSpawnPos() {
  let v = null;
  try { v = JSON.parse(localStorage.getItem(key())); } catch (e) {}
  if (!Array.isArray(v) || v.length !== 3) return null;
  const [x, y, z] = v;
    if (isLoaded(x, z) && get(x, y, z) !== BED && get(x, y, z) !== 99) {    try { localStorage.removeItem(key()); } catch (e) {}
    return null;
  }
  return { x: x + 0.5, y: y + 1.05, z: z + 0.5 };
}

let ov = null, sleeping = false;
function overlay() {
  if (ov) return ov;
  ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity .8s;z-index:30;display:flex;align-items:center;justify-content:center;color:#fff;font-size:34px;font-weight:700';
  ov.textContent = '💤 Zzz...';
  document.body.appendChild(ov);
  return ov;
}

const isNight = () => {
  const hr = ((((Date.now() / 1000 + clock.off) % 480) / 480) * 24 + 6) % 24;
  return hr >= 18 || hr < 6;
};

export function useBed(t) {
  if (sleeping) return;
  setSpawn(t[0], t[1], t[2]);
  if (!isNight()) return toast('🛏 Doğma noktası ayarlandı. Uyumak için gece olmalı');
  sleeping = true;
  const o = overlay();
  o.style.pointerEvents = 'all';
  o.style.opacity = 1;
  setTimeout(() => {
    const cur = Date.now() / 1000 + clock.off;
    clock.off += 480 - (cur % 480);   // sabah 06:00
    o.style.opacity = 0;
    o.style.pointerEvents = 'none';
    sleeping = false;
    toast('☀️ Günaydın! Doğma noktası ayarlandı');
  }, 2400);
}
