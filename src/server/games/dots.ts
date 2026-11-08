/**
 * Dots and Boxes game service (server-side, authoritative).
 * Ported 1:1 from the original Express server; in-memory Maps/SSE/setTimeout were
 * replaced by Supabase persistence (store.ts) and a client-driven `tick` action for
 * bot turns and turn-timer expirations.
 */

import {
  DotsRoom,
  DotsPlayer,
  DotsGridSize,
} from '@/types/dots';
import {
  checkNewCompletedBoxes,
  calculateBotMove,
  getAllPossibleEdges,
} from '@/utils/dotsLogic';
import { GameError, getRoom, insertRoom, mutateRoom, normalizeCode, RoomRecord } from '../store';
import { json, randomId } from '../http';

const GAME = 'dots' as const;

export const DOTS_BOT_DELAY_MS = 850;
const BOT_DELAY_TOLERANCE_MS = 250;
export const DOTS_DEFAULT_TURN_TIMEOUT_SECONDS = 20;

export function getNextActiveDotsTurnIndex(players: { isIdle?: boolean }[], currentIndex: number): number {
  if (players.length <= 1) return 0;
  for (let i = 1; i <= players.length; i++) {
    const candidateIdx = (currentIndex + i) % players.length;
    if (!players[candidateIdx]?.isIdle) {
      return candidateIdx;
    }
  }
  return (currentIndex + 1) % players.length;
}

function getNextStartingDotsTurnIndex(room: { players: { isIdle?: boolean }[]; startTurnIndex?: number }): number {
  if (room.players.length === 0) return 0;
  const currentStart = typeof room.startTurnIndex === 'number' ? room.startTurnIndex : -1;
  const target = (currentStart + 1) % room.players.length;
  for (let i = 0; i < room.players.length; i++) {
    const candidate = (target + i) % room.players.length;
    if (!room.players[candidate]?.isIdle) {
      return candidate;
    }
  }
  return target;
}

const DOTS_BOT_NAMES = ['Gizmo Bot', 'Circuit Sam', 'Pixel Bot', 'Sparky Bot', 'Byte Fox', 'Robo Owl'];
const DOTS_BOT_AVATARS = ['owl', 'alien', 'panda', 'cat', 'tiger', 'lion'];

function generateDotsCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function view(rec: RoomRecord<DotsRoom>, extra: Record<string, unknown> = {}) {
  return { success: true, room: rec.state, version: rec.version, ...extra };
}

function refreshTurnDeadline(room: DotsRoom) {
  if (room.status === 'PLAYING') {
    const seconds = room.timerSeconds > 0 ? room.timerSeconds : DOTS_DEFAULT_TURN_TIMEOUT_SECONDS;
    room.turnDeadline = Date.now() + seconds * 1000;
  } else {
    room.turnDeadline = null;
  }
}

function executeDotsMove(
  room: DotsRoom,
  playerId: string,
  lineId: string
): { success: boolean; error?: string } {
  if (room.status !== 'PLAYING') {
    return { success: false, error: 'Match is not active' };
  }
  if (room.currentTurnPlayerId !== playerId) {
    return { success: false, error: 'It is not your turn to draw a line' };
  }
  if (room.lines[lineId]) {
    return { success: false, error: 'This line has already been drawn' };
  }

  const allPossible = getAllPossibleEdges(room.gridSize);
  if (!allPossible.includes(lineId)) {
    return { success: false, error: 'Invalid edge identifier for this grid size' };
  }

  const player = room.players.find((p) => p.id === playerId);
  if (!player) {
    return { success: false, error: 'Player not found in room' };
  }

  // Clear idle & missed turns when player takes action
  player.isIdle = false;
  player.missedTurns = 0;

  // Draw the line
  room.lines[lineId] = playerId;

  // Check for any newly completed boxes
  const newBoxes = checkNewCompletedBoxes(lineId, room.lines, room.gridSize);

  if (newBoxes.length > 0) {
    // Award completed boxes to player
    for (const box of newBoxes) {
      const boxKey = `${box.row}-${box.col}`;
      room.boxes[boxKey] = {
        row: box.row,
        col: box.col,
        ownerId: player.id,
        ownerName: player.name,
        ownerColorIndex: player.colorIndex,
        completedMoveIndex: room.moves.length + 1,
      };
    }
    player.score += newBoxes.length;

    // RULE 5: If a player completes a box, they get another turn!
    room.comboActive = true;

    // Check game completion: total boxes = (gridSize - 1)^2
    const totalBoxes = (room.gridSize - 1) * (room.gridSize - 1);
    if (Object.keys(room.boxes).length >= totalBoxes) {
      room.status = 'COMPLETED';
      room.turnDeadline = null;

      const maxScore = Math.max(...room.players.map((p) => p.score));
      room.winners = room.players.filter((p) => p.score === maxScore);
      room.isTie = room.winners.length > 1;
    }
  } else {
    // No box completed: turn passes to next active player (skipping idle players)
    room.turnIndex = getNextActiveDotsTurnIndex(room.players, room.turnIndex);
    room.currentTurnPlayerId = room.players[room.turnIndex].id;
    room.comboActive = false;
  }

  // Record move history
  room.moves.push({
    moveIndex: room.moves.length + 1,
    playerId: player.id,
    playerName: player.name,
    playerColorIndex: player.colorIndex,
    lineId,
    boxesCompleted: newBoxes.length,
    timestamp: Date.now(),
  });

  room.lastDrawnLineId = lineId;
  room.lastCompletedBoxes = newBoxes;

  if (room.status === 'PLAYING') {
    refreshTurnDeadline(room);
  }

  return { success: true };
}

// ---------------------- HANDLERS ----------------------

export async function createDotsRoom(body: Record<string, any>) {
  const { playerName, avatar, gridSize = 6, timerSeconds = 0 } = body;
  const name = (playerName || 'Player 1').trim().slice(0, 16);
  const validGrid = [4, 5, 6, 7, 8, 9].includes(gridSize) ? (gridSize as DotsGridSize) : 6;
  const validTimer = [0, 15, 30].includes(timerSeconds) ? timerSeconds : 0;

  const hostPlayer: DotsPlayer = {
    id: randomId('p_', 7),
    name,
    avatar: avatar || 'fox',
    colorIndex: 0,
    score: 0,
    isHost: true,
    isReady: true,
    isBot: false,
    connected: true,
  };

  const rec = await insertRoom<DotsRoom>(GAME, generateDotsCode, (code) => ({
    code,
    status: 'WAITING',
    gridSize: validGrid,
    maxPlayers: 4,
    timerSeconds: validTimer,
    players: [hostPlayer],
    currentTurnPlayerId: hostPlayer.id,
    turnIndex: 0,
    lines: {},
    boxes: {},
    moves: [],
    winners: [],
    isTie: false,
    turnDeadline: null,
    lastDrawnLineId: null,
    lastCompletedBoxes: [],
    comboActive: false,
    createdAt: Date.now(),
  }));

  return json(view(rec, { player: hostPlayer }));
}

export async function quickplayDotsRoom(body: Record<string, any>) {
  const { playerName, avatar, gridSize = 6, botCount = 1 } = body;
  const name = (playerName || 'Player 1').trim().slice(0, 16);
  const validGrid = [4, 5, 6, 7, 8, 9].includes(gridSize) ? (gridSize as DotsGridSize) : 6;
  const numBots = Math.min(3, Math.max(1, Number(botCount) || 1));

  const hostPlayer: DotsPlayer = {
    id: randomId('p_', 7),
    name,
    avatar: avatar || 'fox',
    colorIndex: 0,
    score: 0,
    isHost: true,
    isReady: true,
    isBot: false,
    connected: true,
  };

  const players: DotsPlayer[] = [hostPlayer];
  for (let i = 0; i < numBots; i++) {
    players.push({
      id: randomId('bot_', 5),
      name: DOTS_BOT_NAMES[i % DOTS_BOT_NAMES.length],
      avatar: DOTS_BOT_AVATARS[i % DOTS_BOT_AVATARS.length],
      colorIndex: i + 1,
      score: 0,
      isHost: false,
      isReady: true,
      isBot: true,
      connected: true,
    });
  }

  const firstTurnIdx = Math.floor(Math.random() * players.length);

  const rec = await insertRoom<DotsRoom>(GAME, generateDotsCode, (code) => ({
    code,
    status: 'PLAYING',
    gridSize: validGrid,
    maxPlayers: 4,
    timerSeconds: 0,
    players,
    currentTurnPlayerId: players[firstTurnIdx].id,
    turnIndex: firstTurnIdx,
    lines: {},
    boxes: {},
    moves: [],
    winners: [],
    isTie: false,
    turnDeadline: null,
    lastDrawnLineId: null,
    lastCompletedBoxes: [],
    comboActive: false,
    createdAt: Date.now(),
  }));

  return json(view(rec, { player: hostPlayer }));
}

export async function joinDotsRoom(body: Record<string, any>) {
  const roomCode = normalizeCode(body.code);
  let player: DotsPlayer | null = null;

  const { record } = await mutateRoom<DotsRoom>(
    roomCode,
    GAME,
    (room) => {
      if (room.status !== 'WAITING') throw new GameError(400, 'Match is already in progress');
      if (room.players.length >= room.maxPlayers) {
        throw new GameError(400, 'Room is already full (max 4 players)');
      }

      const name = (body.playerName || `Player ${room.players.length + 1}`).trim().slice(0, 16);
      const colorIndex = room.players.length;

      player = {
        id: randomId('p_', 7),
        name,
        avatar: body.avatar || 'panda',
        colorIndex,
        score: 0,
        isHost: false,
        isReady: false,
        isBot: false,
        connected: true,
      };
      room.players.push(player);
    },
    { notFoundMessage: 'Dots and Boxes room not found' }
  );

  return json(view(record!, { player }));
}

export async function getDotsRoom(rawCode: string) {
  const rec = await getRoom<DotsRoom>(normalizeCode(rawCode), GAME);
  if (!rec) throw new GameError(404, 'Dots room not found');
  return json(view(rec));
}

export async function dotsAction(rawCode: string, action: string, body: Record<string, any>) {
  const code = normalizeCode(rawCode);
  const playerId: string | undefined = typeof body.playerId === 'string' ? body.playerId : undefined;

  switch (action) {
    case 'ready': {
      let isReady = false;
      const { record } = await mutateRoom<DotsRoom>(code, GAME, (room) => {
        const player = room.players.find((p) => p.id === playerId);
        if (!player) throw new GameError(404, 'Player not found');
        player.isReady = !player.isReady;
        isReady = player.isReady;
      });
      return json(view(record!, { isReady }));
    }

    case 'add-bot': {
      const { record } = await mutateRoom<DotsRoom>(code, GAME, (room) => {
        if (room.status !== 'WAITING') throw new GameError(400, 'Cannot add bot once match has started');
        if (room.players.length >= room.maxPlayers) throw new GameError(400, 'Room is full (max 4 players)');

        const botIndex = room.players.filter((p) => p.isBot).length;
        const botPlayer: DotsPlayer = {
          id: randomId('bot_', 5),
          name: DOTS_BOT_NAMES[botIndex % DOTS_BOT_NAMES.length],
          avatar: DOTS_BOT_AVATARS[botIndex % DOTS_BOT_AVATARS.length],
          colorIndex: room.players.length,
          score: 0,
          isHost: false,
          isReady: true,
          isBot: true,
          connected: true,
        };
        room.players.push(botPlayer);
      });
      return json(view(record!));
    }

    case 'settings': {
      const { record } = await mutateRoom<DotsRoom>(code, GAME, (room) => {
        const player = room.players.find((p) => p.id === playerId);
        if (!player || !player.isHost) throw new GameError(403, 'Only the host can modify settings');
        if (room.status !== 'WAITING') throw new GameError(400, 'Cannot change settings during active match');
        if ([4, 5, 6, 7, 8, 9].includes(body.gridSize)) room.gridSize = body.gridSize;
        if ([0, 15, 30].includes(body.timerSeconds)) room.timerSeconds = body.timerSeconds;
      });
      return json(view(record!));
    }

    case 'start': {
      const { record } = await mutateRoom<DotsRoom>(code, GAME, (room) => {
        const player = room.players.find((p) => p.id === playerId);
        if (!player || !player.isHost) throw new GameError(403, 'Only the host can start the match');
        if (room.players.length < 2) {
          throw new GameError(400, 'Need at least 2 players to start. Add a bot or invite a friend!');
        }
        const unreadyHumans = room.players.filter((p) => !p.isBot && !p.isReady);
        if (unreadyHumans.length > 0) {
          throw new GameError(400, 'All players must be ready before starting');
        }

        const startIdx = getNextStartingDotsTurnIndex(room);
        room.status = 'PLAYING';
        room.startTurnIndex = startIdx;
        room.turnIndex = startIdx;
        room.currentTurnPlayerId = room.players[startIdx].id;
        room.lines = {};
        room.boxes = {};
        room.moves = [];
        room.winners = [];
        room.isTie = false;
        room.comboActive = false;
        room.lastDrawnLineId = null;
        room.lastCompletedBoxes = [];

        for (const p of room.players) {
          p.score = 0;
          p.isIdle = false;
          p.missedTurns = 0;
        }
        refreshTurnDeadline(room);
      });
      return json(view(record!));
    }

    case 'move': {
      const { record } = await mutateRoom<DotsRoom>(code, GAME, (room) => {
        const result = executeDotsMove(room, playerId as string, String(body.lineId || ''));
        if (!result.success) throw new GameError(400, result.error || 'Invalid move');
      });
      return json(view(record!));
    }

    case 'rematch': {
      const { record } = await mutateRoom<DotsRoom>(code, GAME, (room) => {
        const startIdx = getNextStartingDotsTurnIndex(room);
        room.status = 'PLAYING';
        room.startTurnIndex = startIdx;
        room.turnIndex = startIdx;
        room.currentTurnPlayerId = room.players[startIdx].id;
        room.lines = {};
        room.boxes = {};
        room.moves = [];
        room.winners = [];
        room.isTie = false;
        room.comboActive = false;
        room.lastDrawnLineId = null;
        room.lastCompletedBoxes = [];

        for (const p of room.players) {
          p.score = 0;
          p.isIdle = false;
          p.missedTurns = 0;
        }
        refreshTurnDeadline(room);
      });
      return json(view(record!));
    }

    case 'leave': {
      await mutateRoom<DotsRoom>(
        code,
        GAME,
        (room) => {
          const pIndex = room.players.findIndex((p) => p.id === playerId);
          if (pIndex === -1) return 'noop';

          const wasHost = room.players[pIndex].isHost;
          const wasTheirTurn = room.currentTurnPlayerId === playerId;
          room.players.splice(pIndex, 1);

          const remainingHumans = room.players.filter((p) => !p.isBot);
          if (remainingHumans.length === 0) return 'delete';

          if (wasHost) {
            remainingHumans[0].isHost = true;
            remainingHumans[0].isReady = true;
          }

          if (room.status === 'PLAYING') {
            if (room.players.length < 2) {
              room.winners = [room.players[0]];
              room.status = 'COMPLETED';
              room.turnDeadline = null;
            } else if (wasTheirTurn) {
              const nextIdx = getNextActiveDotsTurnIndex(room.players, Math.max(0, pIndex - 1));
              room.turnIndex = nextIdx;
              room.currentTurnPlayerId = room.players[room.turnIndex].id;
              refreshTurnDeadline(room);
            } else {
              const activeIdx = room.players.findIndex((p) => p.id === room.currentTurnPlayerId);
              room.turnIndex = activeIdx !== -1 ? activeIdx : 0;
              room.currentTurnPlayerId = room.players[room.turnIndex].id;
            }
          }
        },
        { allowMissing: true }
      );
      return json({ success: true });
    }

    // Handles bot moves AND turn-deadline auto-moves with Idle tracking
    case 'tick': {
      let acted = false;
      const { record } = await mutateRoom<DotsRoom>(code, GAME, (room, rec) => {
        acted = false;
        if (room.status !== 'PLAYING') return 'noop';

        const now = Date.now();
        const activePlayer = room.players.find((p) => p.id === room.currentTurnPlayerId);
        if (!activePlayer) return 'noop';

        const isBotReady =
          activePlayer.isBot && now - rec.updatedAt >= DOTS_BOT_DELAY_MS - BOT_DELAY_TOLERANCE_MS;
        const isDeadlineExpired =
          room.turnDeadline !== null && now >= room.turnDeadline - 150;

        if (!isBotReady && !isDeadlineExpired) return 'noop';

        if (isDeadlineExpired && !activePlayer.isBot) {
          activePlayer.missedTurns = (activePlayer.missedTurns || 0) + 1;
          if (activePlayer.missedTurns >= 2) {
            activePlayer.isIdle = true;
          }
        }

        const move = calculateBotMove(room.gridSize, room.lines);
        if (!move) return 'noop';

        const res = executeDotsMove(room, activePlayer.id, move);
        if (!res.success) return 'noop';
        acted = true;
      });
      return json(view(record!, { acted }));
    }

    case 'un-idle': {
      const { record } = await mutateRoom<DotsRoom>(code, GAME, (room) => {
        const p = room.players.find((item) => item.id === playerId);
        if (!p) throw new GameError(404, 'Player not found in room');
        p.isIdle = false;
        p.missedTurns = 0;
      });
      return json(view(record!));
    }

    default:
      throw new GameError(404, `Unknown action "${action}"`);
  }
}
