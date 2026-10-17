import { N, get, solid, heightAt, WATER, spawnPos } from './world.js';
import { input } from './input.js';

const R = 0.3, PH = 1.7;
const sp0 = spawnPos();

export const pHooks = { onFall: null };

export const P = {
  x: sp0.x, y: sp0.y, z: sp0.z,
  vy: 0, ground: false, yaw: 0, pitch: 0,
  kx: 0, kz: 0,    // geri tepme hızı
  sx: sp0.x, sy: sp0.y, sz: sp0.z,   // en son güvenle durduğu yer
  fallY: sp0.y,    // havadayken ulaştığı en yüksek nokta
  inWater: false, underWater: false
};

export function collides(x, y, z) {
  for (const dx of [-R, R]) for (const dz of [-R, R]) for (const dy of [0.05, 0.9, PH - 0.05])
    if (solid(Math.floor(x + dx), Math.floor(y + dy), Math.floor(z + dz))) return true;
  return false;
}

export function jump() {
  if (P.inWater) { P.vy = P.underWater ? 4.4 : 6.8; P.ground = false; return; } // kulaç at
  if (P.ground) { P.vy = 8; P.ground = false; }
}

// Vurulunca geri tepme (dx, dz: saldırgandan uzaklaşma yönü)
export function knock(dx, dz) {
  const l = Math.hypot(dx, dz) || 1;
  P.kx = dx / l * 8;
  P.kz = dz / l * 8;
  P.vy = Math.max(P.vy, 5);
  P.ground = false;
}

export function updatePlayer(dt, frozen) {
  if (frozen) return;
  const wx = Math.floor(P.x), wz = Math.floor(P.z);
  P.inWater = get(wx, Math.floor(P.y + 0.4), wz) === WATER;
  P.underWater = get(wx, Math.floor(P.y + 1.6), wz) === WATER;

  const k = input.keys;
  let f = -input.jy, s = input.jx;
  if (k.KeyW) f += 1; if (k.KeyS) f -= 1;
  if (k.KeyD) s += 1; if (k.KeyA) s -= 1;
  if (k.Space) jump();

  const decay = Math.max(0, 1 - 5 * dt);
  P.kx *= decay; P.kz *= decay;

  const sp = P.inWater ? 2.6 : 4.5, sn = Math.sin(P.yaw), cs = Math.cos(P.yaw);
  const vx = (-sn * f + cs * s) * sp + P.kx, vz = (-cs * f - sn * s) * sp + P.kz;
  if (!collides(P.x + vx * dt, P.y, P.z)) P.x += vx * dt;
  if (!collides(P.x, P.y, P.z + vz * dt)) P.z += vz * dt;

  if (P.inWater) {
    P.vy = Math.max(-3, P.vy - 7 * dt);          // suda yavaş batış
    P.vy *= Math.max(0, 1 - 2.5 * dt);
    P.fallY = P.y;                               // suya düşünce hasar yok
  } else {
    P.vy = Math.max(-40, P.vy - 22 * dt);
  }
  const ny = P.y + P.vy * dt;
  let landed = false;
  if (!collides(P.x, ny, P.z)) { P.y = ny; P.ground = false; }
  else { if (P.vy < 0) { P.ground = true; landed = true; } P.vy = 0; }

  // Düşme hasarı: 3 bloktan fazla düşersen, fazla her blok 1 can
  if (P.ground) {
    const d = P.fallY - P.y;
    if (landed && d > 3 && pHooks.onFall) pHooks.onFall(Math.floor(d - 3));
    P.fallY = P.y;
  } else if (P.y > P.fallY) {
    P.fallY = P.y;
  }

  // Dünyanın içinde yere basıyorsa güvenli nokta olarak kaydet
  if (P.ground && P.x >= 0 && P.x < N && P.z >= 0 && P.z < N) {
    P.sx = P.x; P.sy = P.y; P.sz = P.z;
  }
}
