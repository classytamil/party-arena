import {
  calculateTicTacToeBotMove,
  getTicTacToeWinningCells,
  TicTacToePlayer,
  TicTacToeRoom,
} from '@/types/ticTacToe';
import { AVATAR_OPTIONS } from '@/types/bingo';
import { GameError, getRoom, insertRoom, mutateRoom, normalizeCode, RoomRecord } from '../store';
import { json, randomId } from '../http';

const GAME = 'tictactoe' as const;
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TICTACTOE_BOT_NAMES = ['Pixel Pete', 'Grid Bot', 'Retro Rex', 'Robo O', 'Neon Nova'];
const TICTACTOE_BOT_AVATARS = ['alien', 'owl', 'dragon', 'panda', 'tiger'];

function generateTicTacToeCode(): string {
  return Array.from({ length: 6 }, () =>
    ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
  ).join('');
}

function sanitizeName(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string') return fallback;
  return raw.replace(/[<>]/g, '').trim().slice(0, 16) || fallback;
}

function sanitizeAvatar(raw: unknown): string {
  return typeof raw === 'string' && AVATAR_OPTIONS.some((avatar) => avatar.id === raw)
    ? raw
    : 'fox';
}

function roomView(record: RoomRecord<TicTacToeRoom>, playerId?: string) {
  return {
    success: true,
    room: record.state,
    version: record.version,
    player: record.state.players.find((player) => player.id === playerId) ?? null,
  };
}

function startRound(room: TicTacToeRoom) {
  if (room.players.length !== 2) throw new GameError(400, 'Two players are required to start.');
  if (!room.players.every((player) => player.isReady)) {
    throw new GameError(400, 'Both players must be ready to start.');
  }

  const xPlayerIndex = Math.floor(Math.random() * 2);
  room.players.forEach((player, index) => {
    player.symbol = index === xPlayerIndex ? 'X' : 'O';
  });
  room.board = Array(9).fill(null);
  room.winnerId = null;
  room.winningCells = [];
  room.currentTurnPlayerId = room.players[xPlayerIndex].id;
  room.status = 'PLAYING';
}

export async function createTicTacToeRoom(body: Record<string, any>) {
  const host: TicTacToePlayer = {
    id: randomId('p_'),
    name: sanitizeName(body.playerName, 'Player 1'),
    avatar: sanitizeAvatar(body.avatar),
    symbol: null,
    wins: 0,
    draws: 0,
    isHost: true,
    isReady: true,
    isBot: false,
  };

  const record = await insertRoom<TicTacToeRoom>(GAME, generateTicTacToeCode, (code) => ({
    code,
    status: 'WAITING',
    players: [host],
    board: Array(9).fill(null),
    currentTurnPlayerId: null,
    winnerId: null,
    winningCells: [],
    createdAt: Date.now(),
  }));
  return json(roomView(record, host.id));
}

export async function quickplayTicTacToeRoom(body: Record<string, any>) {
  const hostName = sanitizeName(body.playerName, 'Player 1');
  const hostAvatar = sanitizeAvatar(body.avatar);
  const host: TicTacToePlayer = {
    id: randomId('p_'),
    name: hostName,
    avatar: hostAvatar,
    symbol: null,
    wins: 0,
    draws: 0,
    isHost: true,
    isReady: true,
    isBot: false,
  };

  const botName = TICTACTOE_BOT_NAMES[Math.floor(Math.random() * TICTACTOE_BOT_NAMES.length)];
  const botAvatar = TICTACTOE_BOT_AVATARS[Math.floor(Math.random() * TICTACTOE_BOT_AVATARS.length)];
  const bot: TicTacToePlayer = {
    id: randomId('bot_'),
    name: botName,
    avatar: botAvatar,
    symbol: null,
    wins: 0,
    draws: 0,
    isHost: false,
    isReady: true,
    isBot: true,
  };

  const xPlayerIndex = Math.floor(Math.random() * 2);
  const players = [host, bot];
  players.forEach((player, index) => {
    player.symbol = index === xPlayerIndex ? 'X' : 'O';
  });

  const record = await insertRoom<TicTacToeRoom>(GAME, generateTicTacToeCode, (code) => ({
    code,
    status: 'PLAYING',
    players,
    board: Array(9).fill(null),
    currentTurnPlayerId: players[xPlayerIndex].id,
    winnerId: null,
    winningCells: [],
    createdAt: Date.now(),
  }));

  return json(roomView(record, host.id));
}

export async function joinTicTacToeRoom(body: Record<string, any>) {
  const code = normalizeCode(body.code);
  const name = sanitizeName(body.playerName, 'Player 2');
  const avatar = sanitizeAvatar(body.avatar);
  let joinedPlayer: TicTacToePlayer | null = null;

  const { record } = await mutateRoom<TicTacToeRoom>(
    code,
    GAME,
    (room) => {
      if (room.status !== 'WAITING') throw new GameError(400, 'This game is already in progress.');
      if (room.players.length >= 2) throw new GameError(400, 'Room is full.');
      joinedPlayer = {
        id: randomId('p_'),
        name,
        avatar,
        symbol: null,
        wins: 0,
        draws: 0,
        isHost: false,
        isReady: false,
        isBot: false,
      };
      room.players.push(joinedPlayer);
    },
    { notFoundMessage: 'Room not found. Please check the room code.' }
  );
  return json(roomView(record!, joinedPlayer!.id));
}

export async function getTicTacToeRoom(rawCode: string, playerId?: string) {
  const record = await getRoom<TicTacToeRoom>(normalizeCode(rawCode), GAME);
  if (!record) throw new GameError(404, 'Tic-Tac-Toe room not found.');
  return json(roomView(record, playerId));
}

export async function ticTacToeAction(
  rawCode: string,
  action: string,
  body: Record<string, any>
) {
  const code = normalizeCode(rawCode);
  const playerId = typeof body.playerId === 'string' ? body.playerId : '';

  switch (action) {
    case 'ready': {
      const { record } = await mutateRoom<TicTacToeRoom>(code, GAME, (room) => {
        if (room.status !== 'WAITING') throw new GameError(400, 'The lobby is no longer open.');
        const player = room.players.find((entry) => entry.id === playerId);
        if (!player) throw new GameError(404, 'Player not found in room.');
        player.isReady = !player.isReady;
      });
      return json(roomView(record!, playerId));
    }

    case 'add-bot': {
      const { record } = await mutateRoom<TicTacToeRoom>(code, GAME, (room) => {
        if (room.status !== 'WAITING') throw new GameError(400, 'The lobby is no longer open.');
        if (room.players.length >= 2) throw new GameError(400, 'Room is already full.');
        const host = room.players.find((entry) => entry.id === playerId);
        if (!host?.isHost) throw new GameError(403, 'Only the room host can add a bot.');

        const botName = TICTACTOE_BOT_NAMES[Math.floor(Math.random() * TICTACTOE_BOT_NAMES.length)];
        const botAvatar = TICTACTOE_BOT_AVATARS[Math.floor(Math.random() * TICTACTOE_BOT_AVATARS.length)];
        room.players.push({
          id: randomId('bot_'),
          name: botName,
          avatar: botAvatar,
          symbol: null,
          wins: 0,
          draws: 0,
          isHost: false,
          isReady: true,
          isBot: true,
        });
      });
      return json(roomView(record!, playerId));
    }

    case 'start': {
      const { record } = await mutateRoom<TicTacToeRoom>(code, GAME, (room) => {
        const host = room.players.find((entry) => entry.id === playerId);
        if (!host?.isHost) throw new GameError(403, 'Only the room host can start the game.');
        if (room.status !== 'WAITING') throw new GameError(400, 'The game is not waiting to start.');
        startRound(room);
      });
      return json(roomView(record!, playerId));
    }

    case 'move': {
      const { record } = await mutateRoom<TicTacToeRoom>(code, GAME, (room) => {
        if (room.status !== 'PLAYING') throw new GameError(400, 'The game is not active.');
        if (room.currentTurnPlayerId !== playerId) throw new GameError(400, 'It is not your turn.');
        const index = body.index;
        if (!Number.isInteger(index) || index < 0 || index > 8) {
          throw new GameError(400, 'Choose a valid board cell.');
        }
        if (room.board[index] !== null) throw new GameError(400, 'That cell is already occupied.');
        const player = room.players.find((entry) => entry.id === playerId);
        if (!player?.symbol) throw new GameError(400, 'Your symbol has not been assigned.');
        room.board[index] = player.symbol;

        const winningCells = getTicTacToeWinningCells(room.board);
        if (winningCells.length) {
          room.winningCells = winningCells;
          room.winnerId = player.id;
          player.wins += 1;
          room.status = 'COMPLETED';
          room.currentTurnPlayerId = null;
        } else if (room.board.every((cell) => cell !== null)) {
          room.players.forEach((entry) => {
            entry.draws += 1;
          });
          room.status = 'COMPLETED';
          room.currentTurnPlayerId = null;
        } else {
          room.currentTurnPlayerId =
            room.players.find((entry) => entry.id !== playerId)?.id ?? null;
        }
      });
      return json(roomView(record!, playerId));
    }

    case 'tick': {
      const { record } = await mutateRoom<TicTacToeRoom>(code, GAME, (room) => {
        if (room.status !== 'PLAYING') return 'noop';
        const curPlayer = room.players.find((entry) => entry.id === room.currentTurnPlayerId);
        if (!curPlayer || !curPlayer.isBot || !curPlayer.symbol) return 'noop';

        const index = calculateTicTacToeBotMove(room.board, curPlayer.symbol);
        if (index < 0 || index > 8 || room.board[index] !== null) return 'noop';

        room.board[index] = curPlayer.symbol;

        const winningCells = getTicTacToeWinningCells(room.board);
        if (winningCells.length) {
          room.winningCells = winningCells;
          room.winnerId = curPlayer.id;
          curPlayer.wins += 1;
          room.status = 'COMPLETED';
          room.currentTurnPlayerId = null;
        } else if (room.board.every((cell) => cell !== null)) {
          room.players.forEach((entry) => {
            entry.draws += 1;
          });
          room.status = 'COMPLETED';
          room.currentTurnPlayerId = null;
        } else {
          room.currentTurnPlayerId =
            room.players.find((entry) => entry.id !== curPlayer.id)?.id ?? null;
        }
      });
      return json(roomView(record!, playerId));
    }

    case 'rematch': {
      const { record } = await mutateRoom<TicTacToeRoom>(code, GAME, (room) => {
        const player = room.players.find((entry) => entry.id === playerId);
        if (!player) throw new GameError(404, 'Player not found in room.');
        if (room.status !== 'COMPLETED') throw new GameError(400, 'The current game is not finished.');
        if (room.players.length !== 2) throw new GameError(400, 'Two players are required for a rematch.');
        room.players.forEach((entry) => {
          entry.isReady = true;
        });
        startRound(room);
      });
      return json(roomView(record!, playerId));
    }

    case 'leave': {
      await mutateRoom<TicTacToeRoom>(
        code,
        GAME,
        (room) => {
          const index = room.players.findIndex((entry) => entry.id === playerId);
          if (index === -1) return 'noop';
          room.players.splice(index, 1);
          if (room.players.length === 0 || room.players.every((p) => p.isBot)) return 'delete';

          room.players[0].isHost = true;
          room.players[0].isReady = true;
          room.players[0].symbol = null;
          room.status = 'WAITING';
          room.board = Array(9).fill(null);
          room.currentTurnPlayerId = null;
          room.winnerId = null;
          room.winningCells = [];
        },
        { allowMissing: true }
      );
      return json({ success: true });
    }

    default:
      throw new GameError(404, `Unknown action "${action}".`);
  }
}
