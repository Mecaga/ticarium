import { TYPES, CATS } from '../world/world.js';
import { FACE_TILES, tileOf, addFlat } from '../world/textures.js';
import { eco } from './economy.js';
import { RECIPES, LOG, WOOLANY } from './recipes.js';
import { iconHTML } from '../ui/ui.js';
import { SMELT } from '../ui/furnace.js';

export const BOOK2 = 178, BOOK3 = 179;
for (const [id, n] of [[BOOK2, 'Tarifler kitabı'], [BOOK3, 'Fırın kitabı']]) {
  TYPES[id] = { name: n, color: 0x7846a0, base: 40 };
  FACE_TILES[id] = [tileOf('book'), tileOf('book'), tileOf('book')];
  eco.inv[id] = 0; eco.raw[id] = 40; eco.trend[id] = 0;
  CATS[4][1].push(id);
  addFlat(id);
}
RECIPES.push({ out: [BOOK2, 1], shapeless: [70, 70, WOOLANY] });
RECIPES.push({ out: [BOOK3, 1], shapeless: [LOG, LOG, 82] });

const st = document.createElement('style');
st.textContent = '#bk2{position:fixed;inset:0;background:#000b;z-index:27;display:none;align-items:center;justify-content:center}#bk2b{background:#1d2330;color:#fff;border-radius:14px;padding:14px;width:min(94vw,430px);max-height:90vh;overflow:auto;box-sizing:border-box}.k2{display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin:6px 0;padding:6px;background:#0004;border-radius:8px;font-size:13px}.k2 img{width:26px;height:26px;image-rendering:pixelated;vertical-align:middle}';
document.head.appendChild(st);
const el = document.createElement('div');
el.id = 'bk2';
document.body.appendChild(el);
const ic = tok => (tok === 0 ? '<span style="display:inline-block;width:26px"></span>' : iconHTML(tok === LOG ? 4 : tok === WOOLANY ? 16 : tok));

function craftHTML() {
  return RECIPES.filter(r => r.out[0] !== BOOK2).map(r => {
    const left = r.pat ? r.pat.map(row => '<div>' + row.map(ic).join('') + '</div>').join('') : '<div>' + r.shapeless.map(ic).join('') + '</div>';
    return '<div class="k2"><div>' + left + '</div> → ' + (r.out[1] > 1 ? r.out[1] + '× ' : '') + iconHTML(r.out[0]) + ' ' + TYPES[r.out[0]].name +
      '<small style="opacity:.6;width:100%">' + (r.pat ? 'Şekilli' : 'Şekilsiz (sıra önemsiz)') + '</small></div>';
  }).join('');
}
function smeltHTML() {
  let h = Object.keys(SMELT).map(i => '<div class="k2">' + iconHTML(+i) + ' ' + TYPES[i].name + ' → ' + iconHTML(SMELT[i]) + ' ' + TYPES[SMELT[i]].name + '</div>').join('');
  h += '<div class="k2"><b>Yakıtlar</b><small style="width:100%">Kömür 8 eşya · Odun, tahta 1,5 · Çubuk 0,5. Eşya başına 3 sn. Ocak kapalıyken de çalışır.</small></div>';
  return h;
}
export function openBook2(id) {
  el.style.display = 'flex';
  el.innerHTML = '<div id="bk2b"><h3 style="margin:0 0 6px">📖 ' + TYPES[id].name + '</h3>' + (id === BOOK2 ? craftHTML() : smeltHTML()) +
    '<button style="width:100%;margin-top:8px;padding:11px;border:0;border-radius:8px;background:#b3261e;color:#fff;font-weight:700">Kapat</button></div>';
  el.querySelector('button').onclick = () => { el.style.display = 'none'; };
}
