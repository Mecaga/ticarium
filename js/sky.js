import { N } from './world.js';

let sun, clouds;
const DIR = new THREE.Vector3(0.5, 0.75, 0.4).normalize();

export function initSky(scene) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,240,1)');
  gr.addColorStop(0.3, 'rgba(255,248,190,1)');
  gr.addColorStop(0.36, 'rgba(255,225,120,0.5)');
  gr.addColorStop(1, 'rgba(255,215,100,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  sun = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(c), fog: false, depthWrite: false, transparent: true
  }));
  sun.scale.set(34, 34, 1);
  scene.add(sun);

  clouds = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.88, fog: false });
  for (let i = 0; i < 8; i++) {
    const cl = new THREE.Group();
    const parts = 3 + Math.floor(Math.random() * 3);
    for (let p = 0; p < parts; p++) {
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(6 + Math.random() * 8, 1.6, 4 + Math.random() * 5), mat);
      b.position.set(Math.random() * 8 - 4, Math.random() * 0.6, Math.random() * 6 - 3);
      cl.add(b);
    }
    cl.position.set(Math.random() * (N + 160) - 80, 40 + Math.random() * 8, Math.random() * (N + 160) - 80);
    clouds.add(cl);
  }
  scene.add(clouds);
}

export function updateSky(dt, camera) {
  if (sun) sun.position.copy(camera.position).addScaledVector(DIR, 100);
  if (clouds) {
    for (const c of clouds.children) {
      c.position.x += dt * 1.3;
      if (c.position.x > N + 80) c.position.x = -80;
    }
  }
}
