import { N } from '../world/idtable.js';
import { TYPES, CATS, get, set, rebuild, isLoaded, isPlant, solid, pointHit, prev, FARM, H as WORLD_H, faceAt, WATER, LAVA } from '../world/world.js';
import { eco } from './economy.js';
import { RECIPES } from './recipes.js';
import { toast, drawHud, iconHTML } from '../ui/ui.js';
import { P } from '../entities/player.js';
import { dropItems } from '../entities/items.js';
import { G } from '../core/state.js';
import { isCreative } from './creative.js';
import { recordChange } from './progress.js';
import { addItem } from './inventory.js';
import { sfx } from '../core/sound.js';
import { setPanelWire, clearWireAt, initWires } from './structwire.js';
import { footprint, relOf, rotVal, DIR_NAME } from './structgeo.js';

// Yapı şemaları: Kocaman kale (10×10×10), Köylü tarlası (9×1×9), Büyük villa (11×8×11), Dev ev (24×11×24),
// Dağ karakolu (7×6×7, köşe), Maden girişi (5×8×5, 5 yer altı, köşe, demir kazma ister).
// Yapı eşyası yere konunca blok olur. Bloğa bakıp Koy ile panel açılır.
// "Ver" malzemeyi çantadan stoğa koyar, "Kur" stoğu harcar, yapı 3 sn sonra kurulur.
// Kurulum set + commit ile yazılır: kayıt (recordChange) ve online (sendBlock) bu yoldan gider.

const DOOR_LO = 240, DOOR_UP = 248;   // doors.js: kapı alt ve üst parçası, yön 0 = kuzey
const BUILD_DELAY = 3000, BATCH = 60;

const commit = (x, y, z, t) => { recordChange(x, y, z, t); if (G.online) G.online.sendBlock(x, y, z, t); };
const nameOf = t => (TYPES[t] ? TYPES[t].name : 'Eşya ' + t);

// ---- Kayıtlar ----
function reg(id, name, color, base, cat) {
  TYPES[id] = { name, color, base };
  eco.inv[id] = 0; eco.raw[id] = base; eco.trend[id] = 0;
  if (cat != null && !CATS[cat][1].includes(id)) CATS[cat][1].push(id);
}
reg(N.KALE_BLOK, 'Kale yapısı', 0x807e7c, 200);
reg(N.KOYLU_TARLA_BLOK, 'Tarla yapısı', 0x6e4e28, 120);
reg(N.VILLA_BLOK, 'Villa yapısı', 0xbc9862, 300);
reg(N.DEV_EV_BLOK, 'Dev ev yapısı', 0xe2d8c4, 500);
reg(N.KALE_EYA, 'Kocaman kale', 0x8c8884, 200, 4);
reg(N.KOYLU_TARLA_EYA, 'Köylü tarlası', 0x6e4e28, 120, 4);
reg(N.VILLA_EYA, 'Büyük villa', 0xbc9862, 300, 4);
reg(N.DEV_EV_EYA, 'Dev ev', 0xe2d8c4, 500, 4);

// Tarifler (çalışma masası, 3×3)
RECIPES.push({ out: [N.KALE_EYA, 1], pat: [[N.TAS, N.TAS, N.TAS], [N.TAS, N.TAHTA, N.TAS], [N.TAS, N.TAS, N.TAS]] });
RECIPES.push({ out: [N.KOYLU_TARLA_EYA, 1], pat: [[N.TOPRAK, N.TOPRAK, N.TOPRAK], [N.TOPRAK, N.KOVA, N.TOPRAK], [N.TOPRAK, N.TOPRAK, N.TOPRAK]] });
RECIPES.push({ out: [N.VILLA_EYA, 1], pat: [[N.TAHTA, N.TAHTA, N.TAHTA], [N.TAHTA, N.CAM, N.TAHTA], [N.TAHTA, N.TAHTA, N.TAHTA]] });
RECIPES.push({ out: [N.DEV_EV_EYA, 1], pat: [[N.TUGLA, N.TUGLA, N.TUGLA], [N.TAHTA, N.ELMAS, N.TAHTA], [N.TAS, N.TAS, N.TAS]] });

// ---- Yerleşimler: hücre = [x, y, z, blok, malzeme] (malzeme 0 = bedava). Koordinat yapının köşesinden. ----
function grid() {
  const m = new Map();
  return {
    put(x, y, z, b, c) { m.set(x + ',' + y + ',' + z, [x, y, z, b, c]); },
    del(x, y, z) { m.delete(x + ',' + y + ',' + z); },
    list() { return [...m.values()]; }
  };
}

// Kocaman kale: kalın duvar halkası, kuzeyde geçit (zemin dahil açık), 4 köşede gözetleme kulesi
function makeKale(g) {
  const TA = N.TAS, TH = N.TAHTA, CM = N.CAM;
  for (let y = 0; y <= 4; y++) for (let x = 0; x < 10; x++) for (let z = 0; z < 10; z++)
    if (x <= 1 || x >= 8 || z <= 1 || z >= 8) g.put(x, y, z, TA, TA);                       // 2 kalınlıkta duvar
  for (let y = 0; y <= 3; y++) for (const x of [4, 5]) for (const z of [0, 1]) g.del(x, y, z); // geçit: zemin dahil açık
  for (const x of [4, 5]) for (const z of [0, 1]) g.put(x, 4, z, TH, TH);                       // geçit lentosu
  for (let y = 2; y <= 3; y++) {                                                                // pencereler
    for (const x of [4, 5]) for (const z of [8, 9]) g.put(x, y, z, CM, CM);
    for (const z of [4, 5]) for (const x of [0, 1, 8, 9]) g.put(x, y, z, CM, CM);
  }
  for (let x = 0; x < 10; x++) for (let z = 0; z < 10; z++)                                     // siper dişleri
    if ((x === 0 || x === 9 || z === 0 || z === 9) && (x + z) % 2 === 0) g.put(x, 5, z, TA, TA);
  for (const [cx, cz] of [[0, 0], [7, 0], [0, 7], [7, 7]])                                      // 4 gözetleme kulesi
    for (let dx = 0; dx < 3; dx++) for (let dz = 0; dz < 3; dz++) {
      const x = cx + dx, z = cz + dz;
      if (!(dx === 1 && dz === 1)) for (let y = 0; y <= 8; y++) g.put(x, y, z, TA, TA);     // gövde (ortası boş)
      g.put(x, 9, z, TH, TH);                                                               // ahşap platform
    }
  return [];
}

// Köylü tarlası: toprak kenar, ortada su kanalı, içi işlenmiş toprak (ekim oyuncuya bırakılır)
function makeTarla(g) {
  for (let x = 0; x < 9; x++) for (let z = 0; z < 9; z++) {
    if (x === 0 || x === 8 || z === 0 || z === 8) g.put(x, 0, z, N.TOPRAK, N.TOPRAK);   // toprak kenar
    else if (z === 4) g.put(x, 0, z, N.SU, 0);                                           // su kanalı
    else g.put(x, 0, z, FARM, N.TOPRAK);                                                 // işlenmiş toprak
  }
  return [[N.SU_KOVASI, 1]];
}

// Büyük villa: 2 katlı, tahta ön/arka, taş yanlar, cam pencereler, kapı, oda bölmesi, taş basamak merdiven, tuğla çatı
function makeVilla(g) {
  const TA = N.TAS, TH = N.TAHTA, CM = N.CAM, TG = N.TUGLA;
  for (let x = 0; x < 11; x++) for (let z = 0; z < 11; z++) g.put(x, 0, z, TA, TA);            // zemin katı
  for (const y of [1, 2, 3, 4, 5, 6]) for (let x = 0; x < 11; x++) for (let z = 0; z < 11; z++) {
    const ez = z === 0 || z === 10, ex = x === 0 || x === 10;
    if (!ez && !ex) continue;
    const m = ez && !ex ? TH : TA;                                                             // ön/arka tahta, yanlar taş
    g.put(x, y, z, m, m);
  }
  for (const y of [2, 3, 5, 6]) {                                                              // pencereler
    for (const x of [3, 7]) { g.put(x, y, 0, CM, CM); g.put(x, y, 10, CM, CM); }
    for (const z of [3, 7]) { g.put(0, y, z, CM, CM); g.put(10, y, z, CM, CM); }
  }
  g.put(5, 1, 0, DOOR_LO, 0); g.put(5, 2, 0, DOOR_UP, 0);                                     // giriş kapısı
  for (let x = 1; x <= 9; x++) for (let z = 1; z <= 9; z++) g.put(x, 4, z, TH, TH);           // 2. kat zemini
  g.put(9, 1, 8, TA, TA); g.put(9, 2, 7, TA, TA); g.put(9, 3, 6, TA, TA); g.put(9, 4, 5, TA, TA);
  g.del(9, 4, 6); g.del(9, 4, 7);                                                             // üst kata açıklık
  for (let y = 1; y <= 3; y++) for (let z = 6; z <= 9; z++) g.put(5, y, z, TH, TH);            // oda bölmesi
  g.put(2, 1, 2, TH, TH); g.put(1, 1, 2, TH, TH); g.put(3, 1, 2, TH, TH);                     // masa ve sandalyeler
  g.put(7, 3, 8, CM, CM);                                                                     // cam aydınlatma
  for (let x = 0; x < 11; x++) for (let z = 0; z < 11; z++) g.put(x, 7, z, TG, TG);           // tuğla çatı
  return [[N.KAPI_BASI, 1]];
}

// Dev ev (24×11×24, iki kat). x 0..23 (batıdan doğuya), z 0..23 (kuzeyden güneye), y 0..10.
// Zemin kat: ana oda 10×6, mutfak 5×6, WC 2×6, kiler 2×6, 3 normal oda 5×6, geçit ve giriş holü.
// Üst kat: 2 normal oda 5×6 ve açık hol. Merdiven koridorda (z=10, x 17–21).
function makeDevEv(g0) {
  // Giriş kuzeyde (z=0) olsun diye yerleşim z ekseninde aynalanır
  const g = { put: (x, y, z, a, b) => g0.put(x, y, 23 - z, a, b), del: (x, y, z) => g0.del(x, y, 23 - z) };
  const TA = N.TAS, TH = N.TAHTA, CM = N.CAM, TG = N.TUGLA;
  let nD = 0;
  const box = (x0, y0, z0, x1, y1, z1, b) => {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) g.put(x, y, z, b, b);
  };
  const put = (x, y, z, b) => g.put(x, y, z, b, b);
  const cut = (x0, y0, z0, x1, y1, z1) => {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) g.del(x, y, z);
  };
  const door = (x, y, z, f) => { g.put(x, y, z, DOOR_LO + f, 0); g.put(x, y + 1, z, DOOR_UP + f, 0); nD++; };
  const win = (x, y, z) => { g.put(x, y, z, CM, CM); g.put(x, y + 1, z, CM, CM); };
  const lamp = (x, y, z) => g.put(x, y, z, CM, CM);

  // Döşemeler ve çatı
  box(0, 0, 0, 23, 0, 23, TH);
  box(0, 5, 0, 23, 5, 23, TH);
  box(0, 10, 0, 23, 10, 23, TG);

  // Dış duvarlar (taş), iki kat
  for (const [a, b] of [[1, 4], [6, 9]]) {
    box(0, a, 0, 23, b, 0, TA);
    box(0, a, 23, 23, b, 23, TA);
    box(0, a, 0, 0, b, 23, TA);
    box(23, a, 0, 23, b, 23, TA);
  }

  // Zemin kat iç duvarları (tahta)
  box(11, 1, 1, 11, 4, 6, TH);
  box(17, 1, 1, 17, 4, 6, TH);
  box(20, 1, 1, 20, 4, 6, TH);
  box(1, 1, 7, 22, 4, 7, TH);
  box(1, 1, 12, 22, 4, 12, TH);
  box(6, 1, 13, 6, 4, 18, TH);
  box(12, 1, 13, 12, 4, 18, TH);
  box(18, 1, 13, 18, 4, 18, TH);
  box(1, 1, 19, 22, 4, 19, TH);

  // Üst kat iç duvarları (tahta)
  box(6, 6, 1, 6, 9, 6, TH);
  box(12, 6, 1, 12, 9, 6, TH);
  box(1, 6, 7, 12, 9, 7, TH);

  // Kapılar (12 adet)
  door(11, 1, 23, 0);
  door(5, 1, 7, 0);
  door(14, 1, 7, 0);
  door(18, 1, 7, 0);
  door(21, 1, 7, 0);
  door(3, 1, 12, 0);
  door(9, 1, 12, 0);
  door(15, 1, 12, 0);
  door(20, 1, 12, 0);
  door(20, 1, 19, 0);
  door(3, 6, 7, 0);
  door(9, 6, 7, 0);

  // Pencereler
  for (const x of [3, 7, 14, 18, 21]) win(x, 2, 0);
  for (const x of [4, 8, 15, 18]) win(x, 2, 23);
  for (const z of [3, 10, 15, 21]) { win(0, 2, z); win(23, 2, z); }
  for (const x of [3, 9]) win(x, 7, 0);
  for (const x of [4, 8, 15, 18]) win(x, 7, 23);
  for (const z of [3, 10, 18]) win(0, 7, z);
  for (const z of [3, 10, 15]) win(23, 7, z);

  // Merdiven ve açıklık
  put(21, 1, 10, TA); put(20, 2, 10, TA); put(19, 3, 10, TA); put(18, 4, 10, TA); put(17, 5, 10, TA);
  cut(18, 5, 10, 19, 5, 10);

  // İç detay
  put(5, 1, 3, TH); lamp(5, 4, 3);
  for (let x = 12; x <= 15; x++) put(x, 1, 1, TA);
  g.put(16, 1, 1, N.OCAK, 0);
  put(14, 1, 4, TH); lamp(14, 4, 3);
  put(19, 1, 1, TG);
  g.put(21, 1, 2, N.SANDIK, 0); g.put(21, 1, 5, N.SANDIK, 0);
  for (const x of [3, 9, 15]) { put(x, 1, 16, TH); lamp(x, 4, 16); }
  put(3, 6, 4, TH); lamp(3, 9, 4);
  put(9, 6, 4, TH); lamp(9, 9, 4);

  return [[N.KAPI_BASI, nD], [N.SANDIK, 2], [N.OCAK, 1]];
}

// ---- Parça 3: dağ karakolu ve maden girişi ----
reg(N.DAG_KARAKOL_BLOK, 'Dağ karakolu yapısı', 0x8a8076, 350);
reg(N.DAG_KARAKOL_EYA, 'Dağ karakolu', 0x8a8076, 350, 4);
reg(N.MADEN_GIRIS_BLOK, 'Maden girişi yapısı', 0x6b5a48, 400);
reg(N.MADEN_GIRIS_EYA, 'Maden girişi', 0x6b5a48, 400, 4);
RECIPES.push({ out: [N.DAG_KARAKOL_EYA, 1], pat: [[N.ODUN, N.TAS, N.ODUN], [N.TAS, N.TAHTA, N.TAS], [N.ODUN, N.TAS, N.ODUN]] });
RECIPES.push({ out: [N.MADEN_GIRIS_EYA, 1], pat: [[N.TAS, N.TAS, N.TAS], [0, N.TAHTA, 0], [0, N.TAS, 0]] });

// Dağ karakolu (7×6×7): taş temel, alt taş ve üst tahta duvar, kütük köşe direkleri, tahta çatı,
// ön yüzde (kuzey) kapı, cam pencereler. İçinde masa, ocak ve sandık.
function makeKarakol(g) {
  const TA = N.TAS, TH = N.TAHTA, OD = N.ODUN, CM = N.CAM;
  const put = (x, y, z, b) => g.put(x, y, z, b, b);
  const edge = (x, z) => x === 0 || x === 6 || z === 0 || z === 6;
  for (let x = 0; x < 7; x++) for (let z = 0; z < 7; z++) put(x, 0, z, TA);                  // taş temel
  for (let y = 1; y <= 4; y++) for (let x = 0; x < 7; x++) for (let z = 0; z < 7; z++)
    if (edge(x, z)) put(x, y, z, y <= 2 ? TA : TH);                                           // alt taş, üst tahta duvar
  for (let x = 1; x <= 5; x++) for (let z = 1; z <= 5; z++) put(x, 1, z, TH);                 // zemin tahtası
  for (let x = 0; x < 7; x++) for (let z = 0; z < 7; z++) put(x, 5, z, TH);                   // tahta çatı
  for (const [x, z] of [[0, 0], [6, 0], [0, 6], [6, 6]])
    for (let y = 1; y <= 5; y++) put(x, y, z, OD);                                            // kütük köşe direkleri
  g.put(3, 1, 0, DOOR_LO, 0); g.put(3, 2, 0, DOOR_UP, 0);                                     // kapı (ön yüz kuzey)
  for (const y of [2, 3]) { put(0, y, 3, CM); put(6, y, 3, CM); put(3, y, 6, CM); }           // pencereler
  put(1, 2, 0, CM); put(5, 2, 0, CM);
  put(2, 2, 3, TH);                                                                           // masa
  g.put(5, 2, 5, N.OCAK, 0); g.put(1, 2, 5, N.SANDIK, 0);                                    // ocak ve sandık
  return [[N.KAPI_BASI, 1], [N.SANDIK, 1], [N.OCAK, 1]];
}

// Maden girişi (5×8×5, 5 blok yer altı): yüzeyde kütük ayaklı taş çerçeve, tahta kiriş ve cam fener.
// Şaftta merdiven ve kütük destekler, altta maden odası ve sandık. Kazma gerekir (sp.tool).
function makeMaden(g) {
  const TA = N.TAS, TH = N.TAHTA, OD = N.ODUN, CM = N.CAM, LAD = N.TIRMANMA_MERDIVEN;
  const put = (x, y, z, b) => g.put(x, y, z, b, b);
  // Yer altı: maden odası (x 0..4, z 0..4, y -5..-4) ve dar şaft (2, -3..-1, 2) boşaltılır
  for (let x = 0; x < 5; x++) for (let z = 0; z < 5; z++) for (let y = -5; y <= -4; y++) g.put(x, y, z, 0, 0);
  for (let y = -3; y <= -1; y++) g.put(2, y, 2, 0, 0);
  // Şaft merdiveni (2, -5..-1, 2) ve şaft duvarlarında kütük destekler
  for (let y = -5; y <= -1; y++) put(2, y, 2, LAD);
  for (const y of [-1, -3]) { put(1, y, 2, OD); put(3, y, 2, OD); }
  // Maden odası: iki cam fener ve bir sandık
  put(0, -4, 2, CM); put(4, -4, 2, CM);
  g.put(4, -5, 4, N.SANDIK, 0);
  // Yüzey platformu (y 0): taş. Giriş (2,0,0) ve şaft ağzı (2,0,1), (2,0,2) açık kalır
  for (let x = 0; x < 5; x++) for (let z = 0; z < 5; z++) if (!(x === 2 && z <= 2)) put(x, 0, z, TA);
  // Dış çerçeve: ön yüzde kütük ayaklar, tahta kiriş, ortada cam fener; yanlarda alçak taş duvar
  put(1, 0, 0, OD); put(3, 0, 0, OD); put(1, 1, 0, OD); put(3, 1, 0, OD);
  put(1, 2, 0, TH); put(3, 2, 0, TH); put(2, 2, 0, CM);
  put(0, 1, 0, TA); put(4, 1, 0, TA); put(0, 2, 0, TA); put(4, 2, 0, TA);
  for (let z = 1; z <= 4; z++) { put(0, 1, z, TA); put(4, 1, z, TA); }
  for (let x = 1; x <= 3; x++) put(x, 1, 4, TA);
  return [[N.SANDIK, 1]];
}

const SPECS = [
  { key: 'kale', item: N.KALE_EYA, blk: N.KALE_BLOK, name: 'Kocaman kale', W: 10, D: 10, H: 10, sup: N.TAS, ax: 'corner', make: makeKale },
  { key: 'tarla', item: N.KOYLU_TARLA_EYA, blk: N.KOYLU_TARLA_BLOK, name: 'Köylü tarlası', W: 9, D: 9, H: 1, sup: N.TOPRAK, ax: 'corner', make: makeTarla },
  { key: 'villa', item: N.VILLA_EYA, blk: N.VILLA_BLOK, name: 'Büyük villa', W: 11, D: 11, H: 8, sup: N.TAS, ax: 'corner', make: makeVilla },
  { key: 'devev', item: N.DEV_EV_EYA, blk: N.DEV_EV_BLOK, name: 'Dev ev', W: 24, D: 24, H: 11, sup: N.TAS, ax: 'corner', make: makeDevEv },
  { key: 'karakol', item: N.DAG_KARAKOL_EYA, blk: N.DAG_KARAKOL_BLOK, name: 'Dağ karakolu', W: 7, D: 7, H: 6, sup: N.TAS, ax: 'corner', make: makeKarakol },
  { key: 'maden', item: N.MADEN_GIRIS_EYA, blk: N.MADEN_GIRIS_BLOK, name: 'Maden girişi', W: 5, D: 5, H: 3, Y0: -5, dig: true, ax: 'corner', tool: N.DEMIR_KAZMA, sup: N.TAS, make: makeMaden }
];
const byItem = {}, byBlk = {};
for (const s of SPECS) { byItem[s.item] = s; byBlk[s.blk] = s; }
export const isStructBlock = t => !!byBlk[t];
export const isStructItem = t => !!byItem[t];

const LAYOUT = new Map();
function layoutOf(sp) {
  if (!LAYOUT.has(sp)) {
    const g = grid(), extras = sp.make(g) || [], cells = g.list(), need = {};
    for (const c of cells) if (c[4]) need[c[4]] = (need[c[4]] || 0) + 1;
    for (const [item, n] of extras) need[item] = (need[item] || 0) + n;
    LAYOUT.set(sp, { cells, need });
  }
  return LAYOUT.get(sp);
}

// ---- Oyuncuyu kurulum bölgesinin dışına taşıma ----
const SUB = 3;   // kurulum en fazla 3 blok aşağı destek koyar, bölge bu kadar aşağıyı da kapsar

// Oyuncu gövdesi (0,6 × 1,7) bu noktada bir engele değiyor mu
function bodyHit(x, y, z) {
  for (const dx of [-0.3, 0.3]) for (const dz of [-0.3, 0.3]) for (const dy of [0.05, 0.9, 1.65]) {
    const bx = x + dx, by = y + dy, bz = z + dz;
    if (solid(Math.floor(bx), Math.floor(by), Math.floor(bz)) || pointHit(bx, by, bz)) return true;
  }
  return false;
}

// Oyuncu gövdesi bölgeyle (Z) kesişiyor mu. Z.yb: alt sınır (Y0 dahil), Z.yt: üst sınır (dışarıda kalır)
function inZone(Z) {
  return P.x + 0.3 > Z.ox && P.x - 0.3 < Z.ox + Z.W && P.z + 0.3 > Z.oz && P.z - 0.3 < Z.oz + Z.D &&
    P.y + 1.7 > Z.yb - SUB && P.y < Z.yt;
}

// Bölgenin dışında oyuncuya en yakın boş konum. needGround: ayağının altı katı olmalı.
function safeSpot(Z, needGround) {
  const px = Math.floor(P.x), pz = Math.floor(P.z), fy0 = Math.floor(P.y);
  const outside = (x, z) => x < Z.ox || x >= Z.ox + Z.W || z < Z.oz || z >= Z.oz + Z.D;
  let best = null, bestD = Infinity;
  for (let r = 1; r <= 30; r++) {
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const x = px + dx, z = pz + dz;
      if (!isLoaded(x, z) || !outside(x, z)) continue;
      for (const off of [0, 1, -1, 2, -2, 3, -3, 4, -4]) {
        const fy = fy0 + off;
        if (fy < 1 || fy + 2 >= WORLD_H) continue;
        if (needGround && !solid(x, fy - 1, z)) continue;
        if (bodyHit(x + 0.5, fy, z + 0.5)) continue;
        const d = Math.hypot(x + 0.5 - P.x, z + 0.5 - P.z) + Math.abs(fy - P.y) * 0.25;
        if (d < bestD) { bestD = d; best = { x: x + 0.5, y: fy, z: z + 0.5 }; }
        break;
      }
    }
    if (best && bestD <= r) break;
  }
  return best;
}

// Son çare: bölgenin üstü (oyuncu bölgenin dışında kalır)
function topSpot(Z) {
  const x = Z.ox + Z.W / 2, z = Z.oz + Z.D / 2, y = Z.yt + 0.05;
  return bodyHit(x, y, z) ? null : { x, y, z };
}

// Oyuncu bölgedeyse en yakın güvenli konuma taşır. Hiç yer yoksa false döner.
function keepOut(Z) {
  if (P.riding || !inZone(Z)) return true;
  const s = safeSpot(Z, true) || safeSpot(Z, false) || topSpot(Z);
  if (!s) return false;
  P.x = s.x; P.y = s.y; P.z = s.z;
  P.vy = 0; P.fallY = P.y; P.ground = false; P.kx = P.kz = 0;
  return true;
}

// Bloğun ön yüzü: koyan oyuncunun olduğu tarafa (0 kuzey, 1 doğu, 2 güney, 3 batı)
function facingOf(x, z) {
  const vx = P.x - (x + 0.5), vz = P.z - (z + 0.5);
  if (Math.abs(vz) >= Math.abs(vx)) return vz < 0 ? 0 : 2;
  return vx > 0 ? 1 : 3;
}

// Kurulum uygun mu? Alan yüklü, boş ve zemini düzgünse olur. Oyuncunun yeri burada sorulmaz (keepOut taşır).
// Köşe yapılarda hücreler r kez döner. "tool" varsa alet çantada olmalı (harcanmaz).
function check(sp, bx, by, bz, r) {
  const L = layoutOf(sp), fail = msg => ({ ok: false, msg }), rr = r || 0;
  if (!isCreative() && sp.tool && (eco.inv[sp.tool] || 0) < 1) return fail('Çantanda ' + nameOf(sp.tool) + ' olmalı (harcanmaz)');
  const fp = footprint(sp, rr);
  const Z = { ox: bx + fp.x0, oz: bz + fp.z0, W: fp.x1 - fp.x0 + 1, D: fp.z1 - fp.z0 + 1, yb: by + (sp.Y0 || 0), yt: by + sp.H };
  for (let x = Z.ox; x < Z.ox + Z.W; x++) for (let z = Z.oz; z < Z.oz + Z.D; z++)
    if (!isLoaded(x, z)) return fail('Alan henüz yüklenmedi');
  // Dolu alan. Kazılan yapılarda (dig) yer altı serbesttir, yerleşim onu oyar. Bitkiler engel değil.
  for (let x = Z.ox; x < Z.ox + Z.W; x++) for (let z = Z.oz; z < Z.oz + Z.D; z++)
    for (let y = sp.dig ? by : Z.yb; y < Z.yt; y++) {
      const own = x === bx && z === bz && y === by, v = get(x, y, z);
      if (!own && v !== 0 && !isPlant(v)) return fail('Alan dolu, önce boşalt');
    }
  // Kazılacak yer altında (dig) su ya da lav varsa kurulmaz: akıp tüneli doldururlar
  if (sp.dig) for (let x = Z.ox; x < Z.ox + Z.W; x++) for (let z = Z.oz; z < Z.oz + Z.D; z++)
    for (let y = Z.yb; y < by; y++) {
      const v = get(x, y, z);
      if (v === WATER || v === LAVA) return fail('Yer altında su ya da lav var');
    }
  // Zemin: bloğun altındaki boşluklar destekle doldurulur (en fazla SUB kat)
  const supports = [];
  for (let x = Z.ox; x < Z.ox + Z.W; x++) for (let z = Z.oz; z < Z.oz + Z.D; z++) {
    for (let k = 1; ; k++) {
      const y = by - k;
      if (solid(x, y, z)) break;
      if (k > SUB) return fail('Zemin düz değil, bu alan kurulamaz');
      supports.push([x, y, z, sp.sup]);
    }
  }
  // Yerleşim: hücreler r kez döner, blok değerleri (kapı, sandık yönü) da döner
  const jobs = L.cells.map(c => {
    const [rx, rz] = relOf(sp, c[0], c[2], rr);
    return [bx + rx, by + c[1], bz + rz, rotVal(c[3], rr)];
  });
  return { ok: true, zone: Z, supports, jobs, need: L.need };
}

// ---- Stok: yerel cihazda, yapının konumuna göre (şema bloğu ile aynı biçim) ----
let el = null, cur = null, stock = {};
const keyOf = (x, y, z) => 'bd_st_' + ((G.room && G.room.code) || 'solo') + '_' + x + '_' + y + '_' + z;
function loadStock(x, y, z) {
  try { return JSON.parse(localStorage.getItem(keyOf(x, y, z)) || '{}') || {}; } catch (e) { return {}; }
}
function saveStock() {
  if (!cur) return;
  const clean = {};
  for (const i in stock) if (stock[i] > 0) clean[i] = stock[i];
  stock = clean;
  const k = keyOf(cur.x, cur.y, cur.z);
  try {
    if (Object.keys(clean).length) localStorage.setItem(k, JSON.stringify(clean));
    else localStorage.removeItem(k);
  } catch (e) {}
}

// ---- Panel ----
function ui() {
  if (el) return;
  const st = document.createElement('style');
  st.textContent = '#stP{position:fixed;inset:0;background:#000b;z-index:27;display:none;align-items:center;justify-content:center}' +
    '#stB{background:#1d2330;color:#fff;border-radius:14px;padding:14px;width:min(94vw,420px);max-height:90vh;overflow:auto;box-sizing:border-box;font-size:13px}' +
    '#stB .stR{display:flex;align-items:center;gap:6px;margin:6px 0;padding:6px;background:#0004;border-radius:8px}' +
    '#stB .stR img{width:26px;height:26px;image-rendering:pixelated}#stB .stR span{flex:1}' +
    '#stB button{padding:7px 9px;border:0;border-radius:7px;background:#1565c0;color:#fff;font-weight:700;margin-left:3px}' +
    '#stB button:disabled{background:#455;opacity:.5}' +
    '#stB .stW{background:#3a1d22;border-left:4px solid #f55;padding:6px;border-radius:6px;margin:6px 0}';
  document.head.appendChild(st);
  el = document.createElement('div');
  el.id = 'stP';
  document.body.appendChild(el);
  el.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || !cur) return;
    if (b.dataset.v) verItem(+b.dataset.v);
    else if (b.dataset.a) alItem(+b.dataset.a);
    else if (b.dataset.all) { for (const k in layoutOf(cur.sp).need) verItem(+k); }
    else if (b.dataset.rot) return rotateStruct();
    else if (b.dataset.k) return kur();
    else if (b.dataset.x) return closeStruct();
    draw();
  });
}

function draw() {
  if (!cur) return;
  const sp = cur.sp, c = check(sp, cur.x, cur.y, cur.z, cur.r), need = layoutOf(sp).need, cre = isCreative();
  let done = true, rows = '';
  for (const k in need) {
    const item = +k, n = need[k], have = stock[k] || 0, bag = eco.inv[item] || 0;
    if (have < n) done = false;
    rows += '<div class="stR">' + iconHTML(item) + '<span>' + nameOf(item) + '</span>' +
      (cre ? '<b>' + n + '</b>' :
        '<b>' + have + ' / ' + n + '</b>' +
        '<button data-v="' + item + '"' + (bag < 1 || have >= n ? ' disabled' : '') + '>Ver</button>' +
        '<button data-a="' + item + '"' + (have < 1 ? ' disabled' : '') + '>Al</button>') + '</div>';
  }
  if (sp.tool) {
    const ok = cre || (eco.inv[sp.tool] || 0) >= 1;
    rows += '<div class="stR">' + iconHTML(sp.tool) + '<span>' + nameOf(sp.tool) + ' <small>(alet, harcanmaz)</small></span><b>' + (ok ? '✔' : '✖') + '</b></div>';
  }
  const canKur = c.ok && (cre || done);
  const info = sp.ax === 'corner' ? '<small>Ön yüz: ' + DIR_NAME[cur.r] + ' · sarı ok bu yönü gösterir</small><br>' : '';
  el.innerHTML = '<div id="stB"><h3 style="margin:0 0 2px">🏗️ ' + sp.name + '</h3>' +
    '<small>' + sp.W + '×' + (sp.H - (sp.Y0 || 0)) + '×' + sp.D + ' · Kurulunca 3 sn içinde dikilir</small><br>' + info +
    (c.ok ? '' : '<div class="stW">⚠ ' + c.msg + '</div>') + rows +
    '<div style="display:flex;gap:6px;margin-top:8px">' +
    (cre ? '' : '<button data-all="1" style="flex:1">Hepsini ver</button>') +
    (sp.ax === 'corner' ? '<button data-rot="1" style="flex:1">↻ Döndür</button>' : '') +
    '<button data-k="1" style="flex:1;background:#2e7d32"' + (canKur ? '' : ' disabled') + '>🔨 Kur</button>' +
    '<button data-x="1" style="flex:1;background:#b3261e">Kapat</button></div></div>';
}

function verItem(item) {
  const need = layoutOf(cur.sp).need[item] || 0, have = stock[item] || 0, room = need - have;
  if (room <= 0) return;
  const bag = eco.inv[item] || 0, n = Math.min(room, bag);
  if (n < 1) return toast('Çantada ' + nameOf(item) + ' yok');
  eco.inv[item] = bag - n;
  stock[item] = have + n;
  saveStock(); drawHud();
}

function alItem(item) {
  const have = stock[item] || 0;
  if (have < 1) return;
  const a = addItem(item, have) || 0;
  stock[item] = have - a;
  saveStock(); drawHud();
  if (a < have) toast('🎒 Çanta dolu');
}

// ---- Kurulum ----
function giveBack(t) {
  if (!addItem(t, 1)) dropItems([{ t, c: 1, x: P.x, y: P.y + 1.3, z: P.z, vx: 0, vy: 2, vz: 0 }]);
  drawHud();
}

// Hücreleri alttan üste, BATCH'lik parçalar halinde yazar. Her parçadan önce oyuncu bölgedeyse dışarı taşınır.
function runBuild(c, sp) {
  const jobs = c.supports.concat(c.jobs).sort((a, b) => a[1] - b[1]);
  let i = 0, warned = false;
  const step = () => {
    if (!keepOut(c.zone) && !warned) { warned = true; toast('⚠ Oyuncu için boş yer yok, kurulum sürüyor'); }
    const end = Math.min(jobs.length, i + BATCH);
    for (; i < end; i++) { const [x, y, z, t] = jobs[i]; set(x, y, z, t); commit(x, y, z, t); }
    if (i < jobs.length) return setTimeout(step, 30);
    if (sp.key === 'tarla' && !isCreative()) giveBack(N.KOVA);
    toast('✅ ' + sp.name + ' kuruldu');
  };
  step();
}

// Kur: malzemeler ve oyuncunun durumu kontrol edilir. Sonra yapı bloğu kalkar, 3 sn sonra kurulur.
function kur() {
  if (!cur) return;
  const { x, y, z, sp, r } = cur, c = check(sp, x, y, z, r);
  if (!c.ok) return toast(c.msg);
  if (!isCreative()) {
    for (const k in c.need) if ((stock[k] || 0) < c.need[k]) return toast('Malzeme eksik: ' + nameOf(+k));
  }
  if (!keepOut(c.zone)) return toast('Oyuncu için güvenli boş yer yok');
  if (!isCreative()) {
    for (const k in c.need) stock[k] -= c.need[k];
    saveStock();
  }
  set(x, y, z, 0); commit(x, y, z, 0);
  clearWireAt(x, y, z);
  closeStruct();
  toast('🔨 ' + sp.name + ' 3 sn sonra kurulacak');
  setTimeout(() => runBuild(c, sp), BUILD_DELAY);
}

// ---- Dışa açık fonksiyonlar ----
// Yapı eşyası yere konur ve blok olur. Köşe yapılarda ön yüz, koyan oyuncuya bakar.
export function placeStructure(t) {
  const sp = byItem[t];
  if (!sp || !prev) return;
  const [x, y, z] = prev, here = get(x, y, z);
  if (here !== 0 && !isPlant(here)) return toast('Buraya konmaz');
  if (!isCreative() && (eco.inv[t] || 0) < 1) return toast(sp.name + ' yok');
  const v = sp.blk | ((sp.ax === 'corner' ? facingOf(x, z) : 0) << 8);
  set(x, y, z, v); commit(x, y, z, v);
  if (!isCreative()) eco.inv[t]--;
  sfx.place(); rebuild(); drawHud();
  toast('Bloğa bakıp Koy ile malzemeleri ver');
}

// Yapı bloğuna bakıp Koy: paneli açar. Köşe yapılarda yönü bloktan okur.
export function openStruct(x, y, z, t) {
  const sp = byBlk[t];
  if (!sp) return;
  ui();
  const r = sp.ax === 'corner' ? (faceAt(x, y, z) & 3) : 0;
  cur = { x, y, z, sp, r };
  stock = loadStock(x, y, z);
  setPanelWire(x, y, z);
  draw();
  el.style.display = 'flex';
}

// Köşe yapıyı 90° döndürür: ön yüz sıradaki yöne geçer, kayıt ve ağ güncellenir
function rotateStruct() {
  if (!cur || cur.sp.ax !== 'corner') return;
  const nr = (cur.r + 1) & 3, v = cur.sp.blk | (nr << 8);
  set(cur.x, cur.y, cur.z, v); commit(cur.x, cur.y, cur.z, v);
  cur.r = nr;
  rebuild();
  draw();
}

export function closeStruct() {
  cur = null;
  setPanelWire(null);
  if (el) el.style.display = 'none';
}

export const isStructOpen = () => !!cur;

// Yapı bloğu kırılınca: yapı eşyası ve stokta kalan malzemeler döner, çizgi hemen kalkar
export function structDrops(t, x, y, z) {
  const sp = byBlk[t];
  if (!sp) return null;
  clearWireAt(x, y, z);
  const s = loadStock(x, y, z), out = [[sp.item, 1]];
  for (const k in s) if (s[k] > 0) out.push([+k, s[k]]);
  try { localStorage.removeItem(keyOf(x, y, z)); } catch (e) {}
  return out;
}

// Yapı alanı çizgileri (mavi kutular) bu dosya yüklenince başlar
initWires(SPECS);
