import { P } from '../entities/player.js';
import { hp } from '../entities/health.js';
import { isCreative, setCreative } from './creative.js';
import { G } from '../core/state.js';
import { clock } from '../world/sky.js';
import { toast } from '../ui/ui.js';
import { tgtOpts } from '../world/world.js';

const $ = id => document.getElementById(id);
function mk(id, txt, css) {
  const b = document.createElement('div');
  b.className = 'btn'; b.id = id; b.textContent = txt; b.style.cssText = css;
  document.body.appendChild(b);
  return b;
}
const tap = (b, fn) => {
  b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false });
  b.addEventListener('mousedown', e => { e.stopPropagation(); fn(); });
};
const hold = (b, on, off) => {
  const dn = e => { e.preventDefault(); e.stopPropagation(); on(); };
  const up = () => off();
  b.addEventListener('touchstart', dn, { passive: false });
  b.addEventListener('touchend', up); b.addEventListener('touchcancel', up);
  b.addEventListener('mousedown', dn); b.addEventListener('mouseup', up); b.addEventListener('mouseleave', up);
};

const sneakB = mk('bSneak', '🧎', 'right:18px;bottom:306px;font-size:22px');
const flyB = mk('bFly', '🕊', 'right:18px;bottom:378px;font-size:22px;display:none');
const upB = mk('bUp', '⬆', 'right:92px;bottom:378px;font-size:22px;display:none');
const dnB = mk('bDn', '⬇', 'right:92px;bottom:306px;font-size:22px;display:none');
P.sneak = false; P.fly = false; P.ghost = false; P.up = false; P.down = false;

export function setSneak(v) { P.sneak = v; tgtOpts.sneak = v; sneakB.style.background = v ? '#1565c0cc' : ''; }
export function setFly(v) {
  if (v && !isCreative() && !P.ghost) return toast('Uçmak için /gm1');
  P.fly = v; P.up = P.down = false;
  flyB.style.background = v ? '#1565c0cc' : '';
  upB.style.display = dnB.style.display = v ? 'flex' : 'none';
}
export function setGhost(v) {
  if (P.ghost === v) return;
  P.ghost = v;
  const hide = v ? 'none' : '';
  ['hotbar', 'bJump', 'bBreak', 'bPlace', 'bAttack', 'bDrop'].forEach(i => { const e = $(i); if (e) e.style.display = hide; });
  if (v) { hp.god = true; setFly(true); } 
  if (G.online) G.online.setDead(v);
}
export function clearModes() { setGhost(false); }

tap(sneakB, () => setSneak(!P.sneak));
tap(flyB, () => setFly(!P.fly));
hold(upB, () => { P.up = true; }, () => { P.up = false; });
hold(dnB, () => { P.down = true; }, () => { P.down = false; });

setInterval(() => {
  if (!G.room) { if (P.ghost) setGhost(false); if (P.fly) setFly(false); if (P.sneak) setSneak(false); }
  if (!isCreative() && !P.ghost && P.fly) setFly(false);
  flyB.style.display = (G.room && (isCreative() || P.ghost)) ? 'flex' : 'none';
  if (!G.room) { upB.style.display = dnB.style.display = 'none'; }
}, 300);

function confetti() {
  const em = ['🎉', '🎊', '✨', '⭐', '🎈'];
  for (let i = 0; i < 45; i++) {
    const d = document.createElement('div');
    d.textContent = em[i % em.length];
    d.style.cssText = 'position:fixed;top:-40px;left:' + Math.random() * 100 + 'vw;font-size:' + (18 + Math.random() * 18) + 'px;z-index:40;pointer-events:none;transition:transform ' + (2 + Math.random() * 2) + 's linear';
    document.body.appendChild(d);
    setTimeout(() => { d.style.transform = 'translateY(110vh) rotate(' + (Math.random() * 720) + 'deg)'; }, 30 + Math.random() * 600);
    setTimeout(() => d.remove(), 5000);
  }
}
const setTime = hr => { clock.off = (((hr - 6 + 24) % 24) / 24 * 480) - ((Date.now() / 1000) % 480); };

export function extraCmd(cmd) {
  if (cmd === '/gm2') {
    if (!isCreative()) setCreative(true);
    setGhost(true);
    return ['👻 Hayalet modu: kimse seni göremez, her yerden geçersin.', 'Normale dönmek için /gm1 ya da /gm0'];
  }
  if (cmd === '/gunduz') { setTime(12); return ['☀️ Gündüz oldu (sadece sende)']; }
  if (cmd === '/gece') { setTime(0); return ['🌙 Gece oldu (sadece sende)']; }
  if (cmd === '/konfeti') { confetti(); return ['🎉']; }
  return null;
}
