import { useCallback, useEffect, useRef, useState } from 'react';
import { useRoomSync } from './useRoomSync';
import { TicTacToePlayer, TicTacToeRoom } from '../types/ticTacToe';

const SESSION_KEY = 'tictactoe_session_v1';

export function useTicTacToeRealtime() {
  const [room, setRoom] = useState<TicTacToeRoom | null>(null);
  const [player, setPlayer] = useState<TicTacToePlayer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playerIdRef = useRef<string | null>(null);
  playerIdRef.current = player?.id ?? null;

  const handleStateUpdate = useCallback((updatedRoom: TicTacToeRoom) => {
    const playerId = playerIdRef.current;
    if (playerId) {
      const currentPlayer = updatedRoom.players.find((entry) => entry.id === playerId);
      if (!currentPlayer) {
        sessionStorage.removeItem(SESSION_KEY);
        setRoom(null);
        setPlayer(null);
        return;
      }
      setPlayer(currentPlayer);
    }
    setRoom(updatedRoom);
  }, []);

  const { noteVersion } = useRoomSync<TicTacToeRoom>({
    roomCode: room?.code ?? null,
    playerId: player?.id ?? null,
    buildFetchUrl: (code, playerId) =>
      `/api/tictactoe/rooms/${encodeURIComponent(code)}?playerId=${encodeURIComponent(playerId)}`,
    onRoomSnapshot: handleStateUpdate,
  });

  useEffect(() => {
    if (!room || !player) return;
    const leaveOnUnload = () => {
      void fetch(`/api/tictactoe/rooms/${encodeURIComponent(room.code)}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id }),
        keepalive: true,
      });
    };
    window.addEventListener('pagehide', leaveOnUnload);
    return () => window.removeEventListener('pagehide', leaveOnUnload);
  }, [room?.code, player?.id]);

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (!saved) return;
    try {
      const { code, playerId } = JSON.parse(saved) as { code?: string; playerId?: string };
      if (!code || !playerId) throw new Error('Invalid saved Tic-Tac-Toe session');
      fetch(
        `/api/tictactoe/rooms/${encodeURIComponent(code)}?playerId=${encodeURIComponent(playerId)}`
      )
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok || !data.success || !data.room) {
            throw new Error(data.error || 'Could not restore room');
          }
          const currentPlayer = data.room.players.find(
            (entry: TicTacToePlayer) => entry.id === playerId
          );
          if (!currentPlayer) throw new Error('Player is no longer in this room');
          noteVersion(data.version);
          setRoom(data.room);
          setPlayer(currentPlayer);
        })
        .catch(() => sessionStorage.removeItem(SESSION_KEY));
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, [noteVersion]);

  const enterRoom = useCallback(
    async (url: string, payload: Record<string, string>, failureMessage: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok || !data.success || !data.room || !data.player) {
          throw new Error(data.error || failureMessage);
        }
        noteVersion(data.version);
        setRoom(data.room);
        setPlayer(data.player);
        sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ code: data.room.code, playerId: data.player.id })
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : failureMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [noteVersion]
  );

  const createRoom = useCallback(
    (playerName: string, avatar: string) =>
      enterRoom(
        '/api/tictactoe/rooms',
        { playerName, avatar },
        'Could not create room'
      ),
    [enterRoom]
  );

  const joinRoom = useCallback(
    (code: string, playerName: string, avatar: string) =>
      enterRoom(
        '/api/tictactoe/rooms/join',
        { code, playerName, avatar },
        'Could not join room'
      ),
    [enterRoom]
  );

  const runAction = useCallback(
    async (action: string, extra: Record<string, number> = {}) => {
      if (!room || !player) return;
      setError(null);
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/tictactoe/rooms/${encodeURIComponent(room.code)}/${action}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId: player.id, ...extra }),
          }
        );
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || `Could not ${action}`);
        }
        if (data.room) {
          noteVersion(data.version);
          handleStateUpdate(data.room);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : `Could not ${action}`);
      } finally {
        setIsLoading(false);
      }
    },
    [room, player, noteVersion, handleStateUpdate]
  );

  const leaveRoom = useCallback(async () => {
    if (room && player) {
      try {
        await fetch(`/api/tictactoe/rooms/${encodeURIComponent(room.code)}/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: player.id }),
        });
      } catch {
        // The local session should still be cleared when the network is unavailable.
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
    joinRoom,
    toggleReady: () => runAction('ready'),
    startGame: () => runAction('start'),
    playCell: (index: number) => runAction('move', { index }),
    rematch: () => runAction('rematch'),
    leaveRoom,
    clearError: () => setError(null),
  };
}
