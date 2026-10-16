import { P } from './player.js';

export const input = { jx: 0, jy: 0, keys: {} };

export function initInput(canvas, actions) {
  // Klavye
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    input.keys[e.code] = true;
    if (e.code === 'KeyE') actions.market();
    if (e.code >= 'Digit1' && e.code <= 'Digit5') actions.select(+e.code.slice(5));
  });
  addEventListener('keyup', e => input.keys[e.code] = false);

  // Fare
  canvas.addEventListener('click', () => {
    if (!('ontouchstart' in window)) canvas.requestPointerLock();
  });
  addEventListener('mousemove', e => {
    if (!document.pointerLockElement) return;
    P.yaw -= e.movementX * 0.002;
    P.pitch = Math.max(-1.5, Math.min(1.5, P.pitch - e.movementY * 0.002));
  });
  addEventListener('mousedown', e => {
    if (!document.pointerLockElement) return;
    if (e.button === 0) actions.breakBlock();
    if (e.button === 2) actions.placeBlock();
  });
  addEventListener('contextmenu', e => e.preventDefault());

  // Joystick (sol alan)
  const joy = document.getElementById('joy');
  const base = document.getElementById('joyBase');
  const knob = document.getElementById('joyKnob');
  let joyId = null, ox = 0, oy = 0;

  joy.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    joyId = t.identifier; ox = t.clientX; oy = t.clientY;
    base.style.display = 'block';
    base.style.left = (ox - 50) + 'px';
    base.style.top = (oy - 50) + 'px';
  }, { passive: false });

  joy.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.changedTouches) if (t.identifier === joyId) {
      let dx = t.clientX - ox, dy = t.clientY - oy;
      const l = Math.hypot(dx, dy), m = 50;
      if (l > m) { dx = dx / l * m; dy = dy / l * m; }
      input.jx = dx / m; input.jy = dy / m;
      knob.style.left = (28 + dx) + 'px';
      knob.style.top = (28 + dy) + 'px';
    }
  }, { passive: false });

  const endJoy = e => {
    for (const t of e.changedTouches) if (t.identifier === joyId) {
      joyId = null; input.jx = input.jy = 0;
      base.style.display = 'none';
      knob.style.left = knob.style.top = '28px';
    }
  };
  joy.addEventListener('touchend', endJoy);
  joy.addEventListener('touchcancel', endJoy);

  // Bakınma (sağ alan)
  const look = document.getElementById('look');
  let lookId = null, lx = 0, ly = 0;
  look.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    lookId = t.identifier; lx = t.clientX; ly = t.clientY;
  }, { passive: false });
  look.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.changedTouches) if (t.identifier === lookId) {
      P.yaw -= (t.clientX - lx) * 0.006;
      P.pitch = Math.max(-1.5, Math.min(1.5, P.pitch - (t.clientY - ly) * 0.006));
      lx = t.clientX; ly = t.clientY;
    }
  }, { passive: false });
  look.addEventListener('touchend', e => {
    for (const t of e.changedTouches) if (t.identifier === lookId) lookId = null;
  });

  // Butonlar
  const bind = (id, fn) => {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false });
    el.addEventListener('mousedown', e => { e.stopPropagation(); fn(); });
  };
  bind('bJump', actions.jump);
  bind('bBreak', actions.breakBlock);
  bind('bPlace', actions.placeBlock);
  bind('bMarket', actions.market);
}
