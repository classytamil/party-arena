import { handle, readJson } from '@/server/http';
import { joinTicTacToeRoom } from '@/server/games/tictactoe';

export async function POST(req: Request) {
  return handle(async () => joinTicTacToeRoom(await readJson(req)));
}
