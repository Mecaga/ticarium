import { makeLists } from './menu-lists.js';
import { makeWorlds } from './menu-worlds.js';

const $ = id => document.getElementById(id);
let R = null, C = null, A = null, onEnter = null, unsub = null, lists = null, worlds = null, UN = '';
const loadR = async () => R || (R = await import('../net/rooms.js'));
const loadC = async () => C || (C = await import('../net/cloud.js'));
const loadA = async () => A || (A = await import('../core/auth.js'));
const screens = ['sAuth', 'sMain', 'sCreate', 'sList', 'sJoin', 'sMine', 'sWorlds', 'sNew'];

const st = document.createElement('style');
st.textContent = `
#sAuth{display:none}
#mUser{font-size:13px;opacity:.9;margin:0 0 6px;text-align:center}
#mLogout{display:none !important;}
`;
document.head.appendChild(st);

const nice = m => /permission_denied|permission denied/i.test(m)
  ? 'Firebase kuralları izin vermiyor. Realtime Database → Rules → yeni kuralları yapıştır → Publish'
  : m;
const err = m => { $('mErr').textContent = nice(String(m || '')); };

function show(id) {
  screens.forEach(s => { const el = $(s); if (el) el.style.display = s === id ? 'block' : 'none'; });
  $('mErr').textContent = '';
  if (id !== 'sList' && unsub) { unsub(); unsub = null; }
}

const pname = () => UN || $('nameIn').value.trim() || 'Oyuncu' + Math.floor(Math.random() * 900 + 100);

export const isMenuOpen = () => $('menu').style.display !== 'none';

async function diag() {
  const el = $('mAuth');
  el.textContent = '☁️ Bağlanıyor...';
  try { el.textContent = await (await loadC()).diag(); }
  catch (e) { el.textContent = '❌ ' + (e.code || e.message || e); }
}

function enterMain(a) {
  UN = a.userName;
  const inp = $('nameIn');
  inp.style.display = 'block';
  inp.value = UN;
  $('mUser').textContent = '';
  inp.onchange = () => {
    const v = inp.value.trim().slice(0, 14) || UN;
    UN = v; a.setUserName(v);
    try { localStorage.setItem('bd_name', v); } catch (e) {}
    loadC().then(c => c.setProfile(v));
  };
  try { localStorage.setItem('bd_name', UN); } catch (e) {}
  show('sMain');
  diag();
}

export function showMenu() {
  $('menu').style.display = 'flex';
  loadA().then(async a => {
    await a.login();
    let n = '';
    try { n = localStorage.getItem('bd_name') || ''; } catch (e) {}
    if (!n) n = 'Oyuncu' + Math.floor(100 + Math.random() * 900);
    a.setUserName(n);
    enterMain(a);
  }).catch(e => { show('sMain'); err(e.code || e.message); });
}

// opts.keepOpen: host çıkarken oda açık kalsın
export async function leaveToMenu(opts = {}) {
  try { if (R) await R.leaveRoom(opts); } catch (e) {}
  showMenu();
}

function enter(info) {
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
  worlds = makeWorlds({ loadC, loadR, run, enter, err, pname, show, worldRooms: () => lists.worldRooms() });

  // Çıkış düğmesini garanti olsun diye hem stil hem kodla gizliyoruz
  if ($('mLogout')) {
    $('mLogout').style.setProperty('display', 'none', 'important');
  }

  $('mWorlds').onclick = () => { show('sWorlds'); worlds.start(); };
  $('wNew').onclick = () => worlds.openNew();
  $('nwDo').onclick = e => run(e.currentTarget, () => worlds.create());
  $('nwBack').onclick = () => { show('sWorlds'); worlds.start(); };

  $('mCreate').onclick = () => { show('sCreate'); lists.fillWorlds(); };
  $('mList').onclick = () => { show('sList'); lists.startList(); };
  $('mJoin').onclick = () => show('sJoin');
  $('mMine').onclick = () => { show('sMine'); lists.startMine(); };
  document.querySelectorAll('.back').forEach(b => { b.onclick = () => show('sMain'); });
  lists.initCreate();

  $('cDo').onclick = e => run(e.currentTarget, async () => {
    const wid = $('cWorld').value;
    if (!wid) throw new Error('Önce Dünyalarım\'dan bir dünya kur');
    const r = await loadR();
    err('Oda hazırlanıyor...');
    enter(await r.hostWorld({
      wid,
      name: $('cName').value.trim(),
      isPublic: $('cPublic').checked,
      pvp: $('cPvp').checked,
      keep: $('cKeep').checked,
      maxPlayers: +$('cMax').value,
      playerName: pname(),
      enter: true
    }));
  });
  $('jDo').onclick = e => run(e.currentTarget, async () => {
    const r = await loadR();
    enter(await r.joinRoom($('jCode').value, pname()));
  });
}
