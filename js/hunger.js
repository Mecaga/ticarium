import { hurt, hp } from './health.js';

export const food = { cur: 20, max: 20, drain: 0, starve: 0 };

const st = document.createElement('style');
st.textContent = `
#hearts{left:calc(50% - 6px);transform:translateX(-100%);font-size:12px}
#food{position:fixed;bottom:72px;left:calc(50% + 6px);font-size:12px;z-index:6;pointer-events:none;white-space:nowrap;display:none}
`;
document.head.appendChild(st);
const el = document.createElement('div');
el.id = 'food';
document.body.appendChild(el);

function draw() {
  const full = Math.ceil(food.cur / 2);
  let h = '';
  for (let i = 0; i < 10; i++) h += i < full ? '🍗' : '<span style="opacity:.22">🍗</span>';
  el.innerHTML = h;
}
draw();

export function showFood(on) { el.style.display = on ? 'block' : 'none'; }
export function setFood(v) { food.cur = Math.max(0, Math.min(food.max, Math.round(v))); food.drain = 0; food.starve = 0; draw(); }
export function resetFood() { setFood(food.max); }
export function eat(n) { food.cur = Math.min(food.max, food.cur + n); draw(); }
export const canRegen = () => food.cur >= 14;

export function tickHunger(dt, moving, alive) {
  if (!alive) return;
  food.drain += dt * (moving ? 2 : 1);
  if (food.drain >= 45) {
    food.drain = 0;
    if (food.cur > 0) { food.cur--; draw(); }
  }
  if (food.cur <= 0) {
    food.starve += dt;
    if (food.starve >= 4) {
      food.starve = 0;
      if (hp.cur > 2) hurt(1, { starve: true }); // açlıktan 1 kalbe kadar düşer
    }
  } else food.starve = 0;
}
