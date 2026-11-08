/**
 * Server-only Supabase data layer for game rooms.
 *
 * Every room lives in a single `game_rooms` row (state stored as JSONB).
 * Writes use optimistic concurrency on the `version` column so concurrent
 * serverless invocations (two players clicking at once, duplicate bot ticks)
 * can never clobber each other: the loser simply re-reads and retries.
 *
 * After every committed write we push a tiny "room changed" ping over
 * Supabase Realtime Broadcast. Clients then re-fetch their own sanitized view.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type GameType = 'bingo' | 'dots' | 'papergun';

export interface RoomRecord<T> {
  code: string;
  game: GameType;
  state: T;
  version: number;
  /** Epoch ms of the last committed write (used for bot "think" delays). */
  updatedAt: number;
}

export class GameError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const TABLE = 'game_rooms';
const ROOM_TTL_MS = 2 * 60 * 60 * 1000; // Rooms idle for 2h are purged
const MAX_MUTATION_RETRIES = 8;

function getSupabaseUrl(): string | undefined {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function getApiKey(): string | undefined {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

function getServerHeaderKey(): string | undefined {
  return process.env.PARTY_SERVER_KEY;
}

let cachedClient: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (cachedClient) return cachedClient;
  const url = getSupabaseUrl();
  const key = getApiKey();
  if (!url || !key) {
    throw new GameError(
      500,
      'Server is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    );
  }
  const serverKey = getServerHeaderKey();
  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: serverKey
      ? { headers: { 'x-party-server-key': serverKey } }
      : undefined,
  });
  return cachedClient;
}

interface RoomRow {
  code: string;
  game: GameType;
  state: unknown;
  version: number;
  updated_at: string;
}

function toRecord<T>(row: RoomRow): RoomRecord<T> {
  return {
    code: row.code,
    game: row.game,
    state: row.state as T,
    version: row.version,
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

export function normalizeCode(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toUpperCase() : '';
}

/** Fetch a room. Pass `game` to require a specific game type (returns null on mismatch). */
export async function getRoom<T>(code: string, game?: GameType): Promise<RoomRecord<T> | null> {
  if (!code) return null;
  const { data, error } = await db()
    .from(TABLE)
    .select('code, game, state, version, updated_at')
    .eq('code', code)
    .maybeSingle();
  if (error) throw new GameError(500, `Database error: ${error.message}`);
  if (!data) return null;
  const rec = toRecord<T>(data as RoomRow);
  if (game && rec.game !== game) return null;
  return rec;
}

/**
 * Insert a brand-new room with a unique code. Room codes are unique across ALL
 * games (single primary key), so the universal "join by code" inspector works.
 */
export async function insertRoom<T>(
  game: GameType,
  generateCode: () => string,
  buildState: (code: string) => T
): Promise<RoomRecord<T>> {
  // Opportunistic cleanup of stale rooms (replaces the old in-memory setInterval sweeper)
  void purgeStaleRooms();

  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateCode();
    const state = buildState(code);
    const now = new Date().toISOString();
    const { data, error } = await db()
      .from(TABLE)
      .insert({ code, game, state, version: 1, created_at: now, updated_at: now })
      .select('code, game, state, version, updated_at')
      .single();

    if (!error && data) {
      const rec = toRecord<T>(data as RoomRow);
      return rec;
    }
    // 23505 = unique_violation -> code collision, try another code
    if (error && error.code !== '23505') {
      throw new GameError(500, `Database error: ${error.message}`);
    }
  }
  throw new GameError(500, 'Could not allocate a unique room code. Please try again.');
}

export type MutationResult = void | 'delete' | 'noop';

export interface MutateOutcome<T> {
  record: RoomRecord<T> | null;
  deleted: boolean;
  changed: boolean;
}

/**
 * Read-modify-write a room with optimistic locking.
 *
 * `mutator` receives a mutable copy of the state plus the current record and may:
 *  - mutate `state` and return nothing  -> saved (version + 1) and broadcast
 *  - return 'noop'                      -> nothing written
 *  - return 'delete'                    -> row deleted and broadcast
 *  - throw GameError                    -> propagated to the API response
 *
 * The mutator can run more than once on conflict, so it must not have external side effects.
 */
export async function mutateRoom<T>(
  code: string,
  game: GameType,
  mutator: (state: T, record: RoomRecord<T>) => MutationResult,
  options: { notFoundMessage?: string; allowMissing?: boolean } = {}
): Promise<MutateOutcome<T>> {
  for (let attempt = 0; attempt < MAX_MUTATION_RETRIES; attempt++) {
    const current = await getRoom<T>(code, game);
    if (!current) {
      if (options.allowMissing) return { record: null, deleted: false, changed: false };
      throw new GameError(404, options.notFoundMessage || 'Room not found');
    }

    const working = structuredClone(current.state);
    const result = mutator(working, current);

    if (result === 'noop') {
      return { record: current, deleted: false, changed: false };
    }

    if (result === 'delete') {
      const { data, error } = await db()
        .from(TABLE)
        .delete()
        .eq('code', code)
        .eq('version', current.version)
        .select('code');
      if (error) throw new GameError(500, `Database error: ${error.message}`);
      if (data && data.length > 0) {
        await broadcastRoomUpdate(code, current.version + 1, 'deleted');
        return { record: null, deleted: true, changed: true };
      }
      continue; // version conflict -> retry
    }

    const nextVersion = current.version + 1;
    const { data, error } = await db()
      .from(TABLE)
      .update({ state: working, version: nextVersion, updated_at: new Date().toISOString() })
      .eq('code', code)
      .eq('version', current.version)
      .select('code, game, state, version, updated_at');

    if (error) throw new GameError(500, `Database error: ${error.message}`);
    if (data && data.length > 0) {
      const saved = toRecord<T>(data[0] as RoomRow);
      await broadcastRoomUpdate(code, saved.version, 'updated');
      return { record: saved, deleted: false, changed: true };
    }

    // Someone else committed first. Small jittered backoff, then retry on fresh state.
    await new Promise((r) => setTimeout(r, 15 + Math.random() * 40 * (attempt + 1)));
  }
  throw new GameError(409, 'The room is busy right now. Please try again.');
}

export async function purgeStaleRooms(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - ROOM_TTL_MS).toISOString();
    await db().from(TABLE).delete().lt('updated_at', cutoff);
  } catch {
    // Best-effort cleanup only
  }
}

/** Realtime topic used for a room. Must match the client (src/hooks/useRoomSync.ts). */
export function roomTopic(code: string): string {
  return `room-${code}`;
}

/**
 * Push a lightweight change notification through Supabase Realtime Broadcast (REST API).
 * Payload deliberately contains NO game state, so secrets can never leak via the public channel.
 */
export async function broadcastRoomUpdate(code: string, version: number, kind: 'updated' | 'deleted') {
  const url = getSupabaseUrl();
  const key = getApiKey();
  if (!url || !key) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        messages: [
          {
            topic: roomTopic(code),
            event: 'room_changed',
            payload: { code, version, kind },
            private: false,
          },
        ],
      }),
      signal: controller.signal,
    });
  } catch {
    // Clients also poll as a fallback, so a dropped ping is not fatal.
  } finally {
    clearTimeout(timeout);
  }
}
