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
// Sıvının geçebileceği hücre: boş, bitki ya da aynı sıvı
const pass = (x, y, z, t) => { if (!isLoaded(x, z)) return false; const c = get(x, y, z); return c === 0 || isPlant(c) || c === t; };

// Bu hücre yana yayılabilir mi?
//  - altı boşsa: sadece aşağı akar, yatay hareket tamamen kesilir
//  - akan sıvı, aynı sıvının üstündeyse (düşen sütun) yayılmaz
//  - altı blokluysa yayılır; kaynak, aynı sıvının üstündeyse yayılır (deniz çukurları doldurur)
function canSpread(x, y, z, t) {
  if (y <= 0) return true;
  if (free(x, y - 1, z)) return false;
  if (get(x, y - 1, z) === t) return waterLvl(x, y, z) === 0;
  return true;
}

// ---- Sonsuz su kaynağı ----
// Bir hücrenin yanında (4 yön) yayılabilen en az 2 TAM su kaynağı varsa ve altı katı blok ya da su kaynağıysa
// hücre kaynak olur. Aralarında 1 boşluk (S _ S), L köşesi ve çapraz iki kaynağın arası bu kuraldan çıkar.
const srcOK = (x, y, z) => get(x, y, z) === WATER && waterLvl(x, y, z) === 0 && canSpread(x, y, z, WATER);
function srcCount(x, y, z) {
  let n = 0;
  for (const [dx, dz] of H4) if (srcOK(x + dx, y, z + dz)) n++;
  return n;
}
function baseOk(x, y, z) {
  if (y <= 0) return false;
  const b = get(x, y - 1, z);
  return (b !== 0 && !isPlant(b) && b !== WATER && b !== LAVA) || (b === WATER && waterLvl(x, y - 1, z) === 0);
}

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
  return canSpread(x, y, z, t) ? waterLvl(x, y, z) + 1 : 99;
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

// Bu hücreden başlayıp en yakın düşüşe (altı boş hücre) uzaklık. 99 = 4 blok içinde düşüş yok.
function holeDist(x, y, z, depth, fdx, fdz, t) {
  let best = 99;
  for (const [dx, dz] of H4) {
    if (dx === -fdx && dz === -fdz) continue;
    const nx = x + dx, nz = z + dz;
    if (!pass(nx, y, nz, t)) continue;
    if (free(nx, y - 1, nz)) return depth;
    if (depth < 4) { const d = holeDist(nx, y, nz, depth + 1, dx, dz, t); if (d < best) best = d; }
  }
  return best;
}

function step(x, y, z) {
  if (!isLoaded(x, z)) return;
  const t = get(x, y, z);

  // Boş hücre: yanında 2+ su kaynağı varsa sonsuz kaynak olur (kovayla alınan kaynak da böyle yenilenir)
  if (t === 0 || isPlant(t)) {
    if (srcCount(x, y, z) >= 2 && baseOk(x, y, z)) change(x, y, z, WATER);
    return;
  }
  if (t !== WATER && t !== LAVA) return;
  if (contact(x, y, z, t)) return;
  const l = waterLvl(x, y, z), ML = maxLv(t);

  if (l > 0) {   // akan sıvı: sonsuz kaynak olabilir, beslenmiyorsa kurur, seviyesi uymuyorsa düzelir
    if (t === WATER && srcCount(x, y, z) >= 2 && baseOk(x, y, z)) { change(x, y, z, WATER); return; }
    let need = get(x, y + 1, z) === t ? 1 : 99;
    for (const [dx, dz] of H4) {
      if (need <= 1) break;
      need = Math.min(need, feed(x + dx, y, z + dz, t));
    }
    if (need > ML) { change(x, y, z, 0); return; }
    if (need !== l) { change(x, y, z, t + need); return; }
  }

  // 1) Yerçekimi önceliği: altı boşsa sadece aşağı akar, yatay momentum kesilir
  if (y > 0 && free(x, y - 1, z)) { change(x, y - 1, z, t + 1); return; }

  // 2) Yatay yayılım sadece altı kapalıysa (blok ya da kaynağın altındaki deniz)
  if (!canSpread(x, y, z, t) || l >= ML) return;

  // Altı doluysa yana yayılır. 4 blok içinde bir düşüş varsa o yöne akar, yoksa her yöne.
  const dirs = [];
  let min = 99;
  for (const [dx, dz] of H4) {
    const nx = x + dx, nz = z + dz;
    if (!pass(nx, y, nz, t)) continue;
    const d = free(nx, y - 1, nz) ? 0 : holeDist(nx, y, nz, 1, dx, dz, t);
    dirs.push([nx, nz, d]);
    if (d < min) min = d;
  }
  for (const [nx, nz, d] of dirs) {
    if (min < 99 && d !== min) continue;
    const nt = get(nx, y, nz);
    if (nt === 0 || isPlant(nt)) change(nx, y, nz, t + l + 1);
    else if (nt === t && waterLvl(nx, y, nz) > l + 1) change(nx, y, nz, t + l + 1);
  }
  // Yayılacak yer yoksa hiçbir şey olmaz: sıvı durgun kalır
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
    if (get(x, y, z) === LAVA && tick % 4 !== 0) { q.add(k); continue; }   // lav 4 kat yavaş (su 0,25 sn, lav 1 sn)
    if (n++ > 700) { q.add(k); continue; }
    step(x, y, z);
  }
  }
