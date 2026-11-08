import { handle, readJson } from '@/server/http';
import { joinDotsRoom } from '@/server/games/dots';

export async function POST(req: Request) {
  return handle(async () => joinDotsRoom(await readJson(req)));
}
