import { json } from '@/server/http';

export async function GET() {
  return json({ status: 'ok', timestamp: Date.now() });
}
