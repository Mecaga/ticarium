import { hasSolo, loadSolo, clearLocal } from './save.js';

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
.mbox .wrow .wsm{width:46px;flex:none;background:#444;padding:0}
.mbox .wrow .wdel{background:#b3261e}
#wInfo{font-size:13px;opacity:.85;margin:2px 0 4px}
#worldList{max-height:48vh;overflow:auto;touch-action:pan-y}
#worldList p{opacity:.7;text-align:center}
#mAuth{font-size:12px;opacity:.75;margin-top:10px;text-align:center}
.mbox select#nwKind{width:100%;padding:10px;border-radius:8px;border:0;font-size:15px;margin-bottom:8px}
`;
document.head.appendChild(st);

const ago = ts => {
  if (!ts) return 'yeni';
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return 'az önce';
  if (m < 60) return m + ' dk önce';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' sa önce';
  return Math.floor(h / 24) + ' gün önce';
};

// ctx: { loadC, run, enter, err, pname, show }
export function makeWorlds(ctx) {
  const { loadC, run, enter, err, pname, show } = ctx;

  async function start() {
    const box = $('worldList');
    box.innerHTML = '<p>Yükleniyor...</p>';
    let list;
    try {
      const c = await loadC();
      c.setProfile(pname());
      list = await c.listWorlds();
    } catch (e) { box.innerHTML = ''; return err(e.code || e.message); }
    $('wInfo').textContent = 'Dünyalarım (' + list.length + '/6) · bulutta kayıtlı';
    $('wNew').disabled = list.length >= 6;
    box.innerHTML = '';
    if (!list.length) box.innerHTML = '<p>Henüz dünya yok. "Yeni Dünya" ile başla!</p>';
    for (const w of list) {
      const kd = KINDS[w.kind] || KINDS.normal;
      const row = document.createElement('div');
      row.className = 'wrow';

      const b = document.createElement('button');
      b.className = 'wmain';
      b.textContent = kd[0] + ' ' + w.name;
      const s = document.createElement('small');
      s.style.cssText = 'display:block;font-weight:400;opacity:.8';
      s.textContent = kd[1] + ' · ' + ago(w.updated);
      b.appendChild(s);
      b.onclick = () => run(b, async () => {
        const c = await loadC();
        const d = await c.loadWorld(w.id);
        enter({ solo: true, wid: w.id, name: w.name, seed: w.seed, kind: w.kind, cloud: c, data: d });
      });

      const ren = document.createElement('button');
      ren.className = 'wsm'; ren.textContent = '✏️';
      ren.onclick = () => run(ren, async () => {
        const n = prompt('Yeni isim:', w.name);
        if (!n || !n.trim()) return;
        const c = await loadC();
        await c.renameWorld(w.id, n.trim().slice(0, 24));
        await start();
      });

      const del = document.createElement('button');
      del.className = 'wsm wdel'; del.textContent = '🗑';
      del.onclick = () => run(del, async () => {
        if (!confirm('"' + w.name + '" kalıcı olarak silinecek. Emin misin?')) return;
        const c = await loadC();
        await c.deleteWorld(w.id);
        await start();
      });

      row.append(b, ren, del);
      box.appendChild(row);
    }
    if (hasSolo() && list.length < 6) {
      const imp = document.createElement('button');
      imp.textContent = '📥 Eski yerel dünyayı buluta aktar';
      imp.className = 'alt';
      imp.onclick = () => run(imp, async () => {
        const s = loadSolo();
        if (!s) return;
        const c = await loadC();
        const state = { ...s };
        delete state.changes; delete state.seed;
        await c.createWorld({ name: 'Eski dünyam', kind: 'normal', seed: s.seed, changes: s.changes || {}, state });
        clearLocal();
        await start();
      });
      box.appendChild(imp);
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
