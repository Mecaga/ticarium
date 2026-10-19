import { N, H, get, set, wh, waterLvl, inBounds, isPlant, WATER, LAVA } from './world.js';
import { ghooks } from './gravity.js';

const STONE = 3;
const H4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const D6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const q = new Set();
let sim = false, acc = 0, tick = 0;
const key = (x, y, z) => (y * N + z) * N + x;
const maxLv = t => (t === WATER ? 5 : 3);   // su 5 blok, lav 3 blok yayılır
const free = (x, y, z) => { const t = get(x, y, z); return t === 0 || isPlant(t); };

function queue(x, y, z) { if (inBounds(x, y, z)) q.add(key(x, y, z)); }

// Blok değişince çevresini kontrol listesine ekle (sadece simülasyonu yapan cihazda)
wh.fn = (x, y, z) => {
  if (!sim) return;
  queue(x, y, z); queue(x + 1, y, z); queue(x - 1, y, z);
  queue(x, y, z + 1); queue(x, y, z - 1); queue(x, y + 1, z); queue(x, y - 1, z);
};

// Tek oyunculuda ve oda sahibinde açık. Diğer oyuncular sonucu bloklardan alır.
export function setSimulate(v) { sim = !!v; if (!v) q.clear(); }

// Yüklenen dünyadaki akan sıvıları yeniden doğrula
export function revalidate() {
  if (!sim) return;
  for (let y = 0; y < H; y++) for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const t = get(x, y, z);
    if ((t === WATER || t === LAVA) && waterLvl(x, y, z) > 0) q.add(key(x, y, z));
  }
}

function change(x, y, z, raw) {
  set(x, y, z, raw);
  if (ghooks.onChange) ghooks.onChange(x, y, z, raw);
}

// Komşu bu hücreyi yatay besliyor mu: veriyorsa seviye, yoksa 99
function feed(x, y, z, t) {
  if (get(x, y, z) !== t) return 99;
  const l = waterLvl(x, y, z);
  return (l === 0 || !free(x, y - 1, z)) ? l + 1 : 99;
}

// Su ve lav değerse lav taşa döner
function contact(x, y, z, t) {
  for (const [dx, dy, dz] of D6) {
    const nt = get(x + dx, y + dy, z + dz);
    if (t === WATER && nt === LAVA) change(x + dx, y + dy, z + dz, STONE);
    else if (t === LAVA && nt === WATER) { change(x, y, z, STONE); return true; }
  }
  return false;
}

function step(x, y, z) {
  const t = get(x, y, z);
  if (t !== WATER && t !== LAVA) return;
  if (contact(x, y, z, t)) return;
  const l = waterLvl(x, y, z), ML = maxLv(t);
  if (l > 0) {
    let need = get(x, y + 1, z) === t ? 1 : 99;
    let srcs = 0;
    for (const [dx, dz] of H4) {
      const nx = x + dx, nz = z + dz;
      if (need > 1) need = Math.min(need, feed(nx, y, nz, t));
      if (get(nx, y, nz) === t && waterLvl(nx, y, nz) === 0) srcs++;
    }
    if (t === WATER && srcs >= 2) { // yanında iki su kaynağı varsa yeni kaynak oluşur
      const b = get(x, y - 1, z);
      if ((b !== 0 && !isPlant(b) && b !== WATER && b !== LAVA) || (b === WATER && waterLvl(x, y - 1, z) === 0)) {
        change(x, y, z, WATER); return;
      }
    }
    if (need > ML) { change(x, y, z, 0); return; }              // beslenmiyor: kurur
    if (need !== l) { change(x, y, z, t + need); return; }      // seviyeyi düzelt
  }
  const fall = y > 0 && free(x, y - 1, z);
  if (fall) change(x, y - 1, z, t + 1);                          // aşağı düşer
  if (l >= ML || (l > 0 && fall)) return;
  for (const [dx, dz] of H4) {                                   // yanlara yayılır (kapalı yöne gitmez)
    const nx = x + dx, nz = z + dz;
    if (!inBounds(nx, y, nz)) continue;
    const nt = get(nx, y, nz);
    if (nt === 0 || isPlant(nt)) change(nx, y, nz, t + l + 1);
    else if (nt === t && waterLvl(nx, y, nz) > l + 1) change(nx, y, nz, t + l + 1);
  }
}

export function updateFluids(dt) {
  if (!sim || !q.size) return;
  acc += dt;
  if (acc < 0.25) return;
  acc = 0;
  tick++;
  const cur = [...q];
  q.clear();
  let n = 0;
  for (const k of cur) {
    const x = k % N, y = Math.floor(k / (N * N)), z = Math.floor(k / N) % N;
    if (get(x, y, z) === LAVA && tick % 4 !== 0) { q.add(k); continue; }   // lav 4 kat yavaş akar
    if (n++ > 700) { q.add(k); continue; }
    step(x, y, z);
  }
}
