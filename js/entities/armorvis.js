const MATS = {};
const mat = c => MATS[c] || (MATS[c] = new THREE.MeshLambertMaterial({ color: c, polygonOffset: true, polygonOffsetFactor: -1 }));
const colOf = id => (id >= 95 ? 0x50e1d7 : 0xd0d0da);

export function showArmor(o, arm) {
  const key = arm || '';
  if (o.armKey === key) return;
  o.armKey = key;
  (o.armList || []).forEach(m => m.parent && m.parent.remove(m));
  o.armList = [];
  const ids = key.split(',').map(Number);
  if (!ids.some(Boolean)) return;
  const u = o.mesh.userData;
  const add = (par, w, h, d, x, y, z, id) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(colOf(id)));
    m.position.set(x, y, z); par.add(m); o.armList.push(m);
  };
  if (ids[0]) add(u.head, 0.46, 0.22, 0.46, 0, 0.12, 0, ids[0]);          // kask: sadece üst kısım
  if (ids[1]) add(o.mesh, 0.68, 0.98, 0.42, 0, 0.85, 0, ids[1]);           // göğüslük
  if (ids[2]) { add(u.legL, 0.31, 0.26, 0.31, 0, -0.13, 0, ids[2]); add(u.legR, 0.31, 0.26, 0.31, 0, -0.13, 0, ids[2]); }
  if (ids[3]) { add(u.legL, 0.31, 0.16, 0.33, 0, -0.34, 0, ids[3]); add(u.legR, 0.31, 0.16, 0.33, 0, -0.34, 0, ids[3]); }
}
