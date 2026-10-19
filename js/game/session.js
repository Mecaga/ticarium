import { generate, rebuild, set, SAPLING } from '../world/world.js';
import { resetEco, eco } from './economy.js';
import { resetHealth } from '../entities/health.js';
import { resetFood } from '../entities/hunger.js';
import { drawHud, drawMarket, isMarketOpen, toast, MARKET_ON } from '../ui/ui.js';
import { clearItems, hooks as itemHooks } from '../entities/items.js';
import { clearMobs, spawnAnimals } from '../entities/mobs.js';
import { clearGravity, flushGravity } from '../world/gravity.js';
import { saveHooks } from '../core/save.js';
import { leaveToMenu } from '../ui/menu.js';
import { G } from '../core/state.js';
import { applyState, autosave, canSave, bindCloud } from './progress.js';
import { toSpawn, clearDeath } from './death.js';
import { applyRoomUI, updateInfo, closePanels, refreshSettings, refreshPlayers } from '../ui/panels.js';
import { trackSapling, clearSaplings } from './actions.js';
import { addChat, clearChat } from '../ui/chat.js';
import { setSimulate, revalidate } from '../world/fluids.js';
import { setPaint, clearPaints, stack } from '../world/paints.js';
import { resetMode } from './creative.js';
import { resetVitals } from '../entities/vitals.js';

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

  resetMode();
  resetEco();       // çanta boş başlar
  resetHealth();
  resetFood();
  resetVitals();

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

  import('../net/online.js')
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
  resetMode();
  clearItems(); clearMobs(); clearGravity(); clearDeath(); closePanels(); clearSaplings(); clearChat(); clearPaints();
  G.room = null;
  applyRoomUI();
  await leaveToMenu();
}
