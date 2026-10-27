import { FACE_TILES, tileOf, addFlat } from '../world/textures.js';
import { eachBlock } from '../world/world.js';
import { G } from '../core/state.js';
import './bed.js';
import './extras.js';
import './doors.js';

const T3 = n => [tileOf(n), tileOf(n), tileOf(n)];
FACE_TILES[99] = [tileOf('bedHead'), tileOf('bedSide'), tileOf('planks')];
FACE_TILES[100] = [tileOf('bedFoot'), tileOf('bedSide'), tileOf('planks')];
FACE_TILES[101] = [tileOf('jukeTop'), tileOf('jukeSide'), tileOf('jukeSide')];
for (const d of [102, 103, 104]) FACE_TILES[d] = T3('disc');
FACE_TILES[105] = T3('shears');
FACE_TILES[107] = T3('bprint');
FACE_TILES[108] = T3('doorC'); FACE_TILES[109] = T3('doorC');
FACE_TILES[87] = T3('doorO'); FACE_TILES[88] = T3('doorO');
addFlat(102, 103, 104, 105, 108, 109);

// Yerleştirilmiş şema bloklarının alan çizgileri (bakmasan da görünür)
const ghosts = new Map();
let geo = null, mat = null;
setInterval(() => {
  const sc = G.scene;
  if (!sc) return;
  if (!geo) {
    geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(5, 4, 5));
    mat = new THREE.LineBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.8 });
  }
  const seen = new Set();
  if (G.room) {
    eachBlock([107], (x, y, z) => {
      const k = x + '_' + y + '_' + z;
      seen.add(k);
      if (!ghosts.has(k)) {
        const m = new THREE.LineSegments(geo, mat);
        m.position.set(x + 2.5, y + 2, z + 2.5);
        sc.add(m);
        ghosts.set(k, m);
      }
    });
  }
  for (const [k, m] of ghosts) if (!seen.has(k)) { sc.remove(m); ghosts.delete(k); }
}, 1000);
