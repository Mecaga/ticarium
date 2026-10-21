export const hp = { cur: 20, max: 20, dead: false, protectUntil: 0, regen: 0, god: false };
export const hhooks = { onChange: null, onHurt: null, onDeath: null, reduce: null };

const changed = () => { if (hhooks.onChange) hhooks.onChange(hp.cur, hp.max); };
export const isDead = () => hp.dead;
export const canHurt = () => !hp.dead && !hp.god && Date.now() >= hp.protectUntil;

export function resetHealth() {
  hp.cur = hp.max; hp.dead = false; hp.protectUntil = 0; hp.regen = 0; hp.god = false;
  changed();
}

export function healFull() { hp.cur = hp.max; changed(); }

// src: { name, id } | { fall } | { void } | { starve } | { lava } | { drown }
// Zırh hasarı azaltır (reduce: game/armor.js)
export function hurt(d, src = {}) {
  if (hp.dead || hp.god || d <= 0) return false;
  if (Date.now() < hp.protectUntil) return false;
  if (hhooks.reduce) d = Math.max(1, Math.round(hhooks.reduce(d, src)));
  hp.cur = Math.max(0, hp.cur - d);
  hp.regen = 0;
  changed();
  if (hhooks.onHurt) hhooks.onHurt();
  if (hp.cur <= 0) {
    hp.dead = true;
    if (hhooks.onDeath) hhooks.onDeath(src);
    return true;
  }
  return false;
}

export function killNow(src = {}) {
  if (hp.dead || hp.god) return;
  hp.cur = 0; hp.dead = true;
  changed();
  if (hhooks.onDeath) hhooks.onDeath(src);
}

export function respawnHealth() {
  hp.cur = hp.max; hp.dead = false; hp.regen = 0;
  hp.protectUntil = Date.now() + 3000;
  changed();
}

// canRegen: açlık yeterliyse can dolar
export function tickHealth(dt, canRegen = true) {
  if (hp.dead || hp.cur >= hp.max || !canRegen) return;
  hp.regen += dt;
  if (hp.regen >= 4) { hp.regen = 0; hp.cur++; changed(); }
}
