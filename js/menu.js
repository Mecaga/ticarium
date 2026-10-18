import { hasSolo, loadSolo, addMine } from './save.js';
import { makeLists } from './menu-lists.js';

const $ = id => document.getElementById(id);
let R = null, onEnter = null, unsub = null, lists = null;
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

export function initMenu(cb) {
  onEnter = cb;
  lists = makeLists({ loadR, run, enter, err, pname, setUnsub: f => { unsub = f; } });
  try { $('nameIn').value = localStorage.getItem('tc_name') || ''; } catch (e) {}

  $('mCreate').onclick = () => { show('sCreate'); lists.fillWorlds(); };
  $('mList').onclick = () => { show('sList'); lists.startList(); };
  $('mJoin').onclick = () => show('sJoin');
  $('mMine').onclick = () => { show('sMine'); lists.startMine(); };
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
      source: lists.pickSource()
    }));
  });
  $('jDo').onclick = e => run(e.currentTarget, async () => {
    const r = await loadR();
    enter(await r.joinRoom($('jCode').value, pname()));
  });
}
