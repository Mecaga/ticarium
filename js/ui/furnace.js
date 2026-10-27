import { eco } from '../game/economy.js';
import { TYPES } from '../world/world.js';
import { drawHud, iconHTML, toast } from './ui.js';
import { canAdd, addItem } from '../game/inventory.js';
import { isCreative } from '../game/creative.js';
import { dropItems } from '../entities/items.js';
import { P } from '../entities/player.js';
import { sfx } from '../core/sound.js';
import { loadAt, saveAt, canStore } from '../game/store.js';

// Eritilenler: girdi → çıktı
export const SMELT = { 37: 83, 38: 84, 6: 9, 15: 86 };   // demir cevheri, altın cevheri, kum, et
// Yakıt: kaç eşya eritir
const FUEL = { 82: 8, 70: 1.5, 4: 1.5, 13: 1.5, 71: 0.5 };
const TIME = 3;   // eşya başına saniye

const st = document.createElement('style');
st.textContent = `
#furnP{position:fixed;inset:0;background:#000b;z-index:26;display:none;align-items:center;justify-content:center}
#furnBox{--cs3:clamp(44px,14vw,58px);background:#1d2330;color:#fff;border-radius:14px;padding:14px;width:min(94vw,430px);max-height:94vh;overflow:auto;touch-action:pan-y;box-sizing:border-box}
#furnBox h2{margin:0 0 6px;font-size:18px}
#furnBox h3{margin:12px 0 6px;font-size:14px}
#furnRow{display:flex;align-items:center;justify-content:center;gap:14px;margin:10px 0}
.fcol{display:flex;flex-direction:column;align-items:center;gap:6px}
.fc,.fi{width:var(--cs3);height:var(--cs3);min-width:var(--cs3);flex:0 0 auto;aspect-ratio:1/1;box-sizing:border-box;background:#0006;border:2px solid #fff3;border-radius:6px;position:relative;display:flex;align-items:center;justify-content:center}
.fc.out{border-color:#ffd84a;background:#ffd84a22}
.fi.on{border-color:#ffd84a;background:#ffd84a22}
.fc img,.fi img{width:78%;height:78%;image-rendering:pixelated;pointer-events:none;display:block}
.fc i,.fi i{width:60%;height:60%;border-radius:4px;display:block;pointer-events:none}
.fc b,.fi b{position:absolute;right:2px;bottom:0;font-size:11px;font-weight:700;color:#fff;text-shadow:0 0 3px #000,0 0 3px #000;pointer-events:none}
.fc small{position:absolute;left:2px;top:0;font-size:10px;opacity:.7}
.farr{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:24px}
.pbar{width:50px;height:6px;background:#000;border-radius:3px;overflow:hidden}
.pbar em{display:block;height:100%;width:0;background:#ff9a2e}
#furnInv{display:grid;grid-template-columns:repeat(auto-fill,var(--cs3));gap:4px;justify-content:center;max-height:28vh;overflow-y:auto;touch-action:pan-y}
.qrow{display:flex;gap:6px;align-items:center;margin-top:10px;font-size:13px}
.qrow button{flex:1;padding:8px;border:0;border-radius:8px;background:#444;color:#fff;font-weight:700}
.qrow button.on{background:#1565c0}
.fbtn{width:100%;margin-top:12px;padding:11px;border:0;border-radius:8px;background:#b3261e;color:#fff;font-weight:700;font-size:15px}
`;
document.head.appendChild(st);

const el = document.createElement('div');
el.id = 'furnP';
document.body.appendChild(el);

let open = false, F = null, sel = 0, qty = 1, fpos = null;
export const isFurnaceOpen = () => open;
const fresh = () => ({ inp: null, fuel: null, out: null, burn: 0, prog: 0 });

function giveBack(t, n) {
  const a = addItem(t, n);
  if (a < n) {
    dropItems([{ t, c: n - a, x: P.x, y: P.y + 1.3, z: P.z, vx: (Math.random() - 0.5) * 2, vy: 2, vz: (Math.random() - 0.5) * 2 }]);
    toast('🎒 Çanta dolu, fazlası yere düştü');
  }
}

function cell(c, id, label) {
  return '<div class="fc' + (id === 'out' ? ' out' : '') + '" data-c="' + id + '"><small>' + label + '</small>' +
    (c ? iconHTML(c.t) + '<b>' + c.n + '</b>' : '') + '</div>';
}

function draw() {
  const ids = Object.keys(TYPES).map(Number).filter(t => (eco.inv[t] || 0) > 0 && (SMELT[t] || FUEL[t]));
  let h = '<div id="furnBox"><h2>🔥 Ocak</h2>';
  h += '<small style="opacity:.75;display:block">Aşağıdan eşya seç, sonra üstteki hücreye dokun. Cevher, kum ve et erir. Yakıt: kömür, odun, tahta, çubuk. <b>Ocak arka planda da çalışır</b>, kapatsan bile erimeye devam eder.</small>';
  h += '<div id="furnRow"><div class="fcol">' + cell(F.inp, 'inp', 'eritilecek') + '<div style="font-size:20px">🔥</div>' + cell(F.fuel, 'fuel', 'yakıt') + '</div>';
  h += '<div class="farr">➡️<div class="pbar"><em id="fbar"></em></div></div>' + cell(F.out, 'out', 'sonuç') + '</div>';
  h += '<h3>Çantan</h3><div id="furnInv">' + (ids.length
    ? ids.map(t => '<div class="fi' + (t === sel ? ' on' : '') + '" data-t="' + t + '">' + iconHTML(t) + '<b>' + eco.inv[t] + '</b></div>').join('')
    : '<p style="opacity:.7;grid-column:1/-1">Eritilecek ya da yakılacak eşyan yok. Cevher, kum, et ve kömür topla!</p>') + '</div>';
  h += '<div class="qrow">Her dokunuşta: ' + [1, 8, 64].map(q => '<button data-q="' + q + '" class="' + (q === qty ? 'on' : '') + '">' + q + '</button>').join('') + '</div>';
  h += '<button class="fbtn" data-close="1">Kapat</button></div>';
  el.innerHTML = h;
}

function put(slot) {
  if (!sel) {
    const c = F[slot];
    if (!c) return;
    giveBack(c.t, c.n);
    F[slot] = null;
    drawHud();
    return draw();
  }
  const ok = slot === 'inp' ? !!SMELT[sel] : !!FUEL[sel];
  if (!ok) return toast(slot === 'inp' ? 'Bu eşya eritilemez' : 'Bu eşya yakıt değil');
  const c = F[slot];
  if (c && c.t !== sel) return toast('Önce hücreyi boşalt');
  const n = Math.min(qty, eco.inv[sel] || 0, 64 - (c ? c.n : 0));
  if (n < 1) return;
  eco.inv[sel] -= n;
  F[slot] = { t: sel, n: (c ? c.n : 0) + n };
  if ((eco.inv[sel] || 0) < 1) sel = 0;
  drawHud();
  draw();
}

function takeOut() {
  const o = F.out;
  if (!o) return;
  if (!canAdd(o.t, o.n)) return toast('🎒 Çanta dolu');
  addItem(o.t, o.n);
  F.out = null;
  drawHud();
  draw();
}

el.addEventListener('click', e => {
  const t = e.target;
  if (t.closest('[data-close]')) return closeFurnace();
  const q = t.closest('[data-q]');
  if (q) { qty = +q.dataset.q; return draw(); }
  const fi = t.closest('.fi');
  if (fi) { sel = sel === +fi.dataset.t ? 0 : +fi.dataset.t; return draw(); }
  const fc = t.closest('.fc');
  if (fc) { const id = fc.dataset.c; if (id === 'out') takeOut(); else put(id); }
});

const dat = f => ({ inp: f.inp || null, fuel: f.fuel || null, out: f.out || null, burn: f.burn || 0, prog: f.prog || 0, ts: Date.now() });

export async function openFurnace(p) {
  if (isCreative()) return toast('Yaratıcı modda ocak gerekmez');
  if (!canStore()) return toast('Ocak sadece kayıtlı dünyada çalışır');
  fpos = p.slice(0, 3);
  const d = await loadAt('f', fpos);
  F = fresh(); sel = 0;
  if (d) {
    F.inp = d.inp || null; F.fuel = d.fuel || null; F.out = d.out || null; F.burn = d.burn || 0; F.prog = d.prog || 0;
    const el2 = Math.min(7200, (Date.now() - (d.ts || Date.now())) / 1000);   // kapalıyken geçen süre kadar çalışmış sayılır
    for (let s = 0; s < el2; s += 0.5) advance(0.5);
  }
  open = true;
  el.style.display = 'flex';
  draw();
}

export function closeFurnace() {
  if (!open) return;
  const f = F;
  open = false; F = null;
  el.style.display = 'none';
  saveAt('f', fpos, (f.inp || f.fuel || f.out) ? dat(f) : null);
  drawHud();
}

export function returnFurnace() { if (open) closeFurnace(); }

// Ocak kırılınca içindekiler düşer
export async function furnaceBroken(x, y, z) {
  const p = [x, y, z], d = await loadAt('f', p);
  if (!d) return;
  await saveAt('f', p, null);
  const arr = [];
  for (const s of ['inp', 'fuel', 'out']) if (d[s]) arr.push({ t: d[s].t, c: d[s].n, x: x + 0.5, y: y + 0.5, z: z + 0.5, vx: 0, vy: 2.5, vz: 0 });
  if (arr.length) dropItems(arr);
}

function advance(dt) {
  const rec = F.inp ? SMELT[F.inp.t] : 0;
  const room = rec && (!F.out || (F.out.t === rec && F.out.n < 64));
  let changed = false;
  if (room) {
    if (F.burn <= 0 && F.fuel) {
      F.burn = FUEL[F.fuel.t]; F.fuel.n--;
      if (F.fuel.n <= 0) F.fuel = null;
      changed = true;
    }
    if (F.burn > 0) {
      F.prog += dt;
      if (F.prog >= TIME) {
        F.prog = 0; F.burn -= 1;
        F.inp.n--;
        if (F.inp.n <= 0) F.inp = null;
        F.out = F.out ? { t: F.out.t, n: F.out.n + 1 } : { t: rec, n: 1 };
        changed = true;
      }
    } else F.prog = 0;
  } else F.prog = 0;
  return changed;
}

export function updateFurnace(dt) {
  if (!open) return;
  if (advance(dt)) draw();
  else { const b = el.querySelector('#fbar'); if (b) b.style.width = Math.round(F.prog / TIME * 100) + '%'; }
}
