import { handle, readJson } from '@/server/http';
import { createPaperGunRoom } from '@/server/games/papergun';

export async function POST(req: Request) {
  return handle(async () => createPaperGunRoom(await readJson(req)));
}
