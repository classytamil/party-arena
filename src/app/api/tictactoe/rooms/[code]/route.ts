import { handle, RouteParams } from '@/server/http';
import { getTicTacToeRoom } from '@/server/games/tictactoe';

export async function GET(req: Request, { params }: RouteParams<{ code: string }>) {
  const { code } = await params;
  const playerId = new URL(req.url).searchParams.get('playerId') ?? undefined;
  return handle(() => getTicTacToeRoom(code, playerId));
}
