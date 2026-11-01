import { N } from '../world/idtable.js';
import { TYPES } from '../world/world.js';
import { RECIPES, LOG, WOOLANY } from './recipes.js';
import { iconHTML } from '../ui/ui.js';
import { SMELT } from '../ui/furnace.js';

const B = [
  { id: N.YEMEK_KITABI, r: [LOG, LOG, WOOLANY], d: 'Yemek tarifleri' },
  { id: N.CRAFT_KITABI, r: [N.TAHTA, N.TAHTA, WOOLANY], d: 'Eşya ve blok tarifleri (yemek, alet, zırh hariç)' },
  { id: N.ALET_KITABI, r: [N.TAHTA, N.TAHTA, N.CUBUK], d: 'Kazma, balta, kürek, çapa, kılıç, makas' },
  { id: N.ZIRH_KITABI, r: [N.TAHTA, N.TAHTA, N.DEMIR_KULCE], d: 'Bütün zırh tarifleri' },
  { id: N.FIRIN_KITABI, r: [LOG, LOG, N.KOMUR], d: 'Fırında eriyenler ve yakıtlar' },
  { id: N.REHBER_KITABI, r: [N.TOPRAK], d: 'Bütün kitapların tarifi ve içeriği' }
];
B.forEach(b => RECIPES.push({ out: [b.id, 1], shapeless: b.r }));
const ids = B.map(b => b.id), byId = Object.fromEntries(B.map(b => [b.id, b]));
export const isBook = t => !!byId[t];

const st = document.createElement('style');
st.textContent = '#lbP{position:fixed;inset:0;background:#000b;z-index:27;display:none;align-items:center;justify-content:center}#lbB{background:#1d2330;color:#fff;border-radius:14px;padding:14px;width:min(94vw,430px);max-height:90vh;overflow:auto;box-sizing:border-box}.k2{display:flex;align-items:center;justify-content:flex-start;gap:6px;flex-wrap:wrap;margin:6px 0;padding:6px;background:#0004;border-radius:8px;font-size:13px}.k2>div{display:flex;flex-direction:column;align-items:flex-start}.k2>div>div{display:flex}.k2 img{width:26px;height:26px;image-rendering:pixelated;vertical-align:middle}.k2 small{width:100%;opacity:.7}';
document.head.appendChild(st);
const el = document.createElement('div');
el.id = 'lbP';
document.body.appendChild(el);

const ic = tok => (tok === 0 ? '<span style="display:inline-block;width:26px;height:26px"></span>' : iconHTML(tok === LOG ? N.ODUN : tok === WOOLANY ? N.YUN : tok));
const row = r => {
  const left = r.pat ? r.pat.map(x => '<div>' + x.map(ic).join('') + '</div>').join('') : '<div>' + r.shapeless.map(ic).join('') + '</div>';
  return '<div class="k2">' + left + '<span>→</span><span>' + (r.out[1] > 1 ? r.out[1] + '× ' : '') + iconHTML(r.out[0]) + ' ' + TYPES[r.out[0]].name +
    '</span><small>' + (r.pat ? 'Şekilli' : 'Şekilsiz (sıra önemsiz)') + '</small></div>';
};
const isFood = o => o === N.EKMEK || o === N.CIGKOFTE || o === N.HAMUR || o === N.KEK || (o >= N.SALATALIK_SALATASI && o <= N.PATATES_KIZARTMASI);
const isTool = o => (o >= 256 && o <= 275) || o === N.MAKAS;
const isArm = o => o >= 280 && o <= 295;
const list = f => RECIPES.filter(r => !ids.includes(r.out[0]) && f(r.out[0])).map(row).join('') || '<div class="k2">Tarif yok</div>';
const smelt = () => Object.keys(SMELT).map(i => '<div class="k2">' + iconHTML(+i) + ' ' + TYPES[i].name + ' → ' + iconHTML(SMELT[i]) + ' ' + TYPES[SMELT[i]].name + '</div>').join('') +
  '<div class="k2"><b>Yakıtlar</b><small>Kömür 8 eşya · odun, tahta 1,5 · çubuk 0,5. Eşya başına 3 sn. Ocak kapalıyken de çalışır.</small></div>';
const food = () => list(isFood) + '<div class="k2"><small>Doğrudan yenenler: Et +6 · Elma +4 · Havuç +4 · Patates +3 · Domates +3 · Biber +2 · Soğan +2 · Ekmek +5 · Çiğköfte +14</small></div>';
const guide = () => B.filter(b => b.id !== N.REHBER_KITABI).map(b => row({ shapeless: b.r, out: [b.id, 1] }).replace('<small>', '<small>' + b.d + ' · ')).join('') +
  row({ shapeless: [N.TOPRAK], out: [N.REHBER_KITABI, 1] }).replace('<small>', '<small>Bu kitap: 1 toprak yeter · ');

export function openBook(t) {
  const b = byId[t];
  const body = t === N.YEMEK_KITABI ? food() : t === N.CRAFT_KITABI ? list(o => !isFood(o) && !isTool(o) && !isArm(o)) :
    t === N.ALET_KITABI ? list(isTool) : t === N.ZIRH_KITABI ? list(isArm) : t === N.FIRIN_KITABI ? smelt() : guide();
  el.style.display = 'flex';
  el.innerHTML = '<div id="lbB"><h3 style="margin:0 0 6px">📖 ' + TYPES[b.id].name + '</h3>' + body +
    '<button style="width:100%;margin-top:8px;padding:11px;border:0;border-radius:8px;background:#b3261e;color:#fff;font-weight:700">Kapat</button></div>';
  el.querySelector('button').onclick = () => { el.style.display = 'none'; };
}
