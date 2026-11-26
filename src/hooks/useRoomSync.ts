/**
 * Shared client-side room synchronization hook (WebSocket-first, zero polling when connected).
 *
 * Uses:
 *  1. A persistent Supabase Realtime WebSocket channel (`room-<code>`).
 *     - When this client commits a mutation (`noteVersion(v)`), it broadcasts
 *       directly over its open WebSocket (`channel.send`) so peers receive updates
 *       in ~50–150ms without waiting for a server-side REST broadcast.
 *     - Server-side `after()` broadcasts act as a backup for joins/leaves.
 *  2. Zero `setInterval` polling while the WebSocket is `SUBSCRIBED`. Polling
 *     only activates if the WebSocket drops (`CHANNEL_ERROR` / `TIMED_OUT` / `CLOSED`)
 *     or Realtime isn't configured, and stops immediately once reconnected.
 *  3. `visibilitychange`, `focus`, and `online` catch-up refreshes + auto-reconnect.
 */

import { useEffect, useRef, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getBrowserSupabase } from '@/lib/supabaseBrowser';

const FETCH_TIMEOUT_MS = 5000;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 10000;

interface UseRoomSyncOptions<TRoom> {
  roomCode: string | null;
  playerId: string | null;
  /** Endpoint that returns `{ success: true, room, version? }` for this viewer. */
  buildFetchUrl: (code: string, playerId: string) => string;
  onRoomSnapshot: (room: TRoom) => void;
  /** Fallback poll interval (ms) used ONLY while WebSocket is disconnected. */
  pollIntervalMs?: number;
}

export function useRoomSync<TRoom>({
  roomCode,
  playerId,
  buildFetchUrl,
  onRoomSnapshot,
  pollIntervalMs = 1000,
}: UseRoomSyncOptions<TRoom>) {
  const onSnapshotRef = useRef(onRoomSnapshot);
  onSnapshotRef.current = onRoomSnapshot;

  const buildUrlRef = useRef(buildFetchUrl);
  buildUrlRef.current = buildFetchUrl;

  const lastVersionRef = useRef<number>(-1);
  const inFlightRef = useRef<boolean>(false);
  const pendingRef = useRef<boolean>(false);
  const activeKeyRef = useRef<string | null>(null);
  const roomCodeRef = useRef<string | null>(roomCode);
  const playerIdRef = useRef<string | null>(playerId);
  roomCodeRef.current = roomCode;
  playerIdRef.current = playerId;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef<boolean>(false);

  const fetchLatest = useCallback(
    async (code: string, pid: string, minVersion?: number, force = false) => {
      const sessionKey = `${code}:${pid}`;
      if (activeKeyRef.current !== sessionKey) return;
      if (!force && minVersion !== undefined && minVersion <= lastVersionRef.current) return;
      if (inFlightRef.current) {
        pendingRef.current = true;
        return;
      }

      inFlightRef.current = true;
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const res = await fetch(buildUrlRef.current(code, pid), {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!res.ok || activeKeyRef.current !== sessionKey) return;
        const data = await res.json();
        if (activeKeyRef.current !== sessionKey) return;
        if (data && data.room) {
          if (typeof data.version === 'number') {
            if (!force && data.version <= lastVersionRef.current) return;
            lastVersionRef.current = data.version;
          }
          onSnapshotRef.current(data.room as TRoom);
        }
      } catch {
        // Ignore transient network errors or timeouts; next broadcast or reconnect will retry.
      } finally {
        window.clearTimeout(timeoutId);
        inFlightRef.current = false;
        if (pendingRef.current && activeKeyRef.current === sessionKey) {
          pendingRef.current = false;
          void fetchLatest(code, pid);
        }
      }
    },
    []
  );

  /**
   * Record the server version returned by a mutation and push an instant
   * WebSocket broadcast directly to peers over the open Realtime channel.
   */
  const noteVersion = useCallback((version?: number, broadcast = true) => {
    if (typeof version === 'number' && version > lastVersionRef.current) {
      lastVersionRef.current = version;
      if (
        broadcast &&
        isSubscribedRef.current &&
        channelRef.current &&
        roomCodeRef.current
      ) {
        void channelRef.current.send({
          type: 'broadcast',
          event: 'room_changed',
          payload: { code: roomCodeRef.current, version, kind: 'updated' },
        });
      }
    }
  }, []);

  /** Force-fetch the latest server state (e.g. after rolling back a failed optimistic update). */
  const forceRefresh = useCallback(() => {
    const code = roomCodeRef.current;
    const pid = playerIdRef.current;
    if (code && pid) {
      void fetchLatest(code, pid, undefined, true);
    }
  }, [fetchLatest]);

  useEffect(() => {
    lastVersionRef.current = -1;
    inFlightRef.current = false;
    pendingRef.current = false;
    isSubscribedRef.current = false;
    channelRef.current = null;

    if (!roomCode || !playerId) {
      activeKeyRef.current = null;
      return;
    }

    const sessionKey = `${roomCode}:${playerId}`;
    activeKeyRef.current = sessionKey;

    let cancelled = false;
    const supabase = getBrowserSupabase();
    let reconnectTimer: number | null = null;
    let fallbackPollTimer: number | null = null;
    let reconnectAttempts = 0;

    const clearReconnectTimer = () => {
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const startFallbackPolling = () => {
      if (cancelled || fallbackPollTimer !== null) return;
      fallbackPollTimer = window.setInterval(() => {
        if (!cancelled && document.visibilityState === 'visible') {
          void fetchLatest(roomCode, playerId);
        }
      }, pollIntervalMs);
    };

    const stopFallbackPolling = () => {
      if (fallbackPollTimer !== null) {
        window.clearInterval(fallbackPollTimer);
        fallbackPollTimer = null;
      }
    };

    const subscribeChannel = () => {
      if (cancelled) return;
      if (!supabase) {
        startFallbackPolling();
        return;
      }

      clearReconnectTimer();

      if (channelRef.current) {
        const old = channelRef.current;
        channelRef.current = null;
        isSubscribedRef.current = false;
        void supabase.removeChannel(old);
      }

      const nextChannel = supabase
        .channel(`room-${roomCode}`)
        .on('broadcast', { event: 'room_changed' }, (msg) => {
          if (cancelled) return;
          const version =
            typeof msg?.payload?.version === 'number' ? msg.payload.version : undefined;
          void fetchLatest(roomCode, playerId, version);
        })
        .subscribe((status) => {
          if (cancelled) return;
          if (status === 'SUBSCRIBED') {
            isSubscribedRef.current = true;
            reconnectAttempts = 0;
            stopFallbackPolling();
            void fetchLatest(roomCode, playerId);
          } else if (
            status === 'CHANNEL_ERROR' ||
            status === 'TIMED_OUT' ||
            status === 'CLOSED'
          ) {
            isSubscribedRef.current = false;
            startFallbackPolling();
            if (reconnectTimer === null) {
              const delay = Math.min(
                RECONNECT_MAX_MS,
                RECONNECT_BASE_MS * Math.pow(2, reconnectAttempts)
              );
              reconnectAttempts += 1;
              reconnectTimer = window.setTimeout(() => {
                reconnectTimer = null;
                subscribeChannel();
              }, delay);
            }
          }
        });

      channelRef.current = nextChannel;
    };

    void fetchLatest(roomCode, playerId);
    subscribeChannel();

    const onResume = () => {
      if (cancelled) return;
      if (document.visibilityState === 'visible') {
        void fetchLatest(roomCode, playerId);
        if (supabase && (!channelRef.current || !isSubscribedRef.current)) {
          reconnectAttempts = 0;
          subscribeChannel();
        }
      }
    };

    const onOnline = () => {
      if (cancelled) return;
      void fetchLatest(roomCode, playerId);
      if (supabase) {
        reconnectAttempts = 0;
        subscribeChannel();
      }
    };

    document.addEventListener('visibilitychange', onResume);
    window.addEventListener('focus', onResume);
    window.addEventListener('online', onOnline);

    return () => {
      cancelled = true;
      activeKeyRef.current = null;
      inFlightRef.current = false;
      pendingRef.current = false;
      isSubscribedRef.current = false;
      clearReconnectTimer();
      stopFallbackPolling();
      document.removeEventListener('visibilitychange', onResume);
      window.removeEventListener('focus', onResume);
      window.removeEventListener('online', onOnline);
      if (channelRef.current && supabase) {
        const toRemove = channelRef.current;
        channelRef.current = null;
        void supabase.removeChannel(toRemove);
      }
    };
  }, [roomCode, playerId, fetchLatest, pollIntervalMs]);

  return { noteVersion, forceRefresh };
}
