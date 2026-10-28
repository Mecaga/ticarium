import { TYPES } from '../world/world.js';

export const eco = {
  coins: 50,
  sel: 1,
  hsel: 0,
  hotbar: [1, 2, 3, 4, 5],
  layout: null,
  dur: {},
  armor: { head: 0, chest: 0, legs: 0, feet: 0 },
  armDur: { head: 0, chest: 0, legs: 0, feet: 0 },
  inv: {}, raw: {}, trend: {}
};

export const net = { active: false, owner: false, trade: null, setPrice: null };

// Güvenli baz değer (TYPES yüklenmediyse varsayılan 10 kullanılır)
const getBase = t => (TYPES && TYPES[t] && TYPES[t].base) ? TYPES[t].base : 10;

export function resetEco() {
  eco.coins = 50; eco.sel = 1; eco.hsel = 0;
  eco.hotbar = [1, 2, 3, 4, 5];
  eco.layout = null;
  eco.dur = {};
  eco.armor = { head: 0, chest: 0, legs: 0, feet: 0 };
  eco.armDur = { head: 0, chest: 0, legs: 0, feet: 0 };
  
  if (TYPES) {
    for (const t in TYPES) {
      const base = getBase(t);
      eco.inv[t] = 0;
      eco.raw[t] = base;
      eco.trend[t] = 0;
    }
  }
}

export const clampRaw = (t, v) => {
  const base = getBase(t);
  return Math.max(base * 0.5, Math.min(base * 1.8, v));
};

export const priceOf = t => Math.max(1, Math.round(eco.raw[t] || getBase(t)));
export const buyCost = t => Math.ceil(priceOf(t) * 1.1);

export function sell(t) {
  if (eco.inv[t] < 1) return false;
  eco.coins += priceOf(t);
  eco.inv[t]--;
  eco.raw[t] = clampRaw(t, (eco.raw[t] || getBase(t)) * 0.97);
  if (net.active && net.trade) net.trade(t, 0.97);
  return true;
}

export function buy(t) {
  const cost = buyCost(t);
  if (eco.coins < cost) return false;
  eco.coins -= cost;
  eco.inv[t]++;
  eco.raw[t] = clampRaw(t, (eco.raw[t] || getBase(t)) * 1.03);
  if (net.active && net.trade) net.trade(t, 1.03);
  return true;
}

export function startPriceTicker(onTick) {
  setInterval(() => {
    if (net.active && !net.owner) return;
    if (!TYPES) return;
    for (const t in TYPES) {
      const b = getBase(t), old = priceOf(t);
      const currentRaw = eco.raw[t] || b;
      const next = currentRaw + (Math.random() - 0.5) * b * 0.5 + (b - currentRaw) * 0.1;
      eco.raw[t] = clampRaw(t, next);
      eco.trend[t] = priceOf(t) - old;
      if (net.active && net.setPrice) net.setPrice(t, eco.raw[t]);
    }
    if (onTick) onTick();
  }, 8000);
}
