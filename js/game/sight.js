import { P } from '../entities/player.js';
import { sightClear } from '../world/world.js';

// Bir noktadan oyuncuya görüş. Gövdenin üç yüksekliğinden biri açıksa görür,
// yani duvarın üstünden ya da kenarından da fark edilebilir.
export function seesFrom(x, y, z, eyeH) {
  const ey = y + eyeH;
  return sightClear(x, ey, z, P.x, P.y + 0.4, P.z) ||
    sightClear(x, ey, z, P.x, P.y + 1.0, P.z) ||
    sightClear(x, ey, z, P.x, P.y + 1.5, P.z);
}

// Canavar nesnesi için görüş. Sonuç 250 ms önbelleklenir, her karede ışın taranmaz.
export function seesPlayer(m, eyeH) {
  const now = performance.now();
  if (now - (m.sightT || 0) < 250) return !!m.sight;
  m.sightT = now;
  m.sight = seesFrom(m.x, m.y, m.z, eyeH);
  return m.sight;
}

// Ok için nişan noktası tamamen açık olmalı. Arada blok varsa ok atılmaz.
export function aimClear(x, y, z, eyeH) {
  return sightClear(x, y + eyeH, z, P.x, P.y + 1.2, P.z);
}
