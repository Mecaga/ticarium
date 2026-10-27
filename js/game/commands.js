import { G } from '../core/state.js';
import { setCreative, isCreative } from './creative.js';
import { TYPES, CATS } from '../world/world.js';
import { drawHud } from '../ui/ui.js';
import { addItem } from './inventory.js';
import { extraCmd, clearModes } from './modes.js';

const norm = s => String(s).toLowerCase().replace(/\u0307/g, '')
  .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
  .replace(/[^a-z0-9]/g, '');

// /ver <eşya adı> [adet]: survival çantasına eşya ekler (çanta doluysa sığan kadarı)
function cmdVer(args) {
  if (isCreative()) return ['Yaratıcı modda her eşya zaten çantanda. Normale dönmek için /gm0'];
  if (!args.length || args[0].toLowerCase() === 'liste') {
    const out = ['Kullanım: /ver <eşya adı> [adet]   örnek: /ver elmas kazma 1'];
    for (const [title, ids] of CATS) out.push(title + ': ' + ids.map(t => TYPES[t].name).join(', '));
    return out;
  }
  let n = 1;
  const last = args[args.length - 1];
  if (/^\d+$/.test(last)) { n = Math.max(1, Math.min(64, +last)); args = args.slice(0, -1); }
  const q = norm(args.join(''));
  if (!q) return ['Eşya adı yaz. /ver liste'];
  let hit = 0;
  for (const t in TYPES) if (norm(TYPES[t].name) === q) hit = +t;
  if (!hit) for (const t in TYPES) if (norm(TYPES[t].name).startsWith(q)) { hit = +t; break; }
  if (!hit) for (const t in TYPES) if (norm(TYPES[t].name).includes(q)) { hit = +t; break; }
  if (!hit) return ['Böyle bir eşya yok. /ver liste yaz.'];
  const a = addItem(hit, n);
  drawHud();
  if (a < 1) return ['🎒 Çanta dolu'];
  return [a < n ? '🎒 Çanta doldu: ' + a + ' ' + TYPES[hit].name + ' verildi' : '✅ ' + a + ' ' + TYPES[hit].name + ' verildi'];
}

// Sohbet komutları. Sadece oda kurucusu (tek oyunculuda sen) kullanır.
// Komut sohbete gitmez, cevabı sadece yazan kişi görür.
export function runCommand(text) {
  const parts = String(text).trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const r = G.room;
  if (!r) return ['Önce bir dünyaya gir.'];
  if (!(r.solo || r.isOwner)) return ['⛔ Bu komutu sadece oda kurucusu kullanabilir.'];

  const ex = extraCmd(cmd);
  if (ex) return ex;
  if (cmd === '/gm1' || cmd === '/gm0') clearModes();

  if (cmd === '/gm1') {
    if (isCreative()) return ['Zaten yaratıcı moddasın. Normale dönmek için /gm0'];
    setCreative(true);
    return [
      '🎨 Yaratıcı mod açık (/gm1):',
      '• Canın sınırsız, hasar almazsın, kimse sana vuramaz',
      '• Suda boğulmazsın',
      '• Tüm eşyalar çantanda, kullandıkça bitmez, bloklar anında kırılır',
      '• Normal moda dönmek için /gm0'
    ];
  }
  if (cmd === '/gm0') {
    if (!isCreative()) return ['Zaten normal moddasın.'];
    setCreative(false);
    return ['⚔️ Normal mod (/gm0): can, açlık ve hasar geri geldi, eski çantan döndü.'];
  }
  if (cmd === '/ver') return cmdVer(parts.slice(1));
  if (cmd === '/yardim' || cmd === '/help') {
    return ['Komutlar:', '/gm1  yaratıcı mod', '/gm0  normal mod', '/ver <eşya> [adet]  çantaya eşya ekle (/ver liste)'];
  }
  return ['Bilinmeyen komut. /yardim yaz.'];
}
