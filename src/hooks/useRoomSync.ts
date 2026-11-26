/**
 * Shared client-side room synchronization hook.
 *
 * Uses:
 *  1. A Supabase Realtime Broadcast subscription on `room-<code>` that receives
 *     instant `room_changed` pings from the server after every mutation and
 *     triggers a sanitized GET fetch for this viewer (with automatic reconnect).
 *  2. A lightweight polling fallback, plus `visibilitychange`, `focus`, and `online`
 *     refreshes, with a per-request timeout so a stalled fetch can never freeze sync.
 */

import { useEffect, useRef, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getBrowserSupabase } from '@/lib/supabaseBrowser';

const FETCH_TIMEOUT_MS = 5000;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 10000;
const CONNECTED_POLL_INTERVAL_MS = 4000;

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
  pollIntervalMs = 750,
}: UseRoomSyncOptions<TRoom>) {
  const onSnapshotRef = useRef(onRoomSnapshot);
  onSnapshotRef.current = onRoomSnapshot;

  const buildUrlRef = useRef(buildFetchUrl);
  buildUrlRef.current = buildFetchUrl;

  const lastVersionRef = useRef<number>(-1);
  const inFlightRef = useRef<boolean>(false);
  const pendingRef = useRef<boolean>(false);
  const lastFetchAtRef = useRef<number>(0);
  const activeKeyRef = useRef<string | null>(null);
  const roomCodeRef = useRef<string | null>(roomCode);
  const playerIdRef = useRef<string | null>(playerId);
  roomCodeRef.current = roomCode;
  playerIdRef.current = playerId;

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
      lastFetchAtRef.current = Date.now();
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
        // Ignore transient network errors or timeouts; next broadcast or poll will retry.
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

  /** Allow callers to record the version received from a POST response so we don't re-fetch it. */
  const noteVersion = useCallback((version?: number) => {
    if (typeof version === 'number' && version > lastVersionRef.current) {
      lastVersionRef.current = version;
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

    if (!roomCode || !playerId) {
      activeKeyRef.current = null;
      return;
    }

    const sessionKey = `${roomCode}:${playerId}`;
    activeKeyRef.current = sessionKey;

    let cancelled = false;
    const supabase = getBrowserSupabase();
    let channel: RealtimeChannel | null = null;
    let reconnectTimer: number | null = null;
    let reconnectAttempts = 0;
    let isSubscribed = false;

    const clearReconnectTimer = () => {
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const subscribeChannel = () => {
      if (cancelled || !supabase) return;
      clearReconnectTimer();

      if (channel) {
        const old = channel;
        channel = null;
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
            isSubscribed = true;
            reconnectAttempts = 0;
            void fetchLatest(roomCode, playerId);
          } else if (
            status === 'CHANNEL_ERROR' ||
            status === 'TIMED_OUT' ||
            status === 'CLOSED'
          ) {
            isSubscribed = false;
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

      channel = nextChannel;
    };

    void fetchLatest(roomCode, playerId);
    subscribeChannel();

    const interval = window.setInterval(() => {
      if (cancelled || document.visibilityState !== 'visible') return;
      const targetInterval = isSubscribed ? CONNECTED_POLL_INTERVAL_MS : pollIntervalMs;
      if (Date.now() - lastFetchAtRef.current >= targetInterval) {
        void fetchLatest(roomCode, playerId);
      }
    }, pollIntervalMs);

    const onResume = () => {
      if (cancelled) return;
      if (document.visibilityState === 'visible') {
        void fetchLatest(roomCode, playerId);
        if (supabase && (!channel || channel.state !== 'joined')) {
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
      clearReconnectTimer();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onResume);
      window.removeEventListener('focus', onResume);
      window.removeEventListener('online', onOnline);
      if (channel && supabase) {
        const toRemove = channel;
        channel = null;
        void supabase.removeChannel(toRemove);
      }
    };
  }, [roomCode, playerId, fetchLatest, pollIntervalMs]);

  return { noteVersion, forceRefresh };
}
