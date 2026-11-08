/**
 * Universal room inspector: given any 4- or 6-character code, returns which game it belongs to.
 */

import { getRoom, normalizeCode } from '../store';
import { json } from '../http';

export async function inspectRoom(rawCode: string) {
  const code = normalizeCode(rawCode);
  const rec = await getRoom(code);
  if (!rec) {
    return json({ exists: false, gameType: null });
  }
  return json({ exists: true, gameType: rec.game });
}
