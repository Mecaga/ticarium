import { N } from '../world/idtable.js';
import { TYPES, CATS, get, set, rebuild, wtarget, WATER } from '../world/world.js';
import { addFlat } from '../world/textures.js';
import { eco } from './economy.js';
import { RECIPES } from './recipes.js';
import { SMELT } from '../ui/furnace.js';
import { toast, drawHud } from '../ui/ui.js';
import { addItem, canAdd } from './inventory.js';
import { hurt, isDead } from '../entities/health.js';
import { P } from '../entities/player.js';
import { G } from '../core/state.js';
import { recordChange } from './progress.js';
import { sfx } from '../core/sound.js';
import { MAXDUR } from './gear.js';
import { FOODX } from './content.js';
import { dropItems } from '../entities/items.js';
import { setLure, lureBite } from './fish.js';

// ---- Kayıtlar (dokular extra_items.js'ten gelir) ----
function reg(id, name, color, base, flat, cat) {
  TYPES[id] = { name, color, base };
  eco.inv[id] = 0; eco.raw[id] = base; eco.trend[id] = 0;
  if (flat) addFlat(id);
  if (cat != null && !CATS[cat][1].includes(id)) CATS[cat][1].push(id);
}
reg(N.OLTA, 'Olta', 0x8c6434, 40, true, 3);
reg(N.SOMON, 'Somon', 0xe8836a, 12, true, 2);
reg(N.HAMSI, 'Hamsi', 0xaab4c8, 8, true, 2);
reg(N.KIRPI_BALIGI, 'Kirpi balığı', 0xb89a50, 6, true, 2);
reg(N.BALON_BALIGI, 'Balon balığı', 0xd8d070, 10, true, 2);
reg(N.PISMIS_SOMON, 'Pişmiş somon', 0xc86a40, 24, true, 2);
reg(N.PISMIS_HAMSI, 'Pişmiş hamsi', 0x8a8a98, 16, true, 2);
reg(N.PISMIS_BALON_BALIGI, 'Pişmiş balon balığı', 0xb8b050, 20, true, 2);
reg(N.CAKMAK_TASI, 'Çakmaktaşı', 0x444448, 20, true, 4);
reg(N.TNT, 'TNT', 0xd03030, 60, false, 0);
MAXDUR[N.OLTA] = 64; MAXDUR[N.CAKMAK_TASI] = 64;

Object.assign(FOODX, { [N.SOMON]: 3, [N.HAMSI]: 2, [N.BALON_BALIGI]: 2, [N.PISMIS_SOMON]: 9, [N.PISMIS_HAMSI]: 6, [N.PISMIS_BALON_BALIGI]: 7 });
Object.assign(SMELT, { [N.SOMON]: N.PISMIS_SOMON, [N.HAMSI]: N.PISMIS_HAMSI, [N.BALON_BALIGI]: N.PISMIS_BALON_BALIGI });

const S = N.CUBUK, I = N.IP;
RECIPES.push({ out: [N.OLTA, 1], pat: [[0, 0, S], [0, S, I], [S, 0, I]] });
RECIPES.push({ out: [N.CAKMAK_TASI, 1], shapeless: [N.CAKIL, N.DEMIR_KULCE] });
RECIPES.push({ out: [N.TNT, 1], pat: [[N.KUM, N.CAKIL, N.KUM], [N.CAKIL, N.KUM, N.CAKIL], [N.KUM, N.CAKIL, N.KUM]] });

// ---- Olta: suya bakıp Koy ile atılır. Şamandıra fırlar, balık ısırınca Koy ile toplanır ----
const LINE_MAT = new THREE.LineBasicMaterial({ color: 0xf0f0f0 });
const BOB_MAT = new THREE.MeshBasicMaterial({ color: 0xe53935 });
const linePos = new Float32Array(6);
let cast = null;   // { x, y, z: suyun hücresi, item, st: 'fly' | 'wait' | 'bite', t0, next, biteEnd }
let bob = null, line = null;

export const isCasting = () => !!cast;

function ensureVisual() {
  if (bob || !G.scene) return;
  bob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), BOB_MAT);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
  line = new THREE.Line(geo, LINE_MAT);
  line.frustumCulled = false;
  bob.visible = false; line.visible = false;
  G.scene.add(bob);
  G.scene.add(line);
}

function hideVisual() { if (bob) { bob.visible = false; line.visible = false; } }

// Elin konumu: kameranın biraz sağ-altı
function handPos() {
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
  return [P.x + fx * 0.35 + rx * 0.3, P.y + 1.25, P.z + fz * 0.35 + rz * 0.3];
}

function cancel(msg) {
  cast = null; setLure(false); hideVisual();
  if (msg) toast(msg);
}

function catchFish() {
  const t = cast.item;
  cancel(null);
  if (canAdd(t, 1)) addItem(t, 1);
  else dropItems([{ t, c: 1, x: P.x, y: P.y + 1.3, z: P.z, vx: 0, vy: 2, vz: 0 }]);
  sfx.splash(); drawHud();
  toast('🐟 ' + TYPES[t].name + ' tuttun!');
}

// Koy: atılıyken ya da beklerken oltayı geri çeker. Balık ısırmışsa toplar.
export function useRod() {
  ensureVisual();
  if (cast) return cast.st === 'bite' ? catchFish() : cancel('🎣 Olta toplandı');
  if (!wtarget || get(wtarget[0], wtarget[1], wtarget[2]) !== WATER) return toast('Oltayı suya bakarak kullan');
  cast = { x: wtarget[0], y: wtarget[1], z: wtarget[2], item: 0, st: 'fly', t0: performance.now(), next: 0, biteEnd: 0 };
  toast('🎣 Olta atıldı. Balık ısırınca Koy\'a bas');
}

// Her karede: şamandıranın fırlaması, beklemesi ve ısırması. Çizgi elden şamandıraya uzanır.
function updateCast() {
  ensureVisual();
  if (!bob || !G.room || isDead() || eco.sel !== N.OLTA) return cancel(null);
  if (Math.hypot(P.x - (cast.x + 0.5), P.z - (cast.z + 0.5)) > 8) return cancel('🎣 Olta toplandı (çok uzaklaştın)');
  const c = cast, n = performance.now(), [hx, hy, hz] = handPos();
  const tx = c.x + 0.5, ty = c.y + 0.9, tz = c.z + 0.5;
  let bx = tx, by = ty, bz = tz;
  if (c.st === 'fly') {
    const k = Math.min(1, (n - c.t0) / 350);
    bx = hx + (tx - hx) * k; bz = hz + (tz - hz) * k;
    by = hy + (ty - hy) * k + Math.sin(k * Math.PI) * 0.6;
    if (k >= 1) { c.st = 'wait'; c.t0 = n; c.next = n + 250; setLure(true, c.x, c.z); }
  } else if (c.st === 'wait') {
    by = ty + Math.sin(n / 260) * 0.02;
    if (n >= c.next) {
      c.next = n + 250;
      const it = lureBite();
      if (it) { c.st = 'bite'; c.item = it; c.biteEnd = n + 1600; toast('❗ Balık ısırdı! Koy\'a bas'); }
      else if (n - c.t0 > 14000) return cancel('🎣 Balık gelmedi');
    }
  } else {
    by = ty - 0.12 + Math.sin(n / 60) * 0.03;
    if (n > c.biteEnd) return cancel('🐟 Balık kaçtı');
  }
  bob.position.set(bx, by, bz); bob.visible = true;
  linePos.set([hx, hy, hz, bx, by, bz]);
  line.geometry.attributes.position.needsUpdate = true;
  line.visible = true;
}

function tick() {
  requestAnimationFrame(tick);
  if (cast) updateCast();
}
requestAnimationFrame(tick);

// ---- TNT: çakmaktaşıyla yakılır, 3 sn sonra patlar, yanındaki TNT'leri de tetikler ----
const commit = (x, y, z, t) => { recordChange(x, y, z, t); if (G.online) G.online.sendBlock(x, y, z, t); };
function boom(x, y, z) {
  if (get(x, y, z) !== N.TNT) return;
  set(x, y, z, 0); commit(x, y, z, 0);
  const R = 3;
  for (let dx = -R; dx <= R; dx++) for (let dy = -R; dy <= R; dy++) for (let dz = -R; dz <= R; dz++) {
    if (dx * dx + dy * dy + dz * dz > R * R + 1) continue;
    const bx = x + dx, by = y + dy, bz = z + dz, t = get(bx, by, bz);
    if (!t || t === N.KATMAN_KAYASI || t === N.OBSIDIYEN) continue;
    if (t === N.TNT) { fuse(bx, by, bz, 0.4); continue; }
    set(bx, by, bz, 0); commit(bx, by, bz, 0);
  }
  const d = Math.hypot(P.x - x, P.y - y, P.z - z);
  if (d < 6) hurt(Math.round((6 - d) * 2), { name: 'TNT' });
  sfx.hit(); rebuild();
}
function fuse(x, y, z, sec) { setTimeout(() => boom(x, y, z), sec * 1000); }

// Çakmaktaşı ile TNT'ye bakıp Koy: 3 sn sonra patlar
export function useFlint(tb) {
  if (!tb || get(tb[0], tb[1], tb[2]) !== N.TNT) return false;
  toast('💥 3 saniye!');
  fuse(tb[0], tb[1], tb[2], 3);
  return true;
}
