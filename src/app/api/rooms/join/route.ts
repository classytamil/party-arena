import { handle, readJson } from '@/server/http';
import { joinBingoRoom } from '@/server/games/bingo';

export async function POST(req: Request) {
  return handle(async () => joinBingoRoom(await readJson(req)));
}
