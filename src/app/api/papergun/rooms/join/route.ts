import { handle, readJson } from '@/server/http';
import { joinPaperGunRoom } from '@/server/games/papergun';

export async function POST(req: Request) {
  return handle(async () => joinPaperGunRoom(await readJson(req)));
}
