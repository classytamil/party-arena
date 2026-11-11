import { handle, readJson } from '@/server/http';
import { createTicTacToeRoom } from '@/server/games/tictactoe';

export async function POST(req: Request) {
  return handle(async () => createTicTacToeRoom(await readJson(req)));
}
