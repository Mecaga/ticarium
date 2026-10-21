import { eco } from '../game/economy.js';
import { TYPES } from '../world/world.js';
import { drawHud, iconHTML, toast } from './ui.js';
import { findRecipe } from '../game/recipes.js';
import { canAdd, addItem } from '../game/inventory.js';
import { isCreative } from '../game/creative.js';
import { isGear } from '../game/gear.js';
import { dropItems } from '../entities/items.js';
import { P } from '../entities/player.js';
import { sfx } from '../core/sound.js';

// Hücreler sabit kare (iPad/iOS Safari uyumlu)
const st = document.createElement('style');
st.textContent = `
#craftP{position:fixed;inset:0;background:#000b;z-index:26;display:none;align-items:center;justify-content:center}
#craftBox{--cs2:clamp(40px,13vw,56px);background:#1d2330;color:#fff;border-radius:14px;padding:14px;width:min(94vw,430px);max-height:94vh;overflow:auto;touch-action:pan-y;box-sizing:border-box}
#craftBox h2{margin:0 0 6px;font-size:18px}
#craftBox h3{margin:12px 0 6px;font-size:14px}
#craftRow{display:flex;align-items:center;justify-content:center;gap:14px;margin:10px 0}
.cgrid{display:grid;gap:4px}
.cc,.cr,.ci2{width:var(--cs2);height:var(--cs2);min-width:var(--cs2);flex:0 0 auto;aspect-ratio:1/1;box-sizing:border-box;background:#0006;border:2px solid #fff3;border-radius:6px;position:relative;display:flex;align-items:center;justify-content:center}
.cr{border-color:#ffd84a;background:#ffd84a22}
.ci2.on{border-color:#ffd84a;background:#ffd84a22}
.cc img,.cr img,.ci2 img{width:78%;height:78%;image-rendering:pixelated;pointer-events:none;display:block}
.cc i,.cr i,.ci2 i{width:60%;height:60%;border-radius:4px;display:block;pointer-events:none}
.cc b,.cr b,.ci2 b{position:absolute;right:2px;bottom:0;font-size:11px;font-weight:700;color:#fff;text-shadow:0 0 3px #000,0 0 3px #000;pointer-events:none}
#craftInv{display:grid;grid-template-columns:repeat(auto-fill,var(--cs2));gap:4px;justify-content:center;max-height:30vh;overflow-y:auto;touch-action:pan-y}
.cbtns{display:flex;gap:8px;margin-top:12px}
.cbtns button{flex:1;padding:11px;border:0;border-radius:8px;background:#444;color:#fff;font-weight:700;font-size:15px}
.cbtns button.danger{background:#b3261e}
`;
document.head.appendChild(st);

const el = document.createElement('div');
el.id = 'craftP';
document.body.appendChild(el);

let open = false, size = 2, cells = [], sel = 0;
export const isCraftOpen = () => open;

const result = () => findRecipe(cells.map(c => (c ? c.t : 0)), size);

function giveBack(t, n) {
  const a = addItem(t, n);
  if (a < n) {
    dropItems([{ t, c: n - a, x: P.x, y: P.y + 1.3, z: P.z, vx: (Math.random() - 0.5) * 2, vy: 2, vz: (Math.random() - 0.5) * 2 }]);
    toast('🎒 Çanta dolu, fazlası yere düştü');
  }
}

function returnAll() {
  cells.forEach(c => { if (c) giveBack(c.t, c.n); });
  cells = new Array(size * size).fill(null);
}

function draw() {
  const out = result();
  const ids = Object.keys(TYPES).map(Number).filter(t => (eco.inv[t] || 0) > 0 && !isGear(t));
  let h = '<div id="craftBox"><h2>' + (size === 3 ? '🪵 Çalışma Masası (3x3)' : '🔨 Üretim (2x2)') + '</h2>';
  h += '<small style="opacity:.75;display:block">Aşağıdan malzeme seç, sonra gridde hücreye dokun (her dokunuş 1 adet koyar). Dolu hücreye dokunursan geri alırsın. Sonuca dokununca üretilir.</small>';
  h += '<div id="craftRow"><div class="cgrid" style="grid-template-columns:repeat(' + size + ',var(--cs2))">';
  cells.forEach((c, i) => { h += '<div class="cc" data-i="' + i + '">' + (c ? iconHTML(c.t) + '<b>' + c.n + '</b>' : '') + '</div>'; });
  h += '</div><div style="font-size:26px">➡️</div><div class="cr" data-r="1">' +
    (out ? iconHTML(out[0]) + (out[1] > 1 ? '<b>' + out[1] + '</b>' : '') : '') + '</div></div>';
  if (out) h += '<div style="text-align:center;font-size:13px">' + TYPES[out[0]].name + '</div>';
  h += '<h3>Çantan</h3><div id="craftInv">' + (ids.length
    ? ids.map(t => '<div class="ci2' + (t === sel ? ' on' : '') + '" data-t="' + t + '">' + iconHTML(t) + '<b>' + eco.inv[t] + '</b></div>').join('')
    : '<p style="opacity:.7;grid-column:1/-1">Çantan boş. Blok kır, odun topla!</p>') + '</div>';
  h += '<div class="cbtns"><button data-a="clear">Temizle</button><button data-a="close" class="danger">Kapat</button></div></div>';
  el.innerHTML = h;
}

function cellTap(i) {
  const c = cells[i];
  if (sel) {
    if ((eco.inv[sel] || 0) < 1) { sel = 0; return draw(); }
    if (c && c.t !== sel) return toast('Bu hücre dolu: önce boşalt');
    if (c && c.n >= 64) return;
    eco.inv[sel]--;
    cells[i] = c ? { t: c.t, n: c.n + 1 } : { t: sel, n: 1 };
    if ((eco.inv[sel] || 0) < 1) sel = 0;
    drawHud();
  } else if (c) {
    giveBack(c.t, c.n);
    cells[i] = null;
    drawHud();
  }
  draw();
}

function craft() {
  const out = result();
  if (!out) return;
  if (!canAdd(out[0], out[1])) return toast('🎒 Çanta dolu');
  cells = cells.map(c => (c && c.n > 1 ? { t: c.t, n: c.n - 1 } : null));
  addItem(out[0], out[1]);
  sfx.place();
  drawHud();
  draw();
}

el.addEventListener('click', e => {
  const t = e.target;
  const ci = t.closest('.ci2');
  if (ci) { sel = sel === +ci.dataset.t ? 0 : +ci.dataset.t; return draw(); }
  const cc = t.closest('.cc');
  if (cc) return cellTap(+cc.dataset.i);
  if (t.closest('.cr')) return craft();
  const b = t.closest('[data-a]');
  if (b) { if (b.dataset.a === 'clear') { returnAll(); drawHud(); draw(); } else closeCraft(); }
});

// n: 2 (çantadaki) ya da 3 (çalışma masası)
export function openCraft(n) {
  if (isCreative()) return toast('Yaratıcı modda üretim gerekmez');
  size = n;
  cells = new Array(n * n).fill(null);
  sel = 0;
  open = true;
  el.style.display = 'flex';
  draw();
}

export function closeCraft() {
  if (!open) return;
  returnAll();
  open = false;
  el.style.display = 'none';
  drawHud();
}

// Ölüm, çıkış gibi durumlarda malzemeleri geri verir
export function returnCraft() { if (open) closeCraft(); }
