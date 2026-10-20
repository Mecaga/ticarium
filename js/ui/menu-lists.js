import { KINDS } from './menu-worlds.js';

const $ = id => document.getElementById(id);

// ctx: { loadR, loadC, run, enter, err, pname, setUnsub }
export function makeLists(ctx) {
  const { loadR, loadC, run, enter, err, pname, setUnsub } = ctx;
  let wmap = {}, nameDirty = false;

  // Dünyalarım + her dünyanın açık oda durumu
  async function worldRooms() {
    const c = await loadC(), r = await loadR();
    const list = await c.listWorlds();
    return Promise.all(list.map(async w => {
      let st = { exists: false };
      if (w.room) {
        try { st = await r.roomState(w.room); } catch (e) {}
        if (!st.exists || st.closed) {
          st = { exists: false };
          c.setWorldRoom(w.id, null).catch(() => {});
          w.room = null;
        }
      }
      return { w, st };
    }));
  }

  async function startList() {
    const box = $('roomList');
    box.innerHTML = '<p>Yükleniyor...</p>';
    try {
      const r = await loadR();
      const un = await r.watchPublicRooms((list, e) => {
        if (e) { box.innerHTML = ''; return err(e.code || e.message); }
        box.innerHTML = '';
        if (!list.length) { box.innerHTML = '<p>Açık oda yok. Bir tane kur!</p>'; return; }
        for (const room of list) {
          const kd = KINDS[room.kind] || KINDS.normal;
          const b = document.createElement('button');
          b.textContent = kd[0] + ' ' + room.name;
          const s = document.createElement('small');
          s.textContent = `${room.ownerName || '?'} · Kod: ${room.code} · 👥 ${room.count || 0}/${room.max || 8}`;
          b.appendChild(s);
          b.onclick = () => run(b, async () => enter(await r.joinRoom(room.code, pname())));
          box.appendChild(b);
        }
      });
      setUnsub(un);
    } catch (e) { box.innerHTML = ''; err(e.code || e.message); }
  }

  // Odalarım: dünyalarımdan açık ve herkese açık olanlar
  async function startMine() {
    const box = $('mineList');
    box.innerHTML = '<p>Yükleniyor...</p>';
    let items;
    try { items = (await worldRooms()).filter(x => x.st.exists && x.st.public); }
    catch (e) { box.innerHTML = ''; return err(e.code || e.message); }
    box.innerHTML = '';
    if (!items.length) {
      box.innerHTML = '<p>Herkese açık odan yok. Dünyalarım\'da ✖️ düğmesine basarak dünyanı herkese açık yapabilirsin.</p>';
      return;
    }
    for (const { w, st } of items) {
      const kd = KINDS[w.kind] || KINDS.normal;
      const b = document.createElement('button');
      b.textContent = '👁 ' + st.name;
      const s = document.createElement('small');
      s.textContent = 'Kod: ' + w.room + ' · 👥 ' + (st.count || 0) + ' · ' + kd[1];
      b.appendChild(s);
      b.onclick = () => run(b, async () => {
        const r = await loadR();
        enter(await r.hostWorld({ wid: w.id, name: st.name, isPublic: true, playerName: pname(), enter: true }));
      });
      box.appendChild(b);
    }
  }

  // Oda Kur: sadece kayıtlı dünyalar. Oda adı dünya adıdır.
  async function fillWorlds() {
    const sel = $('cWorld');
    sel.innerHTML = '';
    const add = (v, t) => {
      const o = document.createElement('option');
      o.value = v; o.textContent = t;
      sel.appendChild(o);
    };
    wmap = {}; nameDirty = false;
    try {
      const c = await loadC();
      const list = await c.listWorlds();
      list.forEach(w => { wmap[w.id] = w; add(w.id, (KINDS[w.kind] || KINDS.normal)[0] + ' ' + w.name); });
      if (!list.length) add('', 'Önce Dünyalarım\'dan dünya kur');
      syncName();
    } catch (e) { err(e.code || e.message); }
  }

  function syncName() {
    const w = wmap[$('cWorld').value];
    $('cName').value = w ? w.name : '';
  }

  function initCreate() {
    $('cWorld').onchange = () => { nameDirty = false; syncName(); };
    $('cName').oninput = () => { nameDirty = true; };
  }

  return { startList, startMine, fillWorlds, initCreate, worldRooms };
}
