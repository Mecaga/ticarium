import { db, ref, update, onValue } from '../core/firebase.js';
import { uid, } from '../core/auth.js';
import { G } from '../core/state.js';
import { setCreative, isCreative } from './creative.js';
import { clearModes } from './modes.js';
import { toast } from '../ui/ui.js';
import { askChoice } from '../ui/dialog.js';

const btn = document.createElement('div');
btn.textContent = '🛡';
btn.style.cssText = 'position:fixed;left:8px;top:96px;width:38px;height:38px;border-radius:50%;background:#000a;color:#fff;font-size:20px;display:none;align-items:center;justify-content:center;z-index:12';
document.body.appendChild(btn);

let panel = null, unsub = null, key = '', players = {};
const mkPanel = () => {
  panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;inset:0;background:#000b;z-index:40;display:none;align-items:center;justify-content:center';
  document.body.appendChild(panel);
};
function draw() {
  let h = '<div style="background:#1d2330;color:#fff;border-radius:14px;padding:14px;width:min(90vw,360px)"><h3 style="margin:0 0 8px">🛡 Oyuncular</h3>';
  let n = 0;
  for (const id in players) {
    if (id === uid) continue;
    n++;
    const p = players[id];
    h += '<div style="display:flex;align-items:center;gap:8px;margin:6px 0"><span style="flex:1">' + (p.name || '?') + (p.gm ? ' 🎨' : '') +
      '</span><button data-id="' + id + '" style="padding:8px 12px;border:0;border-radius:8px;background:#1565c0;color:#fff;font-weight:700">🛡 ' + (p.gm ? 'GM0 yap' : 'GM1 yap') + '</button></div>';
  }
  if (!n) h += '<small>Odada başka oyuncu yok.</small>';
  h += '<button data-x="1" style="width:100%;margin-top:8px;padding:10px;border:0;border-radius:8px;background:#b3261e;color:#fff;font-weight:700">Kapat</button></div>';
  panel.innerHTML = h;
}
const open = e => { e.preventDefault(); e.stopPropagation(); if (!panel) mkPanel(); draw(); panel.style.display = 'flex'; };
btn.addEventListener('touchstart', open, { passive: false });
btn.addEventListener('mousedown', open);
document.addEventListener('click', async e => {
  if (!panel || !panel.contains(e.target)) return;
  if (e.target.closest('[data-x]')) { panel.style.display = 'none'; return; }
  const b = e.target.closest('[data-id]');
  if (!b) return;
  const id = b.dataset.id, p = players[id], to = p.gm ? 0 : 1;
  const k = await askChoice(to ? 'GM1 verilsin mi?' : 'GM0\'a döndürülsün mü?', (p.name || '?') + (to ? ' yaratıcı moda geçer.' : ' normal moda döner.'), [['Onayla', 'y', 'ok'], ['İptal', 'n']]);
  if (k === 'y') update(ref(db, 'rooms/' + G.room.code + '/players/' + id), { gm: to }).catch(() => {});
});

setInterval(() => {
  const r = G.room;
  const owner = !!(r && !r.solo && r.code && r.isOwner);
  btn.style.display = owner ? 'flex' : 'none';
  if (!r || r.solo || !r.code) { if (unsub) { unsub(); unsub = null; key = ''; } return; }
  if (key === r.code) return;
  key = r.code;
  unsub = onValue(ref(db, 'rooms/' + r.code + '/players'), s => {
    players = s.val() || {};
    const me = players[uid];
    if (me && typeof me.gm === 'number' && !r.isOwner) {   // sahibin verdiği mod bu cihazda uygulanır
      const want = me.gm === 1;
      if (want !== isCreative()) { clearModes(); setCreative(want); toast(want ? '🎨 Oda sahibi sana GM1 verdi' : '⚔️ GM0\'a döndün'); }
    }
    if (panel && panel.style.display === 'flex') draw();
  });
}, 1500);
