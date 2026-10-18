import { generate, rebuild, set, SAPLING } from './world.js';
import { resetEco, eco } from './economy.js';
import { resetHealth } from './health.js';
import { resetFood } from './hunger.js';
import { drawHud, drawMarket, isMarketOpen, toast, MARKET_ON } from './ui.js';
import { clearItems, hooks as itemHooks } from './items.js';
import { clearMobs, spawnAnimals } from './mobs.js';
import { clearGravity, flushGravity } from './gravity.js';
import { saveHooks } from './save.js';
import { leaveToMenu } from './menu.js';
import { G } from './state.js';
import { applyState, autosave, canSave, bindCloud } from './progress.js';
import { toSpawn, clearDeath } from './death.js';
import { applyRoomUI, updateInfo, closePanels, refreshSettings, refreshPlayers } from './panels.js';
import { trackSapling, clearSaplings } from './actions.js';
import { addChat, clearChat } from './chat.js';
import { setSimulate, revalidate } from './water.js';
import { setPaint, clearPaints, stack } from './paints.js';

// Ayarlar → Dünyayı sil: bulut kaydını siler
saveHooks.onDelete = async () => {
  const room = G.room;
  const c = room && room.cloud;
  if (!c || !room.wid) return;
  c.dropSaver();
  try { await c.deleteWorld(room.wid); } catch (e) {}
};

export function enterGame(info) {
  if (G.online) { G.online.stopOnline(); G.online = null; }
  clearItems(); clearMobs(); clearGravity(); clearDeath(); closePanels(); clearSaplings(); clearChat(); clearPaints();
  stack.length = 0;
  itemHooks.push = itemHooks.take = itemHooks.expire = null; itemHooks.myId = '';
  const my = G.room = { ...info, count: 1, max: info.max || 8 };
  const data = my.data;
  delete my.data;

  resetEco();
  resetHealth();
  resetFood();
  // Başlangıç eşyaları: kova ve tuval hızlı slotlarda
  eco.inv[30] = 1; eco.inv[32] = 2;
  eco.hotbar = [1, 2, 3, 30, 32];
  eco.hsel = 0; eco.sel = 1;
  if (info.kind === 'sky') eco.inv[12] = 2;

  generate(info.seed, info.kind || 'normal');
  setSimulate(!!(info.solo || info.isOwner));

  let saved = null;
  if (info.solo && info.cloud) {
    bindCloud(info.cloud);
    info.cloud.startSaver(info.wid);
    const ch = (data && data.changes) || {};
    for (const k in ch) {
      const [x, y, z] = k.split('_').map(Number);
      set(x, y, z, ch[k]);
      if (ch[k] === SAPLING) trackSapling(x, y, z);
    }
    const pn = (data && data.paints) || {};
    for (const k in pn) {
      const [x, y, z] = k.split('_').map(Number);
      setPaint(x, y, z, pn[k]);
    }
    saved = data && data.state;
  }
  rebuild();
  toSpawn();
  if (saved) applyState(saved);
  drawHud();
  applyRoomUI();

  if (info.solo) { spawnAnimals(); revalidate(); return; }

  import('./online.js')
    .then(m => {
      if (G.room !== my) return;
      G.online = m;
      m.startOnline(G.scene, info.code, {
        isOwner: info.isOwner,
        pvp: info.pvp,
        name: info.playerName,
        onPrices: () => { if (isMarketOpen()) drawMarket(); },
        onMeta: meta => {
          const r = G.room;
          if (!r) return;
          r.pvp = meta.pvp; r.max = meta.max; r.keep = meta.keep;
          applyRoomUI();
          refreshSettings();
        },
        onCount: n => {
          const r = G.room;
          if (!r) return;
          r.count = n;
          updateInfo();
          refreshPlayers();
        },
        onBlock: (x, y, z, t) => { if (t === SAPLING) trackSapling(x, y, z); },
        onChat: addChat,
        onKill: name => {
          if (MARKET_ON) { eco.coins += 15; drawHud(); }
          toast(name + ' yendin!');
        }
      });
      if (info.isOwner) setTimeout(() => { if (G.room === my) revalidate(); }, 4000);
      if (canSave()) m.loadProgress().then(s => { if (s && G.room === my) applyState(s); });
    })
    .catch(e => { document.getElementById('roomInfo').textContent = 'Online hata: ' + (e.message || e); });
}

export async function leave() {
  flushGravity();
  autosave(false);
  const c = G.room && G.room.cloud;
  if (c) { try { await c.stopSaver(); } catch (e) {} }
  if (G.online) { G.online.stopOnline(); G.online = null; }
  setSimulate(false);
  clearItems(); clearMobs(); clearGravity(); clearDeath(); closePanels(); clearSaplings(); clearChat(); clearPaints();
  G.room = null;
  applyRoomUI();
  await leaveToMenu();
}
