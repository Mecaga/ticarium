import { N, SEBZE_ILK, SEBZE_SIRA } from './idtable.js';

export const BEDROCK = N.KATMAN_KAYASI, SAPLING = N.FIDAN, BIRCH_LOG = N.HUS_ODUN, BIRCH_LEAF = N.HUS_YAPRAK;
export const MEAT = N.ET, WOOL = N.YUN, WATER = N.SU, GLASS = N.CAM;
export const WATER_MAX = 24;
export const LAVA = N.LAV, LAVA_MAX = 28;
export const BUCKET = N.KOVA, WBUCKET = N.SU_KOVASI, CANVAS = N.TUVAL, LBUCKET = N.LAV_KOVASI;
export const OBSIDIAN = N.OBSIDIYEN, NETHERITE = 0;
export const COAL_ORE = N.KOMUR_CEVHERI, IRON_ORE = N.DEMIR_CEVHERI, GOLD_ORE = N.ALTIN_CEVHERI, DIAMOND_ORE = N.ELMAS_CEVHERI;
export const FLOWER_MIN = N.LAVANTA, FLOWER_MAX = N.AMBER, APPLE = N.ELMA;
export const PLANKS = N.TAHTA, STICK = N.CUBUK, CRAFT = N.CALISMA_MASASI, SEEDS = N.BUGDAY_TOHUMU, WHEAT = N.BUGDAY, BREAD = N.EKMEK;
export const FARM = 75, TALL = 76;
export const CROP_MIN = N.BUGDAY_0, CROP_MAX = N.BUGDAY_3;
export const FURNACE = N.OCAK, COAL = N.KOMUR, INGOT_I = N.DEMIR_KULCE, INGOT_G = N.ALTIN_KULCE, GEM = N.ELMAS, COOKED = N.PISMIS_ET;
export const DYE_MIN = N.MOR_BOYA, DYE_MAX = N.BEYAZ_BOYA;
export const WOOLC_MIN = N.MOR_YUN, WOOLC_MAX = N.BEYAZ_YUN;
export const VCROP_MIN = SEBZE_ILK, VCROP_MAX = SEBZE_ILK + SEBZE_SIRA.length * 4 - 1;
export const POTATO = N.PATATES, CARROT = N.HAVUC, TOMATO = N.DOMATES, PEPPER = N.BIBER, ONION = N.SOGAN, CIGKOFTE = N.CIGKOFTE;

// Sebzeler: [ilk aşama bloğu, eşya]. Her sebzenin 4 aşaması ardışık.
export const VEG = SEBZE_SIRA.map((k, i) => [SEBZE_ILK + i * 4, N[k]]);

export const DYE_COL = [0x9a5fd0, 0xf2c91e, 0xd02228, 0x3050cd, 0xf3861f, 0xf078ac, 0x3ca03c, 0xf0f0f0];
export const DYE_NAMES = ['Mor', 'Sarı', 'Kırmızı', 'Mavi', 'Turuncu', 'Pembe', 'Yeşil', 'Beyaz'];

export const isCrop = t => (t >= CROP_MIN && t <= CROP_MAX) || (t >= VCROP_MIN && t <= VCROP_MAX);
export const isPlant = t => t === SAPLING || t === TALL || (t >= FLOWER_MIN && t <= FLOWER_MAX) || isCrop(t);

// [N anahtarı, ad, renk, taban fiyat]
const L = [
  ['CIM', 'Çim', 0x5fae45, 10], ['TOPRAK', 'Toprak', 0x8b5a2b, 6], ['TAS', 'Taş', 0x969490, 15], ['ODUN', 'Odun', 0x6b4423, 25],
  ['YAPRAK', 'Yaprak', 0x2f7d32, 5], ['KUM', 'Kum', 0xe6d690, 8], ['TUGLA', 'Tuğla', 0xb5493a, 30], ['KAR', 'Kar', 0xf5f5f5, 12],
  ['CAM', 'Cam', 0x9fd8e8, 20], ['ALTIN_BLOK', 'Altın blok', 0xffd700, 80], ['FIDAN', 'Fidan', 0x4caf50, 14],
  ['HUS_ODUN', 'Huş odun', 0xe4e0d2, 25], ['HUS_YAPRAK', 'Huş yaprak', 0x8fc060, 5], ['ET', 'Et', 0xc4464f, 18], ['YUN', 'Yün', 0xececec, 14],
  ['KOVA', 'Kova', 0x9aa0a6, 40], ['SU_KOVASI', 'Su kovası', 0x4a90e2, 45], ['TUVAL', 'Tuval', 0xd9c9a0, 35], ['LAV_KOVASI', 'Lav kovası', 0xe8661a, 60],
  ['OBSIDIYEN', 'Obsidiyen', 0x1b1030, 90],
  ['KOMUR_CEVHERI', 'Kömür cevheri', 0x454548, 20], ['DEMIR_CEVHERI', 'Demir cevheri', 0xd4aa8c, 40],
  ['ALTIN_CEVHERI', 'Altın cevheri', 0xfad646, 70], ['ELMAS_CEVHERI', 'Elmas cevheri', 0x5ae6e6, 150],
  ['LAVANTA', 'Lavanta', 0x9a5fd0, 6], ['PAPATYA', 'Papatya', 0xf5f5f5, 6], ['GELINCIK', 'Gelincik', 0xd02228, 6],
  ['MAVI_GELINCIK', 'Mavi gelincik', 0x3050cd, 8], ['TURUNCU_LALE', 'Turuncu lale', 0xf3861f, 8], ['PEMBE_LALE', 'Pembe lale', 0xf078ac, 8],
  ['BEYAZ_LALE', 'Beyaz lale', 0xf5f5f5, 8], ['ELMA', 'Elma', 0xc81e1e, 12],
  ['TAHTA', 'Tahta', 0xbc9862, 8], ['CUBUK', 'Çubuk', 0x8c6434, 3], ['CALISMA_MASASI', 'Çalışma masası', 0xa07c4c, 30],
  ['BUGDAY_TOHUMU', 'Buğday tohumu', 0x5a8a32, 4], ['BUGDAY', 'Buğday', 0xc8aa3c, 8], ['EKMEK', 'Ekmek', 0xc89650, 20],
  ['OCAK', 'Ocak', 0x8a8a8e, 40], ['KOMUR', 'Kömür', 0x2a2a2e, 12], ['DEMIR_KULCE', 'Demir külçe', 0xd0d0da, 50],
  ['ALTIN_KULCE', 'Altın külçe', 0xf5c940, 80], ['ELMAS', 'Elmas', 0x50e1d7, 160], ['PISMIS_ET', 'Pişmiş et', 0x96552f, 30],
  ['PATATES', 'Patates', 0xc4a060, 6], ['HAVUC', 'Havuç', 0xf0821e, 6], ['DOMATES', 'Domates', 0xdc3228, 8], ['BIBER', 'Biber', 0x3caa3c, 8],
  ['SOGAN', 'Soğan', 0xebe1eb, 6], ['CIGKOFTE', 'Çiğköfte', 0xa83a20, 40], ['YUMURTA', 'Yumurta', 0xf5f0e1, 6],
  ['SUT_KOVASI', 'Süt kovası', 0xf5f5fa, 50], ['HAMUR', 'Hamur', 0xebd7aa, 14], ['KEK', 'Kek', 0xf0c8d2, 40],
  ['MARUL', 'Marul', 0x78c850, 6], ['PANCAR', 'Pancar', 0x961e46, 6], ['SALATALIK', 'Salatalık', 0x3c963c, 6],
  ['SALATALIK_SALATASI', 'Salatalık salatası', 0xd23c32, 25], ['MARUL_SALATASI', 'Marul salatası', 0x82c85a, 22],
  ['PANCAR_CORBASI', 'Pancar çorbası', 0x961e46, 28], ['DOMATES_CORBASI', 'Domates çorbası', 0xd74628, 28],
  ['SEBZE_CORBASI', 'Sebze çorbası', 0xe69632, 32], ['PATATES_KIZARTMASI', 'Patates kızartması', 0xebbe46, 30],
  ['YEMEK_KITABI', 'Yemek kitabı', 0xc83232, 40], ['CRAFT_KITABI', 'Craft kitabı', 0x3c9650, 40], ['FIRIN_KITABI', 'Fırın kitabı', 0xeb7d19, 40],
  ['ALET_KITABI', 'Alet kitabı', 0x3c78d2, 40], ['ZIRH_KITABI', 'Zırh kitabı', 0xa0a5b4, 40], ['REHBER_KITABI', 'Rehber kitabı', 0x8c50be, 40],
  ['SANDIK', 'Sandık', 0x9a6a30, 50], ['MAKAS', 'Makas', 0xd8d8d8, 60], ['MUZIK_KUTUSU', 'Müzik kutusu', 0x6b4423, 60],
  ['DISK_1', 'Disk: Neşe', 0x222222, 40], ['DISK_2', 'Disk: Gece', 0x6a2040, 50], ['DISK_3', 'Disk: Macera', 0xd4a020, 70],
  ['SEMA_BLOGU', 'Şema bloğu (ev)', 0x4a90e2, 50], ['DEMIR_BLOK', 'Demir blok', 0xd8d8de, 150], ['ELMAS_BLOK', 'Elmas blok', 0x50e1d7, 500],
  ['YATAK_BASI', 'Yatak', 0xc03030, 60], ['KAPI_BASI', 'Kapı', 0x9a6a30, 30],
  ['MOR_BOYA', 'Mor boya', 0x9a5fd0, 8], ['SARI_BOYA', 'Sarı boya', 0xf2c91e, 8], ['KIRMIZI_BOYA', 'Kırmızı boya', 0xd02228, 8],
  ['MAVI_BOYA', 'Mavi boya', 0x3050cd, 8], ['TURUNCU_BOYA', 'Turuncu boya', 0xf3861f, 8], ['PEMBE_BOYA', 'Pembe boya', 0xf078ac, 8],
  ['YESIL_BOYA', 'Yeşil boya', 0x3ca03c, 8], ['BEYAZ_BOYA', 'Beyaz boya', 0xf0f0f0, 8],
  ['MOR_YUN', 'Mor yün', 0x9a5fd0, 16], ['SARI_YUN', 'Sarı yün', 0xf2c91e, 16], ['KIRMIZI_YUN', 'Kırmızı yün', 0xd02228, 16],
  ['MAVI_YUN', 'Mavi yün', 0x3050cd, 16], ['TURUNCU_YUN', 'Turuncu yün', 0xf3861f, 16], ['PEMBE_YUN', 'Pembe yün', 0xf078ac, 16],
  ['YESIL_YUN', 'Yeşil yün', 0x3ca03c, 16], ['BEYAZ_YUN', 'Beyaz yün', 0xf0f0f0, 16],
  ['AHSAP_KAZMA', 'Ahşap kazma', 0xb08850, 20], ['TAS_KAZMA', 'Taş kazma', 0x9a9a9a, 30], ['DEMIR_KAZMA', 'Demir kazma', 0xd8d8d8, 60], ['ELMAS_KAZMA', 'Elmas kazma', 0x4de0d0, 150],
  ['AHSAP_BALTA', 'Ahşap balta', 0xb08850, 20], ['TAS_BALTA', 'Taş balta', 0x9a9a9a, 30], ['DEMIR_BALTA', 'Demir balta', 0xd0d0d0, 60], ['ELMAS_BALTA', 'Elmas balta', 0x4de0d0, 150],
  ['AHSAP_KUREK', 'Ahşap kürek', 0xb08850, 18], ['TAS_KUREK', 'Taş kürek', 0x9a9a9a, 28], ['DEMIR_KUREK', 'Demir kürek', 0xc8c8c8, 50], ['ELMAS_KUREK', 'Elmas kürek', 0x4de0d0, 140],
  ['AHSAP_CAPA', 'Ahşap çapa', 0xb08850, 20], ['TAS_CAPA', 'Taş çapa', 0x9a9a9a, 30], ['DEMIR_CAPA', 'Demir çapa', 0xd8d8d8, 60], ['ELMAS_CAPA', 'Elmas çapa', 0x4de0d0, 150],
  ['AHSAP_KILIC', 'Ahşap kılıç', 0xb08850, 25], ['TAS_KILIC', 'Taş kılıç', 0x9a9a9a, 35], ['DEMIR_KILIC', 'Demir kılıç', 0xd8d8d8, 70], ['ELMAS_KILIC', 'Elmas kılıç', 0x4de0d0, 160],
  ['DEMIR_MIGFER', 'Demir miğfer', 0xd0d0da, 100], ['DEMIR_ZIRH', 'Demir zırh', 0xd0d0da, 160], ['DEMIR_PANTOLON', 'Demir pantolon', 0xd0d0da, 140], ['DEMIR_BOT', 'Demir bot', 0xd0d0da, 90],
  ['ELMAS_MIGFER', 'Elmas miğfer', 0x50e1d7, 250], ['ELMAS_ZIRH', 'Elmas zırh', 0x50e1d7, 400], ['ELMAS_PANTOLON', 'Elmas pantolon', 0x50e1d7, 350], ['ELMAS_BOT', 'Elmas bot', 0x50e1d7, 200],
  ['INEK_YUMURTASI', 'İnek yumurtası', 0x9a6a3a, 30], ['KOYUN_YUMURTASI', 'Koyun yumurtası', 0xeeeeee, 30], ['TAVUK_YUMURTASI', 'Tavuk yumurtası', 0xf2d25a, 30]
];
export const TYPES = {};
for (const [k, name, color, base] of L) {
  if (N[k] === undefined) { console.warn('defs.js: idtable.js içinde yok: ' + k); continue; }
  TYPES[N[k]] = { name, color, base };
}

const K = a => a.map(k => N[k]).filter(v => v !== undefined);
export const CATS = [
  ['🧱 Bloklar', K(['CIM', 'TOPRAK', 'TAS', 'ODUN', 'YAPRAK', 'KUM', 'TUGLA', 'KAR', 'CAM', 'ALTIN_BLOK', 'HUS_ODUN', 'HUS_YAPRAK', 'YUN',
    'MOR_YUN', 'SARI_YUN', 'KIRMIZI_YUN', 'MAVI_YUN', 'TURUNCU_YUN', 'PEMBE_YUN', 'YESIL_YUN', 'BEYAZ_YUN', 'OBSIDIYEN',
    'KOMUR_CEVHERI', 'DEMIR_CEVHERI', 'ALTIN_CEVHERI', 'ELMAS_CEVHERI', 'DEMIR_BLOK', 'ELMAS_BLOK', 'TAHTA', 'CALISMA_MASASI',
    'OCAK', 'SANDIK', 'MUZIK_KUTUSU', 'SEMA_BLOGU', 'YATAK_BASI', 'KAPI_BASI'])],
  ['🌱 Fidan ve çiçekler', K(['FIDAN', 'LAVANTA', 'PAPATYA', 'GELINCIK', 'MAVI_GELINCIK', 'TURUNCU_LALE', 'PEMBE_LALE', 'BEYAZ_LALE', 'BUGDAY_TOHUMU'])],
  ['🍎 Yiyecek', K(['ET', 'ELMA', 'BUGDAY', 'EKMEK', 'PISMIS_ET', 'PATATES', 'HAVUC', 'DOMATES', 'BIBER', 'SOGAN', 'CIGKOFTE', 'MARUL', 'PANCAR',
    'SALATALIK', 'HAMUR', 'KEK', 'SALATALIK_SALATASI', 'MARUL_SALATASI', 'PANCAR_CORBASI', 'DOMATES_CORBASI', 'SEBZE_CORBASI', 'PATATES_KIZARTMASI'])],
  ['🪣 Aletler', K(['KOVA', 'SU_KOVASI', 'LAV_KOVASI', 'TUVAL', 'MAKAS',
    'AHSAP_KAZMA', 'TAS_KAZMA', 'DEMIR_KAZMA', 'ELMAS_KAZMA', 'AHSAP_BALTA', 'TAS_BALTA', 'DEMIR_BALTA', 'ELMAS_BALTA',
    'AHSAP_KUREK', 'TAS_KUREK', 'DEMIR_KUREK', 'ELMAS_KUREK', 'AHSAP_CAPA', 'TAS_CAPA', 'DEMIR_CAPA', 'ELMAS_CAPA',
    'AHSAP_KILIC', 'TAS_KILIC', 'DEMIR_KILIC', 'ELMAS_KILIC',
    'DEMIR_MIGFER', 'DEMIR_ZIRH', 'DEMIR_PANTOLON', 'DEMIR_BOT', 'ELMAS_MIGFER', 'ELMAS_ZIRH', 'ELMAS_PANTOLON', 'ELMAS_BOT'])],
  ['💎 Malzemeler', K(['CUBUK', 'KOMUR', 'DEMIR_KULCE', 'ALTIN_KULCE', 'ELMAS', 'YUMURTA', 'SUT_KOVASI',
    'MOR_BOYA', 'SARI_BOYA', 'KIRMIZI_BOYA', 'MAVI_BOYA', 'TURUNCU_BOYA', 'PEMBE_BOYA', 'YESIL_BOYA', 'BEYAZ_BOYA',
    'DISK_1', 'DISK_2', 'DISK_3', 'YEMEK_KITABI', 'CRAFT_KITABI', 'FIRIN_KITABI', 'ALET_KITABI', 'ZIRH_KITABI', 'REHBER_KITABI',
    'INEK_YUMURTASI', 'KOYUN_YUMURTASI', 'TAVUK_YUMURTASI'])]
];
