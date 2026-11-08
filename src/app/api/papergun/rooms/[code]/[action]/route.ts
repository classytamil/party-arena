import { handle, readJson, RouteParams } from '@/server/http';
import { paperGunAction } from '@/server/games/papergun';

export async function POST(
  req: Request,
  { params }: RouteParams<{ code: string; action: string }>
) {
  const { code, action } = await params;
  return handle(async () => paperGunAction(code, action, await readJson(req)));
}
