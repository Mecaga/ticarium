import { G } from './state.js';
import { toast } from './ui.js';
import { sfx } from './sound.js';
import { autosave, canSave, setChanges } from './progress.js';
import { clearSolo } from './save.js';

const $ = id => document.getElementById(id);
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const phooks = { leave: null }; // main.js doldurur

let settingsOpen = false, playersOpen = false, plTimer = null;
export const panelOpen = () => settingsOpen || playersOpen;

// ---------- Can / kırmızı ekran ----------
export function drawHearts(cur, max) {
  const full = Math.ceil(cur / 2), tot = Math.ceil(max / 2);
  $('hearts').textContent = '❤️'.repeat(full) + '🖤'.repeat(Math.max(0, tot - full));
}

export function flash() {
  const f = $('flash');
  f.style.opacity = 0.45;
  setTimeout(() => { f.style.opacity = 0; }, 160);
}

// ---------- Köşe bilgileri ----------
export function updateInfo() {
  const room = G.room;
  if (!room) { $('roomInfo').textContent = ''; return; }
  if (room.solo) { $('roomInfo').textContent = 'Tek oyunculu · 💾'; return; }
  $('roomInfo').textContent = 'Oda: ' + room.code + ' · ' + room.name + ' · 👥 ' + room.count + '/' + room.max +
    (room.pvp ? ' · ⚔️' : '') + (room.keep ? ' · 🎒' : '');
  $('bPlayers').textContent = '👥 ' + room.count + '/' + room.max;
}

export function applyRoomUI() {
  const room = G.room;
  const on = !!(room && !room.solo);
  $('bAttack').style.display = (on && room.pvp) ? 'flex' : 'none';
  $('hearts').style.display = room ? 'block' : 'none';
  $('bSettings').style.display = room ? 'flex' : 'none';
  $('bPlayers').style.display = on ? 'flex' : 'none';
  $('bLeave').style.display = room ? 'flex' : 'none';
  $('coord').style.display = room ? 'block' : 'none';
  updateInfo();
}

// ---------- Ayarlar ----------
function drawSettings() {
  const room = G.room;
  if (!room) return;
  const on = (v, id) => `<button id="${id}" class="${v ? 'sell' : 'buy'}">${v ? 'Açık' : 'Kapalı'}</button>`;
  const flag = v => v ? 'Açık' : 'Kapalı';
  let h = '<h2>⚙️ Ayarlar</h2>';
  if (room.solo) {
    h += '<small>Tek oyunculu dünya</small>';
  } else {
    h += `<small>Oda kodu: ${esc(room.code)} · ${room.count}/${room.max} kişilik</small>`;
    h += `<div class="row"><div class="n">Oda kodu<small>${esc(room.code)}</small></div><button id="setCopy" class="buy">📋 Kopyala</button></div>`;
    if (room.isOwner) {
      const maxBtns = [2, 4, 6, 8, 10].map(n =>
        `<button data-m="${n}" class="${room.max === n ? 'sell' : 'buy'}">${n}</button>`).join('');
      h += `<div class="row"><div class="n">PVP<small>Oyuncular birbirine vurabilir</small></div>${on(room.pvp, 'setPvp')}</div>
        <div class="row"><div class="n">Envanteri koru<small>Ölünce eşyalar düşmez</small></div>${on(room.keep, 'setKeep')}</div>
        <div class="row"><div class="n">Oyuncu limiti<small>Yeni girişlerde geçerli</small></div><div id="setMax">${maxBtns}</div></div>`;
    } else {
      h += `<div class="row"><div class="n">Oda kuralları<small>PVP: ${flag(room.pvp)} · Envanteri koru: ${flag(room.keep)} · Limit: ${room.max}</small></div></div>`;
    }
  }
  h += `<div class="row"><div class="n">Ses<small>Vuruş, kırma, koyma sesleri</small></div>${on(!sfx.isMuted(), 'setSnd')}</div>`;
  if (canSave()) {
    h += `<div class="row"><div class="n">Kaydet<small>Otomatik: 15 sn'de bir</small></div><button id="setSave" class="buy">💾 Kaydet</button></div>`;
  } else {
    h += `<div class="row"><div class="n">Kayıt<small>Başkasının odası kaydedilmez</small></div></div>`;
  }
  if (room.solo) {
    h += `<div class="row"><div class="n">Dünyayı sil<small>Kayıt kalıcı silinir</small></div><button id="setDel" style="background:#b3261e">🗑 Sil</button></div>`;
  }
  h += '<button class="closeBtn">Kapat</button>';
  $('setBox').innerHTML = h;
}

export function refreshSettings() { if (settingsOpen) drawSettings(); }

export function toggleSettings() {
  if (!G.room) return;
  settingsOpen = !settingsOpen;
  $('settings').style.display = settingsOpen ? 'flex' : 'none';
  if (settingsOpen) drawSettings();
}

$('setBox').addEventListener('click', async e => {
  const b = e.target.closest('button');
  const room = G.room;
  if (!b || !room) return;
  if (b.classList.contains('closeBtn')) return toggleSettings();
  if (b.id === 'setSave') return autosave(true);
  if (b.id === 'setSnd') { sfx.setMuted(!sfx.isMuted()); return drawSettings(); }
  if (b.id === 'setCopy') {
    try { await navigator.clipboard.writeText(room.code); toast('Kod kopyalandı: ' + room.code); }
    catch (err) { toast('Kod: ' + room.code); }
    return;
  }
  if (b.id === 'setDel') {
    if (confirm('Dünya kalıcı olarak silinecek. Emin misin?')) {
      clearSolo();
      setChanges({});
      room.noSave = true;
      if (phooks.leave) phooks.leave();
    }
    return;
  }
  try {
    const r = await import('./rooms.js');
    if (b.id === 'setPvp') await r.updateSettings({ pvp: !room.pvp });
    if (b.id === 'setKeep') await r.updateSettings({ keep: !room.keep });
    if (b.dataset.m) await r.updateSettings({ max: +b.dataset.m });
  } catch (err) { toast('Ayar kaydedilemedi'); }
});

// ---------- Oyuncular ----------
function drawPlayers() {
  const room = G.room;
  if (!G.online || !room || room.solo) return;
  const list = G.online.getPlayers(room.playerName || 'Sen')
    .sort((a, b) => (b.me ? 1 : 0) - (a.me ? 1 : 0) || a.dist - b.dist);
  let h = `<h2>👥 Oyuncular (${list.length}/${room.max})</h2>`;
  for (const p of list) {
    h += `<div class="row"><div class="n">${p.owner ? '👑 ' : ''}${esc(p.name)}${p.me ? ' (sen)' : ''}
      <small>${p.dead ? '💀 öldü' : '❤️ hayatta'}${p.me ? '' : ' · ' + Math.round(p.dist) + ' blok uzakta'}</small></div></div>`;
  }
  h += '<button class="closeBtn">Kapat</button>';
  $('plBox').innerHTML = h;
}

export function refreshPlayers() { if (playersOpen) drawPlayers(); }

export function togglePlayers() {
  if (!G.room || G.room.solo) return;
  playersOpen = !playersOpen;
  $('players').style.display = playersOpen ? 'flex' : 'none';
  clearInterval(plTimer);
  if (playersOpen) { drawPlayers(); plTimer = setInterval(drawPlayers, 1000); }
}

$('plBox').addEventListener('click', e => {
  if (e.target.closest('.closeBtn')) togglePlayers();
});

export function closePanels() {
  settingsOpen = false; $('settings').style.display = 'none';
  playersOpen = false; $('players').style.display = 'none';
  clearInterval(plTimer);
}
