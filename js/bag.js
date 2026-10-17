import { TYPES } from './world.js';
import { eco } from './economy.js';
import { drawHud } from './ui.js';
import { dropFromInventory } from './items.js';

const css = c => '#' + c.toString(16).padStart(6, '0');

const st = document.createElement('style');
st.textContent = `
.slot{width:48px;height:56px}
.slot span{font-size:9px;line-height:1.1}
.slot b{font-size:11px}
.slot.more{font-size:24px;font-weight:700}
#bag{position:fixed;inset:0;background:#000b;z-index:25;display:none;align-items:center;justify-content:center}
#bagBox{position:relative;background:#1d2330;color:#fff;border-radius:14px;padding:14px;width:min(94vw,420px);max-height:92vh;overflow:auto;touch-action:pan-y}
#bagBox h2{margin:0 0 2px}
#bagBox h3{margin:12px 0 6px;font-size:14px}
#bagBox small{opacity:.7;font-size:12px}
#bagX{position:absolute;top:8px;right:8px;width:36px;height:36px;border:0;border-radius:50%;background:#b3261e;color:#fff;font-size:18px;font-weight:700}
#bagGrid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:8px}
.bc,.hs{background:#0006;border:2px solid #fff3;border-radius:8px;padding:6px 2px;text-align:center;font-size:10px;display:flex;flex-direction:column;align-items:center;gap:2px;touch-action:none}
.bc.pend{border-color:#ffd84a}
.bc i,.hs i{width:24px;height:24px;border-radius:4px;display:block}
.bc span{font-size:12px;font-weight:700}
#bagSlots{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.hs{min-height:58px;border-style:dashed}
.dropRow{display:flex;gap:6px;align-items:center;margin-top:10px;font-size:13px}
.dropRow span{flex:1.2}
.dropRow button{flex:1;padding:8px;border:0;border-radius:8px;background:#e65100;color:#fff;font-weight:700}
.ghost{position:fixed;width:44px;height:44px;border-radius:8px;border:2px solid #fff;opacity:.85;pointer-events:none;z-index:40}
`;
document.head.appendChild(st);

const bag = document.createElement('div');
bag.id = 'bag';
document.body.appendChild(bag);

let open = false, pending = null, drag = null;
export const isBagOpen = () => open;

export function toggleBag() {
  open = !open;
  pending = null;
  bag.style.display = open ? 'flex' : 'none';
  if (open) draw();
}

function assign(i, t) {
  const j = eco.hotbar.indexOf(t);
  if (j >= 0 && j !== i) eco.hotbar[j] = eco.hotbar[i];
  eco.hotbar[i] = t;
  eco.sel = eco.hotbar[eco.hsel];
  pending = null;
  draw(); drawHud();
}

function draw() {
  let h = `<div id="bagBox"><button id="bagX">✕</button><h2>🎒 Çanta</h2>
    <small>Bloğu alttaki slota sürükle (ya da bloğa dokun, sonra slota dokun)</small><div id="bagGrid">`;
  for (const t in TYPES) {
    h += `<div class="bc${pending == t ? ' pend' : ''}" data-t="${t}"><i style="background:${css(TYPES[t].color)}"></i>
      ${TYPES[t].name}<span>${eco.inv[t]}</span></div>`;
  }
  h += `</div>`;
  if (pending) {
    h += `<div class="dropRow"><span>${TYPES[pending].name} bırak:</span>
      <button data-drop="1">1</button><button data-drop="10">10</button><button data-drop="all">Hepsi</button></div>`;
  }
  h += `<h3>Hızlı slotlar</h3><div id="bagSlots">`;
  eco.hotbar.forEach((t, i) => {
    h += `<div class="hs" data-i="${i}"><i style="background:${css(TYPES[t].color)}"></i>${TYPES[t].name}</div>`;
  });
  h += `</div></div>`;
  bag.innerHTML = h;
}

bag.addEventListener('click', e => {
  if (e.target.closest('#bagX')) return toggleBag();
  const d = e.target.closest('[data-drop]');
  if (d && pending) {
    const n = d.dataset.drop === 'all' ? eco.inv[pending] : +d.dataset.drop;
    dropFromInventory(pending, n);
    draw(); drawHud();
  }
});

bag.addEventListener('pointerdown', e => {
  const c = e.target.closest('.bc');
  if (c) { drag = { t: +c.dataset.t, x: e.clientX, y: e.clientY, moved: false, ghost: null }; return; }
  const s = e.target.closest('.hs');
  if (s && pending) assign(+s.dataset.i, pending);
});

addEventListener('pointermove', e => {
  if (!drag) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 8) return;
  drag.moved = true;
  if (!drag.ghost) {
    const g = document.createElement('div');
    g.className = 'ghost';
    g.style.background = css(TYPES[drag.t].color);
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
  if (cancel) return;
  if (!d.moved) { pending = d.t; draw(); return; }
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const s = el && el.closest('.hs');
  if (s) assign(+s.dataset.i, d.t);
}
addEventListener('pointerup', e => endDrag(e, false));
addEventListener('pointercancel', e => endDrag(e, true));
