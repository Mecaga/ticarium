import { get, set, wh, waterLvl, inBounds, isPlant, isLoaded, eachFlow, WATER, LAVA, OBSIDIAN } from './world.js';
import { ghooks } from './gravity.js';

const STONE = 3, OFF = 1048576, SPAN = 2097152;
const H4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const D6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const q = new Set();
let sim = false, acc = 0, tick = 0;
const key = (x, y, z) => ((x + OFF) * SPAN + (z + OFF)) * 32 + y;
const maxLv = t => (t === WATER ? 5 : 3);   // su 5 blok, lav 3 blok yayılır
// Yüklü olmayan chunk dolu sayılır (sıvı oraya akmaz)
const free = (x, y, z) => { if (!isLoaded(x, z)) return false; const t = get(x, y, z); return t === 0 || isPlant(t); };

function queue(x, y, z) { if (inBounds(x, y, z)) q.add(key(x, y, z)); }

wh.fn = (x, y, z) => {
  if (!sim) return;
  queue(x, y, z); queue(x + 1, y, z); queue(x - 1, y, z);
  queue(x, y, z + 1); queue(x, y, z - 1); queue(x, y + 1, z); queue(x, y - 1, z);
};

// Akışı sadece oda yönetimi sende olan cihaz hesaplar, diğerleri sonucu bloklardan alır
export function setSimulate(v) { sim = !!v; if (!v) q.clear(); }

export function revalidate() {
  if (!sim) return;
  eachFlow((x, y, z) => q.add(key(x, y, z)));
}

function change(x, y, z, raw) {
  set(x, y, z, raw);
  if (ghooks.onChange) ghooks.onChange(x, y, z, raw);
}

function feed(x, y, z, t) {
  if (get(x, y, z) !== t) return 99;
  const l = waterLvl(x, y, z);
  return (l === 0 || !free(x, y - 1, z)) ? l + 1 : 99;
}

// Su lava değerse: lav kaynağı obsidiyen, akan lav taş olur
function contact(x, y, z, t) {
  for (const [dx, dy, dz] of D6) {
    const nx = x + dx, ny = y + dy, nz = z + dz, nt = get(nx, ny, nz);
    if (t === WATER && nt === LAVA) change(nx, ny, nz, waterLvl(nx, ny, nz) === 0 ? OBSIDIAN : STONE);
    else if (t === LAVA && nt === WATER) { change(x, y, z, waterLvl(x, y, z) === 0 ? OBSIDIAN : STONE); return true; }
  }
  return false;
}

function step(x, y, z) {
  if (!isLoaded(x, z)) return;
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
    if (t === WATER && srcs >= 2) {   // yanında iki su kaynağı varsa yeni kaynak oluşur
      const b = get(x, y - 1, z);
      if ((b !== 0 && !isPlant(b) && b !== WATER && b !== LAVA) || (b === WATER && waterLvl(x, y - 1, z) === 0)) {
        change(x, y, z, WATER); return;
      }
    }
    if (need > ML) { change(x, y, z, 0); return; }              // beslenmiyor: kurur
    if (need !== l) { change(x, y, z, t + need); return; }
  }
  const fall = y > 0 && free(x, y - 1, z);
  if (fall) change(x, y - 1, z, t + 1);                          // altı boşsa aşağı akar
  if (l >= ML || (l > 0 && fall)) return;
  for (const [dx, dz] of H4) {                                   // altında blok varsa yana yayılır
    const nx = x + dx, nz = z + dz;
    if (!isLoaded(nx, nz)) continue;
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
    const y = k % 32, r = (k - y) / 32;
    const z = r % SPAN - OFF, x = Math.floor(r / SPAN) - OFF;
    if (get(x, y, z) === LAVA && tick % 4 !== 0) { q.add(k); continue; }   // lav 4 kat yavaş akar
    if (n++ > 700) { q.add(k); continue; }
    step(x, y, z);
  }
}
