import { N, get, heightAt } from './world.js';
import { input } from './input.js';

const R = 0.3, PH = 1.7;
const sx = N / 2 + 0.5, sz = N / 2 + 0.5, sy = heightAt(N / 2, N / 2) + 2;

export const P = {
  x: sx, y: sy, z: sz,
  vy: 0, ground: false, yaw: 0, pitch: 0,
  // en son güvenle durduğu yer (boşluğa düşünce eşyalar buraya bırakılır)
  sx, sy, sz
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

  P.vy = Math.max(-40, P.vy - 22 * dt);
  const ny = P.y + P.vy * dt;
  if (!collides(P.x, ny, P.z)) { P.y = ny; P.ground = false; }
  else { if (P.vy < 0) P.ground = true; P.vy = 0; }

  // Dünyanın içinde yere basıyorsa güvenli nokta olarak kaydet
  if (P.ground && P.x >= 0 && P.x < N && P.z >= 0 && P.z < N) {
    P.sx = P.x; P.sy = P.y; P.sz = P.z;
  }
}
