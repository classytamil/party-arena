import { handle, readJson, RouteParams } from '@/server/http';
import { dotsAction } from '@/server/games/dots';

export async function POST(
  req: Request,
  { params }: RouteParams<{ code: string; action: string }>
) {
  const { code, action } = await params;
  return handle(async () => dotsAction(code, action, await readJson(req)));
}
