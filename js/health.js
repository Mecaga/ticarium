export const hp = { cur: 20, max: 20, dead: false, protectUntil: 0, regen: 0 };
export const hhooks = { onChange: null, onHurt: null, onDeath: null };

const changed = () => { if (hhooks.onChange) hhooks.onChange(hp.cur, hp.max); };
export const isDead = () => hp.dead;
export const canHurt = () => !hp.dead && Date.now() >= hp.protectUntil;

export function resetHealth() {
  hp.cur = hp.max; hp.dead = false; hp.protectUntil = 0; hp.regen = 0;
  changed();
}

// src: { name, id } (oyuncu) | { fall: true } | { void: true }
export function hurt(d, src = {}) {
  if (hp.dead || d <= 0) return false;
  if (Date.now() < hp.protectUntil) return false;
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
  if (hp.dead) return;
  hp.cur = 0; hp.dead = true;
  changed();
  if (hhooks.onDeath) hhooks.onDeath(src);
}

export function respawnHealth() {
  hp.cur = hp.max; hp.dead = false; hp.regen = 0;
  hp.protectUntil = Date.now() + 3000;
  changed();
}

export function tickHealth(dt) {
  if (hp.dead || hp.cur >= hp.max) return;
  hp.regen += dt;
  if (hp.regen >= 4) { hp.regen = 0; hp.cur++; changed(); }
}
