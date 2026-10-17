import { H, spawnPos } from './world.js';
import { P, pHooks, collides } from './player.js';
import { eco } from './economy.js';
import { drawHud, toast } from './ui.js';
import { dropItems } from './items.js';
import { hhooks, hurt, respawnHealth } from './health.js';
import { setFood } from './hunger.js';
import { G } from './state.js';
import { autosave } from './progress.js';
import { sfx } from './sound.js';
import { drawHearts, flash } from './panels.js';

const deathEl = document.createElement('div');
deathEl.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#200;opacity:0;pointer-events:none;transition:opacity .4s;z-index:7;display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:700';
deathEl.textContent = 'Öldün 💀';
document.body.appendChild(deathEl);

let deathTimer = null;

export function toSpawn() {
  const sp = spawnPos();
  P.x = sp.x; P.z = sp.z;
  let y = sp.y;
  while (y < H - 2 && collides(P.x, y, P.z)) y += 1; // ağaç vb. varsa yukarı çık
  P.y = y; P.vy = 0; P.ground = false;
  P.kx = 0; P.kz = 0;
  P.sx = P.x; P.sy = P.y; P.sz = P.z; P.fallY = P.y;
}

export function clearDeath() {
  if (deathTimer) { clearTimeout(deathTimer); deathTimer = null; }
  deathEl.style.opacity = 0;
}

function scatter(px, py, pz) {
  let total = 0;
  for (const t in eco.inv) total += eco.inv[t];
  if (!total) return 0;
  const stack = Math.max(16, Math.ceil(total / 24));
  const arr = [];
  for (const t in eco.inv) {
    let n = eco.inv[t];
    eco.inv[t] = 0;
    while (n > 0) {
      const c = Math.min(stack, n); n -= c;
      const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 3;
      arr.push({ t: +t, c, x: px, y: py + 1, z: pz, vx: Math.cos(a) * sp, vy: 4 + Math.random() * 3, vz: Math.sin(a) * sp });
    }
  }
  dropItems(arr);
  drawHud();
  return total;
}

function loseOnDeath(px, py, pz) {
  const r = G.room;
  if (r && !r.solo && r.keep) return false;
  return scatter(px, py, pz) > 0;
}

export function initDeath() {
  hhooks.onChange = drawHearts;
  hhooks.onHurt = () => { flash(); sfx.hurt(); };
  hhooks.onDeath = src => {
    const pos = src.void ? [P.sx, P.sy, P.sz] : [P.x, P.y, P.z];
    const lost = loseOnDeath(pos[0], pos[1], pos[2]);
    const why = src.name ? src.name + ' seni yendi' : src.void ? 'Boşluğa düştün' : 'Çok yüksekten düştün';
    toast(why + ' 💀' + (lost ? ' Eşyaların düştü' : ''));
    if (G.online) G.online.reportDeath(src.id || '');
    autosave(false, true); // ölünce envanteri hemen kaydet (eşya kopyalanmasın)
    deathEl.style.opacity = 1;
    deathTimer = setTimeout(() => {
      deathTimer = null;
      toSpawn();
      respawnHealth();
      setFood(20);
      if (G.online) G.online.setDead(false);
      deathEl.style.opacity = 0;
      toast('Canlandın');
    }, 2000);
  };
  pHooks.onFall = d => { if (d > 0) hurt(d, { fall: true }); };
}
