import { handle, readJson } from '@/server/http';
import { quickplayDotsRoom } from '@/server/games/dots';

export async function POST(req: Request) {
  return handle(async () => quickplayDotsRoom(await readJson(req)));
}
