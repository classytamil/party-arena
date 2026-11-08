/**
 * Real-time Hook for Paper Gun Battle Multiplayer Game (Supabase Realtime + Next.js API)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { PaperGunRoom, PaperGunPlayer, ActionChoice, PaperGunNumber } from '../types/paperGun';
import {
  playJoinRoomSound,
  playPageFlipSound,
  playPencilDrawSound,
  playGunshotSound,
  playHitSound,
  playReloadSound,
  playVictorySound,
} from '../utils/sound';
import { useRoomSync } from './useRoomSync';

const SESSION_KEY = 'papergun_session_v1';

export function usePaperGunRealtime() {
  const [room, setRoom] = useState<PaperGunRoom | null>(null);
  const [player, setPlayer] = useState<PaperGunPlayer | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const lastOutcomeRef = useRef<string | null>(null);
  const prevStatusRef = useRef<string | null>(null);
  const playerIdRef = useRef<string | null>(null);
  playerIdRef.current = player?.id ?? null;

  const handleStateUpdate = useCallback((updatedRoom: PaperGunRoom) => {
    if (updatedRoom.lastOutcome) {
      const outcomeKey = `${updatedRoom.lastOutcome.actionType}_${updatedRoom.lastOutcome.number}_${updatedRoom.turnIndex}_${updatedRoom.turnAttempt}_${updatedRoom.logs.length}`;
      if (outcomeKey !== lastOutcomeRef.current) {
        lastOutcomeRef.current = outcomeKey;
        playPageFlipSound();

        if (updatedRoom.lastOutcome.actionType === 'character_eliminated') {
          playGunshotSound();
          setTimeout(() => playHitSound(), 100);
        } else if (updatedRoom.lastOutcome.actionType === 'shot_blocked') {
          playGunshotSound();
          setTimeout(() => playReloadSound(), 100);
        } else if (
          updatedRoom.lastOutcome.actionType === 'character_stage' ||
          updatedRoom.lastOutcome.actionType === 'craft_gun' ||
          updatedRoom.lastOutcome.actionType === 'craft_trigger' ||
          updatedRoom.lastOutcome.actionType === 'add_bullet'
        ) {
          setTimeout(() => playPencilDrawSound(), 120);
        } else if (
          updatedRoom.lastOutcome.actionType === 'reload_success' ||
          updatedRoom.lastOutcome.actionType === 'reload_attempt'
        ) {
          setTimeout(() => playReloadSound(), 120);
        }
      }
    }

    if (
      updatedRoom.status === 'COMPLETED' &&
      updatedRoom.winnerId &&
      prevStatusRef.current !== 'COMPLETED'
    ) {
      playVictorySound();
    }
    prevStatusRef.current = updatedRoom.status;

    setRoom(updatedRoom);
    const pid = playerIdRef.current;
    if (pid) {
      const me = updatedRoom.players.find((p) => p.id === pid);
      if (me) setPlayer(me);
    }
  }, []);

  const { noteVersion } = useRoomSync<PaperGunRoom>({
    roomCode: room?.code ?? null,
    playerId: player?.id ?? null,
    buildFetchUrl: (code, pid) =>
      `/api/papergun/rooms/${encodeURIComponent(code)}?playerId=${encodeURIComponent(pid)}`,
    onRoomSnapshot: handleStateUpdate,
  });

  // Drive bot turns automatically from the client (validated by the server)
  useEffect(() => {
    if (!room || !player || room.status !== 'PLAYING') return;
    const activePlayer = room.players.find((p) => p.id === room.currentTurnPlayerId);
    if (!activePlayer || !activePlayer.isBot) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/papergun/rooms/${encodeURIComponent(room.code)}/tick`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: player.id }),
        });
        const data = await res.json();
        if (data.success && data.room) {
          noteVersion(data.version);
          handleStateUpdate(data.room);
        }
      } catch {
        // Next poll or broadcast will retry if needed
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [
    room?.code,
    room?.status,
    room?.currentTurnPlayerId,
    room?.turnIndex,
    room?.turnAttempt,
    room?.drawnChoices?.length,
    room?.pendingShotFromCharacter,
    room?.logs.length,
    player?.id,
    handleStateUpdate,
    noteVersion,
  ]);

  // Auto-restore session from sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        const { code, playerId } = JSON.parse(stored);
        if (code && playerId) {
          fetch(
            `/api/papergun/rooms/${encodeURIComponent(code)}?playerId=${encodeURIComponent(playerId)}`
          )
            .then((r) => r.json())
            .then((data) => {
              if (data.success && data.room && data.player) {
                noteVersion(data.version);
                prevStatusRef.current = data.room.status;
                setRoom(data.room);
                setPlayer(data.player);
              } else {
                sessionStorage.removeItem(SESSION_KEY);
              }
            })
            .catch(() => {
              sessionStorage.removeItem(SESSION_KEY);
            });
        }
      }
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, [noteVersion]);

  const createRoom = useCallback(
    async (playerName: string, avatar: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/papergun/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName, avatar }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to create duel room');
        }
        noteVersion(data.version);
        prevStatusRef.current = data.room.status;
        setRoom(data.room);
        setPlayer(data.player);
        sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ code: data.room.code, playerId: data.player.id })
        );
        playJoinRoomSound();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error creating duel room');
      } finally {
        setIsLoading(false);
      }
    },
    [noteVersion]
  );

  const quickPlayVsBots = useCallback(
    async (playerName: string, avatar: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/papergun/rooms/quickplay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName, avatar }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to start quick duel');
        }
        noteVersion(data.version);
        prevStatusRef.current = data.room.status;
        setRoom(data.room);
        setPlayer(data.player);
        sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ code: data.room.code, playerId: data.player.id })
        );
        playJoinRoomSound();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error starting quick duel');
      } finally {
        setIsLoading(false);
      }
    },
    [noteVersion]
  );

  const joinRoom = useCallback(
    async (code: string, playerName: string, avatar: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/papergun/rooms/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, playerName, avatar }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to join duel room');
        }
        noteVersion(data.version);
        prevStatusRef.current = data.room.status;
        setRoom(data.room);
        setPlayer(data.player);
        sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ code: data.room.code, playerId: data.player.id })
        );
        playJoinRoomSound();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error joining duel room');
      } finally {
        setIsLoading(false);
      }
    },
    [noteVersion]
  );

  const toggleReady = useCallback(async () => {
    if (!room || !player) return;
    try {
      const res = await fetch(`/api/papergun/rooms/${room.code}/ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id }),
      });
      const data = await res.json();
      if (data.success && data.room) {
        noteVersion(data.version);
        handleStateUpdate(data.room);
      }
    } catch (err) {
      console.error('Error toggling ready state:', err);
    }
  }, [room, player, noteVersion, handleStateUpdate]);

  const addBot = useCallback(async () => {
    if (!room) return;
    try {
      const res = await fetch(`/api/papergun/rooms/${room.code}/add-bot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player?.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to add bot opponent');
      } else if (data.room) {
        noteVersion(data.version);
        handleStateUpdate(data.room);
      }
    } catch {
      setError('Failed to add bot opponent');
    }
  }, [room, player?.id, noteVersion, handleStateUpdate]);

  const startGame = useCallback(async () => {
    if (!room || !player || !player.isHost) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/papergun/rooms/${room.code}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to start duel');
      }
      if (data.room) {
        noteVersion(data.version);
        handleStateUpdate(data.room);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error starting duel');
    } finally {
      setIsLoading(false);
    }
  }, [room, player, noteVersion, handleStateUpdate]);

  const performAction = useCallback(
    async (actionChoice: ActionChoice = 'character', targetCharacterNumber?: PaperGunNumber) => {
      if (!room || !player || room.status !== 'PLAYING') return;
      if (room.currentTurnPlayerId !== player.id) {
        setError("Wait for your opponent's turn to complete.");
        return;
      }
      setError(null);
      try {
        const res = await fetch(`/api/papergun/rooms/${room.code}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: player.id, actionChoice, targetCharacterNumber }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Action failed');
        }
        if (data.room) {
          noteVersion(data.version);
          handleStateUpdate(data.room);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error performing action');
      }
    },
    [room, player, noteVersion, handleStateUpdate]
  );

  const passTurn = useCallback(async () => {
    if (!room || !player || room.status !== 'PLAYING') return;
    if (room.currentTurnPlayerId !== player.id) return;
    try {
      const res = await fetch(`/api/papergun/rooms/${room.code}/pass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id }),
      });
      const data = await res.json();
      if (data.success && data.room) {
        noteVersion(data.version);
        handleStateUpdate(data.room);
      }
    } catch (err) {
      console.error('Error passing turn:', err);
    }
  }, [room, player, noteVersion, handleStateUpdate]);

  const rematch = useCallback(async () => {
    if (!room || !player) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/papergun/rooms/${room.code}/rematch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to start rematch');
      }
      if (data.room) {
        noteVersion(data.version);
        handleStateUpdate(data.room);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error starting rematch');
    } finally {
      setIsLoading(false);
    }
  }, [room, player, noteVersion, handleStateUpdate]);

  const leaveRoom = useCallback(async (): Promise<void> => {
    sessionStorage.removeItem(SESSION_KEY);

    if (room && player) {
      try {
        await fetch(`/api/papergun/rooms/${room.code}/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: player.id }),
        });
      } catch {
        // Ignore network errors on leave
      }
    }

    setRoom(null);
    setPlayer(null);
    setError(null);
  }, [room, player]);

  return {
    room,
    player,
    isLoading,
    error,
    clearError: () => setError(null),
    createRoom,
    quickPlayVsBots,
    joinRoom,
    toggleReady,
    addBot,
    startGame,
    performAction,
    passTurn,
    rematch,
    leaveRoom,
  };
}
