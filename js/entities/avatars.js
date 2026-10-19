function label(text) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 8, 256, 48);
  g.fillStyle = '#fff'; g.font = 'bold 30px sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(text).slice(0, 14), 128, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, fog: false }));
  s.scale.set(2, 0.5, 1);
  s.renderOrder = 10;
  s.position.y = 2.1;
  return s;
}

// Üstü pivotlu uzuv (dönünce omuzdan/kalçadan sallanır)
function limb(w, h, d, mat, x, y) {
  const p = new THREE.Group();
  p.position.set(x, y, 0);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.y = -h / 2;
  p.add(m);
  return p;
}

export function makeAvatar(name, id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  const color = new THREE.Color().setHSL(h / 360, 0.6, 0.5);
  const m = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const headMat = new THREE.MeshLambertMaterial({ color: 0xf1c27d });
  const pantsMat = new THREE.MeshLambertMaterial({ color: 0x35457a });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.35), bodyMat);
  body.position.y = 0.85;
  const headG = new THREE.Group();
  headG.position.y = 1.55;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), headMat);
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.05), new THREE.MeshBasicMaterial({ color: 0x222222 }));
  face.position.set(0, 0, -0.21);
  headG.add(head, face);

  const legL = limb(0.27, 0.42, 0.27, pantsMat, -0.15, 0.42);
  const legR = limb(0.27, 0.42, 0.27, pantsMat, 0.15, 0.42);
  const armL = limb(0.2, 0.62, 0.22, headMat, -0.42, 1.28);
  const armR = limb(0.2, 0.62, 0.22, headMat, 0.42, 1.28);

  m.add(body, headG, legL, legR, armL, armR);
  try { m.add(label(name)); } catch (e) {} // isim yazısı olmasa da karakter görünsün
  m.userData = { head: headG, legL, legR, armL, armR, mats: [bodyMat, headMat, pantsMat] };
  m.visible = false;
  return m;
}

// Yürüme sallanması + vurma kolu
export function animateAvatar(o, speed, dt) {
  const u = o.mesh.userData;
  o.phase = (o.phase || 0) + dt * Math.min(speed, 6) * 2.2;
  const s = Math.sin(o.phase) * Math.min(1, speed / 3) * 0.9;
  u.legL.rotation.x = s; u.legR.rotation.x = -s;
  u.armL.rotation.x = -s;
  if (o.swing > 0) {
    o.swing -= dt;
    u.armR.rotation.x = -Math.sin((1 - Math.max(0, o.swing) / 0.35) * Math.PI) * 1.7;
  } else u.armR.rotation.x = s;
}

// Vurulan karakter kısa süre kırmızı yanar
export function tint(o) {
  if (!o || !o.mesh) return;
  const mats = o.mesh.userData.mats || [];
  mats.forEach(m => m.emissive.setHex(0xff0000));
  clearTimeout(o.tt);
  o.tt = setTimeout(() => mats.forEach(m => m.emissive.setHex(0x000000)), 260);
}
