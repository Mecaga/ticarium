// Doku adı -> kategori klasörü. İlk eşleşen kazanır.
const R = [
  ['maden/doga', /^(coalOre|ironOre|goldOre|diamondOre)$/],
  ['maden/dusen', /^(coal|gem)$/],
  ['maden/kulce', /^(ingotI|ingotG)$/],
  ['maden/blok', /^(ironB|diamB|gold|obsidian|netherite)$/],
  ['yapi', /^(brick|glass|glassEdge|planks|wool|wc\d|bprint)$/],
  ['fonksiyonel', /^(craftTop|craftSide|furnaceTop|furnaceSide|chestTop|chestSide|doorC|doorO|jukeTop|jukeSide|bedFoot|bedHead|bedSide|farmTop|paint)$/],
  ['mob', /^egg[0-2]$/],
  ['zirh', /^(helm|chest|leg|boot)[ID]$/],
  ['arac', /^((pick|axe|shovel|hoe|sword)[A-Z]?|bucket|wbucket|lbucket|shears)$/],
  ['yemek', /^(meat|apple|bread|cooked|cigkofte|potato|carrot|tomato|pepper|onion|eggI|milkB|dough|cake|lettuce|beet|cucumber|salad.|soup.|fries|wheatI)$/],
  ['tarla', /^(seeds|sapling|wheat\d|cr\d_\d)$/],
  ['cicek', /^(lavender|daisy|poppy|bpoppy|tulipo|tulipp|tulipw|dye\d|tallGrass)$/],
  ['malzeme', /^(book\d|disc|stick)$/],
  ['temel', /^(grassTop|grassSide|dirt|stone|woodSide|woodTop|leaves|sand|snow|bedrock|water|lava|birchSide|birchTop|birchLeaf)$/]
];
export const CAT_NAMES = {
  'temel': 'Temel bloklar', 'fonksiyonel': 'İşleme giren bloklar', 'yapi': 'Yapı blokları',
  'maden/doga': 'Maden: doğada', 'maden/dusen': 'Maden: düşen parça', 'maden/kulce': 'Maden: külçe', 'maden/blok': 'Maden: blok',
  'cicek': 'Çiçek ve boyalar', 'mob': 'Mob (yumurta)', 'arac': 'Aletler', 'yemek': 'Yemekler',
  'tarla': 'Tarla ürünleri', 'zirh': 'Zırhlar', 'malzeme': 'Malzemeler', 'diger': 'Diğer'
};
export function categoryOf(name) {
  for (const [c, re] of R) if (re.test(name)) return c;
  return 'diger';
}
