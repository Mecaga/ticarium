import { setWorldLight } from './world.js';

const CYCLE = 480, FOG_NEAR = 36, FOG_FAR = 72;   // sis, yüklü chunk sınırında tam kapanır
const sm = (a, b, x) => { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
const DAY = new THREE.Color(0x87ceeb), NIGHT = new THREE.Color(0x060a1e);
const DUSK = new THREE.Color(0xff8a50), DEEP = new THREE.Color(0x0f3b7a);
const tmp = new THREE.Color();
const sunDir = new THREE.Vector3();
let scene, sun, moon, stars, clouds, cloudMat, ambient, dirL, uwEl;

export const clock = { off: 0 };
export const gamePhase = () => ((Date.now() / 1000 + clock.off) % CYCLE) / CYCLE;

export function gameClock() {
  const hr = (gamePhase() * 24 + 6) % 24;
  const h = Math.floor(hr), m = Math.floor((hr - h) * 60);
  const day = hr >= 6 && hr < 18;
  return (day ? '☀️ ' : '🌙 ') + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

export function setLights(a, d) { ambient = a; dirL = d; }

function spriteTex(draw) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  draw(c.getContext('2d'));
  return new THREE.CanvasTexture(c);
}

export function initSky(sc) {
  scene = sc;
  sun = new THREE.Sprite(new THREE.SpriteMaterial({
    map: spriteTex(g => {
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,240,1)');
      gr.addColorStop(0.3, 'rgba(255,248,190,1)');
      gr.addColorStop(0.36, 'rgba(255,225,120,0.5)');
      gr.addColorStop(1, 'rgba(255,215,100,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    }),
    fog: false, depthWrite: false, transparent: true
  }));
  sun.scale.set(34, 34, 1);
  scene.add(sun);

  moon = new THREE.Sprite(new THREE.SpriteMaterial({
    map: spriteTex(g => {
      g.fillStyle = '#e8ecf5'; g.beginPath(); g.arc(64, 64, 40, 0, 6.3); g.fill();
      g.fillStyle = 'rgba(150,160,185,.55)';
      [[50, 52, 8], [76, 70, 10], [64, 40, 5], [48, 80, 6]].forEach(c => { g.beginPath(); g.arc(c[0], c[1], c[2], 0, 6.3); g.fill(); });
    }),
    fog: false, depthWrite: false, transparent: true
  }));
  moon.scale.set(22, 22, 1);
  scene.add(moon);

  const pts = [];
  for (let i = 0; i < 450; i++) {
    const v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
    if (v.lengthSq() < 0.01) continue;
    v.normalize().multiplyScalar(95);
    pts.push(v.x, v.y, v.z);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  stars = new THREE.Points(sg, new THREE.PointsMaterial({
    color: 0xffffff, size: 2.5, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false
  }));
  stars.frustumCulled = false;
  scene.add(stars);

  clouds = new THREE.Group();
  cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.88, fog: false });
  for (let i = 0; i < 12; i++) {
    const cl = new THREE.Group();
    const parts = 3 + Math.floor(Math.random() * 3);
    for (let p = 0; p < parts; p++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(6 + Math.random() * 8, 1.6, 4 + Math.random() * 5), cloudMat);
      b.position.set(Math.random() * 8 - 4, Math.random() * 0.6, Math.random() * 6 - 3);
      cl.add(b);
    }
    cl.position.set(Math.random() * 260 - 130, 40 + Math.random() * 8, Math.random() * 260 - 130);
    clouds.add(cl);
  }
  scene.add(clouds);

  uwEl = document.createElement('div');
  uwEl.style.cssText = 'position:fixed;inset:0;background:rgba(20,70,160,.38);pointer-events:none;z-index:3;display:none';
  document.body.appendChild(uwEl);
}

export function updateSky(dt, camera, uw) {
  const a = gamePhase() * Math.PI * 2, sy = Math.sin(a);
  sunDir.set(Math.cos(a) * 0.85, sy, 0.45).normalize();
  const k = sm(-0.12, 0.28, sy); // 0 gece, 1 gündüz

  tmp.copy(NIGHT).lerp(DAY, k);
  tmp.lerp(DUSK, Math.max(0, 1 - Math.abs(sy) * 3.5) * 0.55);
  if (uw) tmp.copy(DEEP).multiplyScalar(0.3 + 0.7 * k);
  scene.background.copy(tmp);
  scene.fog.color.copy(tmp);
  scene.fog.near = uw ? 0.5 : FOG_NEAR;
  scene.fog.far = uw ? 24 : FOG_FAR;

  setWorldLight((0.3 + 0.7 * k) * (uw ? 0.9 : 1));
  if (ambient) ambient.intensity = 0.25 + 0.5 * k;
  if (dirL) { dirL.intensity = 0.55 * k; dirL.position.copy(sunDir); }

  sun.position.copy(camera.position).addScaledVector(sunDir, 100);
  moon.position.copy(camera.position).addScaledVector(sunDir, -100);
  sun.visible = sy > -0.15 && !uw;
  moon.visible = sy < 0.15 && !uw;

  stars.position.copy(camera.position);
  stars.rotation.z = a * 0.5;
  const so = Math.max(0, 1 - k * 1.6);
  stars.material.opacity = so;
  stars.visible = so > 0.02 && !uw;

  cloudMat.color.setScalar(0.3 + 0.7 * k);
  clouds.visible = !uw;
  for (const c of clouds.children) {   // bulutlar karakteri takip eder
    c.position.x += dt * 1.3;
    const dx = c.position.x - camera.position.x, dz = c.position.z - camera.position.z;
    if (dx > 130) c.position.x -= 260; else if (dx < -130) c.position.x += 260;
    if (dz > 130) c.position.z -= 260; else if (dz < -130) c.position.z += 260;
  }
  uwEl.style.display = uw ? 'block' : 'none';
}
