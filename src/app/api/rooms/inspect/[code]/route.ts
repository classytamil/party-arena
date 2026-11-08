import { handle, RouteParams } from '@/server/http';
import { inspectRoom } from '@/server/games/inspect';

export async function GET(_req: Request, { params }: RouteParams<{ code: string }>) {
  const { code } = await params;
  return handle(() => inspectRoom(code));
}
