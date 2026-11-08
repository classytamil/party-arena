/**
 * Shared client-side room synchronization hook.
 *
 * Replaces the old persistent SSE (`EventSource`) stream with:
 *  1. A Supabase Realtime Broadcast subscription on `room-<code>` that receives
 *     instant `room_changed` pings from the server after every mutation and
 *     triggers a sanitized GET fetch for this viewer.
 *  2. A lightweight polling fallback (and tab-focus refresh) so the game stays
 *     in sync even if a broadcast packet is dropped.
 */

import { useEffect, useRef, useCallback } from 'react';
import { getBrowserSupabase } from '@/lib/supabaseBrowser';

interface UseRoomSyncOptions<TRoom> {
  roomCode: string | null;
  playerId: string | null;
  /** Endpoint that returns `{ success: true, room, version? }` for this viewer. */
  buildFetchUrl: (code: string, playerId: string) => string;
  onRoomSnapshot: (room: TRoom) => void;
  /** Poll interval in ms (faster fallback if Realtime isn't configured). */
  pollIntervalMs?: number;
}

export function useRoomSync<TRoom>({
  roomCode,
  playerId,
  buildFetchUrl,
  onRoomSnapshot,
  pollIntervalMs = 2500,
}: UseRoomSyncOptions<TRoom>) {
  const onSnapshotRef = useRef(onRoomSnapshot);
  onSnapshotRef.current = onRoomSnapshot;

  const buildUrlRef = useRef(buildFetchUrl);
  buildUrlRef.current = buildFetchUrl;

  const lastVersionRef = useRef<number>(-1);
  const inFlightRef = useRef<boolean>(false);
  const pendingRef = useRef<boolean>(false);

  const fetchLatest = useCallback(async (code: string, pid: string, minVersion?: number) => {
    if (minVersion !== undefined && minVersion <= lastVersionRef.current) {
      return;
    }
    if (inFlightRef.current) {
      pendingRef.current = true;
      return;
    }
    inFlightRef.current = true;
    try {
      const res = await fetch(buildUrlRef.current(code, pid), { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.room) {
        if (typeof data.version === 'number') {
          if (data.version < lastVersionRef.current) return;
          lastVersionRef.current = data.version;
        }
        onSnapshotRef.current(data.room as TRoom);
      }
    } catch {
      // Ignore transient network errors; next broadcast or poll will retry.
    } finally {
      inFlightRef.current = false;
      if (pendingRef.current) {
        pendingRef.current = false;
        void fetchLatest(code, pid);
      }
    }
  }, []);

  /** Allow callers to record the version received from a POST response so we don't re-fetch it. */
  const noteVersion = useCallback((version?: number) => {
    if (typeof version === 'number' && version > lastVersionRef.current) {
      lastVersionRef.current = version;
    }
  }, []);

  useEffect(() => {
    lastVersionRef.current = -1;
    if (!roomCode || !playerId) return;

    let cancelled = false;
    const supabase = getBrowserSupabase();

    // Initial snapshot fetch
    void fetchLatest(roomCode, playerId);

    // 1. Subscribe to Supabase Realtime Broadcast channel for instant updates
    const channel = supabase
      ? supabase
          .channel(`room-${roomCode}`)
          .on('broadcast', { event: 'room_changed' }, (msg) => {
            if (cancelled) return;
            const version = typeof msg?.payload?.version === 'number' ? msg.payload.version : undefined;
            void fetchLatest(roomCode, playerId, version);
          })
          .subscribe()
      : null;

    // 2. Fallback poll + visibility refresh so no update is ever missed
    const interval = setInterval(() => {
      if (!cancelled && document.visibilityState === 'visible') {
        void fetchLatest(roomCode, playerId);
      }
    }, pollIntervalMs);

    const onVisibility = () => {
      if (!cancelled && document.visibilityState === 'visible') {
        void fetchLatest(roomCode, playerId);
      }
    };
    window.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('visibilitychange', onVisibility);
      if (channel && supabase) {
        void supabase.removeChannel(channel);
      }
    };
  }, [roomCode, playerId, fetchLatest, pollIntervalMs]);

  return { noteVersion };
}
