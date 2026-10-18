import { loadSolo, getMine, removeMine } from './save.js';

const $ = id => document.getElementById(id);
let wtoken = 0;

// ctx: { loadR, run, enter, err, pname, setUnsub }
export function makeLists(ctx) {
  const { loadR, run, enter, err, pname, setUnsub } = ctx;

  async function startList() {
    const box = $('roomList');
    box.innerHTML = '<p>Yükleniyor...</p>';
    try {
      const r = await loadR();
      const un = await r.watchPublicRooms((list, e) => {
        if (e) { box.innerHTML = ''; return err(e.message); }
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

  async function startMine() {
    const box = $('mineList');
    box.innerHTML = '<p>Yükleniyor...</p>';
    const local = getMine();
    if (!local.length) {
      box.innerHTML = '<p>Kayıtlı oda yok. Kurduğun odalar burada görünür.</p>';
      return;
    }
    let res;
    try {
      const r = await loadR();
      res = await r.checkOwned(local);
    } catch (e) { box.innerHTML = ''; return err(e.code || e.message); }
    box.innerHTML = '';
    let n = 0;
    for (const m of res) {
      if (m.status === 'other' || m.status === 'gone') { removeMine(m.code); continue; }
      n++;
      const b = document.createElement('button');
      b.textContent = m.name;
      const s = document.createElement('small');
      s.textContent = 'Kod: ' + m.code;
      b.appendChild(s);
      b.onclick = () => run(b, async () => {
        const r = await loadR();
        enter(await r.joinRoom(m.code, pname()));
      });
      box.appendChild(b);
    }
    if (!n) box.innerHTML = '<p>Kayıtlı oda yok. Kurduğun odalar burada görünür.</p>';
  }

  // Oda kurarken dünya seçenekleri: rastgele, tek oyunculu kayıt, kendi odaların
  async function fillWorlds() {
    const sel = $('cWorld'), tk = ++wtoken;
    const add = (v, t) => {
      const o = document.createElement('option');
      o.value = v; o.textContent = t;
      sel.appendChild(o);
    };
    sel.innerHTML = '';
    add('random', '🎲 Rastgele yeni dünya');
    if (loadSolo()) add('solo', '💾 Tek oyunculu dünyam');
    try {
      const r = await loadR();
      const res = await r.checkOwned(getMine());
      if (tk !== wtoken) return;
      for (const m of res) {
        if (m.status === 'own') add('room:' + m.code, '🏠 ' + m.name + ' (' + m.code + ')');
        else if (m.status !== 'err') removeMine(m.code);
      }
    } catch (e) {}
  }

  function pickSource() {
    const v = $('cWorld').value;
    if (v === 'solo') {
      const s = loadSolo();
      if (s) return { type: 'solo', seed: s.seed, changes: s.changes || {} };
    }
    if (v.indexOf('room:') === 0) return { type: 'room', code: v.slice(5) };
    return { type: 'random' };
  }

  return { startList, startMine, fillWorlds, pickSource };
      }
