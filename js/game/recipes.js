import { N } from '../world/idtable.js';

export const LOG = 'log';
export const WOOLANY = 'wool';
const P = N.TAHTA, S = N.CUBUK, C = N.TAS, IRON = N.DEMIR_KULCE, GOLD = N.ALTIN_KULCE, GEM = N.ELMAS;

export const RECIPES = [
  { out: [P, 4], shapeless: [LOG] },
  { out: [S, 4], pat: [[P], [P]] },
  { out: [N.CALISMA_MASASI, 1], pat: [[P, P], [P, P]] },
  { out: [N.EKMEK, 1], pat: [[N.BUGDAY, N.BUGDAY, N.BUGDAY]] },
  { out: [N.KOVA, 1], pat: [[C, 0, C], [0, C, 0]] },
  { out: [N.TUVAL, 1], pat: [[S, S, S], [S, N.YUN, S], [S, S, S]] },
  { out: [N.OCAK, 1], pat: [[C, C, C], [C, 0, C], [C, C, C]] },
  { out: [N.ALTIN_BLOK, 1], pat: [[GOLD, GOLD, GOLD], [GOLD, GOLD, GOLD], [GOLD, GOLD, GOLD]] },
  { out: [GOLD, 9], shapeless: [N.ALTIN_BLOK] },
  { out: [N.CIGKOFTE, 2], shapeless: [N.BUGDAY, N.BUGDAY, N.DOMATES, N.BIBER, N.SOGAN] }
];

// Çiçek -> 2 boya; boya + yün -> renkli yün
for (let i = 0; i < 6; i++) RECIPES.push({ out: [N.MOR_BOYA + i, 2], shapeless: [N.LAVANTA + i] });
for (let i = 0; i < 8; i++) RECIPES.push({ out: [N.MOR_YUN + i, 1], shapeless: [N.MOR_BOYA + i, WOOLANY] });

// [malzeme, kazma, balta, kürek, çapa, kılıç]
for (const [m, a, b, c, d, e] of [
  [P, N.AHSAP_KAZMA, N.AHSAP_BALTA, N.AHSAP_KUREK, N.AHSAP_CAPA, N.AHSAP_KILIC],
  [C, N.TAS_KAZMA, N.TAS_BALTA, N.TAS_KUREK, N.TAS_CAPA, N.TAS_KILIC],
  [IRON, N.DEMIR_KAZMA, N.DEMIR_BALTA, N.DEMIR_KUREK, N.DEMIR_CAPA, N.DEMIR_KILIC],
  [GEM, N.ELMAS_KAZMA, N.ELMAS_BALTA, N.ELMAS_KUREK, N.ELMAS_CAPA, N.ELMAS_KILIC]
]) {
  RECIPES.push({ out: [a, 1], pat: [[m, m, m], [0, S, 0], [0, S, 0]] });
  RECIPES.push({ out: [b, 1], pat: [[m, m], [m, S], [0, S]] });
  RECIPES.push({ out: [c, 1], pat: [[m], [S], [S]] });
  RECIPES.push({ out: [d, 1], pat: [[m, m], [0, S], [0, S]] });
  RECIPES.push({ out: [e, 1], pat: [[m], [m], [S]] });
}
for (const [m, h, c, l, b] of [
  [IRON, N.DEMIR_MIGFER, N.DEMIR_ZIRH, N.DEMIR_PANTOLON, N.DEMIR_BOT],
  [GEM, N.ELMAS_MIGFER, N.ELMAS_ZIRH, N.ELMAS_PANTOLON, N.ELMAS_BOT]
]) {
  RECIPES.push({ out: [h, 1], pat: [[m, m, m], [m, 0, m]] });
  RECIPES.push({ out: [c, 1], pat: [[m, 0, m], [m, m, m], [m, m, m]] });
  RECIPES.push({ out: [l, 1], pat: [[m, m, m], [m, 0, m], [m, 0, m]] });
  RECIPES.push({ out: [b, 1], pat: [[m, 0, m], [m, 0, m]] });
}

const ok = (tok, t) => {
  if (tok === undefined) return false;
  if (tok === 0) return t === 0;
  if (tok === LOG) return t === N.ODUN || t === N.HUS_ODUN;
  if (tok === WOOLANY) return t === N.YUN || (t >= N.MOR_YUN && t <= N.BEYAZ_YUN);
  return tok === t;
};

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
