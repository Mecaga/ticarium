const $ = id => document.getElementById(id);
let R = null, onEnter = null, unsub = null;
const loadR = async () => R || (R = await import('./rooms.js'));
const screens = ['sMain', 'sCreate', 'sList', 'sJoin'];

function show(id) {
  screens.forEach(s => $(s).style.display = s === id ? 'block' : 'none');
  $('mErr').textContent = '';
  if (id !== 'sList' && unsub) { unsub(); unsub = null; }
}
const err = m => $('mErr').textContent = m;
const pname = () => {
  const n = $('nameIn').value.trim() || 'Oyuncu' + Math.floor(Math.random() * 900 + 100);
  try { localStorage.setItem('tc_name', n); } catch (e) {}
  return n;
};

export const isMenuOpen = () => $('menu').style.display !== 'none';
export function showMenu() { $('menu').style.display = 'flex'; show('sMain'); }
export async function leaveToMenu() {
  try { if (R) await R.leaveRoom(); } catch (e) {}
  showMenu();
}

function enter(info) { $('menu').style.display = 'none'; onEnter(info); }
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
        s.textContent = `${room.ownerName || '?'} · Kod: ${room.code}`;
        b.appendChild(s);
        b.onclick = () => run(b, async () => enter(await r.joinRoom(room.code, pname())));
        box.appendChild(b);
      }
    });
  } catch (e) { box.innerHTML = ''; err(e.code || e.message); }
}

export function initMenu(cb) {
  onEnter = cb;
  try { $('nameIn').value = localStorage.getItem('tc_name') || ''; } catch (e) {}
  $('mCreate').onclick = () => show('sCreate');
  $('mList').onclick = () => { show('sList'); startList(); };
  $('mJoin').onclick = () => show('sJoin');
  $('mSolo').onclick = () => enter({ solo: true, seed: 1 });
  document.querySelectorAll('.back').forEach(b => b.onclick = () => show('sMain'));

  $('cDo').onclick = e => run(e.currentTarget, async () => {
    const r = await loadR();
    const pn = pname();
    enter(await r.createRoom({
      name: $('cName').value.trim() || pn + ' odası',
      isPublic: $('cPublic').checked,
      playerName: pn
    }));
  });
  $('jDo').onclick = e => run(e.currentTarget, async () => {
    const r = await loadR();
    enter(await r.joinRoom($('jCode').value, pname()));
  });
}
