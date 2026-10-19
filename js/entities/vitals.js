import { P } from './player.js';
import { get, WATER, LAVA } from '../world/world.js';
import { hurt, hp } from './health.js';

// Nefes (boğulma) ve lav hasarı
export const air = { cur: 15, max: 15 };
let lavaT = 0, drownT = 0;

const el = document.createElement('div');
el.style.cssText = 'position:fixed;bottom:92px;left:50%;transform:translateX(-50%);font-size:12px;z-index:6;pointer-events:none;display:none;white-space:nowrap';
document.body.appendChild(el);

export function resetVitals() {
  air.cur = air.max; lavaT = 0; drownT = 0;
  el.style.display = 'none';
}

export function tickVitals(dt, alive) {
  if (!alive || hp.god) { if (air.cur < air.max || el.style.display !== 'none') resetVitals(); return; }
  const fx = Math.floor(P.x), fz = Math.floor(P.z);

  const inLava = get(fx, Math.floor(P.y + 0.2), fz) === LAVA || get(fx, Math.floor(P.y + 1.0), fz) === LAVA;
  if (inLava) {
    lavaT += dt;
    if (lavaT >= 0.5) { lavaT = 0; hurt(4, { lava: true }); }
  } else lavaT = 0;

  const under = get(fx, Math.floor(P.y + 1.6), fz) === WATER;
  if (under) {
    air.cur = Math.max(0, air.cur - dt);
    if (air.cur <= 0) {
      drownT += dt;
      if (drownT >= 1) { drownT = 0; hurt(2, { drown: true }); }
    }
  } else {
    air.cur = Math.min(air.max, air.cur + dt * 5);
    drownT = 0;
  }
  if (under || air.cur < air.max) {
    el.style.display = 'block';
    el.textContent = '🫧'.repeat(Math.max(0, Math.ceil(air.cur / air.max * 10)));
  } else el.style.display = 'none';
}
