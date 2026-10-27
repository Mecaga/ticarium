import { TYPES, CATS } from '../world/world.js';
import { FACE_TILES, tileOf, addFlat } from '../world/textures.js';
import { eco } from './economy.js';
import { RECIPES, LOG, WOOLANY } from './recipes.js';
import { iconHTML } from '../ui/ui.js';

export const BOOK = 177;
TYPES[BOOK] = { name: 'Tarif kitabı', color: 0x7846a0, base: 40 };
FACE_TILES[BOOK] = [tileOf('book'), tileOf('book'), tileOf('book')];
eco.inv[BOOK] = 0; eco.raw[BOOK] = 40; eco.trend[BOOK] = 0;
CATS[4][1].push(BOOK);
addFlat(BOOK);
RECIPES.push({ out: [BOOK, 1], shapeless: [LOG, LOG, WOOLANY] });

const st = document.createElement('style');
st.textContent = `#bkP{position:fixed;inset:0;background:#000b;z-index:27;display:none;align-items:center;justify-content:center}
#bkBox{background:#1d2330;color:#fff;border-radius:14px;padding:14px;width:min(94vw,430px);max-height:90vh;overflow:auto;box-sizing:border-box}
.bkr{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:8px 0;padding:8px;background:#0004;border-radius:8px;font-size:14px}
.bkr img{width:28px;height:28px;image-rendering:pixelated;vertical-align:middle}
.bkr .a{flex:1;min-width:100%;font-size:12px;opacity:.8}`;
document.head.appendChild(st);
const el = document.createElement('div');
el.id = 'bkP';
document.body.appendChild(el);
const I = (t, n) => '<span>' + (n ? n + '× ' : '') + iconHTML(t) + '</span>';
let open = false;
export const isBookOpen = () => open;

export function openBook() {
  open = true;
  el.style.display = 'flex';
  el.innerHTML = '<div id="bkBox"><h3 style="margin:0 0 6px">📖 Yemek tarifleri</h3>' +
    '<div class="bkr">' + I(74, 3) + ' → ' + I(75) + ' Ekmek<div class="a">3 buğday yan yana (çalışma masası). +5 açlık</div></div>' +
    '<div class="bkr">' + I(74, 2) + I(152) + I(153) + I(154) + ' → ' + I(155, 2) + ' Çiğköfte<div class="a">2 buğday + domates + biber + soğan, sıra önemsiz (çalışma masası). +14 açlık</div></div>' +
    '<div class="bkr">' + I(15) + ' → ' + I(86) + ' Pişmiş et<div class="a">Ocakta eritilir (yakıt: kömür, odun). +10 açlık</div></div>' +
    '<div class="bkr"><b>Doğrudan yenenler</b><div class="a">Et +6 · Elma +4 · Havuç +4 · Patates +3 · Domates +3 · Biber +2 · Soğan +2</div></div>' +
    '<div class="bkr"><b>Nereden?</b><div class="a">Buğday: olgun buğdayı kır. Sebze: tohum ve ürünü işlenmiş toprağa ek. Tohum: uzun ot kır.</div></div>' +
    '<button id="bkX" style="width:100%;margin-top:8px;padding:11px;border:0;border-radius:8px;background:#b3261e;color:#fff;font-weight:700">Kapat</button></div>';
  el.querySelector('#bkX').onclick = () => { open = false; el.style.display = 'none'; };
}
