import { atlas, tileNames, tileOf, clearIcons } from './textures.js';
import { categoryOf } from './tex/categories.js';
import { drawHud } from '../ui/ui.js';

const KEY = 'bd_tp';
export const packOn = () => { try { return localStorage.getItem(KEY) !== '0'; } catch (e) { return true; } };

export function initPack() {
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
  if (!packOn() || !atlas.cv || initPack.done) return;
  initPack.done = true;
  const ctx = atlas.cv.getContext('2d');
  tileNames.forEach(name => {
    const put = img => {
      const x = tileOf(name) * 16;
      ctx.clearRect(x, 0, 16, 16);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, img.width, img.height, x, 0, 16, 16);
      atlas.tex.needsUpdate = true;
      clearIcons(); drawHud();
    };
    const img = new Image();
    img.onload = () => put(img);
    img.onerror = () => {   // kategori klasöründe yoksa eski düz yola bak
      const i2 = new Image();
      i2.onload = () => put(i2);
      i2.src = 'textures/' + name + '.png';
    };
    img.src = 'textures/' + categoryOf(name) + '/' + name + '.png';
  });
}
