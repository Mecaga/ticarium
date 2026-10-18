import { N, H, get, set, wh, waterLvl, inBounds, WATER, SAPLING } from './world.js';
import { ghooks } from './gravity.js';

const H4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const q = new Set();
let sim = false, acc = 0;
const key = (x, y, z) => (y * N + z) * N + x;
const isW = (x, y, z) => get(x, y, z) === WATER;
const free = (x, y, z) => { const t = get(x, y, z); return t === 0 || t === SAPLING; };

function queue(x, y, z) { if (inBounds(x, y, z)) q.add(key(x, y, z)); }

// Blok değişince çevresini kontrol listesine ekle (sadece simülasyonu yapan cihazda)
wh.fn = (x, y, z) => {
  if (!sim) return;
  queue(x, y, z); queue(x + 1, y, z); queue(x - 1, y, z);
  queue(x, y, z + 1); queue(x, y, z - 1); queue(x, y + 1, z); queue(x, y - 1, z);
};

// Tek oyunculuda ve oda sahibinde açık. Diğer oyuncular sonucu bloklardan alır.
export function setSimulate(v) { sim = !!v; if (!v) q.clear(); }

// Yüklenen dünyadaki akan suları yeniden doğrula
export function revalidate() {
  if (!sim) return;
  for (let y = 0; y < H; y++) for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    if (get(x, y, z) === WATER && waterLvl(x, y, z) > 0) q.add(key(x, y, z));
  }
}

function change(x, y, z, raw) {
  set(x, y, z, raw);
  if (ghooks.onChange) ghooks.onChange(x, y, z, raw);
}

// Komşu bu hücreyi yatay besliyor mu: veriyorsa seviye, yoksa 99
function feed(x, y, z) {
  if (!isW(x, y, z)) return 99;
  const l = waterLvl(x, y, z);
  return (l === 0 || !free(x, y - 1, z)) ? l + 1 : 99;
}

function step(x, y, z) {
  if (!isW(x, y, z)) return;
  const l = waterLvl(x, y, z);
  if (l > 0) {
    let need = isW(x, y + 1, z) ? 1 : 99;
    let srcs = 0;
    for (const [dx, dz] of H4) {
      const nx = x + dx, nz = z + dz;
      if (need > 1) need = Math.min(need, feed(nx, y, nz));
      if (isW(nx, y, nz) && waterLvl(nx, y, nz) === 0) srcs++;
    }
    if (srcs >= 2) { // yanında iki kaynak varsa yeni kaynak oluşur
      const b = get(x, y - 1, z);
      if ((b !== 0 && b !== SAPLING && b !== WATER) || (b === WATER && waterLvl(x, y - 1, z) === 0)) {
        change(x, y, z, WATER); return;
      }
    }
    if (need > 7) { change(x, y, z, 0); return; }                  // beslenmiyor: kurur
    if (need !== l) { change(x, y, z, WATER + need); return; }     // seviyeyi düzelt
  }
  const fall = y > 0 && free(x, y - 1, z);
  if (fall) change(x, y - 1, z, WATER + 1);                         // aşağı düşer
  if (l >= 7 || (l > 0 && fall)) return;
  for (const [dx, dz] of H4) {                                      // yanlara yayılır
    const nx = x + dx, nz = z + dz;
    if (!inBounds(nx, y, nz)) continue;
    const t = get(nx, y, nz);
    if (t === 0 || t === SAPLING) change(nx, y, nz, WATER + l + 1);
    else if (t === WATER && waterLvl(nx, y, nz) > l + 1) change(nx, y, nz, WATER + l + 1);
  }
}

export function updateWater(dt) {
  if (!sim || !q.size) return;
  acc += dt;
  if (acc < 0.25) return;
  acc = 0;
  const cur = [...q];
  q.clear();
  let n = 0;
  for (const k of cur) {
    if (n++ > 700) { q.add(k); continue; }
    step(k % N, Math.floor(k / (N * N)), Math.floor(k / N) % N);
  }
}
