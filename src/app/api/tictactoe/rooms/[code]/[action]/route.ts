import { handle, readJson, RouteParams } from '@/server/http';
import { ticTacToeAction } from '@/server/games/tictactoe';

export async function POST(
  req: Request,
  { params }: RouteParams<{ code: string; action: string }>
) {
  const { code, action } = await params;
  return handle(async () => ticTacToeAction(code, action, await readJson(req)));
}
