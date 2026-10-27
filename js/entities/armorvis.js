// Diğer oyuncuların üstünde zırh kutuları (standart ~1.8 blok boy varsayımı)
const MATS = {};
const mat = c => MATS[c] || (MATS[c] = new THREE.MeshLambertMaterial({ color: c }));
const colOf = id => (id >= 95 ? 0x50e1d7 : 0xd0d0da);

export function showArmor(o, arm) {
  const key = arm || '';
  if (o.armKey === key) return;
  o.armKey = key;
  if (o.armG) { o.mesh.remove(o.armG); o.armG = null; }
  const ids = key.split(',').map(Number);
  if (!ids.some(Boolean)) return;
  const g = new THREE.Group();
  const box = (w, h, d, y, id) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(colOf(id)));
    m.position.y = y; g.add(m);
  };
  if (ids[0]) box(0.52, 0.52, 0.52, 1.575, ids[0]);
  if (ids[1]) box(0.52, 0.7, 0.3, 1.01, ids[1]);
  if (ids[2]) box(0.5, 0.45, 0.28, 0.45, ids[2]);
  if (ids[3]) box(0.5, 0.2, 0.32, 0.1, ids[3]);
  o.mesh.add(g);
  o.armG = g;
}
