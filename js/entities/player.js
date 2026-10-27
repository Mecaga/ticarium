import { get, solid, WATER, spawnPos, isLoaded, pointHit } from '../world/world.js';
import { input } from '../ui/input.js';

const R = 0.3, PH = 1.7;
const sp0 = spawnPos();

export const pHooks = { onFall: null };

export const P = {
  x: sp0.x, y: sp0.y, z: sp0.z,
  vy: 0, ground: false, yaw: 0, pitch: 0,
  kx: 0, kz: 0,
  sx: sp0.x, sy: sp0.y, sz: sp0.z,
  fallY: sp0.y,
  inWater: false, underWater: false,
  sneak: false, fly: false, ghost: false, up: false, down: false, fast: false
};

export function collides(x, y, z) {
  if (P.ghost) return false;
  for (const dx of [-R, R]) for (const dz of [-R, R]) for (const dy of [0.05, 0.9, PH - 0.05])
    if (solid(Math.floor(x + dx), Math.floor(y + dy), Math.floor(z + dz)) || pointHit(x + dx, y + dy, z + dz)) return true;
  return false;
}

export function jump() {
  if (P.fly) return;
  if (P.inWater) { P.vy = P.underWater ? 4.4 : 6.8; P.ground = false; return; }
  if (P.ground) { P.vy = 8; P.ground = false; }
}

export function knock(dx, dz) {
  const l = Math.hypot(dx, dz) || 1;
  P.kx = dx / l * 8;
  P.kz = dz / l * 8;
  P.vy = Math.max(P.vy, 5);
  P.ground = false;
}

// Eğilirken kenardan düşmeyi engeller
function edgeOk(nx, nz) {
  return !(P.sneak && P.ground && !P.fly && !collides(nx, P.y - 0.4, nz) && collides(P.x, P.y - 0.4, P.z));
}
function mv(nx, nz) {
  if (!edgeOk(nx, nz)) return;
  if (!collides(nx, P.y, nz)) { P.x = nx; P.z = nz; return; }
  if (P.ground && !P.fly) {   // alçak basamaklara (kar, yatak) otomatik çık
    for (const h of [0.3, 0.55, 0.8]) if (!collides(nx, P.y + h, nz)) { P.x = nx; P.z = nz; P.y += h; return; }
  }
}

export function updatePlayer(dt, frozen) {
  if (frozen) return;
  if (!isLoaded(Math.floor(P.x), Math.floor(P.z))) return;
  if (collides(P.x, P.y, P.z)) {   // üstümüze blok konduysa dışarı çık
    let ok = false;
    for (let r = 0.25; r <= 1.25 && !ok; r += 0.25) for (let a = 0; a < 8 && !ok; a++) {
      const nx = P.x + Math.cos(a * 0.785) * r, nz = P.z + Math.sin(a * 0.785) * r;
      if (!collides(nx, P.y, nz)) { P.x = nx; P.z = nz; ok = true; }
    }
    for (let dy = 0.25; dy <= 2.5 && !ok; dy += 0.25) if (!collides(P.x, P.y + dy, P.z)) { P.y += dy; ok = true; }
    P.vy = 0;
  }
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

  let sp = P.fly ? (P.ghost ? 10 : 7) : P.inWater ? 2.6 : 4.5;
  if (P.fast) sp *= 2;
  if (P.sneak && !P.fly) sp *= 0.4;
  const sn = Math.sin(P.yaw), cs = Math.cos(P.yaw);
  const vx = (-sn * f + cs * s) * sp + P.kx, vz = (-cs * f - sn * s) * sp + P.kz;
  mv(P.x + vx * dt, P.z);
  mv(P.x, P.z + vz * dt);

  if (P.fly) {   // uçuş: yerçekimi yok, ⬆ ⬇ ile yükselir
    const up = P.up || k.Space, dn = P.down || k.ShiftLeft || P.sneak;
    P.vy = (up ? 8 : 0) - (dn ? 8 : 0);
    P.fallY = P.y; P.ground = false;
    const ny = P.y + P.vy * dt;
    if (P.ghost || !collides(P.x, ny, P.z)) P.y = ny; else P.vy = 0;
    return;
  }

  if (P.inWater) {
    P.vy = Math.max(-3, P.vy - 7 * dt);
    P.vy *= Math.max(0, 1 - 2.5 * dt);
    P.fallY = P.y;
  } else {
    P.vy = Math.max(-40, P.vy - 22 * dt);
  }
  const ny = P.y + P.vy * dt;
  let landed = false;
  if (!collides(P.x, ny, P.z)) { P.y = ny; P.ground = false; }
  else { if (P.vy < 0) { P.ground = true; landed = true; } P.vy = 0; }

  if (P.ground) {
    const d = P.fallY - P.y;
    if (landed && d > 3 && pHooks.onFall) pHooks.onFall(Math.floor(d - 3));
    P.fallY = P.y;
  } else if (P.y > P.fallY) {
    P.fallY = P.y;
  }

  if (P.ground) { P.sx = P.x; P.sy = P.y; P.sz = P.z; }
}
