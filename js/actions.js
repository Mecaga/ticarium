import { get, set, rebuild, target, prev, TYPES, H, inBounds, BEDROCK, SAPLING, planTree } from './world.js';
import { P, collides } from './player.js';
import { eco } from './economy.js';
import { drawHud, toast } from './ui.js';
import { queueFall, ghooks, isFalling } from './gravity.js';
import { isDead } from './health.js';
import { recordChange } from './progress.js';
import { G } from './state.js';
import { sfx } from './sound.js';

const saplings = new Map();
export const clearSaplings = () => saplings.clear();

export function trackSapling(x, y, z) {
  const r = G.room;
  if (r && !r.solo && !r.isOwner) return; // odada büyütmeyi oda sahibi yapar
  saplings.set(x + '_' + y + '_' + z, { x, y, z, at: Date.now() + 45000 + Math.random() * 45000 });
}

function growSaplings() {
  if (!G.room) return;
  const now = Date.now();
  for (const [k, s] of saplings) {
    if (get(s.x, s.y, s.z) !== SAPLING || !get(s.x, s.y - 1, s.z)) { saplings.delete(k); continue; }
    if (now < s.at) continue;
    const plan = planTree(s.x, s.y, s.z, Math.random() < 0.35);
    if (!plan) { s.at = now + 20000; continue; }
    saplings.delete(k);
    for (const b of plan) {
      set(b.x, b.y, b.z, b.t);
      recordChange(b.x, b.y, b.z, b.t);
      if (G.online) G.online.sendBlock(b.x, b.y, b.z, b.t);
    }
    rebuild();
  }
}

export function initActions() {
  // Düşen kum/kar da kaydedilsin ve odadaki herkese gitsin
  ghooks.onChange = (x, y, z, t) => {
    recordChange(x, y, z, t);
    if (G.online) G.online.sendBlock(x, y, z, t);
  };
  setInterval(growSaplings, 2000);
}

export function breakBlock() {
  if (isDead() || !target) return;
  const [x, y, z] = target;
  const t = get(x, y, z);
  if (t === BEDROCK) return toast('Katman kayası kırılamaz');
  set(x, y, z, 0);
  recordChange(x, y, z, 0);
  eco.inv[t]++;
  if ((t === 5 || t === 14) && Math.random() < 0.25) {
    eco.inv[SAPLING]++;
    toast('🌱 Fidan buldun!');
  }
  if (G.online) G.online.sendBlock(x, y, z, 0);
  queueFall(x, y + 1, z); // üstündeki kum/kar düşsün
  sfx.breakB();
  rebuild(); drawHud();
}

export function placeBlock() {
  if (isDead() || !prev) return;
  const t = eco.sel;
  if (eco.inv[t] < 1) return toast(TYPES[t].name + ' yok.');
  const [x, y, z] = prev;
  if (!inBounds(x, y, z)) return toast(y >= H ? 'Yükseklik sınırı (' + H + ')' : 'Dünya sınırı');
  if (t === SAPLING && ![1, 2, 6, 8].includes(get(x, y - 1, z))) {
    return toast('Fidan çimene, toprağa, kuma ya da kara dikilir');
  }
  set(x, y, z, t);
  if (collides(P.x, P.y, P.z)) { set(x, y, z, 0); return; }
  recordChange(x, y, z, t);
  if (G.online) G.online.sendBlock(x, y, z, t);
  if (t === SAPLING) trackSapling(x, y, z);
  if (isFalling(t)) queueFall(x, y, z); // altı boşsa düşer
  eco.inv[t]--;
  sfx.place();
  rebuild(); drawHud();
}

export function attack() {
  const room = G.room;
  if (isDead() || !G.online || !room || !room.pvp) return;
  const m = G.online.attack();
  if (m) toast(m);
}
