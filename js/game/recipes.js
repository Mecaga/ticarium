export const LOG = 'log';       // 4 (meşe odun) ya da 13 (huş odun)
export const WOOLANY = 'wool';  // beyaz ya da renkli yün
const P = 70, S = 71, C = 3, W = 74, IRON = 83, GOLD = 84, GEM = 85;
const POTATO = 150, TOMATO = 152, PEPPER = 153, ONION = 154;

// pat: şekilli tarif (0 = boş hücre), shapeless: şekilsiz (sıra önemli değil). out: [eşya, adet]
export const RECIPES = [
  { out: [70, 4], shapeless: [LOG] },                              // 1 kütük → 4 tahta
  { out: [71, 4], pat: [[P], [P]] },                               // 2 tahta → 4 çubuk
  { out: [72, 1], pat: [[P, P], [P, P]] },                         // çalışma masası
  { out: [75, 1], pat: [[W, W, W]] },                              // ekmek
  { out: [30, 1], pat: [[C, 0, C], [0, C, 0]] },                   // kova (3 taş, V şekli)
  { out: [32, 1], pat: [[S, S, S], [S, 16, S], [S, S, S]] },       // tuval (çubuk + yün)
  { out: [81, 1], pat: [[C, C, C], [C, 0, C], [C, C, C]] },        // ocak (8 taş)
  { out: [10, 1], pat: [[GOLD, GOLD, GOLD], [GOLD, GOLD, GOLD], [GOLD, GOLD, GOLD]] },   // altın blok (9 külçe)
  { out: [84, 9], shapeless: [10] },                               // altın blok → 9 külçe
  { out: [160, 1], pat: [[IRON, IRON, IRON], [IRON, IRON, IRON], [IRON, IRON, IRON]] }, // demir blok (9 demir külçe)
  { out: [83, 9], shapeless: [160] },                              // demir blok → 9 demir külçe
  { out: [161, 1], pat: [[GEM, GEM, GEM], [GEM, GEM, GEM], [GEM, GEM, GEM]] },         // elmas blok (9 elmas)
  { out: [85, 9], shapeless: [161] },                              // elmas blok → 9 elmas
  { out: [155, 2], shapeless: [W, W, TOMATO, PEPPER, ONION] },      // çiğköfte: 2 buğday + domates + biber + soğan
  { out: [177, 1], shapeless: [W, W, W, 31] },                     // hamur: 3 buğday + su kovası (su kovası kullandıktan sonra boş kova geri döner)
  { out: [170, 1], shapeless: [152, 192] },                        // salatalık: domates + salatalık
  { out: [171, 1], shapeless: [191, ONION] },                      // marul salatası: marul + soğan
  { out: [172, 1], shapeless: [190, 31] },                         // pancar çorbası: pancar
  { out: [173, 1], shapeless: [152, 31] },                         // domates çorbası: domates
  { out: [174, 1], shapeless: [178, 177, 'eggI'] },                // kek: süt + hamur + yumurta
  { out: [175, 1], shapeless: [151, ONION, POTATO] },              // sebze çorbası: havuç + soğan + patates
  { out: [176, 1], shapeless: [POTATO] }                           // patates kızartması (fırında pişince çıkar)
];

// Çiçek → 2 boya; boya + yün → renkli yün (lavanta, papatya, gelincik, mavi gelincik, turuncu lale, pembe lale, yeşil, beyaz lale)
for (let i = 0; i < 8; i++) {
  RECIPES.push({ out: [110 + i, i === 7 ? 2 : 2], shapeless: [40 + i] }); // Beyaz lale (47) veya diğerleri 2 boya verir
  RECIPES.push({ out: [120 + i, 1], shapeless: [110 + i, WOOLANY] });
}

// Renk karışımları (Craft boya birleşimleri)
RECIPES.push(
  { out: [116, 1], shapeless: [111, 113] }, // Sarı + Mavi = Yeşil boya
  { out: [114, 1], shapeless: [111, 112] }, // Sarı + Kırmızı = Turuncu boya
  { out: [110, 1], shapeless: [112, 113] }, // Kırmızı + Mavi = Mor boya
  { out: [115, 1], shapeless: [117, 112] }  // Beyaz + Kırmızı = Pembe boya
);

// [malzeme, kazma, balta, kürek, çapa, kılıç]
for (const [m, pick, axe, shovel, hoe, sword] of [
  [P, 50, 57, 59, 61, 65], [C, 51, 58, 60, 62, 66], [IRON, 52, 55, 56, 63, 67], [GEM, 53, 69, 89, 64, 68]
]) {
  RECIPES.push({ out: [pick, 1], pat: [[m, m, m], [0, S, 0], [0, S, 0]] });
  RECIPES.push({ out: [axe, 1], pat: [[m, m], [m, S], [0, S]] });
  RECIPES.push({ out: [shovel, 1], pat: [[m], [S], [S]] });
  RECIPES.push({ out: [hoe, 1], pat: [[m, m], [0, S], [0, S]] });
  RECIPES.push({ out: [sword, 1], pat: [[m], [m], [S]] });
}

// [malzeme, miğfer, zırh, pantolon, bot]
for (const [m, helm, chest, legs, boots] of [[IRON, 91, 92, 93, 94], [GEM, 95, 96, 97, 98]]) {
  RECIPES.push({ out: [helm, 1], pat: [[m, m, m], [m, 0, m]] });
  RECIPES.push({ out: [chest, 1], pat: [[m, 0, m], [m, m, m], [m, m, m]] });
  RECIPES.push({ out: [legs, 1], pat: [[m, m, m], [m, 0, m], [m, 0, m]] });
  RECIPES.push({ out: [boots, 1], pat: [[m, 0, m], [m, 0, m]] });
}

const ok = (tok, t) => {
  if (tok === 0) return t === 0;
  if (tok === LOG) return t === 4 || t === 13;
  if (tok === WOOLANY) return t === 16 || (t >= 120 && t <= 127);
  return tok === t;
};

// cells: size*size uzunluğunda tür dizisi (0 = boş). Dönüş: [eşya, adet] ya da null
export function findRecipe(cells, size) {
  let r0 = size, r1 = -1, c0 = size, c1 = -1;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    if (cells[r * size + c]) { r0 = Math.min(r0, r); r1 = Math.max(r1, r); c0 = Math.min(c0, c); c1 = Math.max(c1, c); }
  }
  if (r1 < 0) return null;
  const h = r1 - r0 + 1, w = c1 - c0 + 1;
  const sub = [];
  for (let r = 0; r < h; r++) { const row = []; for (let c = 0; c < w; c++) row.push(cells[(r0 + r) * size + c0 + c]); sub.push(row); }
  const items = cells.filter(t => t);
  for (const rc of RECIPES) {
    if (rc.shapeless) {
      if (items.length !== rc.shapeless.length) continue;
      const left = items.slice();
      let good = true;
      for (const tok of rc.shapeless) {
        const i = left.findIndex(t => ok(tok, t));
        if (i < 0) { good = false; break; }
        left.splice(i, 1);
      }
      if (good) return rc.out;
      continue;
    }
    const pat = rc.pat;
    if (pat.length !== h || pat[0].length !== w) continue;
    const test = mirror => pat.every((row, r) => row.every((tok, c) => ok(tok, sub[r][mirror ? w - 1 - c : c])));
    if (test(false) || test(true)) return rc.out;
  }
  return null;
}
