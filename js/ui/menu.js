import { makeLists } from './menu-lists.js';
import { makeWorlds } from './menu-worlds.js';

const $ = id => document.getElementById(id);
let R = null, C = null, onEnter = null, unsub = null, lists = null, worlds = null;
const loadR = async () => R || (R = await import('../net/rooms.js'));
const loadC = async () => C || (C = await import('../net/cloud.js'));
const screens = ['sMain', 'sCreate', 'sList', 'sJoin', 'sMine', 'sWorlds', 'sNew'];

const nice = m => /permission_denied|permission denied/i.test(m)
  ? 'Firebase kuralları izin vermiyor. Realtime Database → Rules → yeni kuralları yapıştır → Publish'
  : m;
const err = m => { $('mErr').textContent = nice(String(m || '')); };

function show(id) {
  screens.forEach(s => { const el = $(s); if (el) el.style.display = s === id ? 'block' : 'none'; });
  $('mErr').textContent = '';
  if (id !== 'sList' && unsub) { unsub(); unsub = null; }
}

const pname = () => {
  const n = $('nameIn').value.trim() || 'Oyuncu' + Math.floor(Math.random() * 900 + 100);
  try { localStorage.setItem('tc_name', n); } catch (e) {}
  return n;
};

export const isMenuOpen = () => $('menu').style.display !== 'none';

async function diag() {
  const el = $('mAuth');
  el.textContent = '☁️ Bağlanıyor...';
  try {
    const c = await loadC();
    el.textContent = await c.diag();
  } catch (e) { el.textContent = '❌ ' + (e.code || e.message || e); }
}

export function showMenu() {
  $('menu').style.display = 'flex';
  show('sMain');
  diag();
}

export async function leaveToMenu() {
  try { if (R) await R.leaveRoom(); } catch (e) {}
  showMenu();
}

function enter(info) {
  // Kurduğun oda buluttaki "kurduğum odalar" listesine yazılır
  if (!info.solo && info.isOwner) loadC().then(c => c.addMyRoom(info.code, info.name)).catch(() => {});
  $('menu').style.display = 'none';
  onEnter(info);
}

async function run(btn, fn) {
  btn.disabled = true;
  try { await fn(); } catch (e) { err(e.code || e.message || String(e)); }
  btn.disabled = false;
}

export function initMenu(cb) {
  onEnter = cb;
  lists = makeLists({ loadR, loadC, run, enter, err, pname, setUnsub: f => { unsub = f; } });
  worlds = makeWorlds({
    loadC, run, enter, err, pname, show,
    myRooms: () => lists.myRooms(),
    joinMine: async code => { const r = await loadR(); enter(await r.joinRoom(code, pname())); }
  });
  try { $('nameIn').value = localStorage.getItem('tc_name') || ''; } catch (e) {}

  $('mWorlds').onclick = () => { show('sWorlds'); worlds.start(); };
  $('wNew').onclick = () => worlds.openNew();
  $('nwDo').onclick = e => run(e.currentTarget, () => worlds.create());
  $('nwBack').onclick = () => { show('sWorlds'); worlds.start(); };

  $('mCreate').onclick = () => { show('sCreate'); lists.fillWorlds(); };
  $('mList').onclick = () => { show('sList'); lists.startList(); };
  $('mJoin').onclick = () => show('sJoin');
  $('mMine').onclick = () => { show('sMine'); lists.startMine(); };
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
      source: lists.pickSource()
    }));
  });
  $('jDo').onclick = e => run(e.currentTarget, async () => {
    const r = await loadR();
    enter(await r.joinRoom($('jCode').value, pname()));
  });
}
