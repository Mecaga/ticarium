import { getMine, removeMine } from './save.js';
import { KINDS } from './menu-worlds.js';

const $ = id => document.getElementById(id);
let wtoken = 0;

// ctx: { loadR, loadC, run, enter, err, pname, setUnsub }
export function makeLists(ctx) {
  const { loadR, loadC, run, enter, err, pname, setUnsub } = ctx;

  // Kurduğum odalar (bulutta). Eski cihaz listesi ilk seferde buluta taşınır.
  async function myRooms() {
    const c = await loadC(), r = await loadR();
    const local = getMine();
    if (local.length) {
      const res0 = await r.checkOwned(local);
      for (const m of res0) if (m.status === 'own') await c.addMyRoom(m.code, m.name);
      local.forEach(m => removeMine(m.code));
    }
    const list = await c.listMyRooms();
    const res = await r.checkOwned(list);
    const out = [];
    for (const m of res) {
      if (m.status === 'own') out.push(m);
      else if (m.status === 'gone' || m.status === 'other') c.removeMyRoom(m.code).catch(() => {});
    }
    return out;   // { code, name, public }
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
          const b = document.createElement('button');
          b.textContent = room.name;
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

  // Odalarım: sadece herkese açık olanlar (özel odalar Dünyalarım'da)
  async function startMine() {
    const box = $('mineList');
    box.innerHTML = '<p>Yükleniyor...</p>';
    let list;
    try { list = (await myRooms()).filter(m => m.public); }
    catch (e) { box.innerHTML = ''; return err(e.code || e.message); }
    box.innerHTML = '';
    if (!list.length) {
      box.innerHTML = '<p>Herkese açık odan yok. Oda kurarken "Herkese açık"ı işaretle. Özel odaların Dünyalarım\'da.</p>';
      return;
    }
    for (const m of list) {
      const b = document.createElement('button');
      b.textContent = '🌐 ' + m.name;
      const s = document.createElement('small');
      s.textContent = 'Kod: ' + m.code + ' · herkese açık, Açık Odalar\'da görünür';
      b.appendChild(s);
      b.onclick = () => run(b, async () => {
        const r = await loadR();
        enter(await r.joinRoom(m.code, pname()));
      });
      box.appendChild(b);
    }
  }

  // Oda kurarken dünya seçenekleri: türler, kayıtlı dünyalarım, kendi odalarım
  async function fillWorlds() {
    const sel = $('cWorld'), tk = ++wtoken;
    const add = (v, t) => {
      const o = document.createElement('option');
      o.value = v; o.textContent = t;
      sel.appendChild(o);
    };
    sel.innerHTML = '';
    for (const k in KINDS) add('kind:' + k, KINDS[k][0] + ' ' + KINDS[k][1]);
    try {
      const c = await loadC();
      const list = await c.listWorlds();
      if (tk !== wtoken) return;
      list.forEach(w => add('world:' + w.id, '💾 ' + w.name + ' (kayıtlı dünyam)'));
      const rooms = await myRooms();
      if (tk !== wtoken) return;
      rooms.forEach(m => add('room:' + m.code, '🏠 ' + m.name + ' (' + m.code + ')'));
    } catch (e) {}
  }

  function pickSource() {
    const v = $('cWorld').value;
    if (v.indexOf('world:') === 0) return { type: 'world', id: v.slice(6) };
    if (v.indexOf('room:') === 0) return { type: 'room', code: v.slice(5) };
    return { type: 'kind', kind: v.indexOf('kind:') === 0 ? v.slice(5) : 'normal' };
  }

  return { startList, startMine, fillWorlds, pickSource, myRooms };
}
