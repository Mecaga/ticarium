import { db, ref, get as dbGet, set as dbSet, remove as dbRemove, onValue } from '../core/firebase.js';
import { uid, userName } from '../core/auth.js';
import { G } from '../core/state.js';
import { hurt } from '../entities/health.js';
import { isCreative } from './creative.js';
import { toast } from '../ui/ui.js';

const norm = s => String(s || '').trim().toLocaleLowerCase('tr').replace(/\s+/g, ' ');
const inRoom = () => !!(G.room && !G.room.solo && G.room.code);

let lastText = '';
document.addEventListener('input', e => {
  const v = e.target && e.target.value;
  if (typeof v === 'string' && v.trim().startsWith('/')) lastText = v.trim();
}, true);

export function socialCmd(cmd) {
  const src = String(cmd || '').trim();
  const word = src.split(/\s+/)[0].toLowerCase();
  if (word !== '/kil' && word !== '/hg') return null;
  let arg = '';
  if (src.includes(' ')) arg = src.slice(src.indexOf(' ') + 1);
  else if (lastText.toLowerCase().startsWith(word)) arg = lastText.slice(word.length);
  arg = norm(arg);
  return word === '/hg' ? hello(arg) : kill(arg);
}

function kill(name) {
  if (!inRoom()) return ['Bu komut çok oyunculu bir odada çalışır'];
  if (!(G.room.isOwner || isCreative())) return ['🔒 /kil için oda sahibi ya da GM1 olmalısın'];
  if (!name) return ['Kullanım: /kil <oyuncu adı>'];
  findPlayer(name, p => {
    send(p.uid, { k: 'kil', by: userName || 'Oda' });
    toast('💀 ' + p.name + ' için /kil gönderildi');
  });
  return ['🔎 ' + name + ' aranıyor...'];
}

function hello(name) {
  if (!inRoom()) return ['Bu komut çok oyunculu bir odada çalışır'];
  if (!G.room.isOwner) return ['🔒 /hg sadece oda sahibine açık'];
  if (!name) return ['Kullanım: /hg <oyuncu adı>'];
  findPlayer(name, p => {
    send(p.uid, { k: 'hg', by: userName || 'Oda' });
    toast('👋 ' + p.name + ' için karşılama gönderildi');
  });
  return ['🔎 ' + name + ' aranıyor...'];
}

async function findPlayer(name, done) {
  try {
    const snap = await dbGet(ref(db, 'rooms/' + G.room.code + '/players'));
    const all = [];
    snap.forEach(c => { all.push({ uid: c.key, name: String((c.val() || {}).name || '') }); });
    const exact = all.filter(p => norm(p.name) === name);
    const pool = exact.length ? exact : all.filter(p => norm(p.name).includes(name));
    if (!pool.length) return toast('Oyuncu bulunamadı: ' + name);
    if (pool.length > 1) return toast('Birden fazla eşleşme: ' + pool.map(p => p.name).join(', '));
    done(pool[0]);
  } catch (e) {
    toast('Oyuncu aranamadı');
  }
}

function send(to, msg) {
  dbSet(ref(db, 'rooms/' + G.room.code + '/cmd/' + to), { ...msg, t: Date.now() })
    .catch(() => toast('Komut gönderilemedi'));
}

let hgEl = null, hgT = 0, subKey = '', unsub = null, lastT = 0;

function greet() {
  if (!hgEl) {
    hgEl = document.createElement('div');
    hgEl.style.cssText = 'position:fixed;left:50%;top:36%;transform:translate(-50%,-50%);font:800 28px system-ui,sans-serif;color:#fff;text-shadow:0 2px 6px #000,0 0 14px #000;z-index:160;pointer-events:none;opacity:0;transition:opacity .4s;white-space:nowrap';
    document.body.appendChild(hgEl);
  }
  hgEl.textContent = 'Hoşgeldin reis 😎';
  hgEl.style.opacity = '1';
  clearTimeout(hgT);
  hgT = setTimeout(() => { hgEl.style.opacity = '0'; }, 3000);
}

function handle(k, v) {
  if (!v || v.t === lastT) return;
  lastT = v.t;
  dbRemove(ref(db, 'rooms/' + k + '/cmd/' + uid)).catch(() => {});
  if (Date.now() - (v.t || 0) > 15000) return;
  if (v.k === 'kil') { toast('💀 Oda komutuyla öldürüldün'); hurt(9999, { name: 'Komut' }); }
  else if (v.k === 'hg') greet();
}

setInterval(() => {
  const k = (inRoom() && uid) ? G.room.code : '';
  if (k === subKey) return;
  if (unsub) { unsub(); unsub = null; }
  subKey = k; lastT = 0;
  if (k) unsub = onValue(ref(db, 'rooms/' + k + '/cmd/' + uid), s => handle(k, s.val()));
}, 1000);
