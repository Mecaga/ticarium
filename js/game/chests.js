import { TYPES, CATS } from '../world/world.js';
import { FACE_TILES, tileOf } from '../world/textures.js';
import { eco } from './economy.js';
import { RECIPES } from './recipes.js';
import { toast, drawHud, iconHTML } from '../ui/ui.js';
import { dropItems } from '../entities/items.js';
import { isCreative } from './creative.js';
import { isGear, takeInstance } from './gear.js';
import { canAdd, addItem } from './inventory.js';
import { loadAt, saveAt, watchAt, canStore } from './store.js';

export const CHEST = 176;
TYPES[CHEST] = { name: 'Sandık', color: 0x9a6a30, base: 50 };
FACE_TILES[CHEST] = [tileOf('chestTop'), tileOf('chestSide'), tileOf('chestTop')];
eco.inv[CHEST] = 0; eco.raw[CHEST] = 50; eco.trend[CHEST] = 0;
CATS[0][1].push(CHEST);
RECIPES.push({ out: [CHEST, 1], pat: [[70, 70, 70], [70, 0, 70], [70, 70, 70]] });

const norm = d => { const o = {}; if (d) for (const t in d) { const v = d[t]; o[t] = typeof v === 'object' ? Object.values(v) : v; } return o; };
const cnt = v => (Array.isArray(v) ? v.length : v);

const st = document.createElement('style');
st.textContent = `#chP{position:fixed;inset:0;background:#000b;z-index:26;display:none;align-items:center;justify-content:center}
#chBox{--cs4:clamp(40px,12vw,52px);background:#1d2330;color:#fff;border-radius:14px;padding:14px;width:min(94vw,430px);max-height:92vh;overflow:auto;box-sizing:border-box;touch-action:pan-y}
#chBox h3{margin:0 0 4px}#chBox h4{margin:10px 0 6px;font-size:13px;opacity:.8}
.chg{display:grid;grid-template-columns:repeat(auto-fill,var(--cs4));gap:4px;justify-content:center;min-height:var(--cs4);max-height:26vh;overflow-y:auto;touch-action:pan-y;background:#0004;border-radius:8px;padding:4px}
.chi{width:var(--cs4);height:var(--cs4);aspect-ratio:1/1;box-sizing:border-box;background:#0006;border:2px solid #fff3;border-radius:6px;position:relative;display:flex;align-items:center;justify-content:center}
.chi img{width:78%;height:78%;image-rendering:pixelated;pointer-events:none}
.chi b{position:absolute;right:2px;bottom:0;font-size:11px;text-shadow:0 0 3px #000,0 0 3px #000;pointer-events:none}
.chq{display:flex;gap:6px;margin-top:10px;align-items:center;font-size:13px}
.chq button{flex:1;padding:8px;border:0;border-radius:8px;background:#444;color:#fff;font-weight:700}
.chq button.on{background:#1565c0}
.chx{width:100%;margin-top:10px;padding:11px;border:0;border-radius:8px;background:#b3261e;color:#fff;font-weight:700}`;
document.head.appendChild(st);

const el = document.createElement('div');
el.id = 'chP';
document.body.appendChild(el);
let open = false, pos = null, qty = 1, cur = {}, unsub = null;
export const isChestOpen = () => open;

const sync = () => saveAt('c', pos, Object.keys(cur).length ? cur : null);

function draw() {
  const mine = Object.keys(TYPES).map(Number).filter(t => (eco.inv[t] || 0) > 0);
  let h = '<div id="chBox"><h3>📦 Sandık</h3><small style="opacity:.7">Üstteki eşyaya dokun: çantana alırsın. Alttakine dokun: sandığa koyarsın. Herkes aynı sandığı görür.</small>';
  h += '<h4>Sandığın içi</h4><div class="chg">' + (Object.keys(cur).map(t => '<div class="chi" data-o="' + t + '">' + iconHTML(+t) + '<b>' + cnt(cur[t]) + '</b></div>').join('') || '<span style="opacity:.6;font-size:13px;padding:6px">Boş</span>') + '</div>';
  h += '<h4>Çantan</h4><div class="chg">' + (mine.map(t => '<div class="chi" data-i="' + t + '">' + iconHTML(t) + '<b>' + eco.inv[t] + '</b></div>').join('') || '<span style="opacity:.6;font-size:13px;padding:6px">Boş</span>') + '</div>';
  h += '<div class="chq">Her dokunuşta: ' + [1, 8, 64].map(q => '<button data-q="' + q + '" class="' + (q === qty ? 'on' : '') + '">' + q + '</button>').join('') + '</div>';
  h += '<button class="chx" data-x="1">Kapat</button></div>';
  el.innerHTML = h;
}

function put(t) {
  if (cur[t] === undefined && Object.keys(cur).length >= 27) return toast('Sandık dolu');
  const n = Math.min(qty, eco.inv[t] || 0);
  if (n < 1) return;
  if (isGear(t)) { cur[t] = cur[t] || []; for (let k = 0; k < n; k++) cur[t].push(takeInstance(t, 0)); }
  else { eco.inv[t] -= n; cur[t] = (cur[t] || 0) + n; }
  sync(); drawHud(); draw();
}

function take(t) {
  if (cur[t] === undefined) return;
  if (isGear(t)) {
    for (let k = 0; k < qty && cur[t].length; k++) {
      if (!canAdd(t, 1)) { toast('🎒 Çanta dolu'); break; }
      addItem(t, 1, cur[t].shift());
    }
    if (!cur[t].length) delete cur[t];
  } else {
    const a = addItem(t, Math.min(qty, cur[t]));
    if (a < 1) toast('🎒 Çanta dolu');
    cur[t] -= a;
    if (cur[t] <= 0) delete cur[t];
  }
  sync(); drawHud(); draw();
}

el.addEventListener('click', e => {
  const T = e.target;
  if (T.closest('[data-x]')) return closeChest();
  const q = T.closest('[data-q]');
  if (q) { qty = +q.dataset.q; return draw(); }
  const i = T.closest('[data-i]');
  if (i) return put(+i.dataset.i);
  const o = T.closest('[data-o]');
  if (o) take(+o.dataset.o);
});

export function openChest(p) {
  if (isCreative()) return toast('Yaratıcı modda sandık gerekmez');
  if (!canStore()) return toast('Sandık sadece kayıtlı dünyada çalışır');
  pos = p.slice(0, 3); open = true; cur = {};
  el.style.display = 'flex';
  unsub = watchAt('c', pos, d => { cur = norm(d); if (open) draw(); });
  draw();
}
export function closeChest() {
  open = false; el.style.display = 'none';
  if (unsub) { unsub(); unsub = null; }
  drawHud();
}

// Sandık kırılınca (kim kırarsa) içindekiler yere düşer
export async function chestBroken(x, y, z) {
  const p = [x, y, z], d = norm(await loadAt('c', p)), arr = [];
  await saveAt('c', p, null);
  const base = () => ({ x: x + 0.5, y: y + 0.5, z: z + 0.5, vx: (Math.random() - 0.5) * 2, vy: 2.5, vz: (Math.random() - 0.5) * 2 });
  for (const t in d) {
    if (Array.isArray(d[t])) d[t].forEach(dur => arr.push({ t: +t, c: 1, d: dur, ...base() }));
    else for (let n = d[t]; n > 0; n -= 64) arr.push({ t: +t, c: Math.min(64, n), ...base() });
  }
  if (arr.length) dropItems(arr);
}
CATS.forEach(c => { c[1] = [...new Set(c[1])]; });
