import { G } from '../core/state.js';
import { eachBlock, faceAt, target } from '../world/world.js';
import { footprint, DX, DZ } from './structgeo.js';

// Yapı alanı çizgileri. Her yapı bloğunun kutusu mavi çizilir (köşe yapılarda döndürülmüş).
// Köşe yapılarda ön yüze (giriş) sarı bir ok çizilir. Panel açıksa ya da baktığın yapı parlak mavi olur.
// Yüklü chunk'lardaki bloklar taranır, başka oyuncunun koyduğu yapılar da en geç 1 saniyede görünür.

const IDLE = 0x2f7dd1, ACTIVE = 0x9be4ff, ARROW = 0xffcc33;
const SP = {};              // blok numarası -> yapı tanımı (initWires doldurur)
const wires = new Map();    // "x,y,z" -> { grp, box, arrow, sig }
const boxGeos = new Map();  // "WxHxD" -> kenar geometrisi (paylaşılır, silinmez)
let mIdle = null, mActive = null, mArrow = null, panelKey = '', activeKey = '';

export function initWires(specs) {
  for (const s of specs) SP[s.blk] = s;
  setInterval(scan, 1000);
  setInterval(tick, 150);
}

// Panel açılınca (x,y,z), kapanınca null
export function setPanelWire(x, y, z) {
  panelKey = x == null ? '' : x + ',' + y + ',' + z;
}

// Blok kırılınca ya da kurulum başlayınca çizgiyi hemen kaldırır
export function clearWireAt(x, y, z) {
  const k = x + ',' + y + ',' + z, w = wires.get(k);
  if (w) { dispose(w); wires.delete(k); }
  if (activeKey === k) activeKey = '';
}

function mats() {
  if (mIdle) return;
  mIdle = new THREE.LineBasicMaterial({ color: IDLE, transparent: true, opacity: 0.75, fog: false });
  mActive = new THREE.LineBasicMaterial({ color: ACTIVE, fog: false });
  mArrow = new THREE.LineBasicMaterial({ color: ARROW, fog: false });
}

function boxGeo(W, H, D) {
  const k = W + 'x' + H + 'x' + D;
  if (!boxGeos.has(k)) boxGeos.set(k, new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, D)));
  return boxGeos.get(k);
}

// Ön yüzden dışarı çıkan sarı ok. (fx, fz): ön yüzün orta noktası, (dx, dz): dışa yön
function arrowGeo(fx, fy, fz, dx, dz) {
  const L = 2.6, px = -dz, pz = dx;
  const tx = fx + dx * L, tz = fz + dz * L;
  const hx = tx - dx * 0.7, hz = tz - dz * 0.7;
  const v = [
    fx, fy, fz, tx, fy, tz,
    tx, fy, tz, hx + px * 0.5, fy, hz + pz * 0.5,
    tx, fy, tz, hx - px * 0.5, fy, hz - pz * 0.5
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  return g;
}

function build(s, x, y, z, f, sig, k) {
  const fp = footprint(s, f), Y0 = s.Y0 || 0;
  const FW = fp.x1 - fp.x0 + 1, FD = fp.z1 - fp.z0 + 1, HH = s.H - Y0;
  const cx = x + fp.x0 + FW / 2, cz = z + fp.z0 + FD / 2, cy = y + Y0 + HH / 2;
  const grp = new THREE.Group();
  const box = new THREE.LineSegments(boxGeo(FW, HH, FD), k === activeKey ? mActive : mIdle);
  box.position.set(cx, cy, cz);
  grp.add(box);
  let arrow = null;
  if (s.ax === 'corner') {
    let fx = cx, fz = cz;
    if (f === 0) fz = z + fp.z0;
    else if (f === 2) fz = z + fp.z1 + 1;
    else if (f === 1) fx = x + fp.x1 + 1;
    else fx = x + fp.x0;
    arrow = new THREE.LineSegments(arrowGeo(fx, y + 1, fz, DX[f], DZ[f]), mArrow);
    grp.add(arrow);
  }
  G.scene.add(grp);
  return { grp, box, arrow, sig };
}

function dispose(w) {
  if (G.scene) G.scene.remove(w.grp);
  if (w.arrow) w.arrow.geometry.dispose();
}

function scan() {
  if (!G.scene) return;
  mats();
  const ids = Object.keys(SP).map(Number);
  if (!ids.length) return;
  const seen = new Set();
  eachBlock(ids, (x, y, z, t) => {
    const s = SP[t];
    if (!s) return;
    const f = s.ax === 'corner' ? (faceAt(x, y, z) & 3) : 0;
    const k = x + ',' + y + ',' + z, sig = t * 4 + f;
    seen.add(k);
    const w = wires.get(k);
    if (w && w.sig === sig) return;
    if (w) dispose(w);
    wires.set(k, build(s, x, y, z, f, sig, k));
  });
  for (const [k, w] of wires) if (!seen.has(k)) { dispose(w); wires.delete(k); }
}

// Vurgu: panel açıksa o yapı, değilse baktığın yapı parlak mavi (150 ms'de bir kontrol)
function tick() {
  if (!G.scene || !mIdle) return;
  let want = panelKey;
  if (!want && target) {
    const tk = target[0] + ',' + target[1] + ',' + target[2];
    if (wires.has(tk)) want = tk;
  }
  if (want === activeKey) return;
  const old = wires.get(activeKey), nw = wires.get(want);
  if (old) old.box.material = mIdle;
  if (nw) nw.box.material = mActive;
  activeKey = want;
}
