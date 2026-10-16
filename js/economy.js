import { TYPES } from './world.js';

export const eco = {
  coins: 50,
  sel: 1,
  inv: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  price: {},
  trend: {}
};

for (const t in TYPES) { eco.price[t] = TYPES[t].base; eco.trend[t] = 0; }

export function sell(t) {
  if (eco.inv[t] < 1) return false;
  eco.inv[t]--;
  eco.coins += eco.price[t];
  return true;
}

export function buy(t) {
  const cost = eco.price[t] + 1;
  if (eco.coins < cost) return false;
  eco.coins -= cost;
  eco.inv[t]++;
  return true;
}

export function startPriceTicker(onTick) {
  setInterval(() => {
    for (const t in TYPES) {
      const b = TYPES[t].base, old = eco.price[t];
      const next = old + (Math.random() - 0.5) * b * 0.6 + (b - old) * 0.1;
      eco.price[t] = Math.max(1, Math.min(Math.round(b * 1.9), Math.round(next)));
      eco.trend[t] = eco.price[t] - old;
    }
    onTick();
  }, 8000);
}
