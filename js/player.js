import { N, H, get, heightAt } from './world.js';
import { input } from './input.js';

const R = 0.3, PH = 1.7;

export const P = {
  x: N / 2 + 0.5,
  y: heightAt(N / 2, N / 2) + 2,
  z: N / 2 + 0.5,
  vy: 0, ground: false, yaw: 0, pitch: 0
};

export function collides(x, y, z) {
  for (const dx of [-R, R]) for (const dz of [-R, R]) for (const dy of [0.05, 0.9, PH - 0.05])
    if (get(Math.floor(x + dx), Math.floor(y + dy), Math.floor(z + dz))) return true;
  return false;
}

export function jump() {
  if (P.ground) { P.vy = 8; P.ground = false; }
}

export function updatePlayer(dt, frozen) {
  if (frozen) return;
  const k = input.keys;
  let f = -input.jy, s = input.jx;
  if (k.KeyW) f += 1; if (k.KeyS) f -= 1;
  if (k.KeyD) s += 1; if (k.KeyA) s -= 1;
  if (k.Space) jump();

  const sp = 4.5, sn = Math.sin(P.yaw), cs = Math.cos(P.yaw);
  const vx = (-sn * f + cs * s) * sp, vz = (-cs * f - sn * s) * sp;
  if (!collides(P.x + vx * dt, P.y, P.z)) P.x += vx * dt;
  if (!collides(P.x, P.y, P.z + vz * dt)) P.z += vz * dt;

  P.vy -= 22 * dt;
  const ny = P.y + P.vy * dt;
  if (!collides(P.x, ny, P.z)) { P.y = ny; P.ground = false; }
  else { if (P.vy < 0) P.ground = true; P.vy = 0; }

  P.x = Math.max(0.5, Math.min(N - 0.5, P.x));
  P.z = Math.max(0.5, Math.min(N - 0.5, P.z));
  if (P.y < -10) { P.x = N / 2 + 0.5; P.z = N / 2 + 0.5; P.y = H; P.vy = 0; }
}
