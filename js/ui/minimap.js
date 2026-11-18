import { G } from '../core/state.js';
import { P } from '../entities/player.js';
import { gameClock } from '../world/sky.js';

const SIZE = 120, RANGE = 40;   // piksel, dünya birimi (yarıçap)
const wrap = document.createElement('div');
wrap.style.cssText = 'position:fixed;right:8px;top:8px;width:' + SIZE + 'px;z-index:8;pointer-events:none;display:none';
const cv = document.createElement('canvas');
cv.width = cv.height = SIZE;
cv.style.cssText = 'width:' + SIZE + 'px;height:' + SIZE + 'px;border-radius:50%;background:#0008;border:2px solid #fff8';
const info = document.createElement('div');
info.style.cssText = 'color:#fff;font:12px monospace;text-align:center;text-shadow:0 0 3px #000;margin-top:2px';
wrap.append(cv, info);
document.body.appendChild(wrap);
const g = cv.getContext('2d');

// Pusula: yaw'dan kuzey yönünü hesapla (kuzey = -z)
function compass() {
  const deg = ((-P.yaw * 180 / Math.PI) % 360 + 360) % 360;
  const names = ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB'];
  return names[Math.round(deg / 45) % 8] + ' ' + Math.round(deg) + '°';
}

function draw() {
  const r = G.room;
  wrap.style.display = r ? 'block' : 'none';
  if (!r) return;
  g.clearRect(0, 0, SIZE, SIZE);
  const c = SIZE / 2, s = (SIZE / 2 - 6) / RANGE;
  // Oyuncu merkezde, yön yukarı (bakış yönüne göre döner)
  const rot = (dx, dz) => {
    const cos = Math.cos(P.yaw), sin = Math.sin(P.yaw);
    // dünya -> ekran: bakış yukarı olacak şekilde
    const ux = dx * cos - dz * sin, uy = dx * sin + dz * cos;
    return [c - ux * s, c + uy * s];
  };
  // Pusula kuzey işareti (kuzey = -z)
  const [nx, ny] = rot(0, -RANGE);
  g.fillStyle = '#ff5555';
  g.font = 'bold 12px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('K', Math.max(8, Math.min(SIZE - 8, nx)), Math.max(8, Math.min(SIZE - 8, ny)));
  // Oyuncu noktası
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(c, c, 4, 0, 6.3); g.fill();
  // Uzak oyuncular (online.js'in tuttuğu others üzerinden değil, G.online.getPlayers kullanır)
  const list = G.online && G.online.getPlayers ? G.online.getPlayers('') : [];
  g.fillStyle = '#5cf';
  for (const p of list) {
    if (p.me || p.dead) continue;
    const pos = G.online.playerPos ? G.online.playerPos(p.id) : null;
    if (!pos) continue;
    const dx = pos.x - P.x, dz = pos.z - P.z;
    if (Math.hypot(dx, dz) > RANGE) continue;
    const [px, py] = rot(dx, dz);
    g.beginPath(); g.arc(px, py, 3, 0, 6.3); g.fill();
  }
  info.textContent = compass() + '  ' + Math.floor(P.x) + ' ' + Math.floor(P.z);
}
setInterval(draw, 200);
