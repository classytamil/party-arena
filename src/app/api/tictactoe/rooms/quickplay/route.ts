import { handle, readJson } from '@/server/http';
import { quickplayTicTacToeRoom } from '@/server/games/tictactoe';

export async function POST(req: Request) {
  return handle(async () => quickplayTicTacToeRoom(await readJson(req)));
}

