// Eşya ve blok tanımları: sabitler, adlar, kategoriler. world.js bunları yeniden dışa aktarır.
export const BEDROCK = 11, SAPLING = 12, BIRCH_LOG = 13, BIRCH_LEAF = 14, MEAT = 15, WOOL = 16, WATER = 17;
export const GLASS = 9;
export const WATER_MAX = 24;
export const LAVA = 25, LAVA_MAX = 28;
export const BUCKET = 30, WBUCKET = 31, CANVAS = 32, LBUCKET = 33;
export const OBSIDIAN = 34;
export const COAL_ORE = 36, IRON_ORE = 37, GOLD_ORE = 38, DIAMOND_ORE = 39;
export const FLOWER_MIN = 40, FLOWER_MAX = 47, APPLE = 46;
export const PLANKS = 70, STICK = 71, CRAFT = 72, SEEDS = 73, WHEAT = 74, BREAD = 75, FARM = 76;
export const CROP_MIN = 77, CROP_MAX = 80;
export const FURNACE = 81, COAL = 82, INGOT_I = 83, INGOT_G = 84, GEM = 85, COOKED = 86;
export const TALL = 106;
export const DYE_MIN = 110, DYE_MAX = 117;
export const WOOLC_MIN = 120, WOOLC_MAX = 127;
export const VCROP_MIN = 130, VCROP_MAX = 149;
export const POTATO = 150, CARROT = 151, TOMATO = 152, PEPPER = 153, ONION = 154, CIGKofte = 155;
export const FRENCH_FRIES = 176, DOUGH = 177, MILK_BUCKET = 178;
export const BEETROOT = 190, LETTUCE = 191, CUCUMBER = 192;

export const VEG = [[130, POTATO], [134, CARROT], [138, TOMATO], [142, PEPPER], [146, ONION]];
VEG.push([210, 193], [214, 194], [218, 195]);

export const DYE_COL = [0x9a5fd0, 0xf2c91e, 0xd02228, 0x3050cd, 0xf3861f, 0xf078ac, 0x3ca03c, 0xf0f0f0];
export const DYE_NAMES = ['Mor', 'Sarı', 'Kırmızı', 'Mavi', 'Turuncu', 'Pembe', 'Yeşil', 'Beyaz'];

export const isCrop = t => (t >= CROP_MIN && t <= CROP_MAX) || (t >= VCROP_MIN && t <= VCROP_MAX) || (t >= 210 && t <= 221);
export const isPlant = t => t === SAPLING || t === TALL || t === 188 || t === 87 || t === 88 || (t >= FLOWER_MIN && t <= FLOWER_MAX) || isCrop(t);
export const TYPES = {
  1:  { name: 'Çim',    color: 0x5fae45, base: 10 },
  2:  { name: 'Toprak', color: 0x8b5a2b, base: 6 },
  3:  { name: 'Taş',    color: 0x969490, base: 15 },
  4:  { name: 'Odun',   color: 0x6b4423, base: 25 },
  5:  { name: 'Yaprak', color: 0x2f7d32, base: 5 },
  6:  { name: 'Kum',    color: 0xe6d690, base: 8 },
  7:  { name: 'Tuğla',  color: 0xb5493a, base: 30 },
  8:  { name: 'Kar',    color: 0xf5f5f5, base: 12 },
  9:  { name: 'Cam',    color: 0x9fd8e8, base: 20 },
  10: { name: 'Altın blok', color: 0xffd700, base: 80 },
  12: { name: 'Fidan',  color: 0x4caf50, base: 14 },
  13: { name: 'Huş odun',   color: 0xe4e0d2, base: 25 },
  14: { name: 'Huş yaprak', color: 0x8fc060, base: 5 },
  15: { name: 'Et',     color: 0xc4464f, base: 18 },
  16: { name: 'Yün',    color: 0xececec, base: 14 },
  30: { name: 'Kova',   color: 0x9aa0a6, base: 40 },
  31: { name: 'Su kovası', color: 0x4a90e2, base: 45 },
  32: { name: 'Tuval',  color: 0xd9c9a0, base: 35 },
  33: { name: 'Lav kovası', color: 0xe8661a, base: 60 },
  34: { name: 'Obsidiyen', color: 0x1b1030, base: 90 },
  36: { name: 'Kömür cevheri', color: 0x454548, base: 20 },
  37: { name: 'Demir cevheri', color: 0xd4aa8c, base: 40 },
  38: { name: 'Altın cevheri', color: 0xfad646, base: 70 },
  39: { name: 'Elmas cevheri', color: 0x5ae6e6, base: 150 },
  40: { name: 'Lavanta', color: 0x9a5fd0, base: 6 },
  41: { name: 'Papatya', color: 0xf5f5f5, base: 6 },
  42: { name: 'Gelincik', color: 0xd02228, base: 6 },
  43: { name: 'Mavi gelincik', color: 0x3050cd, base: 8 },
  44: { name: 'Turuncu lale', color: 0xf3861f, base: 8 },
  45: { name: 'Pembe lale', color: 0xf078ac, base: 8 },
  46: { name: 'Elma',   color: 0xc81e1e, base: 12 },
  50: { name: 'Ahşap kazma', color: 0xb08850, base: 20 },
  51: { name: 'Taş kazma', color: 0x9a9a9a, base: 30 },
  52: { name: 'Demir kazma', color: 0xd8d8d8, base: 60 },
  53: { name: 'Elmas kazma', color: 0x4de0d0, base: 150 },
  55: { name: 'Demir balta', color: 0xd0d0d0, base: 60 },
  56: { name: 'Demir kürek', color: 0xc8c8c8, base: 50 },
  57: { name: 'Ahşap balta', color: 0xb08850, base: 20 },
  58: { name: 'Taş balta', color: 0x9a9a9a, base: 30 },
  59: { name: 'Ahşap kürek', color: 0xb08850, base: 18 },
  60: { name: 'Taş kürek', color: 0x9a9a9a, base: 28 },
  61: { name: 'Ahşap çapa', color: 0xb08850, base: 20 },
  62: { name: 'Taş çapa', color: 0x9a9a9a, base: 30 },
  63: { name: 'Demir çapa', color: 0xd8d8d8, base: 60 },
  64: { name: 'Elmas çapa', color: 0x4de0d0, base: 150 },
  65: { name: 'Ahşap kılıç', color: 0xb08850, base: 25 },
  66: { name: 'Taş kılıç', color: 0x9a9a9a, base: 35 },
  67: { name: 'Demir kılıç', color: 0xd8d8d8, base: 70 },
  68: { name: 'Elmas kılıç', color: 0x4de0d0, base: 160 },
  69: { name: 'Elmas balta', color: 0x4de0d0, base: 150 },
  70: { name: 'Tahta', color: 0xbc9862, base: 8 },
  71: { name: 'Çubuk', color: 0x8c6434, base: 3 },
  72: { name: 'Çalışma masası', color: 0xa07c4c, base: 30 },
  73: { name: 'Buğday tohumu', color: 0x5a8a32, base: 4 },
  74: { name: 'Buğday', color: 0xc8aa3c, base: 8 },
  75: { name: 'Ekmek', color: 0xc89650, base: 20 },
  81: { name: 'Ocak', color: 0x8a8a8e, base: 40 },
  82: { name: 'Kömür', color: 0x2a2a2e, base: 12 },
  83: { name: 'Demir külçe', color: 0xd0d0da, base: 50 },
  84: { name: 'Altın külçe', color: 0xf5c940, base: 80 },
  85: { name: 'Elmas', color: 0x50e1d7, base: 160 },
  86: { name: 'Pişmiş et', color: 0x96552f, base: 30 },
  89: { name: 'Elmas kürek', color: 0x4de0d0, base: 140 },
  91: { name: 'Demir miğfer', color: 0xd0d0da, base: 100 },
  92: { name: 'Demir zırh', color: 0xd0d0da, base: 160 },
  93: { name: 'Demir pantolon', color: 0xd0d0da, base: 140 },
  94: { name: 'Demir bot', color: 0xd0d0da, base: 90 },
  95: { name: 'Elmas miğfer', color: 0x50e1d7, base: 250 },
  96: { name: 'Elmas zırh', color: 0x50e1d7, base: 400 },
  97: { name: 'Elmas pantolon', color: 0x50e1d7, base: 350 },
  98: { name: 'Elmas bot', color: 0x50e1d7, base: 200 },
  110: { name: 'Mor boya', color: 0x9a5fd0, base: 8 },
  111: { name: 'Sarı boya', color: 0xf2c91e, base: 8 },
  112: { name: 'Kırmızı boya', color: 0xd02228, base: 8 },
  113: { name: 'Mavi boya', color: 0x3050cd, base: 8 },
  114: { name: 'Turuncu boya', color: 0xf3861f, base: 8 },
  115: { name: 'Pembe boya', color: 0xf078ac, base: 8 },
  116: { name: 'Yeşil boya', color: 0x3ca03c, base: 8 },
  117: { name: 'Beyaz boya', color: 0xf0f0f0, base: 8 },
  120: { name: 'Mor yün', color: 0x9a5fd0, base: 16 },
  121: { name: 'Sarı yün', color: 0xf2c91e, base: 16 },
  122: { name: 'Kırmızı yün', color: 0xd02228, base: 16 },
  123: { name: 'Mavi yün', color: 0x3050cd, base: 16 },
  124: { name: 'Turuncu yün', color: 0xf3861f, base: 16 },
  125: { name: 'Pembe yün', color: 0xf078ac, base: 16 },
  126: { name: 'Yeşil yün', color: 0x3ca03c, base: 16 },
  127: { name: 'Beyaz yün', color: 0xf0f0f0, base: 16 },
  150: { name: 'Patates', color: 0xc4a060, base: 6 },
  151: { name: 'Havuç', color: 0xf0821e, base: 6 },
  152: { name: 'Domates', color: 0xdc3228, base: 8 },
  153: { name: 'Biber', color: 0x3caa3c, base: 8 },
  154: { name: 'Soğan', color: 0xebe1eb, base: 6 },
  155: { name: 'Çiğköfte', color: 0xa83a20, base: 40 },
  176: { name: 'Patates kızartması', color: 0xf0c850, base: 15 },
  177: { name: 'Hamur', color: 0xf5e1aa, base: 10 },
  178: { name: 'Süt kovası', color: 0xffffff, base: 50 },
  190: { name: 'Pancar', color: 0xdc3250, base: 6 },
  191: { name: 'Marul', color: 0x50b450, base: 6 },
  192: { name: 'Salatalık', color: 0x3c963c, base: 6 }
};

export const CATS = [
  ['🧱 Bloklar', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 14, 16, 120, 121, 122, 123, 124, 125, 126, 127, 34, 36, 37, 38, 39, 70, 72, 81]],
  ['🌱 Fidan ve çiçekler', [12, 40, 41, 42, 43, 44, 45, 73, 190, 191, 192]],
  ['🍎 Yiyecek', [15, 46, 74, 75, 86, 150, 151, 152, 153, 154, 155, 176]],
  ['🪣 Aletler', [30, 31, 33, 32, 178, 50, 51, 52, 53, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 89, 91, 92, 93, 94, 95, 96, 97, 98]],
  ['💎 Malzemeler', [71, 82, 83, 84, 85, 110, 111, 112, 113, 114, 115, 116, 117, 177]]
];
