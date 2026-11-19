// 128x128 PNG dosyalarını yükler. Dosya yoksa null döner, çağıran canvas çizimini kullanır.
const cache = new Map();
export function loadTool(folder, name) {
  const key = folder + '/' + name;
  if (!cache.has(key)) {
    const p = new Promise(res => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = 'js/world/textures/' + folder + '/' + name + '.png';
    });
    cache.set(key, p);
  }
  return cache.get(key);
}
