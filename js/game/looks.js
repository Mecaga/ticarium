import { N } from '../world/idtable.js';
import { eachBlock } from '../world/world.js';
import { G } from '../core/state.js';
import './bed.js';
import './extras.js';
import './doors.js';

// Yerleştirilmiş şema bloklarının alan çizgileri
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
    eachBlock([N.SEMA_BLOGU], (x, y, z) => {
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
