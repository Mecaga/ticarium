import { generate, rebuild, set, SAPLING } from './world.js';
import { resetEco } from './economy.js';
import { resetHealth } from './health.js';
import { resetFood } from './hunger.js';
import { drawHud, drawMarket, isMarketOpen, toast, MARKET_ON } from './ui.js';
import { clearItems, hooks as itemHooks } from './items.js';
import { clearMobs, spawnAnimals } from './mobs.js';
import { clearGravity, flushGravity } from './gravity.js';
import { loadSolo, clearSolo } from './save.js';
import { leaveToMenu } from './menu.js';
import { G } from './state.js';
import { eco } from './economy.js';
import { setChanges, getChanges, applyState, autosave, canSave } from './progress.js';
import { toSpawn, clearDeath } from './death.js';
import { applyRoomUI, updateInfo, closePanels, refreshSettings, refreshPlayers } from './panels.js';
import { trackSapling, clearSaplings } from './actions.js';
import { addChat, clearChat } from './chat.js';
import { drawHud as redraw } from './ui.js';

export function enterGame(info) {
  if (G.online) { G.online.stopOnline(); G.online = null; }
  clearItems(); clearMobs(); clearGravity(); clearDeath(); closePanels(); clearSaplings(); clearChat();
  setChanges({});
  itemHooks.push = itemHooks.take = itemHooks.expire = null; itemHooks.myId = '';
  const my = G.room = { ...info, count: 1, max: info.max || 8 };
  resetEco();
  resetHealth();
  resetFood();
  generate(info.seed);

  let saved = null;
  if (info.solo) {
    if (info.resume) {
      saved = loadSolo();
      if (saved && saved.changes) {
        setChanges(saved.changes);
        const ch = getChanges();
        for (const k in ch) {
          const [x, y, z] = k.split('_').map(Number);
          set(x, y, z, ch[k]);
          if (ch[k] === SAPLING) trackSapling(x, y, z);
        }
      }
    } else clearSolo();
  }
  rebuild();
  toSpawn();
  if (saved) applyState(saved);
  drawHud();
  applyRoomUI();

  if (info.solo) { spawnAnimals(); return; }

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
          if (MARKET_ON) { eco.coins += 15; redraw(); }
          toast(name + ' yendin!');
        }
      });
      if (canSave()) m.loadProgress().then(s => { if (s && G.room === my) applyState(s); });
    })
    .catch(e => { document.getElementById('roomInfo').textContent = 'Online hata: ' + (e.message || e); });
}

export async function leave() {
  flushGravity();
  autosave(false);
  if (G.online) { G.online.stopOnline(); G.online = null; }
  clearItems(); clearMobs(); clearGravity(); clearDeath(); closePanels(); clearSaplings(); clearChat();
  G.room = null;
  applyRoomUI();
  await leaveToMenu();
}
