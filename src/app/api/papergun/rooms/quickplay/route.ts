import { handle, readJson } from '@/server/http';
import { quickplayPaperGunRoom } from '@/server/games/papergun';

export async function POST(req: Request) {
  return handle(async () => quickplayPaperGunRoom(await readJson(req)));
}
