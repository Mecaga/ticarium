import { TYPES } from './world.js';

export const eco = {
  coins: 50,
  sel: 1,
  inv: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  raw: {},
  trend: {}
};

for (const t in TYPES) { eco.raw[t] = TYPES[t].base; eco.trend[t] = 0; }

export const priceOf = t => Math.max(1, Math.round(eco.raw[t]));
export const buyCost = t => Math.ceil(priceOf(t) * 1.1);

export function sell(t) {
  if (eco.inv[t] < 1) return false;
  eco.coins += priceOf(t);
  eco.inv[t]--;
  eco.raw[t] *= 0.97;
  return true;
}

export function buy(t) {
  const cost = buyCost(t);
  if (eco.coins < cost) return false;
  eco.coins -= cost;
  eco.inv[t]++;
  eco.raw[t] *= 1.03;
  return true;
}

export function startPriceTicker(onTick) {
  setInterval(() => {
    for (const t in TYPES) {
      const b = TYPES[t].base, old = priceOf(t);
      const next = eco.raw[t] + (Math.random() - 0.5) * b * 0.5 + (b - eco.raw[t]) * 0.1;
      eco.raw[t] = Math.max(b * 0.5, Math.min(b * 1.8, next));
      eco.trend[t] = priceOf(t) - old;
    }
    onTick();
  }, 8000);
}
