import { handle, readJson } from '@/server/http';
import { createDotsRoom } from '@/server/games/dots';

export async function POST(req: Request) {
  return handle(async () => createDotsRoom(await readJson(req)));
}
