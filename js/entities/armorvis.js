const MATS = {};
const mat = c => MATS[c] || (MATS[c] = new THREE.MeshLambertMaterial({ color: c, polygonOffset: true, polygonOffsetFactor: -1 }));
const colOf = id => (id >= 95 ? 0x50e1d7 : 0xd0d0da);

export function showArmor(o, arm) {
  const key = arm || '';
  if (o.armKey === key) return;
  o.armKey = key;
  if (o.armG) { o.armG.parent.remove(o.armG); o.armG = null; }
  if (o.armH) { o.armH.parent.remove(o.armH); o.armH = null; }
  const ids = key.split(',').map(Number);
  if (!ids.some(Boolean)) return;
  const head = o.mesh.userData.head;
  const box = (w, h, d, x, y, z, id, par) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(colOf(id)));
    m.position.set(x, y, z); par.add(m); return m;
  };
  // Kask: kafanın üst kısmı, yüz açık
  if (ids[0] && head) {
    const hm = head.children.find(c => c.geometry && c.geometry.parameters && c.geometry.parameters.width);
    const p = hm ? hm.geometry.parameters : { width: 0.5, height: 0.5, depth: 0.5 };
    const c = hm ? hm.position : { x: 0, y: 0.25, z: 0 };
    const g = new THREE.Group();
    const w = p.width * 1.14, d = p.depth * 1.14, h = p.height * 0.55;
    box(w, h, d, c.x, c.y + p.height * 0.5 - h * 0.5 + 0.02, c.z, ids[0], g);
    head.add(g); o.armH = g;
  }
  // Gövde: baş pivotuna göre ölçeklenir (standart 1,8 blok boy)
  const neck = head ? head.position.y : 1.4, s = neck / 1.4;
  const g = new THREE.Group();
  if (ids[1]) box(0.58 * s, 0.76 * s, 0.34 * s, 0, neck - 0.42 * s, 0, ids[1], g);
  if (ids[2]) box(0.56 * s, 0.5 * s, 0.32 * s, 0, neck - 0.98 * s, 0, ids[2], g);
  if (ids[3]) box(0.56 * s, 0.22 * s, 0.36 * s, 0, 0.11 * s, 0, ids[3], g);
  o.mesh.add(g); o.armG = g;
}
