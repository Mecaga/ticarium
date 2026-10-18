import { G } from './state.js';
import { sfx } from './sound.js';
import { runCommand } from './commands.js';

const st = document.createElement('style');
st.textContent = `
#bChat{top:184px;right:8px;width:auto;height:38px;border-radius:10px;padding:0 12px;display:none;cursor:pointer}
#chatFeed{position:fixed;left:8px;bottom:150px;max-width:62vw;z-index:6;pointer-events:none;display:flex;flex-direction:column;gap:2px}
.cm{background:#000a;color:#fff;padding:3px 8px;border-radius:6px;font-size:13px;word-break:break-word;transition:opacity .6s}
.cm b{color:#ffd84a}.cm.me b{color:#7fe3ff}
.cm.sys{background:#1b3a5acc}.cm.sys b{color:#9fd0ff}
#chatBox{position:fixed;top:8px;left:8px;right:90px;max-width:480px;background:#1d2330ee;color:#fff;border-radius:12px;padding:10px;z-index:22;display:none}
#chatHist{max-height:38vh;overflow:auto;font-size:14px;margin-bottom:8px;touch-action:pan-y}
#chatHist div{padding:2px 0;word-break:break-word}
#chatHist b{color:#ffd84a}#chatHist .me b{color:#7fe3ff}#chatHist .sys b{color:#9fd0ff}
#chatRow{display:flex;gap:6px}
#chatIn{flex:1;min-width:0;padding:10px;border-radius:8px;border:0;font-size:16px;-webkit-user-select:text;user-select:text}
#chatRow button{padding:0 14px;border:0;border-radius:8px;color:#fff;font-weight:700}
`;
document.head.appendChild(st);

const bChat = document.createElement('div');
bChat.className = 'btn'; bChat.id = 'bChat'; bChat.textContent = '💬';
const feed = document.createElement('div'); feed.id = 'chatFeed';
const box = document.createElement('div'); box.id = 'chatBox';
box.innerHTML = '<div id="chatHist"></div><div id="chatRow"><input id="chatIn" maxlength="120" placeholder="Mesaj ya da /komut..." autocomplete="off">' +
  '<button id="chatSend" style="background:#2e7d32">Gönder</button><button id="chatX" style="background:#b3261e">✕</button></div>';
document.body.append(bChat, feed, box);

const histEl = box.querySelector('#chatHist');
const inp = box.querySelector('#chatIn');
let open = false, lastSend = 0, hist = [];
export const isChatOpen = () => open;

function line(m) {
  const d = document.createElement('div');
  if (m.sys) d.className = 'sys';
  else if (m.mine) d.className = 'me';
  const b = document.createElement('b');
  b.textContent = m.name + ': ';
  d.appendChild(b);
  d.appendChild(document.createTextNode(m.text));
  return d;
}

function renderHist() {
  histEl.textContent = '';
  hist.forEach(m => histEl.appendChild(line(m)));
  histEl.scrollTop = histEl.scrollHeight;
}

export function toggleChat() {
  open = !open;
  box.style.display = open ? 'block' : 'none';
  if (open) { renderHist(); inp.focus(); } else inp.blur();
}

// m: { name, text, mine, live, sys }
export function addChat(m) {
  hist.push(m);
  if (hist.length > 40) hist.shift();
  if (open) renderHist();
  if (!m.live) return;
  const el = line(m);
  el.classList.add('cm');
  feed.appendChild(el);
  while (feed.children.length > 8) feed.removeChild(feed.firstChild);
  setTimeout(() => { el.style.opacity = 0; setTimeout(() => el.remove(), 700); }, m.sys ? 16000 : 9000);
  if (!m.mine && !m.sys) sfx.chat();
}

function send() {
  const text = inp.value.trim().slice(0, 120);
  if (!text) return;
  if (text[0] === '/') {   // komutlar sohbete gitmez
    inp.value = '';
    runCommand(text).forEach(t => addChat({ name: 'ⓘ', text: t, mine: false, live: true, sys: true }));
    return;
  }
  if (Date.now() - lastSend < 1000) return;
  lastSend = Date.now();
  if (G.online) G.online.sendChat(text);
  else addChat({ name: (G.room && G.room.playerName) || 'Sen', text, mine: true, live: true });
  inp.value = '';
}

// Dünyadayken (tek oyunculuda da) görünür
export function setChatVisible() {
  const on = !!G.room;
  bChat.style.display = on ? 'flex' : 'none';
  feed.style.display = on ? 'flex' : 'none';
  if (!on && open) toggleChat();
}

export function clearChat() {
  hist = [];
  feed.textContent = '';
  if (open) toggleChat();
}

export function initChat() {
  bChat.addEventListener('click', toggleChat);
  box.querySelector('#chatSend').addEventListener('click', send);
  box.querySelector('#chatX').addEventListener('click', toggleChat);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); send(); }
    if (e.key === 'Escape') toggleChat();
  });
}
