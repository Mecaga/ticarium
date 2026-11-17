import './spider.js';
import './redstone.js';
import './rails.js';
import './hopper.js';
import './clay.js';
import './stairs.js';
import './arms.js';
import './undead.js';
import './fishing.js';
import { FACE_TILES, tileOf, clearIcons } from '../world/textures.js';
import { faces } from '../world/textures/extra_items2.js';

for (const id in faces) {
  const f = faces[id], a = typeof f === 'string' ? [f, f, f] : f;
  FACE_TILES[id] = a.map(n => tileOf(n));
}
clearIcons();
