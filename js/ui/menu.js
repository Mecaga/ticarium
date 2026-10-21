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
.mbox input[type=password]{width:100%;padding:12px;border-radius:8px;border:0;margin-bottom:8px;font-size:16px;box-sizing:border-box;-webkit-user-select:text;user-select:text}
#sAuth{display:none}
#auHint{font-size:13px;opacity:.85;margin:0 0 8px}
#mUser{font-size:13px;opacity:.9;margin:0 0 6px;text-align:center}
.mbox #mLogout{background:#444;padding:8px;font-size:13px;margin-top:14px}
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
  $('nameIn').value = UN;
  $('mUser').textContent = '👤 ' + UN;
  show('sMain');
  diag();
}

function showAuth(a) {
  show('sAuth');
  $('auHint').textContent = a.isLegacyAnon()
    ? 'Bu cihazda eski misafir dünyaların var. Korumak için GİRİŞ YAPMA, KAYIT OL de: kullanıcı adı ve şifre seç, dünyaların hesabına bağlanır.'
    : 'Kullanıcı adı ve şifrenle giriş yap ya da yeni hesap aç.';
}

export function showMenu() {
  $('menu').style.display = 'flex';
  loadA().then(async a => {
    await a.authReady();
    if (a.isLoggedIn()) enterMain(a); else showAuth(a);
  }).catch(e => { show('sAuth'); err(e.code || e.message); });
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

async function doAuth(mode) {
  const a = await loadA();
  try {
    if (mode === 'login') await a.doLogin($('auUser').value, $('auPass').value);
    else await a.doRegister($('auUser').value, $('auPass').value);
  } catch (e) { throw new Error(a.authError(e)); }
  $('auPass').value = '';
  enterMain(a);
}

export function initMenu(cb) {
  onEnter = cb;
  lists = makeLists({ loadR, loadC, run, enter, err, pname, setUnsub: f => { unsub = f; } });
  worlds = makeWorlds({ loadC, loadR, run, enter, err, pname, show, worldRooms: () => lists.worldRooms() });

  $('auLogin').onclick = e => run(e.currentTarget, () => doAuth('login'));
  $('auReg').onclick = e => run(e.currentTarget, () => doAuth('register'));
  $('mLogout').onclick = async () => {
    try { await (await loadA()).doLogout(); } catch (e) {}
    location.reload();
  };

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
