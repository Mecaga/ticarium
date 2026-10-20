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
import { askChoice } from '../ui/dialog.js';

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
  const my = G.room = { ...info, count: 1, max: info.max || 8, sim: !!(info.solo || info.isOwner) };
  const data = my.data;
  delete my.data;

  resetMode();
  resetEco();
  resetHealth();
  resetFood();
  resetVitals();

  generate(info.seed, info.kind || 'normal');   // arazi chunk chunk yüklenir
  setSimulate(my.sim);

  let saved = null;
  if (info.solo && info.cloud) {
    bindCloud(info.cloud);
    info.cloud.startSaver(info.wid);
    info.cloud.touchWorld(info.wid);
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

  if (info.solo) { revalidate(); return; }

  import('../net/online.js')
    .then(m => {
      if (G.room !== my) return;
      G.online = m;
      m.startOnline(G.scene, info.code, {
        isOwner: info.isOwner,
        pvp: info.pvp,
        name: info.playerName,
        saveKey: info.saveKey,
        onPrices: () => { if (isMarketOpen()) drawMarket(); },
        onSim: v => { setSimulate(v); if (v) { spawnAnimals(); setTimeout(revalidate, 1500); } },
        onClosed: () => { if (G.room === my) leave({ msg: 'Oda kapatıldı. Ana menüye dönüldü.' }); },
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
      // Oda sahibi: envanteri dünyanın kendi kaydından. Diğerleri: kendi hesabındaki oda kaydından.
      if (info.isOwner && info.wid) {
        import('../net/cloud.js').then(c => {
          bindCloud(c);
          c.touchWorld(info.wid);
          return c.loadState(info.wid);
        }).then(s => { if (s && G.room === my) applyState(s); }).catch(() => {});
      } else if (canSave()) {
        m.loadProgress().then(s => { if (s && G.room === my) applyState(s); });
      }
    })
    .catch(e => { document.getElementById('roomInfo').textContent = 'Online hata: ' + (e.message || e); });
}

// opts: { keepOpen (host çıkarken oda açık kalsın), msg }
export async function leave(opts = {}) {
  const room = G.room;
  flushGravity();
  if (room) autosave(false, true);   // envanter ve konum kaydedilir
  const c = room && room.cloud;
  if (c) { try { await c.stopSaver(); } catch (e) {} }
  if (G.online) { G.online.stopOnline(); G.online = null; }
  setSimulate(false);
  resetMode();
  clearItems(); clearMobs(); clearGravity(); clearDeath(); closePanels(); clearSaplings(); clearChat(); clearPaints();
  G.room = null;
  applyRoomUI();
  await leaveToMenu({ keepOpen: !!opts.keepOpen });
  if (opts.msg) toast(opts.msg);
}

// Kaydet ve Çık düğmesi: host ise "Herkes açık kalsın mı?" sorar
export async function requestLeave() {
  const r = G.room;
  if (!r) return;
  if (r.solo || !r.isOwner) return leave({});
  const k = await askChoice('Herkes açık kalsın mı?',
    'Kalsın dersen oda açık kalır, diğer oyuncular oynamaya devam eder. Kapatırsan herkes ana menüye atılır.',
    [['Kalsın', 'keep', 'ok'], ['Odayı Kapat', 'close', 'danger'], ['İptal', 'cancel']]);
  if (k === 'keep') await leave({ keepOpen: true });
  else if (k === 'close') await leave({ keepOpen: false });
}
