import { TYPES, CATS } from '../world/world.js';
import { FACE_TILES, tileOf, addFlat } from '../world/textures.js';
import { eco } from './economy.js';
import { RECIPES, LOG, WOOLANY } from './recipes.js';
import { iconHTML } from '../ui/ui.js';
import { SMELT } from '../ui/furnace.js';

const B = [
  { id: 177, n: 'Yemek kitabı', r: [LOG, LOG, WOOLANY], d: 'Yemek tarifleri' },
  { id: 178, n: 'Craft kitabı', r: [70, 70, WOOLANY], d: 'Eşya ve blok tarifleri (yemek, alet, zırh, boya/yün hariç)' },
  { id: 183, n: 'Alet kitabı', r: [70, 70, 71], d: 'Kazma, balta, kürek, çapa, kılıç, makas' },
  { id: 184, n: 'Zırh kitabı', r: [70, 70, 83], d: 'Bütün zırh tarifleri' },
  { id: 179, n: 'Fırın kitabı', r: [LOG, LOG, 82], d: 'Fırında eriyenler ve yakıtlar' },
  { id: 999, n: 'Renk ve Boya Kitabı', r: [110, 111, 112], d: 'Bütün boyalar ve renkli yün craft tarifleri' },
  { id: 185, n: 'Rehber kitabı', r: [2], d: 'Bütün kitapların tarifi ve içeriği' }
];
B.forEach((b, i) => {
  TYPES[b.id] = { name: b.n, color: 0x7846a0, base: 40 };
  const t = tileOf('book' + i);
  FACE_TILES[b.id] = [t, t, t];
  eco.inv[b.id] = 0; eco.raw[b.id] = 40; eco.trend[b.id] = 0;
  CATS[4][1].push(b.id);
  addFlat(b.id);
  RECIPES.push({ out: [b.id, 1], shapeless: b.r });
});
const ids = B.map(b => b.id);
const byId = Object.fromEntries(B.map(b => [b.id, b]));
export const isBook = t => !!byId[t];

const st = document.createElement('style');
st.textContent = '#lbP{position:fixed;inset:0;background:#000b;z-index:27;display:none;align-items:center;justify-content:center}#lbB{background:#1d2330;color:#fff;border-radius:14px;padding:14px;width:min(94vw,430px);max-height:90vh;overflow:auto;box-sizing:border-box}.k2{display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin:6px 0;padding:6px;background:#0004;border-radius:8px;font-size:13px}.k2 img{width:26px;height:26px;image-rendering:pixelated;vertical-align:middle}.k2 small{width:100%;opacity:.7}';
document.head.appendChild(st);
const el = document.createElement('div');
el.id = 'lbP';
document.body.appendChild(el);

const ic = tok => (tok === 0 ? '<span style="display:inline-block;width:26px"></span>' : iconHTML(tok === LOG ? 4 : tok === WOOLANY ? 16 : tok));
const row = r => {
  const left = r.pat ? r.pat.map(x => '<div style="display:flex;gap:2px">' + x.map(ic).join('') + '</div>').join('') : '<div>' + r.shapeless.map(ic).join('') + '</div>';
  const itemName = TYPES[r.out[0]] ? TYPES[r.out[0]].name : 'Eşya #' + r.out[0];
  return '<div class="k2"><div style="display:flex;flex-direction:column;gap:2px">' + left + '</div> → ' + (r.out[1] > 1 ? r.out[1] + '× ' : '') + iconHTML(r.out[0]) + ' ' + itemName +
    '<small>' + (r.pat ? 'Şekilli (Matris)' : 'Şekilsiz (sıra önemsiz)') + '</small></div>';
};
const inR = (o, a, b) => o >= a && o <= b;
const isTool = o => inR(o, 50, 69) || o === 89 || o === 105;
const isArm = o => inR(o, 91, 98);

// Kitapların çıkış ID'lerini kesinlikle yemek olarak kabul etmiyoruz ve süzüyoruz
const isFood = o => {
  if (ids.includes(o)) return false; 
  if (o === 75 || o === 155) return true;
  if (inR(o, 191, 201)) return true;
  return false;
};

// Boyalar ve renkli yünler (kitaplar hariç)
const isColorOrWool = o => {
  if (ids.includes(o)) return false;
  return inR(o, 110, 117) || inR(o, 120, 127);
};

// Listeleme yapılırken kitaplar (ids) ASLA araya giremez
function list(f) { 
  return RECIPES.filter(r => !ids.includes(r.out[0]) && f(r.out[0])).map(row).join('') || '<div class="k2">Tarif yok</div>'; 
}

function smelt() {
  return Object.keys(SMELT).map(i => '<div class="k2">' + iconHTML(+i) + ' ' + TYPES[i].name + ' → ' + iconHTML(SMELT[i]) + ' ' + TYPES[SMELT[i]].name + '</div>').join('') +
    '<div class="k2"><b>Yakıtlar</b><small>Kömür 8 eşya · odun, tahta 1,5 · çubuk 0,5. Eşya başına 3 sn. Ocak kapalıyken de çalışır.</small></div>';
}

function food() {
  return list(isFood) +
    '<div class="k2"><b>Doğrudan yenenler</b><small>Et +6 · Elma +4 · Havuç +4 · Patates +3 · Domates +3 · Biber +2 · Soğan +2 · Ekmek +5 · Çiğköfte +14</small></div>';
}

function colorBook() {
  return list(isColorOrWool) + 
    '<div class="k2"><b>Bilgi</b><small>Boyalar çiçeklerden elde edilir; yünler boyalarla renklendirilir.</small></div>';
}

function guide() {
  return B.filter(b => b.id !== 185).map(b => row({ shapeless: b.r, out: [b.id, 1] }).replace('<small>', '<small>' + b.d + ' · ')).join('') +
    row({ shapeless: [2], out: [185, 1] }).replace('<small>', '<small>Bu kitap: 1 toprak yeter · ');
}

export function openBook(t) {
  const b = byId[t];
  const body = t === 177 ? food() : t === 178 ? list(o => !isFood(o) && !isTool(o) && !isArm(o) && !isColorOrWool(o)) : t === 183 ? list(isTool) : t === 184 ? list(isArm) : t === 179 ? smelt() : t === 999 ? colorBook() : guide();
  el.style.display = 'flex';
  el.innerHTML = '<div id="lbB"><h3 style="margin:0 0 6px">📖 ' + b.n + '</h3>' + body +
    '<button style="width:100%;margin-top:8px;padding:11px;border:0;border-radius:8px;background:#b3261e;color:#fff;font-weight:700">Kapat</button></div>';
  el.querySelector('button').onclick = () => { el.style.display = 'none'; };
}
CATS.forEach(c => { c[1] = [...new Set(c[1])]; });
