import { TYPES, CATS } from '../world/world.js';
import { eco } from '../game/economy.js';
import { drawHud, iconHTML, toast } from './ui.js';
import { dropFromInventory } from '../entities/items.js';
import { isCreative } from '../game/creative.js';
import { slotInfo, swapSlots } from '../game/inventory.js';

const TABS = ['📦', '🧱', '🌱', '🍎', '🛠'];   // 0: hepsi, 1..4: CATS sırası

const st = document.createElement('style');
st.textContent = `
.slot{width:48px;height:56px;position:relative}
.slot img{width:30px;height:30px;image-rendering:pixelated;pointer-events:none;display:block}
.slot b{position:absolute;right:3px;bottom:1px;font-size:11px;font-weight:700;color:#fff;text-shadow:0 0 3px #000,0 0 3px #000}
.slot.more{font-size:24px;font-weight:700}
#bag{position:fixed;inset:0;background:#000b;z-index:25;display:none;align-items:center;justify-content:center}
#bagBox{position:relative;background:#1d2330;color:#fff;border-radius:14px;padding:14px;width:min(94vw,430px);max-height:94vh;overflow:auto;touch-action:pan-y}
#bagBox h2{margin:0 0 2px}
#bagBox h3{margin:12px 0 6px;font-size:14px}
#bagBox small{opacity:.7;font-size:12px;display:block;margin-bottom:6px}
#bagX{position:absolute;top:8px;right:8px;width:36px;height:36px;border:0;border-radius:50%;background:#b3261e;color:#fff;font-size:18px;font-weight:700}
#bagTabs{display:flex;gap:4px;margin:8px 0 4px}
.tb{flex:1;padding:7px 0;font-size:20px;border:0;border-radius:8px 8px 0 0;background:#2b3345;color:#fff}
.tb.on{background:#4a5a7a}
#bagScroll{height:min(36vh,230px);overflow-y:scroll;overscroll-behavior:contain;background:#0004;border-radius:8px;padding:6px;touch-action:pan-y}
.bgrid{display:grid;grid-template-columns:repeat(9,1fr);gap:4px}
.sl,.ci,.hs{aspect-ratio:1;background:#0006;border:2px solid #fff3;border-radius:6px;display:flex;align-items:center;justify-content:center;position:relative;min-width:0}
.sl{touch-action:none}.ci{touch-action:pan-y}.hs{touch-action:none;border-style:dashed}
.sl img,.ci img,.hs img{width:78%;height:78%;image-rendering:pixelated;pointer-events:none;display:block}
.sl i,.ci i,.hs i{width:60%;height:60%;border-radius:4px;display:block;pointer-events:none}
.sl b,.hs b{position:absolute;right:2px;bottom:0;font-size:11px;font-weight:700;color:#fff;text-shadow:0 0 3px #000,0 0 3px #000;pointer-events:none}
.sl.pend{border-color:#ffd84a;background:#ffd84a22}
.hs.act{border-color:#ffd84a;border-style:solid}
#bagSlots{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;max-width:270px}
.dropRow{display:flex;gap:6px;align-items:center;margin-top:10px;font-size:13px}
.dropRow span{flex:1.2}
.dropRow button{flex:1;padding:8px;border:0;border-radius:8px;background:#e65100;color:#fff;font-weight:700}
.ghost{position:fixed;width:44px;height:44px;opacity:.9;pointer-events:none;z-index:40}
.ghost img{width:100%;height:100%;image-rendering:pixelated}
`;
document.head.appendChild(st);

const bag = document.createElement('div');
bag.id = 'bag';
document.body.appendChild(bag);

let open = false, pend = -1, tab = 0, drag = null;
export const isBagOpen = () => open;

export function toggleBag() {
  open = !open;
  pend = -1;
  bag.style.display = open ? 'flex' : 'none';
  if (open) draw();
}

function assignHot(i, t) {
  const j = eco.hotbar.indexOf(t);
  if (j >= 0 && j !== i) eco.hotbar[j] = eco.hotbar[i];
  eco.hotbar[i] = t;
  eco.sel = eco.hotbar[eco.hsel];
  toast(TYPES[t].name + ' → hızlı slot ' + (i + 1));
  draw(); drawHud();
}

function draw() {
  const cre = isCreative();
  let h = '<div id="bagBox"><button id="bagX">✕</button><h2>🎒 Çanta' + (cre ? ' · 🎨 Yaratıcı' : '') + '</h2>';
  if (cre) {
    h += '<div id="bagTabs">' + TABS.map((e, k) => '<button class="tb' + (k === tab ? ' on' : '') + '" data-tab="' + k + '">' + e + '</button>').join('') + '</div>';
    h += '<small>' + (tab === 0 ? '📦 Tüm eşyalar' : CATS[tab - 1][0]) + ' · eşyaya dokun: seçili hızlı slota konur</small>';
    const ids = tab === 0 ? Object.keys(TYPES).map(Number) : CATS[tab - 1][1];
    h += '<div id="bagScroll"><div class="bgrid">' + ids.filter(t => TYPES[t]).map(t =>
      '<div class="ci" data-t="' + t + '">' + iconHTML(t) + '</div>').join('') + '</div></div>';
  } else {
    const info = slotInfo();
    h += '<small>Eşyaya dokun, sonra başka slota dokun: yer değiştirir. Hızlı slota koymak için eşyayı seç, sonra alttaki slota dokun.</small><div class="bgrid">';
    info.forEach((s, i) => {
      h += '<div class="sl' + (pend === i ? ' pend' : '') + '" data-i="' + i + '">' + (s ? iconHTML(s.t) + '<b>' + s.n + '</b>' : '') + '</div>';
    });
    h += '</div>';
    if (pend >= 0 && info[pend]) {
      h += '<div class="dropRow"><span>' + TYPES[info[pend].t].name + ' bırak:</span>' +
        '<button data-drop="1">1</button><button data-drop="10">10</button><button data-drop="all">Hepsi</button></div>';
    }
  }
  h += '<h3>Hızlı slotlar</h3><div id="bagSlots">' + eco.hotbar.map((t, i) =>
    '<div class="hs' + (i === eco.hsel ? ' act' : '') + '" data-i="' + i + '">' + iconHTML(t) + '<b>' + (cre ? '∞' : (eco.inv[t] || 0)) + '</b></div>').join('') + '</div></div>';
  const keep = bag.querySelector('#bagScroll');
  const top = keep ? keep.scrollTop : 0;   // sekmeyi değiştirmeden yenilenince kaydırma yeri korunur
  bag.innerHTML = h;
  const sc = bag.querySelector('#bagScroll');
  if (sc) sc.scrollTop = top;
}

const typeOf = d => {
  if (d.kind === 'ci') return d.t;
  if (d.kind === 'hs') return eco.hotbar[d.i];
  const s = slotInfo()[d.i];
  return s ? s.t : 0;
};

function tap(d) {
  if (isCreative()) {
    if (d.kind === 'ci') assignHot(eco.hsel, d.t);
    else if (d.kind === 'hs') { eco.hsel = d.i; eco.sel = eco.hotbar[d.i]; draw(); drawHud(); }
    return;
  }
  if (d.kind === 'sl') {
    const s = slotInfo()[d.i];
    if (pend < 0) { if (s) { pend = d.i; draw(); } }
    else if (pend === d.i) { pend = -1; draw(); }
    else { swapSlots(pend, d.i); pend = -1; draw(); }
  } else if (d.kind === 'hs') {
    if (pend >= 0) {
      const s = slotInfo()[pend];
      pend = -1;
      if (s) return assignHot(d.i, s.t);
    } else { eco.hsel = d.i; eco.sel = eco.hotbar[d.i]; }
    draw(); drawHud();
  }
}

bag.addEventListener('click', e => {
  if (e.target.closest('#bagX')) return toggleBag();
  const tb = e.target.closest('[data-tab]');
  if (tb) { tab = +tb.dataset.tab; draw(); return; }
  const d = e.target.closest('[data-drop]');
  if (d && pend >= 0) {
    const s = slotInfo()[pend];
    if (s) dropFromInventory(s.t, d.dataset.drop === 'all' ? eco.inv[s.t] : +d.dataset.drop);
    if (!slotInfo()[pend]) pend = -1;
    draw(); drawHud();
  }
});

bag.addEventListener('pointerdown', e => {
  const el = e.target.closest('.sl, .ci, .hs');
  if (!el) return;
  drag = {
    kind: el.classList.contains('sl') ? 'sl' : el.classList.contains('ci') ? 'ci' : 'hs',
    i: el.dataset.i !== undefined ? +el.dataset.i : -1,
    t: el.dataset.t !== undefined ? +el.dataset.t : 0,
    x: e.clientX, y: e.clientY, moved: false, ghost: null
  };
});

addEventListener('pointermove', e => {
  if (!drag || drag.kind === 'hs') return;
  if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 8) return;
  const t = typeOf(drag);
  if (!t) return;
  drag.moved = true;
  if (!drag.ghost) {
    const g = document.createElement('div');
    g.className = 'ghost';
    g.innerHTML = iconHTML(t);
    document.body.appendChild(g);
    drag.ghost = g;
  }
  drag.ghost.style.left = (e.clientX - 22) + 'px';
  drag.ghost.style.top = (e.clientY - 22) + 'px';
});

function endDrag(e, cancel) {
  if (!drag) return;
  const d = drag; drag = null;
  if (d.ghost) d.ghost.remove();
  if (cancel || !open) return;
  if (!d.moved) { tap(d); return; }
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const to = el && el.closest('.sl, .hs');
  if (!to) return;
  if (to.classList.contains('hs')) {
    const t = typeOf(d);
    if (t) assignHot(+to.dataset.i, t);
  } else if (d.kind === 'sl') {
    swapSlots(d.i, +to.dataset.i);
    pend = -1; draw();
  }
}
addEventListener('pointerup', e => endDrag(e, false));
addEventListener('pointercancel', e => endDrag(e, true));
