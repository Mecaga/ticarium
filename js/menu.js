import { hasSolo, loadSolo, getMine, addMine, removeMine } from './save.js';

const $ = id => document.getElementById(id);
let R = null, onEnter = null, unsub = null;
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
  if (!info.solo) addMine(info.code, info.name);
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

function startMine() {
  const box = $('mineList');
  box.innerHTML = '';
  const list = getMine();
  if (!list.length) {
    box.innerHTML = '<p>Kayıtlı oda yok. Kurduğun ya da girdiğin odalar burada görünür.</p>';
    return;
  }
  for (const m of list) {
    const b = document.createElement('button');
    b.textContent = m.name;
    const s = document.createElement('small');
    s.textContent = 'Kod: ' + m.code;
    b.appendChild(s);
    b.onclick = () => run(b, async () => {
      const r = await loadR();
      try {
        enter(await r.joinRoom(m.code, pname()));
      } catch (e) {
        if (/bulunamad/.test(e.message || '')) { removeMine(m.code); startMine(); }
        throw e;
      }
    });
    box.appendChild(b);
  }
}

export function initMenu(cb) {
  onEnter = cb;
  try { $('nameIn').value = localStorage.getItem('tc_name') || ''; } catch (e) {}

  $('mCreate').onclick = () => show('sCreate');
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
    enter(await r.createRoom({
      name: $('cName').value.trim() || pn + ' odası',
      isPublic: $('cPublic').checked,
      pvp: $('cPvp').checked,
      keep: $('cKeep').checked,
      maxPlayers: +$('cMax').value,
      playerName: pn
    }));
  });
  $('jDo').onclick = e => run(e.currentTarget, async () => {
    const r = await loadR();
    enter(await r.joinRoom($('jCode').value, pname()));
  });
}
