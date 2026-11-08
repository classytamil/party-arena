/**
 * Bingo game service (server-side, authoritative).
 * Ported 1:1 from the original Express server; in-memory Maps/SSE/setTimeout were
 * replaced by Supabase persistence (store.ts) and a client-driven `tick` action for bots.
 */

import {
  Room,
  Player,
  generateBingoCard,
  generateRoomCode,
  getCompletedLineIndices,
  WINNING_LINES,
  WINNING_LINES_COUNT,
  shuffleArray,
  AVATAR_OPTIONS,
} from '@/types/bingo';
import { GameError, getRoom, insertRoom, mutateRoom, normalizeCode, RoomRecord } from '../store';
import { json, randomId } from '../http';

const GAME = 'bingo' as const;

/** Minimum time a bot "thinks" before its pick is accepted (original: 1000ms setTimeout). */
export const BINGO_BOT_DELAY_MS = 1000;
const BOT_DELAY_TOLERANCE_MS = 250;

/**
 * Sanitizes a Room object for a specific viewer so opponents' secret 5x5 cards
 * and live completed line counts are never leaked over the network during active play.
 */
function sanitizeRoomForViewer(room: Room, viewerId?: string): Room {
  if (room.status === 'COMPLETED') {
    return room;
  }

  return {
    ...room,
    drawSequence: [], // Never leak uncalled draw sequence to clients
    players: room.players.map((p) => {
      if (viewerId && p.id === viewerId) {
        return p;
      }
      // Redact opponent's secret 5x5 layout and live line progress during active match
      return {
        ...p,
        card: [],
        daubed: [],
        completedLines: [],
      };
    }),
  };
}

function view(rec: RoomRecord<Room>, viewerId?: string, extra: Record<string, unknown> = {}) {
  return { success: true, room: sanitizeRoomForViewer(rec.state, viewerId), version: rec.version, ...extra };
}

function chooseBotNumber(bot: Player, calledNumbers: number[]): number {
  const calledSet = new Set(calledNumbers);
  const uncalledOnCard = bot.card.filter((n) => !calledSet.has(n));
  if (uncalledOnCard.length === 0) {
    for (let i = 1; i <= 25; i++) {
      if (!calledSet.has(i)) return i;
    }
    return 1;
  }

  let bestNum = uncalledOnCard[0];
  let bestScore = -1;

  for (const num of uncalledOnCard) {
    const cellIdx = bot.card.indexOf(num);
    let score = 0;
    WINNING_LINES.forEach((line) => {
      if (line.indices.includes(cellIdx)) {
        const daubedCount = line.indices.filter((idx) => bot.daubed[idx]).length;
        score += Math.pow(3, daubedCount);
      }
    });
    if (score > bestScore) {
      bestScore = score;
      bestNum = num;
    }
  }

  return bestNum;
}

function executePickNumber(room: Room, playerId: string, number: number): { success: boolean; error?: string } {
  if (room.status !== 'PLAYING') return { success: false, error: 'Game is not active' };
  if (room.currentTurnPlayerId !== playerId) return { success: false, error: 'It is not your turn to choose a number' };
  if (!Number.isInteger(number) || number < 1 || number > 25) {
    return { success: false, error: 'Number must be an integer between 1 and 25' };
  }
  if (room.calledNumbers.includes(number)) return { success: false, error: 'This number has already been called' };

  const callingPlayer = room.players.find((p) => p.id === playerId);
  if (!callingPlayer) return { success: false, error: 'Player not found in room' };

  room.calledNumbers.push(number);
  if (!room.callHistory) room.callHistory = [];
  room.callHistory.push({
    callOrder: room.calledNumbers.length,
    number,
    callerName: callingPlayer.name,
    timestamp: Date.now(),
  });
  room.currentNumber = number;
  room.lastCallerName = callingPlayer.name;

  // Mark for ALL players in room immediately
  for (const player of room.players) {
    const idx = player.card.indexOf(number);
    if (idx !== -1) {
      player.daubed[idx] = true;
    }
    player.completedLines = getCompletedLineIndices(player.daubed);
  }

  // Check for winners (prioritize active caller on simultaneous 5-line completion)
  const winners = room.players.filter((p) => p.completedLines.length >= WINNING_LINES_COUNT);
  if (winners.length > 0) {
    room.winner = winners.find((p) => p.id === playerId) || winners[0];
    room.status = 'COMPLETED';
    return { success: true };
  }

  if (room.calledNumbers.length >= 25) {
    room.status = 'COMPLETED';
    return { success: true };
  }

  // Advance turn to next player safely
  const currentIdx = room.players.findIndex((p) => p.id === playerId);
  room.turnIndex = currentIdx !== -1 ? (currentIdx + 1) % room.players.length : 0;
  room.currentTurnPlayerId = room.players[room.turnIndex].id;

  return { success: true };
}

function performDrawNextNumber(room: Room): { drawnNumber: number | null; winnerDeclared: boolean } {
  if (room.status !== 'PLAYING') return { drawnNumber: null, winnerDeclared: false };
  const currentTurnPlayer = room.players.find((p) => p.id === room.currentTurnPlayerId) || room.players[0];
  const uncalled = Array.from({ length: 25 }, (_, i) => i + 1).filter((n) => !room.calledNumbers.includes(n));
  if (uncalled.length === 0) {
    room.status = 'COMPLETED';
    return { drawnNumber: null, winnerDeclared: false };
  }

  const chosen = uncalled[Math.floor(Math.random() * uncalled.length)];
  executePickNumber(room, currentTurnPlayer.id, chosen);
  return { drawnNumber: chosen, winnerDeclared: !!room.winner };
}

// Sanitize player display name
function sanitizeName(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw.replace(/[<>]/g, '').trim().slice(0, 18);
  return cleaned || fallback;
}

// Validate avatar ID
function sanitizeAvatar(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback;
  return AVATAR_OPTIONS.some((a) => a.id === raw) ? raw : fallback;
}

function newHuman(name: string, avatar: string, isHost: boolean): Player {
  return {
    id: randomId('p_'),
    name,
    avatar,
    card: generateBingoCard(),
    daubed: new Array(25).fill(false),
    completedLines: [],
    isHost,
    isReady: isHost,
    isBot: false,
    connected: true,
  };
}

// ---------------------- HANDLERS ----------------------

export async function createBingoRoom(body: Record<string, any>) {
  const { hostName, hostAvatar, maxPlayers } = body;
  const name = sanitizeName(hostName, 'Host');
  const avatar = sanitizeAvatar(hostAvatar, 'fox');
  const max = Math.min(Math.max(Number(maxPlayers) || 6, 2), 10);
  const hostPlayer = newHuman(name, avatar, true);

  const rec = await insertRoom<Room>(GAME, generateRoomCode, (code) => ({
    code,
    status: 'WAITING',
    maxPlayers: max,
    players: [hostPlayer],
    drawSequence: shuffleArray(Array.from({ length: 25 }, (_, i) => i + 1)),
    drawIndex: 0,
    calledNumbers: [],
    callHistory: [],
    currentNumber: null,
    winner: null,
    autoDrawInterval: 0,
    currentTurnPlayerId: hostPlayer.id,
    turnIndex: 0,
    lastCallerName: null,
    createdAt: Date.now(),
  }));

  return json(view(rec, hostPlayer.id, { player: hostPlayer }));
}

export async function joinBingoRoom(body: Record<string, any>) {
  const code = normalizeCode(body.roomCode);
  const name = sanitizeName(body.playerName, 'Player');
  const avatar = sanitizeAvatar(body.playerAvatar, 'cat');
  let newPlayer: Player | null = null;

  const { record } = await mutateRoom<Room>(
    code,
    GAME,
    (room) => {
      if (room.status !== 'WAITING') throw new GameError(400, 'This game is already in progress.');
      if (room.players.length >= room.maxPlayers) throw new GameError(400, 'Room is full.');
      newPlayer = newHuman(name, avatar, false);
      room.players.push(newPlayer);
    },
    { notFoundMessage: 'Room not found. Please check the 6-character code.' }
  );

  return json(view(record!, newPlayer!.id, { player: newPlayer }));
}

export async function getBingoRoom(rawCode: string, playerId?: string) {
  const rec = await getRoom<Room>(normalizeCode(rawCode), GAME);
  if (!rec) throw new GameError(404, 'Room not found.');
  const player = playerId ? rec.state.players.find((p) => p.id === playerId) || null : null;
  return json(view(rec, playerId, { player }));
}

export async function bingoAction(rawCode: string, action: string, body: Record<string, any>) {
  const code = normalizeCode(rawCode);
  const playerId: string | undefined = typeof body.playerId === 'string' ? body.playerId : undefined;

  switch (action) {
    // Toggle Ready Status
    case 'ready': {
      const { record } = await mutateRoom<Room>(code, GAME, (room) => {
        if (room.status !== 'WAITING') throw new GameError(400, 'Cannot change ready state after match starts');
        const player = room.players.find((p) => p.id === playerId);
        if (!player) throw new GameError(404, 'Player not found in room');
        player.isReady = !!body.isReady;
      });
      return json(view(record!, playerId));
    }

    // Add Simulated Bot Player (Host Only & WAITING state only)
    case 'add-bot': {
      let botPlayer: Player | null = null;
      const { record } = await mutateRoom<Room>(code, GAME, (room) => {
        if (room.status !== 'WAITING') throw new GameError(400, 'Bots can only be added in the waiting lobby.');
        if (playerId) {
          const caller = room.players.find((p) => p.id === playerId);
          if (!caller || !caller.isHost) throw new GameError(403, 'Only the room host can add bots.');
        }
        if (room.players.length >= room.maxPlayers) throw new GameError(400, 'Room is full');

        const botNames = ['Alice', 'Bob', 'Charlie', 'Dana', 'Elena', 'Felix', 'Maya', 'Zack'];
        const existingNames = new Set(room.players.map((p) => p.name));
        const availableName = botNames.find((n) => !existingNames.has(n)) || `Bot ${room.players.length + 1}`;
        const randomAvatar = AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)].id;

        botPlayer = {
          id: randomId('bot_', 7),
          name: availableName,
          avatar: randomAvatar,
          card: generateBingoCard(),
          daubed: new Array(25).fill(false),
          completedLines: [],
          isHost: false,
          isReady: true,
          isBot: true,
          connected: true,
        };
        room.players.push(botPlayer);
      });
      return json(view(record!, playerId, { player: botPlayer }));
    }

    // Start Match (Host Only)
    case 'start': {
      const { record } = await mutateRoom<Room>(code, GAME, (room) => {
        if (room.status !== 'WAITING') throw new GameError(400, 'Game has already started.');
        const player = room.players.find((p) => p.id === playerId);
        if (!player || !player.isHost) throw new GameError(403, 'Only the host can start the game.');
        if (room.players.length < 2) throw new GameError(400, 'At least 2 players are required to start.');
        const readyCount = room.players.filter((p) => p.isReady || p.isHost).length;
        if (readyCount < 2) throw new GameError(400, 'At least 2 players must be ready to start.');

        room.drawSequence = shuffleArray(Array.from({ length: 25 }, (_, i) => i + 1));
        room.drawIndex = 0;
        room.calledNumbers = [];
        room.callHistory = [];
        room.currentNumber = null;
        room.winner = null;
        room.status = 'PLAYING';
        room.turnIndex = 0;
        room.currentTurnPlayerId = room.players[0].id;
        room.lastCallerName = null;

        // Ensure every player has a fresh randomized card
        room.players.forEach((p) => {
          p.card = generateBingoCard();
          p.daubed = new Array(25).fill(false);
          p.completedLines = [];
        });
      });
      return json(view(record!, playerId));
    }

    // Pick Number on Turn (Option A: Player Choice)
    case 'pick-number': {
      const { record } = await mutateRoom<Room>(code, GAME, (room) => {
        const result = executePickNumber(room, playerId as string, Number(body.number));
        if (!result.success) throw new GameError(400, result.error || 'Invalid pick');
      });
      return json(view(record!, playerId));
    }

    // Draw Next Number (Host Only)
    case 'draw': {
      let drawResult = { drawnNumber: null as number | null, winnerDeclared: false };
      const { record } = await mutateRoom<Room>(code, GAME, (room) => {
        const player = room.players.find((p) => p.id === playerId);
        if (!player || !player.isHost) throw new GameError(403, 'Only the host can draw numbers.');
        if (room.status !== 'PLAYING') throw new GameError(400, 'Game is not currently active.');
        drawResult = performDrawNextNumber(room);
      });
      return json(view(record!, playerId, drawResult));
    }

    // Rematch / Play Again (Host Only)
    case 'rematch': {
      const { record } = await mutateRoom<Room>(code, GAME, (room) => {
        const player = room.players.find((p) => p.id === playerId);
        if (!player || !player.isHost) throw new GameError(403, 'Only the host can initiate a rematch.');

        room.status = 'WAITING';
        room.drawSequence = shuffleArray(Array.from({ length: 25 }, (_, i) => i + 1));
        room.drawIndex = 0;
        room.calledNumbers = [];
        room.callHistory = [];
        room.currentNumber = null;
        room.winner = null;
        room.autoDrawInterval = 0;
        room.turnIndex = 0;
        room.currentTurnPlayerId = room.players[0].id;
        room.lastCallerName = null;

        room.players.forEach((p) => {
          p.card = generateBingoCard();
          p.daubed = new Array(25).fill(false);
          p.completedLines = [];
          p.isReady = p.isHost || p.isBot;
        });
      });
      return json(view(record!, playerId));
    }

    // Leave Room (Handles mid-game turn rotation & human host promotion)
    case 'leave': {
      await mutateRoom<Room>(
        code,
        GAME,
        (room) => {
          const playerIdx = room.players.findIndex((p) => p.id === playerId);
          if (playerIdx === -1) return 'noop';

          const wasHost = room.players[playerIdx].isHost;
          const wasTheirTurn = room.currentTurnPlayerId === playerId;
          room.players.splice(playerIdx, 1);

          // Check if any non-bot human players remain
          const remainingHumans = room.players.filter((p) => !p.isBot);
          if (remainingHumans.length === 0) return 'delete';

          // Pass host role to the first remaining human player (never to a Bot!)
          if (wasHost) {
            remainingHumans[0].isHost = true;
            remainingHumans[0].isReady = true;
          }

          // If a match is in progress and only 1 player remains total, end the match with that player as winner
          if (room.status === 'PLAYING' && room.players.length < 2) {
            room.winner = room.players[0];
            room.status = 'COMPLETED';
            return;
          }

          // Fix turnIndex & currentTurnPlayerId if someone leaves mid-game
          if (room.status === 'PLAYING') {
            if (wasTheirTurn) {
              room.turnIndex = playerIdx % room.players.length;
              room.currentTurnPlayerId = room.players[room.turnIndex].id;
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

    // Bot turn driver: replaces the server-side setTimeout. Any client in the room may call it;
    // the server verifies a bot is actually on turn and has "thought" long enough.
    case 'tick': {
      let acted = false;
      const { record } = await mutateRoom<Room>(code, GAME, (room, rec) => {
        acted = false;
        if (room.status !== 'PLAYING') return 'noop';
        const activePlayer = room.players.find((p) => p.id === room.currentTurnPlayerId);
        if (!activePlayer || !activePlayer.isBot) return 'noop';
        if (Date.now() - rec.updatedAt < BINGO_BOT_DELAY_MS - BOT_DELAY_TOLERANCE_MS) return 'noop';

        const botNum = chooseBotNumber(activePlayer, room.calledNumbers);
        const result = executePickNumber(room, activePlayer.id, botNum);
        if (!result.success) return 'noop';
        acted = true;
      });
      return json(view(record!, playerId, { acted }));
    }

    default:
      throw new GameError(404, `Unknown action "${action}"`);
  }
}
