/**
 * Small helpers shared by all Next.js Route Handlers.
 */

import { NextResponse } from 'next/server';
import { GameError } from './store';

export type RouteParams<T> = { params: Promise<T> };

export async function readJson(req: Request): Promise<Record<string, any>> {
  try {
    const text = await req.text();
    if (!text) return {};
    if (text.length > 16 * 1024) throw new GameError(413, 'Request body too large');
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    if (err instanceof GameError) throw err;
    return {};
  }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

/**
 * Wraps a handler so thrown GameErrors become JSON error responses with the right status.
 * Every error response includes both `success: false` and `error`, which satisfies all
 * three existing client hooks.
 */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof GameError) {
      return json({ success: false, error: err.message }, err.status);
    }
    console.error('[api] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return json({ success: false, error: message }, 500);
  }
}

export function randomId(prefix: string, len = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `${prefix}${out}`;
}
