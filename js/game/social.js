import { db, ref, get as dbGet, set as dbSet, remove as dbRemove, onValue } from '../core/firebase.js';
import { uid, userName } from '../core/auth.js';
import { G } from '../core/state.js';
import { hurt } from '../entities/health.js';
import { isCreative } from './creative.js';
import { toast } from '../ui/ui.js';

// Sohbet komutları: /kil <oyuncu> (oda sahibi ya da GM1), /hg <oyuncu> (sadece oda sahibi).
// Komut hedefin cihazına rooms/<kod>/cmd/<uid> üzerinden gider. Hedef cihaz okur, uygular, siler.

const norm = s => String(s || '').trim().toLocaleLowerCase('tr').replace(/\s+/g, ' ');
const inRoom = () => !!(G.room && !G.room.solo && G.room.code);

// Bazı sürümlerde komut yalnızca komut kelimesiyle gelir. Yazılan metni input olaylarından takip ederiz.
let lastText = '';
document.addEventListener('input', e => {
  const v = e.target && e.target.value;
  if (typeof v === 'string' && v.trim().startsWith('/')) lastText = v.trim();
}, true);

// modes.js extraCmd bunu çağırır
