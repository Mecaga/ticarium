import { TYPES } from './world.js';

export const eco = {
  coins: 50,
  sel: 1,          // seçili blok türü
  hsel: 0,         // seçili hızlı slot sırası
  hotbar: [1, 2, 3, 4, 5],
  inv: {}, raw: {}, trend: {}
};

// Online bağlantısı için kancalar (online.js doldurur)
export const net = { active: false, owner: false, trade: null, setPrice: null };

export function resetEco() {
  eco.coins = 50; eco.sel = 1; eco.hsel = 0;
  eco.hotbar = [1, 2, 3, 4, 5];
  for (const t in TYPES) { eco.inv[t] = 0; eco.raw[t] = TYPES[t].base; eco.trend[t] = 0; }
}
resetEco();

export const clampRaw = (t, v) => Math.max(TYPES[t].base * 0.5, Math.min(TYPES[t].base * 1.8, v));
export const priceOf = t => Math.max(1, Math.round(eco.raw[t]));
export const buyCost = t => Math.ceil(priceOf(t) * 1.1);

export function sell(t) {
  if (eco.inv[t] < 1) return false;
  eco.coins += priceOf(t);
  eco.inv[t]--;
  eco.raw[t] = clampRaw(t, eco.raw[t] * 0.97);
  if (net.active && net.trade) net.trade(t, 0.97);
  return true;
}

export function buy(t) {
  const cost = buyCost(t);
  if (eco.coins < cost) return false;
  eco.coins -= cost;
  eco.inv[t]++;
  eco.raw[t] = clampRaw(t, eco.raw[t] * 1.03);
  if (net.active && net.trade) net.trade(t, 1.03);
  return true;
}

export function startPriceTicker(onTick) {
  setInterval(() => {
    if (net.active && !net.owner) return; // odada sadece oda sahibi dalgalandırır
    for (const t in TYPES) {
      const b = TYPES[t].base, old = priceOf(t);
      const next = eco.raw[t] + (Math.random() - 0.5) * b * 0.5 + (b - eco.raw[t]) * 0.1;
      eco.raw[t] = clampRaw(t, next);
      eco.trend[t] = priceOf(t) - old;
      if (net.active && net.setPrice) net.setPrice(t, eco.raw[t]);
    }
    onTick();
  }, 8000);
}
