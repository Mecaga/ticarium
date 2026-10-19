import { G } from '../core/state.js';
import { setCreative, isCreative } from './creative.js';

// Sohbet komutları. Sadece oda kurucusu (tek oyunculuda sen) kullanır.
// Komut sohbete gitmez, cevabı sadece yazan kişi görür.
export function runCommand(text) {
  const cmd = String(text).trim().toLowerCase().split(/\s+/)[0];
  const r = G.room;
  if (!r) return ['Önce bir dünyaya gir.'];
  if (!(r.solo || r.isOwner)) return ['⛔ Bu komutu sadece oda kurucusu kullanabilir.'];

  if (cmd === '/gm1') {
    if (isCreative()) return ['Zaten yaratıcı moddasın. Normale dönmek için /gm0'];
    setCreative(true);
    return [
      '🎨 Yaratıcı mod açık (/gm1):',
      '• Canın sınırsız, hasar almazsın, kimse sana vuramaz',
      '• Suda boğulmazsın',
      '• Tüm eşyalar çantanda, kullandıkça bitmez',
      '• Normal moda dönmek için /gm0'
    ];
  }
  if (cmd === '/gm0') {
    if (!isCreative()) return ['Zaten normal moddasın.'];
    setCreative(false);
    return ['⚔️ Normal mod (/gm0): can, açlık ve hasar geri geldi, eski çantan döndü.'];
  }
  if (cmd === '/yardim' || cmd === '/help') {
    return ['Komutlar:', '/gm1  yaratıcı mod', '/gm0  normal mod'];
  }
  return ['Bilinmeyen komut. /yardim yaz.'];
}
