import { N } from '../idtable.js';
import { loadTool } from './loader.js';

// Eşya numarası -> [klasör, dosya adı]
export const TOOL_MAP = {
  [N.AHSAP_KAZMA]: ['pick', 'wood'],   [N.TAS_KAZMA]: ['pick', 'stone'],   [N.DEMIR_KAZMA]: ['pick', 'iron'],   [N.ELMAS_KAZMA]: ['pick', 'diamond'],
  [N.AHSAP_KILIC]: ['sword', 'wood'],  [N.TAS_KILIC]: ['sword', 'stone'],  [N.DEMIR_KILIC]: ['sword', 'iron'],  [N.ELMAS_KILIC]: ['sword', 'diamond'],
  [N.AHSAP_KUREK]: ['shovel', 'wood'], [N.TAS_KUREK]: ['shovel', 'stone'], [N.DEMIR_KUREK]: ['shovel', 'iron'], [N.ELMAS_KUREK]: ['shovel', 'diamond'],
  [N.AHSAP_BALTA]: ['axe', 'wood'],    [N.TAS_BALTA]: ['axe', 'stone'],    [N.DEMIR_BALTA]: ['axe', 'iron'],    [N.ELMAS_BALTA]: ['axe', 'diamond'],
  [N.AHSAP_CAPA]: ['hoe', 'wood'],     [N.TAS_CAPA]: ['hoe', 'stone'],     [N.DEMIR_CAPA]: ['hoe', 'iron'],     [N.ELMAS_CAPA]: ['hoe', 'diamond']
};

// Eşya numarası için dosya ikonu yüklü mü? Yüklü ise Image döner, değilse null
export async function toolImage(id) {
  const m = TOOL_MAP[id];
  if (!m) return null;
  return loadTool(m[0], m[1]);
}
