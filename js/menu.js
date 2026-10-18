import { hasSolo, loadSolo, getMine, addMine, removeMine } from './save.js';

const $ = id => document.getElementById(id);
let R = null, onEnter = null, unsub = null, wtoken = 0;
const loadR = async () => R || (R = await import('./rooms.js'));
const screens = ['sMain', 'sCreate', 'sList', 'sJoin', 'sMine'];

function show(id) {
  screens.forEach(s => { const el = $(s); if (el) el.style.display = s === id ? 'block' : 'none'; });
  $('mErr').textContent = '';
  if (id !== 'sList' && unsub) { unsub(); unsub = null; }
}
const err = m => { $('mErr').textContent = m; };
const pname = () => {
  const n = $('nameIn').value.trim() || 'Oyuncu' + Math.floor(Math.random() * 900 + 100);
  try { localStorage.setItem('tc_name', n); } catch (e) {}
  return n;
};

export const isMenuOpen = () => $('menu').style.display !== 'none';
export function showMenu() {
  $('menu').style.display = 'flex';
  $('mSoloCont').style.display = hasSolo() ? 'block' : 'none';
  show('sMain');
}
export async function leaveToMenu() {
  try { if (R) await R.leaveRoom(); } catch (e) {}
  showMenu();
}

function enter(info) {
  // Sadece kendi kurduğun odalar "Odalarım"a kaydolur
  if (!info.solo && info.isOwner) addMine(info.code, info.name);
  $('menu').style.display = 'none';
  onEnter(info);
}
async function run(btn, fn) {
  btn.disabled = true;
  try { await fn(); } catch (e) { err(e.code || e.message || String(e)); }
  btn.disabled = false;
}

async function startList() {
  const box = $('roomList');
  box.innerHTML = '<p>Yükleniyor...</p>';
  try {
    const r = await loadR();
    unsub = await r.watchPublicRooms((list, e) => {
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

export function initMenu(cb) {
  onEnter = cb;
  try { $('nameIn').value = localStorage.getItem('tc_name') || ''; } catch (e) {}

  $('mCreate').onclick = () => { show('sCreate'); fillWorlds(); };
  $('mList').onclick = () => { show('sList'); startList(); };
  $('mJoin').onclick = () => show('sJoin');
  $('mMine').onclick = () => { show('sMine'); startMine(); };
  $('mSolo').onclick = () => {
    if (hasSolo() && !confirm('Kayıtlı tek oyunculu dünyan silinecek. Yeni dünya açılsın mı?')) return;
    enter({ solo: true, seed: Math.floor(Math.random() * 1e9) + 1, resume: false });
  };
  $('mSoloCont').onclick = () => {
    const s = loadSolo();
    if (s) enter({ solo: true, seed: s.seed, resume: true });
  };
  document.querySelectorAll('.back').forEach(b => { b.onclick = () => show('sMain'); });

  $('cDo').onclick = e => run(e.currentTarget, async () => {
    const r = await loadR();
    const pn = pname();
    err('Oda hazırlanıyor...');
    enter(await r.createRoom({
      name: $('cName').value.trim() || pn + ' odası',
      isPublic: $('cPublic').checked,
      pvp: $('cPvp').checked,
      keep: $('cKeep').checked,
      maxPlayers: +$('cMax').value,
      playerName: pn,
      source: pickSource()
    }));
  });
  $('jDo').onclick = e => run(e.currentTarget, async () => {
    const r = await loadR();
    enter(await r.joinRoom($('jCode').value, pname()));
  });
}
