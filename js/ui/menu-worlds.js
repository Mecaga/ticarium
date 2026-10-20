import { askDialog, askChoice } from './dialog.js';

const $ = id => document.getElementById(id);
export const KINDS = {
  normal: ['🌍', 'Rastgele dünya (Normal)'],
  flat: ['🟩', 'Düz arazi'],
  sky: ['☁️', 'Skyblock adası']
};

const st = document.createElement('style');
st.textContent = `
.wrow{display:flex;gap:6px;margin-top:8px}
.mbox .wrow button{margin:0 !important}
.mbox .wrow .wmain{flex:1;text-align:left;background:#1565c0}
.mbox .wrow .wsm{width:46px;flex:none;background:#444;padding:0;font-size:18px}
#wInfo{font-size:13px;opacity:.85;margin:2px 0 4px}
#worldList{max-height:48vh;overflow:auto;touch-action:pan-y}
#worldList p{opacity:.7;text-align:center}
#mAuth{font-size:12px;opacity:.75;margin-top:10px;text-align:center}
.mbox select#nwKind{width:100%;padding:10px;border-radius:8px;border:0;font-size:15px;margin-bottom:8px}
`;
document.head.appendChild(st);

const fmt = ts => ts
  ? new Date(ts).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : 'hiç girilmedi';

// ctx: { loadC, loadR, run, enter, err, pname, show, worldRooms }
export function makeWorlds(ctx) {
  const { loadC, loadR, run, enter, err, pname, show, worldRooms } = ctx;

  // Dünyanın açık odası varsa oda olarak, yoksa tek oyunculu açar
  async function playWorld(w, st) {
    const c = await loadC(), r = await loadR();
    if (st.exists) {
      enter(await r.hostWorld({ wid: w.id, name: st.name, isPublic: st.public, playerName: pname(), enter: true }));
      return;
    }
    const d = await c.loadWorld(w.id);
    enter({ solo: true, wid: w.id, name: w.name, seed: w.seed, kind: w.kind, cloud: c, data: d });
  }

  async function start() {
    const box = $('worldList');
    box.innerHTML = '<p>Yükleniyor...</p>';
    let items;
    try {
      const c = await loadC();
      c.setProfile(pname());
      items = await worldRooms();
    } catch (e) { box.innerHTML = ''; return err(e.code || e.message); }
    $('wInfo').textContent = 'Dünyalarım (' + items.length + '/6) · bulutta kayıtlı';
    $('wNew').disabled = items.length >= 6;
    box.innerHTML = '';
    if (!items.length) box.innerHTML = '<p>Henüz dünya yok. "Yeni Dünya" ile başla!</p>';

    for (const { w, st } of items) {
      const kd = KINDS[w.kind] || KINDS.normal;
      const row = document.createElement('div');
      row.className = 'wrow';

      const b = document.createElement('button');
      b.className = 'wmain';
      b.textContent = kd[0] + ' ' + w.name;
      const s = document.createElement('small');
      s.style.cssText = 'display:block;font-weight:400;opacity:.85';
      s.textContent = kd[1] + ' · son giriş: ' + fmt(w.lastIn);
      b.appendChild(s);
      b.onclick = () => run(b, () => playWorld(w, st));

      const ren = document.createElement('button');
      ren.className = 'wsm'; ren.textContent = '✏️';
      ren.onclick = () => run(ren, async () => {
        const res = await askDialog({
          title: 'Dünyayı düzenle',
          text: kd[1] + ' · son giriş: ' + fmt(w.lastIn),
          input: w.name,
          buttons: [['Kaydet', 'save', 'ok'], ['Dünyayı Sil', 'del', 'danger'], ['İptal', 'cancel']]
        });
        const c = await loadC(), r = await loadR();
        if (res.key === 'save') {
          const n = (res.value || '').trim().slice(0, 24);
          if (n) { await c.renameWorld(w.id, n); await start(); }
        } else if (res.key === 'del') {
          const k = await askChoice('Dünya silinsin mi?', '"' + w.name + '" kalıcı olarak silinir' + (st.exists ? ', açık oda da kapanır.' : '.'),
            [['Evet, sil', 'yes', 'danger'], ['İptal', 'no']]);
          if (k !== 'yes') return;
          if (st.exists) await r.closeRoom(w.room, w.id);
          await c.deleteWorld(w.id);
          await start();
        }
      });

      // 👁 herkese açık oda açık, 🔒 özel oda açık, ✖️ oda kapalı
      const vis = document.createElement('button');
      vis.className = 'wsm';
      vis.textContent = st.exists ? (st.public ? '👁' : '🔒') : '✖️';
      vis.onclick = () => run(vis, async () => {
        const r = await loadR();
        if (st.exists) {
          const k = await askChoice('Oda kapatılsın mı?', 'Odadaki herkes ana menüye atılır ve oda listeden kalkar.',
            [['Odayı Kapat', 'close', 'danger'], ['İptal', 'cancel']]);
          if (k !== 'close') return;
          await r.closeRoom(w.room, w.id);
        } else {
          await r.hostWorld({ wid: w.id, name: w.name, isPublic: true, playerName: pname(), enter: false });
        }
        await start();
      });

      row.append(b, ren, vis);
      box.appendChild(row);
    }
  }

  function openNew() {
    show('sNew');
    $('nwName').value = '';
    const sel = $('nwKind');
    sel.innerHTML = '';
    for (const k in KINDS) {
      const o = document.createElement('option');
      o.value = k; o.textContent = KINDS[k][0] + ' ' + KINDS[k][1];
      sel.appendChild(o);
    }
  }

  async function create() {
    const c = await loadC();
    const kind = $('nwKind').value in KINDS ? $('nwKind').value : 'normal';
    const name = $('nwName').value.trim().slice(0, 24) || (KINDS[kind][1].split(' (')[0] + ' dünyası');
    const seed = Math.floor(Math.random() * 1e9) + 1;
    err('Dünya hazırlanıyor...');
    const w = await c.createWorld({ name, kind, seed });
    enter({ solo: true, wid: w.id, name, seed, kind, cloud: c, data: { state: null, changes: {}, paints: {} } });
  }

  return { start, openNew, create };
}
