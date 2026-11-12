import { N } from '../world/idtable.js';
import { TYPES, CATS, get, eachBlock } from '../world/world.js';
import { FACE_TILES, tileOf } from '../world/textures.js';
import { eco } from './economy.js';
import { RECIPES } from './recipes.js';
import { G } from '../core/state.js';
import { loadAt, saveAt, canStore } from './store.js';
import { CHEST } from './chests.js';

TYPES[N.HUNI] = { name: 'Huni', color: 0x555560, base: 40 };
FACE_TILES[N.HUNI] = [tileOf('furnaceTop'), tileOf('furnaceSide'), tileOf('furnaceSide')];
eco.inv[N.HUNI] = 0; eco.raw[N.HUNI] = 40; eco.trend[N.HUNI] = 0;
if (!CATS[0][1].includes(N.HUNI)) CATS[0][1].push(N.HUNI);
const I = N.DEMIR_KULCE;
RECIPES.push({ out: [N.HUNI, 1], pat: [[I, 0, I], [I, CHEST, I], [0, I, 0]] });

const norm = d => { const o = {}; if (d) for (const t in d) { const v = d[t]; o[t] = typeof v === 'object' ? Object.values(v) : v; } return o; };
let busy = false;
async function move(x, y, z) {
  if (get(x, y + 1, z) !== CHEST || get(x, y - 1, z) !== CHEST) return;
  const from = [x, y + 1, z], to = [x, y - 1, z];
  const a = norm(await loadAt('c', from)), keys = Object.keys(a);
  if (!keys.length) return;
  const t = keys[0], b = norm(await loadAt('c', to));
  if (b[t] === undefined && Object.keys(b).length >= 27) return;
  if (Array.isArray(a[t])) { b[t] = b[t] || []; b[t].push(a[t].shift()); if (!a[t].length) delete a[t]; }
  else { a[t]--; b[t] = (b[t] || 0) + 1; if (a[t] <= 0) delete a[t]; }
  await saveAt('c', to, b);
  await saveAt('c', from, Object.keys(a).length ? a : null);
}
setInterval(async () => {
  const r = G.room;
  if (busy || !r || !(r.solo || r.sim) || !canStore()) return;
  busy = true;
  const list = [];
  eachBlock([N.HUNI], (x, y, z) => list.push([x, y, z]));
  for (const h of list.slice(0, 6)) { try { await move(h[0], h[1], h[2]); } catch (e) {} }
  busy = false;
}, 1500);
