import { P } from '../entities/player.js';

export const input = { jx: 0, jy: 0, keys: {} };

// actions: jump, breakDown, breakUp, placeBlock, market, select
export function initInput(canvas, actions) {
  // Klavye
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    input.keys[e.code] = true;
    if (e.code === 'KeyE') actions.market();
    if (e.code >= 'Digit1' && e.code <= 'Digit5') actions.select(+e.code.slice(5));
  });
  addEventListener('keyup', e => input.keys[e.code] = false);

  // Fare: sol tuşu basılı tutunca kırar, bırakınca durur
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
    if (e.button === 0) actions.breakDown();
    if (e.button === 2) actions.placeBlock();
  });
  addEventListener('mouseup', e => { if (e.button === 0) actions.breakUp(); });
  addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('blur', () => actions.breakUp());
  document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement) actions.breakUp(); });

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

  // Bakınma + dokunma: kısa dokunuş koyar, basılı tutup kaydırmak kırar/bakar
  const look = document.getElementById('look');
  const LOOKTAP = { id: null, sx: 0, sy: 0, moved: false, t0: 0, holdT: null };
  
  look.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    Object.assign(LOOKTAP, { id: t.identifier, sx: t.clientX, sy: t.clientY, lx: t.clientX, ly: t.clientY, moved: false, t0: Date.now() });
    // 350 ms basılı kalırsa kırma başlar (hareket etmediyse)
    LOOKTAP.holdT = setTimeout(() => { if (!LOOKTAP.moved) actions.breakDown(); }, 350);
  }, { passive: false });

  look.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.changedTouches) if (t.identifier === LOOKTAP.id) {
      if (Math.hypot(t.clientX - LOOKTAP.sx, t.clientY - LOOKTAP.sy) > 8) {
        if (!LOOKTAP.moved) { LOOKTAP.moved = true; clearTimeout(LOOKTAP.holdT); actions.breakUp(); }
      }
      if (LOOKTAP.moved) {
        P.yaw -= (t.clientX - LOOKTAP.lx) * 0.006;
        P.pitch = Math.max(-1.5, Math.min(1.5, P.pitch - (t.clientY - LOOKTAP.ly) * 0.006));
      }
      LOOKTAP.lx = t.clientX; LOOKTAP.ly = t.clientY;
    }
  }, { passive: false });

  const lookEnd = e => {
    for (const t of e.changedTouches) if (t.identifier === LOOKTAP.id) {
      clearTimeout(LOOKTAP.holdT);
      if (!LOOKTAP.moved && Date.now() - LOOKTAP.t0 < 350) actions.placeBlock();   // kısa dokunuş: koy
      else actions.breakUp();
      LOOKTAP.id = null;
    }
  };
  look.addEventListener('touchend', lookEnd);
  look.addEventListener('touchcancel', lookEnd);

  // Tek dokunuşluk butonlar
  const bind = (id, fn) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false });
    el.addEventListener('mousedown', e => { e.stopPropagation(); fn(); });
  };
  
  bind('bJump', actions.jump);
  bind('bMarket', actions.market);
}
