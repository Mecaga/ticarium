import { TYPES } from '../world/world.js';

export const eco = {
  coins: 50,
  sel: 1,          // seçili eşya türü
  hsel: 0,         // seçili hızlı slot sırası
  hotbar: [1, 2, 3, 4, 5],
  layout: null,    // çanta yerleşimi (inventory.js)
  dur: {},         // alet dayanıklılıkları (gear.js)
  armor: { head: 0, chest: 0, legs: 0, feet: 0 },     // giyilen zırh türleri (armor.js)
  armDur: { head: 0, chest: 0, legs: 0, feet: 0 },    // giyilen zırh dayanıklılıkları
  inv: {}, raw: {}, trend: {}
};

// Online bağlantısı için kancalar (online.js doldurur)
export const net = { active: false, owner: false, trade: null, setPrice: null };

export function resetEco() {
  eco.coins = 50; eco.sel = 1; eco.hsel = 0;
  eco.hotbar = [1, 2, 3, 4, 5];
  eco.layout = null;
  eco.dur = {};
  eco.armor = { head: 0, chest: 0, legs: 0, feet: 0 };
  eco.armDur = { head: 0, chest: 0, legs: 0, feet: 0 };
  for (const t in TYPES) {
    const base = TYPES[t]?.base || 10;
    eco.inv[t] = 0;
    eco.raw[t] = base;
    eco.trend[t] = 0;
  }
}
resetEco();

export const clampRaw = (t, v) => {
  const base = TYPES[t]?.base || 10;
  return Math.max(base * 0.5, Math.min(base * 1.8, v));
};
export const priceOf = t => Math.max(1, Math.round(eco.raw[t] || TYPES[t]?.base || 10));
export const buyCost = t => Math.ceil(priceOf(t) * 1.1);

export function sell(t) {
  if (eco.inv[t] < 1) return false;
  eco.coins += priceOf(t);
  eco.inv[t]--;
  eco.raw[t] = clampRaw(t, (eco.raw[t] || TYPES[t]?.base || 10) * 0.97);
  if (net.active && net.trade) net.trade(t, 0.97);
  return true;
}

export function buy(t) {
  const cost = buyCost(t);
  if (eco.coins < cost) return false;
  eco.coins -= cost;
  eco.inv[t]++;
  eco.raw[t] = clampRaw(t, (eco.raw[t] || TYPES[t]?.base || 10) * 1.03);
  if (net.active && net.trade) net.trade(t, 1.03);
  return true;
}

export function startPriceTicker(onTick) {
  setInterval(() => {
    if (net.active && !net.owner) return;
    for (const t in TYPES) {
      const b = TYPES[t]?.base || 10, old = priceOf(t);
      const currentRaw = eco.raw[t] || b;
      const next = currentRaw + (Math.random() - 0.5) * b * 0.5 + (b - currentRaw) * 0.1;
      eco.raw[t] = clampRaw(t, next);
      eco.trend[t] = priceOf(t) - old;
      if (net.active && net.setPrice) net.setPrice(t, eco.raw[t]);
    }
    onTick();
  }, 8000);
}
