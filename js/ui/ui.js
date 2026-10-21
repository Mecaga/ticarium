import { TYPES } from '../world/world.js';
import { iconURL } from '../world/textures.js';
import { eco, sell, buy, priceOf, buyCost } from '../game/economy.js';
import { isCreative } from '../game/creative.js';

// Pazarı geri açmak için true yap
export const MARKET_ON = false;

const css = c => '#' + c.toString(16).padStart(6, '0');
let marketOpen = false;
export const isMarketOpen = () => marketOpen;
export const hooks = { bag: null };

// Eşya ikonu (dokudan üretilir; yoksa renkli kare)
export function iconHTML(t) {
  const u = iconURL(t);
  return u ? '<img src="' + u + '" draggable="false" alt="">' : '<i style="background:' + css(TYPES[t].color) + '"></i>';
}

export function toast(s) {
  const m = document.getElementById('msg');
  m.textContent = s;
  m.style.opacity = 1;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => m.style.opacity = 0, 1400);
}

export function drawHud() {
  document.getElementById('coins').textContent = '🪙 ' + eco.coins;
  const hb = document.getElementById('hotbar');
  hb.innerHTML = '';
  const cre = isCreative();
  eco.hotbar.forEach((t, i) => {
    const d = document.createElement('div');
    d.className = 'slot' + (i === eco.hsel ? ' sel' : '');
    const have = cre || (eco.inv[t] || 0) > 0;
    d.innerHTML = iconHTML(t) + '<b>' + (cre ? '∞' : (eco.inv[t] || 0)) + '</b>';
    if (!have) d.style.opacity = 0.5;
    const pick = e => { e.preventDefault(); e.stopPropagation(); eco.hsel = i; eco.sel = t; drawHud(); toast(TYPES[t].name); };
    d.addEventListener('touchstart', pick, { passive: false });
    d.addEventListener('mousedown', pick);
    hb.appendChild(d);
  });
  const more = document.createElement('div');
  more.className = 'slot more';
  more.textContent = '⋯';
  const openBag = e => { e.preventDefault(); e.stopPropagation(); if (hooks.bag) hooks.bag(); };
  more.addEventListener('touchstart', openBag, { passive: false });
  more.addEventListener('mousedown', openBag);
  hb.appendChild(more);
}

export function drawMarket() {
  let h = `<h2>🏪 Pazar</h2><div>Bakiye: 🪙 ${eco.coins} <small>Fiyatlar 8 sn'de bir değişir</small></div>`;
  for (const t in TYPES) {
    const tr = eco.trend[t] > 0 ? `<span class="up">▲${eco.trend[t]}</span>`
             : eco.trend[t] < 0 ? `<span class="down">▼${-eco.trend[t]}</span>` : '';
    h += `<div class="row"><div class="n">${TYPES[t].name} ${tr}
      <small>Sat: 🪙 ${priceOf(t)} · Al: 🪙 ${buyCost(t)} · Sende: ${eco.inv[t]}</small></div>
      <button class="sell" data-act="sell" data-t="${t}">Sat</button>
      <button class="buy" data-act="buy" data-t="${t}">Al</button></div>`;
  }
  h += `<button id="close">Kapat</button>`;
  document.getElementById('panel').innerHTML = h;
}

export function toggleMarket() {
  if (!MARKET_ON) return;
  marketOpen = !marketOpen;
  document.getElementById('market').style.display = marketOpen ? 'flex' : 'none';
  if (marketOpen) drawMarket();
}

document.getElementById('panel').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.id === 'close') return toggleMarket();
  const t = +b.dataset.t;
  if (b.dataset.act === 'sell' && !sell(t)) toast(TYPES[t].name + ' yok');
  if (b.dataset.act === 'buy' && !buy(t)) toast('Yetersiz bakiye');
  drawMarket();
  drawHud();
});
