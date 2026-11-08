import { useState, useEffect, useRef, useCallback } from 'react';
import { Room, Player } from '../types/bingo';
import {
  playClickSound,
  playDaubSound,
  playJoinRoomSound,
  playLineCompleteSound,
  playVictorySound,
} from '../utils/sound';
import { useRoomSync } from './useRoomSync';
import confetti from 'canvas-confetti';

interface UseBingoRealtimeReturn {
  room: Room | null;
  player: Player | null;
  isLoading: boolean;
  error: string | null;
  createRoom: (hostName: string, hostAvatar: string, maxPlayers: number) => Promise<boolean>;
  quickPlayVsBots: (hostName: string, hostAvatar: string, botCount?: number) => Promise<boolean>;
  joinRoom: (code: string, playerName: string, playerAvatar: string) => Promise<boolean>;
  toggleReady: (isReady: boolean) => Promise<void>;
  addBot: () => Promise<void>;
  startGame: () => Promise<void>;
  drawNextNumber: () => Promise<void>;
  pickNumber: (number: number) => Promise<void>;
  rematch: () => Promise<void>;
  leaveRoom: () => Promise<void>;
  clearError: () => void;
}

export function useBingoRealtime(): UseBingoRealtimeReturn {
  const [room, setRoom] = useState<Room | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const prevLineCountRef = useRef<number>(0);
  const prevWinnerRef = useRef<string | null>(null);
  const prevCalledCountRef = useRef<number>(0);
  const pickingLockRef = useRef<boolean>(false);
  const lastLocalPickedRef = useRef<number | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const applyRoomSnapshot = useCallback((incoming: Room) => {
    setRoom((prev) => {
      if (prev && incoming.status === 'WAITING' && prev.status !== 'WAITING') {
        prevLineCountRef.current = 0;
        lastLocalPickedRef.current = null;
        prevCalledCountRef.current = 0;
      }
      if (
        incoming.status === 'PLAYING' &&
        incoming.calledNumbers.length > prevCalledCountRef.current
      ) {
        prevCalledCountRef.current = incoming.calledNumbers.length;
        if (incoming.currentNumber !== lastLocalPickedRef.current) {
          playDaubSound();
        }
      } else {
        prevCalledCountRef.current = incoming.calledNumbers.length;
      }
      return incoming;
    });
  }, []);

  const { noteVersion } = useRoomSync<Room>({
    roomCode: room?.code ?? null,
    playerId: player?.id ?? null,
    buildFetchUrl: (code, pid) =>
      `/api/rooms/${encodeURIComponent(code)}?playerId=${encodeURIComponent(pid)}`,
    onRoomSnapshot: applyRoomSnapshot,
  });

  // Sync local player object from updated room snapshot
  useEffect(() => {
    if (!room || !player) return;
    const current = room.players.find((p) => p.id === player.id);
    if (current && current.card && current.card.length === 25) {
      setPlayer(current);
    } else if (current) {
      setPlayer((prev) =>
        prev
          ? {
              ...current,
              card: prev.card,
              daubed: prev.daubed,
              completedLines: prev.completedLines,
            }
          : current
      );
    }
  }, [room, player?.id]);

  // Drive bot turns automatically from the client (validated by the server)
  useEffect(() => {
    if (!room || !player || room.status !== 'PLAYING') return;
    const activePlayer = room.players.find((p) => p.id === room.currentTurnPlayerId);
    if (!activePlayer || !activePlayer.isBot) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/rooms/${encodeURIComponent(room.code)}/tick`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: player.id }),
        });
        const data = await res.json();
        if (data.success && data.room) {
          noteVersion(data.version);
          applyRoomSnapshot(data.room);
        }
      } catch {
        // Next poll or broadcast will retry if needed
      }
    }, 1050);

    return () => clearTimeout(timer);
  }, [
    room?.code,
    room?.status,
    room?.currentTurnPlayerId,
    room?.calledNumbers.length,
    player?.id,
    applyRoomSnapshot,
    noteVersion,
  ]);

  // Audio & Confetti triggers when lines change or winner is declared
  useEffect(() => {
    if (!room) return;

    if (room.winner && room.winner.id !== prevWinnerRef.current) {
      prevWinnerRef.current = room.winner.id;
      playVictorySound();
      try {
        confetti({
          particleCount: 100,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#2563eb', '#10b981', '#f59e0b', '#f43f5e', '#6366f1'],
        });
      } catch {
        // Confetti fallback
      }
    } else if (!room.winner) {
      prevWinnerRef.current = null;
    }

    if (player) {
      const lineCount = player.completedLines.length;
      if (lineCount > prevLineCountRef.current && room.status === 'PLAYING') {
        playLineCompleteSound();
      }
      prevLineCountRef.current = lineCount;
    }
  }, [room?.winner, room?.status, player?.completedLines.length]);

  // Auto-restore active room session if user refreshes browser tab
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedCode = sessionStorage.getItem('bingo_session_room');
    const savedPlayerId = sessionStorage.getItem('bingo_session_player');
    if (savedCode && savedPlayerId) {
      fetch(
        `/api/rooms/${encodeURIComponent(savedCode)}?playerId=${encodeURIComponent(savedPlayerId)}`
      )
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.room && data.player) {
            noteVersion(data.version);
            prevLineCountRef.current = data.player.completedLines?.length || 0;
            prevCalledCountRef.current = data.room.calledNumbers?.length || 0;
            setRoom(data.room);
            setPlayer(data.player);
          } else {
            sessionStorage.removeItem('bingo_session_room');
            sessionStorage.removeItem('bingo_session_player');
          }
        })
        .catch(() => {
          // Ignore if room expired
        });
    }
  }, [noteVersion]);

  // ---------------- ACTIONS ----------------

  const createRoom = async (
    hostName: string,
    hostAvatar: string,
    maxPlayers: number
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    playClickSound();
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName, hostAvatar, maxPlayers }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to create room.');
        setIsLoading(false);
        return false;
      }
      noteVersion(data.version);
      prevLineCountRef.current = 0;
      prevCalledCountRef.current = 0;
      setRoom(data.room);
      setPlayer(data.player);
      sessionStorage.setItem('bingo_session_room', data.room.code);
      sessionStorage.setItem('bingo_session_player', data.player.id);
      playJoinRoomSound();
      setIsLoading(false);
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error creating room');
      setIsLoading(false);
      return false;
    }
  };

  const quickPlayVsBots = async (
    hostName: string,
    hostAvatar: string,
    botCount = 1
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    playClickSound();
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName, hostAvatar, maxPlayers: Math.max(2, botCount + 1) }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to create match.');
        setIsLoading(false);
        return false;
      }

      const code = data.room.code;
      const hostId = data.player.id;

      for (let i = 0; i < botCount; i++) {
        await fetch(`/api/rooms/${code}/add-bot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: hostId }),
        });
      }

      const startRes = await fetch(`/api/rooms/${code}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: hostId }),
      });
      const startData = await startRes.json();

      noteVersion(startData.version);
      const activeRoom: Room = startData.room || data.room;
      const updatedHost = activeRoom.players.find((p: Player) => p.id === hostId) || data.player;

      prevLineCountRef.current = 0;
      prevCalledCountRef.current = 0;
      setRoom(activeRoom);
      setPlayer(updatedHost);
      sessionStorage.setItem('bingo_session_room', code);
      sessionStorage.setItem('bingo_session_player', updatedHost.id);
      playJoinRoomSound();
      setIsLoading(false);
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error starting match');
      setIsLoading(false);
      return false;
    }
  };

  const joinRoom = async (
    code: string,
    playerName: string,
    playerAvatar: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    playClickSound();
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code.toUpperCase(), playerName, playerAvatar }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to join room.');
        setIsLoading(false);
        return false;
      }
      noteVersion(data.version);
      prevLineCountRef.current = 0;
      prevCalledCountRef.current = data.room.calledNumbers?.length || 0;
      setRoom(data.room);
      setPlayer(data.player);
      sessionStorage.setItem('bingo_session_room', data.room.code);
      sessionStorage.setItem('bingo_session_player', data.player.id);
      playJoinRoomSound();
      setIsLoading(false);
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error joining room');
      setIsLoading(false);
      return false;
    }
  };

  const toggleReady = async (isReady: boolean) => {
    if (!room || !player) return;
    playClickSound();
    try {
      const res = await fetch(`/api/rooms/${room.code}/ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id, isReady }),
      });
      const data = await res.json();
      if (data.success && data.room) {
        noteVersion(data.version);
        setRoom(data.room);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error toggling ready');
    }
  };

  const addBot = async () => {
    if (!room || !player || !player.isHost) return;
    playClickSound();
    try {
      const res = await fetch(`/api/rooms/${room.code}/add-bot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id }),
      });
      const data = await res.json();
      if (data.success && data.room) {
        noteVersion(data.version);
        setRoom(data.room);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error adding bot');
    }
  };

  const startGame = async () => {
    if (!room || !player || !player.isHost) return;
    playClickSound();
    try {
      const res = await fetch(`/api/rooms/${room.code}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id }),
      });
      const data = await res.json();
      if (data.success && data.room) {
        noteVersion(data.version);
        prevLineCountRef.current = 0;
        prevCalledCountRef.current = 0;
        lastLocalPickedRef.current = null;
        setRoom(data.room);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error starting game');
    }
  };

  const drawNextNumber = async () => {
    if (!room || !player || !player.isHost) return;
    playClickSound();
    try {
      const res = await fetch(`/api/rooms/${room.code}/draw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id }),
      });
      const data = await res.json();
      if (data.success && data.room) {
        noteVersion(data.version);
        applyRoomSnapshot(data.room);
      }
    } catch (err: unknown) {
      console.error('Error drawing number:', err);
    }
  };

  const pickNumber = async (number: number) => {
    if (!room || !player || room.status !== 'PLAYING') return;
    if (room.currentTurnPlayerId !== player.id) return;
    if (room.calledNumbers.includes(number)) return;
    if (pickingLockRef.current) return;

    pickingLockRef.current = true;
    lastLocalPickedRef.current = number;

    setRoom((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        currentNumber: number,
        calledNumbers: prev.calledNumbers.includes(number)
          ? prev.calledNumbers
          : [...prev.calledNumbers, number],
      };
    });

    try {
      const res = await fetch(`/api/rooms/${room.code}/pick-number`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id, number }),
      });
      const data = await res.json();
      if (data.success && data.room) {
        noteVersion(data.version);
        applyRoomSnapshot(data.room);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err: unknown) {
      console.error('Error picking number:', err);
    } finally {
      pickingLockRef.current = false;
    }
  };

  const rematch = async () => {
    if (!room || !player || !player.isHost) return;
    playClickSound();
    try {
      const res = await fetch(`/api/rooms/${room.code}/rematch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id }),
      });
      const data = await res.json();
      if (data.success && data.room) {
        noteVersion(data.version);
        prevLineCountRef.current = 0;
        prevCalledCountRef.current = 0;
        lastLocalPickedRef.current = null;
        setRoom(data.room);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error setting up rematch');
    }
  };

  const leaveRoom = async () => {
    if (!room || !player) return;
    playClickSound();
    try {
      await fetch(`/api/rooms/${room.code}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id }),
      });
    } catch {
      // Ignore leave error
    } finally {
      sessionStorage.removeItem('bingo_session_room');
      sessionStorage.removeItem('bingo_session_player');
      setRoom(null);
      setPlayer(null);
    }
  };

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
    startGame,
    drawNextNumber,
    pickNumber,
    rematch,
    leaveRoom,
    clearError,
  };
}
