import { handle, readJson } from '@/server/http';
import { createBingoRoom } from '@/server/games/bingo';

export async function POST(req: Request) {
  return handle(async () => createBingoRoom(await readJson(req)));
}
