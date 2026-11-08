/**
 * Real-time Hook for Dots and Boxes Multiplayer Game (Supabase Realtime + Next.js API)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { DotsRoom, DotsPlayer, DotsGridSize } from '../types/dots';
import { checkNewCompletedBoxes } from '../utils/dotsLogic';
import {
  playLineDrawSound,
  playBoxClaimSound,
  playComboClaimSound,
  playVictorySound,
  playJoinRoomSound,
} from '../utils/sound';
import { useRoomSync } from './useRoomSync';

const SESSION_KEY = 'dots_session_v1';

export function useDotsRealtime() {
  const [room, setRoom] = useState<DotsRoom | null>(null);
  const [player, setPlayer] = useState<DotsPlayer | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const lastLineRef = useRef<string | null>(null);
  const lastBoxesCountRef = useRef<number>(0);
  const prevStatusRef = useRef<string | null>(null);
  const playerIdRef = useRef<string | null>(null);
  playerIdRef.current = player?.id ?? null;

  const handleStateUpdate = useCallback((updatedRoom: DotsRoom) => {
    if (updatedRoom.status === 'PLAYING') {
      const currentBoxesCount = Object.keys(updatedRoom.boxes).length;
      const prevBoxesCount = lastBoxesCountRef.current;

      if (updatedRoom.lastDrawnLineId && updatedRoom.lastDrawnLineId !== lastLineRef.current) {
        lastLineRef.current = updatedRoom.lastDrawnLineId;
        const diff = currentBoxesCount - prevBoxesCount;
        if (diff >= 2) {
          playComboClaimSound();
        } else if (diff === 1) {
          playBoxClaimSound();
        } else {
          playLineDrawSound();
        }
      }
      lastBoxesCountRef.current = currentBoxesCount;
    } else if (updatedRoom.status === 'COMPLETED' && prevStatusRef.current !== 'COMPLETED') {
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

  const { noteVersion } = useRoomSync<DotsRoom>({
    roomCode: room?.code ?? null,
    playerId: player?.id ?? null,
    buildFetchUrl: (code) => `/api/dots/rooms/${encodeURIComponent(code)}`,
    onRoomSnapshot: handleStateUpdate,
  });

  // Drive bot turns and turn-timer expirations from the client
  useEffect(() => {
    if (!room || !player || room.status !== 'PLAYING') return;
    const activePlayer = room.players.find((p) => p.id === room.currentTurnPlayerId);
    if (!activePlayer) return;

    let delayMs: number | null = null;
    if (activePlayer.isBot) {
      delayMs = 800;
    } else if (room.turnDeadline && room.timerSeconds > 0) {
      delayMs = Math.max(250, room.turnDeadline - Date.now() + 150);
    }

    if (delayMs === null) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/dots/rooms/${encodeURIComponent(room.code)}/tick`, {
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
        // Ignore transient tick failure
      }
    }, delayMs);

    return () => clearTimeout(timer);
  }, [
    room?.code,
    room?.status,
    room?.currentTurnPlayerId,
    room?.moves.length,
    room?.turnDeadline,
    room?.timerSeconds,
    player?.id,
    handleStateUpdate,
    noteVersion,
  ]);

  // Restore session from sessionStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const { code, playerId } = JSON.parse(saved);
        if (code && playerId) {
          fetch(`/api/dots/rooms/${code}`)
            .then((r) => r.json())
            .then((data) => {
              if (data.success && data.room) {
                const me = data.room.players.find((p: DotsPlayer) => p.id === playerId);
                if (me) {
                  noteVersion(data.version);
                  lastBoxesCountRef.current = Object.keys(data.room.boxes).length;
                  lastLineRef.current = data.room.lastDrawnLineId;
                  prevStatusRef.current = data.room.status;
                  setRoom(data.room);
                  setPlayer(me);
                } else {
                  sessionStorage.removeItem(SESSION_KEY);
                }
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
    async (
      playerName: string,
      avatar: string,
      gridSize: DotsGridSize = 6,
      timerSeconds: number = 0
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/dots/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName, avatar, gridSize, timerSeconds }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to create room');
        }
        noteVersion(data.version);
        lastBoxesCountRef.current = 0;
        lastLineRef.current = null;
        prevStatusRef.current = data.room.status;
        setRoom(data.room);
        setPlayer(data.player);
        sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ code: data.room.code, playerId: data.player.id })
        );
        playJoinRoomSound();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error creating room');
      } finally {
        setIsLoading(false);
      }
    },
    [noteVersion]
  );

  const quickPlayVsBots = useCallback(
    async (
      playerName: string,
      avatar: string,
      gridSize: DotsGridSize = 6,
      botCount: number = 1
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/dots/rooms/quickplay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName, avatar, gridSize, botCount }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to start quick match');
        }
        noteVersion(data.version);
        lastBoxesCountRef.current = 0;
        lastLineRef.current = null;
        prevStatusRef.current = data.room.status;
        setRoom(data.room);
        setPlayer(data.player);
        sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ code: data.room.code, playerId: data.player.id })
        );
        playJoinRoomSound();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error starting quick match');
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
        const res = await fetch('/api/dots/rooms/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, playerName, avatar }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to join room');
        }
        noteVersion(data.version);
        lastBoxesCountRef.current = Object.keys(data.room.boxes).length;
        lastLineRef.current = data.room.lastDrawnLineId;
        prevStatusRef.current = data.room.status;
        setRoom(data.room);
        setPlayer(data.player);
        sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ code: data.room.code, playerId: data.player.id })
        );
        playJoinRoomSound();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error joining room');
      } finally {
        setIsLoading(false);
      }
    },
    [noteVersion]
  );

  const toggleReady = useCallback(async () => {
    if (!room || !player) return;
    try {
      const res = await fetch(`/api/dots/rooms/${room.code}/ready`, {
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
      const res = await fetch(`/api/dots/rooms/${room.code}/add-bot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to add bot');
      } else if (data.room) {
        noteVersion(data.version);
        handleStateUpdate(data.room);
      }
    } catch {
      setError('Failed to add bot');
    }
  }, [room, noteVersion, handleStateUpdate]);

  const updateSettings = useCallback(
    async (gridSize?: DotsGridSize, timerSeconds?: number) => {
      if (!room || !player || !player.isHost) return;
      try {
        const res = await fetch(`/api/dots/rooms/${room.code}/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: player.id,
            gridSize: gridSize ?? room.gridSize,
            timerSeconds: timerSeconds ?? room.timerSeconds,
          }),
        });
        const data = await res.json();
        if (data.success && data.room) {
          noteVersion(data.version);
          handleStateUpdate(data.room);
        }
      } catch (err) {
        console.error('Error updating settings:', err);
      }
    },
    [room, player, noteVersion, handleStateUpdate]
  );

  const startGame = useCallback(async () => {
    if (!room || !player || !player.isHost) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dots/rooms/${room.code}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to start game');
      }
      if (data.room) {
        noteVersion(data.version);
        lastBoxesCountRef.current = 0;
        lastLineRef.current = null;
        handleStateUpdate(data.room);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error starting game');
    } finally {
      setIsLoading(false);
    }
  }, [room, player, noteVersion, handleStateUpdate]);

  const drawLine = useCallback(
    async (lineId: string) => {
      if (!room || !player || room.status !== 'PLAYING') return;
      if (room.currentTurnPlayerId !== player.id) {
        setError('Wait for your turn!');
        return;
      }
      if (room.lines[lineId]) return;

      // 1. Calculate completed boxes optimistically
      const newBoxes = checkNewCompletedBoxes(lineId, room.lines, room.gridSize);
      const totalBoxes = (room.gridSize - 1) * (room.gridSize - 1);
      const currentBoxesCount = Object.keys(room.boxes).length;
      const nextBoxesCount = currentBoxesCount + newBoxes.length;

      // 2. Play sound immediately with zero network latency
      if (newBoxes.length >= 2) {
        playComboClaimSound();
      } else if (newBoxes.length === 1) {
        playBoxClaimSound();
      } else {
        playLineDrawSound();
      }

      // 3. Keep refs updated to prevent redundant sound playback on server sync
      lastLineRef.current = lineId;
      lastBoxesCountRef.current = nextBoxesCount;

      // 4. Compute next player turn and boxes map
      const nextTurnIndex =
        newBoxes.length > 0
          ? room.turnIndex
          : (room.turnIndex + 1) % room.players.length;
      const nextTurnPlayerId =
        newBoxes.length > 0 ? player.id : room.players[nextTurnIndex]?.id || player.id;

      const newBoxesRecord: Record<string, {
        row: number;
        col: number;
        ownerId: string;
        ownerName: string;
        ownerColorIndex: number;
        completedMoveIndex: number;
      }> = {};

      for (const b of newBoxes) {
        newBoxesRecord[`${b.row}-${b.col}`] = {
          row: b.row,
          col: b.col,
          ownerId: player.id,
          ownerName: player.name,
          ownerColorIndex: player.colorIndex,
          completedMoveIndex: room.moves.length + 1,
        };
      }

      const updatedPlayers = room.players.map((p) =>
        p.id === player.id ? { ...p, score: p.score + newBoxes.length } : p
      );
      const updatedPlayer = updatedPlayers.find((p) => p.id === player.id) || player;

      const isGameOver = nextBoxesCount >= totalBoxes;
      let winners: DotsPlayer[] | undefined = undefined;
      let isTie = false;
      if (isGameOver) {
        const maxScore = Math.max(...updatedPlayers.map((p) => p.score));
        winners = updatedPlayers.filter((p) => p.score === maxScore);
        isTie = winners.length > 1;
        playVictorySound();
      }

      const optimisticRoom: DotsRoom = {
        ...room,
        lines: {
          ...room.lines,
          [lineId]: player.id,
        },
        boxes: {
          ...room.boxes,
          ...newBoxesRecord,
        },
        players: updatedPlayers,
        currentTurnPlayerId: nextTurnPlayerId,
        turnIndex: nextTurnIndex,
        comboActive: newBoxes.length > 0,
        lastDrawnLineId: lineId,
        lastCompletedBoxes: newBoxes,
        status: isGameOver ? 'COMPLETED' : room.status,
        winners: winners || room.winners,
        isTie: isGameOver ? isTie : room.isTie,
        moves: [
          ...room.moves,
          {
            moveIndex: room.moves.length + 1,
            playerId: player.id,
            playerName: player.name,
            playerColorIndex: player.colorIndex,
            lineId,
            boxesCompleted: newBoxes.length,
            timestamp: Date.now(),
          },
        ],
      };

      // Apply optimistic update simultaneously to room and player state
      setRoom(optimisticRoom);
      setPlayer(updatedPlayer);

      try {
        const res = await fetch(`/api/dots/rooms/${room.code}/move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: player.id, lineId }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.error || 'Invalid move');
        } else if (data.room) {
          noteVersion(data.version);
          handleStateUpdate(data.room);
        }
      } catch (err) {
        console.error('Error making move:', err);
      }
    },
    [room, player, noteVersion, handleStateUpdate]
  );

  const rematch = useCallback(async () => {
    if (!room) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dots/rooms/${room.code}/rematch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to restart match');
      }
      if (data.room) {
        noteVersion(data.version);
        lastBoxesCountRef.current = 0;
        lastLineRef.current = null;
        handleStateUpdate(data.room);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error restarting match');
    } finally {
      setIsLoading(false);
    }
  }, [room, noteVersion, handleStateUpdate]);

  const leaveRoom = useCallback(async () => {
    if (room && player) {
      try {
        await fetch(`/api/dots/rooms/${room.code}/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: player.id }),
        });
      } catch {
        // Ignored on leave
      }
    }

    sessionStorage.removeItem(SESSION_KEY);
    setRoom(null);
    setPlayer(null);
    setError(null);
  }, [room, player]);

  return {
    room,
    player,
    isLoading,
    error,
    createRoom,
    quickPlayVsBots,
    joinRoom,
    toggleReady,
    addBot,
    updateSettings,
    startGame,
    drawLine,
    rematch,
    leaveRoom,
    clearError: () => setError(null),
  };
}
