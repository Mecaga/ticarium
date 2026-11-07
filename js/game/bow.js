import { N } from '../world/idtable.js';
import { solid } from '../world/world.js';
import { eco } from './economy.js';
import { toast, drawHud } from '../ui/ui.js';
import { P } from '../entities/player.js';
import { G } from '../core/state.js';
import { findMob, hurtMob } from '../entities/mobs.js';
import { isCreative } from './creative.js';
import { isGear, wear } from './gear.js';
import { sfx } from '../core/sound.js';

const arrows = [];
let grp = null, lastShot = 0;

export function shoot() {
  const now = Date.now();
  if (now - lastShot < 600) return;
  if (!isCreative() && (eco.inv[N.OK] || 0) < 1) return toast('Ok yok');
  if (!G.scene) return;
  if (!grp) { grp = new THREE.Group(); G.scene.add(grp); }
  lastShot = now;
  if (!isCreative()) eco.inv[N.OK]--;
  const cp = Math.cos(P.pitch);
  const d = new THREE.Vector3(-Math.sin(P.yaw) * cp, Math.sin(P.pitch), -Math.cos(P.yaw) * cp);
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.6), new THREE.MeshBasicMaterial({ color: 0xdddddd }));
  m.position.set(P.x, P.y + 1.5, P.z);
  m.lookAt(m.position.clone().add(d));
  grp.add(m);
  arrows.push({ m, v: d.multiplyScalar(22), life: 3 });
  sfx.hit();
  if (isGear(N.YAY) && wear(N.YAY, 1)) toast('💥 Yay kırıldı!');
  drawHud();
}

function step(dt) {
  for (let i = arrows.length - 1; i >= 0; i--) {
    const a = arrows[i], p = a.m.position;
    a.v.y -= 9 * dt;
    const nx = p.x + a.v.x * dt, ny = p.y + a.v.y * dt, nz = p.z + a.v.z * dt;
    a.life -= dt;
    let hit = a.life <= 0 || solid(Math.floor(nx), Math.floor(ny), Math.floor(nz));
    if (!hit) {
      const l = a.v.length(), dx = a.v.x / l, dy = a.v.y / l, dz = a.v.z / l;
      const mob = findMob(p.x, p.y, p.z, dx, dy, dz, l * dt + 0.5);
      if (mob) {
        const r = G.room;
        if (r && (r.solo || r.sim)) hurtMob(mob.id, 5, P.x, P.z);
        else if (G.online) G.online.sendMobHit(mob.id, 5, P.x, P.z);
        hit = true;
      }
    }
    if (hit) { grp.remove(a.m); arrows.splice(i, 1); continue; }
    p.set(nx, ny, nz);
    a.m.lookAt(new THREE.Vector3(nx + a.v.x, ny + a.v.y, nz + a.v.z));
  }
}
let last = performance.now();
(function loop(t) { requestAnimationFrame(loop); step(Math.min(0.05, (t - last) / 1000)); last = t; })(last);
