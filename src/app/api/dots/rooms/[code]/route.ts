import { handle, RouteParams } from '@/server/http';
import { getDotsRoom } from '@/server/games/dots';

export async function GET(_req: Request, { params }: RouteParams<{ code: string }>) {
  const { code } = await params;
  return handle(() => getDotsRoom(code));
}
