import { db, ref, get, update, remove } from '../core/firebase.js';
import { uid } from '../core/auth.js';
import { askChoice } from './dialog.js';

const ADMIN = '6hIIq6N8jZc4yK6ZBsscVzrjG4Z2';
const st = document.createElement('style');
st.textContent = '#adm{position:fixed;inset:0;background:#000d;z-index:80;display:none;align-items:center;justify-content:center}#admB{background:#1d2330;color:#fff;border-radius:14px;padding:14px;width:min(94vw,460px);max-height:90vh;overflow:auto;box-sizing:border-box;font-size:13px}#admB button{padding:8px 10px;border:0;border-radius:8px;background:#1565c0;color:#fff;font-weight:700;margin:2px}#admB .r{background:#0004;border-radius:8px;padding:6px;margin:5px 0}#admB .x{background:#b3261e}';
document.head.appendChild(st);
const el = document.createElement('div'); el.id = 'adm'; document.body.appendChild(el);
const btn = document.createElement('div');
btn.textContent = '🛡';
btn.style.cssText = 'position:fixed;right:8px;top:8px;width:38px;height:38px;border-radius:50%;background:#000a;color:#fff;font-size:20px;display:none;align-items:center;justify-content:center;z-index:70';
document.body.appendChild(btn);
setInterval(() => { btn.style.display = (uid === ADMIN && document.getElementById('menu').style.display !== 'none') ? 'flex' : 'none'; }, 800);

const close = () => { el.style.display = 'none'; };
async function users() {
  el.style.display = 'flex';
  el.innerHTML = '<div id="admB">Yükleniyor...</div>';
  let s;
  try { s = await get(ref(db, 'users')); } catch (e) { el.innerHTML = '<div id="admB">Okunamadı: ' + e.message + '<button class="x" id="ax">Kapat</button></div>'; el.querySelector('#ax').onclick = close; return; }
  let h = '<div id="admB"><h3 style="margin:0 0 6px">🛡 Kullanıcılar</h3>';
  s.forEach(u => {
    const v = u.val() || {}, w = v.worlds || {}, n = Object.keys(w).length;
    h += '<div class="r"><b>' + ((v.profile && v.profile.name) || '?') + '</b> <small>' + u.key.slice(0, 8) + ' · ' + n + ' dünya</small>';
    for (const id in w) {
      const x = w[id];
      h += '<div>🌍 ' + x.name + ' <small>' + (x.kind || '') + (x.room ? ' · oda ' + x.room : '') + '</small>' +
        '<button data-r="' + u.key + '|' + id + '">Adı</button><button class="x" data-d="' + u.key + '|' + id + '">Sil</button>' +
        (x.room ? '<button data-c="' + x.room + '">Odayı kapat</button>' : '') + '</div>';
    }
    h += '</div>';
  });
  h += '<button class="x" id="ax">Kapat</button></div>';
  el.innerHTML = h;
  el.querySelector('#ax').onclick = close;
}
el.addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.r) {
    const [u, w] = b.dataset.r.split('|'), n = prompt('Yeni ad');
    if (n) { await update(ref(db, 'users/' + u + '/worlds/' + w), { name: n.slice(0, 24) }); users(); }
  } else if (b.dataset.d) {
    const [u, w] = b.dataset.d.split('|');
    if (await askChoice('Silinsin mi?', 'Dünya kalıcı silinir.', [['Sil', 'y', 'danger'], ['İptal', 'n']]) === 'y') {
      await remove(ref(db, 'users/' + u + '/worlds/' + w)); await remove(ref(db, 'users/' + u + '/wdata/' + w)); users();
    }
  } else if (b.dataset.c) {
    await update(ref(db, 'rooms/' + b.dataset.c + '/meta'), { closed: true });
    await remove(ref(db, 'publicRooms/' + b.dataset.c)).catch(() => {});
    users();
  }
});
const open = e => { e.preventDefault(); e.stopPropagation(); users(); };
btn.addEventListener('touchstart', open, { passive: false });
btn.addEventListener('mousedown', open);
