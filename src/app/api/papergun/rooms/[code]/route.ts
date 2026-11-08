import { handle, RouteParams } from '@/server/http';
import { getPaperGunRoom } from '@/server/games/papergun';

export async function GET(req: Request, { params }: RouteParams<{ code: string }>) {
  const { code } = await params;
  const url = new URL(req.url);
  const playerId = url.searchParams.get('playerId') || undefined;
  return handle(() => getPaperGunRoom(code, playerId));
}
