import { atlas, tileNames, tileOf, clearIcons } from './textures.js';
import { drawHud } from '../ui/ui.js';

const KEY = 'bd_tp';
export const packOn = () => { try { return localStorage.getItem(KEY) !== '0'; } catch (e) { return true; } };

export function initPack() {
  // Menü düğmesi
  const main = document.getElementById('sMain');
  if (main && !document.getElementById('mPack')) {
    const b = document.createElement('button');
    b.id = 'mPack'; b.className = 'alt';
    b.textContent = '🎨 Doku paketi: ' + (packOn() ? 'Açık' : 'Kapalı');
    b.onclick = () => {
      try { localStorage.setItem(KEY, packOn() ? '0' : '1'); } catch (e) {}
      location.reload();
    };
    main.appendChild(b);
  }
  if (!packOn() || !atlas.cv) return;
  const ctx = atlas.cv.getContext('2d');
  let n = 0;
  tileNames.forEach(name => {
    const img = new Image();
    img.onload = () => {
      const x = tileOf(name) * 16;
      ctx.clearRect(x, 0, 16, 16);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, img.width, img.height, x, 0, 16, 16);
      atlas.tex.needsUpdate = true;
      if (++n) { clearIcons(); drawHud(); }
    };
    img.src = 'textures/' + name + '.png?v=' + Date.now();   // dosya yoksa sessizce atlanır
  });
}
