import { wlHook, get, CANVAS } from './world.js';

// Kırılan tuvallerin çizimleri (son kırılan ilk yerleştirilir)
export const stack = [];

let group = null, light = 1, acc = 0;
const items = new Map();   // 'x_y_z' -> { mesh, mat, data, miss }
const keyOf = (x, y, z) => x + '_' + y + '_' + z;

export function initPaints(scene) {
  group = new THREE.Group();
  scene.add(group);
  wlHook.fn = v => { light = v; items.forEach(p => p.mat.color.setScalar(v)); };
}

export function setPaint(x, y, z, data) {
  if (!group) return;
  if (typeof data !== 'string' || !data) return removePaint(x, y, z);
  const k = keyOf(x, y, z);
  let p = items.get(k);
  if (p && p.data === data) return;
  if (!p) {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(light) });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.006, 1.006, 1.006), mat);
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    mesh.visible = false;
    group.add(mesh);
    p = { mesh, mat, data: '', miss: 0 };
    items.set(k, p);
  }
  p.data = data;
  const img = new Image();
  img.onload = () => {
    if (items.get(k) !== p || p.data !== data) return;
    const tex = new THREE.Texture(img);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    if (p.mat.map) p.mat.map.dispose();
    p.mat.map = tex;
    p.mat.needsUpdate = true;
    p.mesh.visible = true;
  };
  img.src = data;
}

export const getPaint = (x, y, z) => { const p = items.get(keyOf(x, y, z)); return p ? p.data : null; };

export function removePaint(x, y, z) {
  const k = keyOf(x, y, z), p = items.get(k);
  if (!p) return;
  group.remove(p.mesh);
  p.mesh.geometry.dispose();
  if (p.mat.map) p.mat.map.dispose();
  p.mat.dispose();
  items.delete(k);
}

export function clearPaints() {
  for (const k of [...items.keys()]) {
    const [x, y, z] = k.split('_').map(Number);
    removePaint(x, y, z);
  }
}

// Tuval bloğu başka biri tarafından kırıldıysa çizimi de kaldır
export function updatePaints(dt) {
  acc += dt;
  if (acc < 1) return;
  acc = 0;
  for (const [k, p] of [...items]) {
    const [x, y, z] = k.split('_').map(Number);
    if (get(x, y, z) === CANVAS) p.miss = 0;
    else if (++p.miss >= 3) removePaint(x, y, z);
  }
}
