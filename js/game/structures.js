import { G } from '../core/state.js';
import { eachBlock, get, target } from '../world/world.js';

// Yapı alanı çizgileri: her yapı bloğunun W×H×D kutusu mavi çizilir.
// Kaynak yüklü chunk'lardaki bloklar; başka oyuncunun koyduğu yapılar da böylece uzaktan görünür.
// Baktığın ya da panelde açık olan yapı parlak mavi olur. Blok kırılınca ya da kurulum başlayınca çizgi kalkar.

const IDLE = 0x2f7dd1, ACTIVE = 0x9be4ff;
const DIM = {};            // blok numarası -> { W, H, D }
const wires = new Map();   // "x,y,z" -> { line, t }
const geos = new Map();    // "WxHxD" -> kenar geometrisi (aynı boyutlar paylaşılır)
let mIdle = null, mActive = null, panelKey = '', activeKey = '';

// structures.js bir kez çağırır: yapı tanımlarını alır, taramayı ve vurgu döngüsünü başlatır
export function initWires(specs) {
  for (const s of specs) DIM[s.blk] = { W: s.W, H: s.H, D: s.D };
  setInterval(scan, 1000);
  setInterval(tick, 150);
}

// Panelde açık yapının konumu. Paneli kapatırken null ver.
export function setPanelWire(x, y, z) {
  panelKey = x == null ? '' : x + ',' + y + ',' + z;
}

// Blok kırıldığında ya da kurulum başladığında çizgiyi hemen kaldırır
export function clearWireAt(x, y, z) {
  const k = x + ',' + y + ',' + z, w = wires.get(k);
  if (w && G.scene) G.scene.remove(w.line);
  wires.delete(k);
  if (activeKey === k) activeKey = '';
}

function mats() {
  if (mIdle) return;
  mIdle = new THREE.LineBasicMaterial({ color: IDLE, transparent: true, opacity: 0.75, fog: false });
  mActive = new THREE.LineBasicMaterial({ color: ACTIVE, fog: false });
}

function geoOf(W, H, D) {
  const k = W + 'x' + H + 'x' + D;
  if (!geos.has(k)) geos.set(k, new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, D)));
  return geos.get(k);
}

// Yüklü chunk'lardaki yapı bloklarını bulur: yenisine çizgi ekler, kalkanın çizgisini siler
function scan() {
  if (!G.scene) return;
  mats();
  const ids = Object.keys(DIM).map(Number);
  if (!ids.length) return;
  const seen = new Set();
  eachBlock(ids, (x, y, z, t) => {
    const d = DIM[t];
    if (!d) return;
    const k = x + ',' + y + ',' + z;
    seen.add(k);
    const w = wires.get(k);
    if (w && w.t === t) return;
    if (w) G.scene.remove(w.line);
    const line = new THREE.LineSegments(geoOf(d.W, d.H, d.D), k === activeKey ? mActive : mIdle);
    // Kutu yapının alanına göre: yatayda x - floor(W/2) ile başlar, dikeyde y'den H kadar yükselir
    line.position.set(x - Math.floor(d.W / 2) + d.W / 2, y + d.H / 2, z - Math.floor(d.D / 2) + d.D / 2);
    G.scene.add(line);
    wires.set(k, { line, t });
  });
  for (const [k, w] of wires) if (!seen.has(k)) { G.scene.remove(w.line); wires.delete(k); }
}

// Parlak vurgu: panel açıksa o yapı, değilse baktığın yapı. 150 ms'de bir kontrol edilir.
function tick() {
  if (!G.scene || !mIdle) return;
  let want = panelKey;
  if (!want && target && DIM[get(target[0], target[1], target[2])]) want = target[0] + ',' + target[1] + ',' + target[2];
  if (want === activeKey) return;
  const old = wires.get(activeKey), nw = wires.get(want);
  if (old) old.line.material = mIdle;
  if (nw) nw.line.material = mActive;
  activeKey = want;
}
