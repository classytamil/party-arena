/**
 * Paper Gun Battle game service (server-side, authoritative).
 * Ported 1:1 from the original Express server; in-memory Maps/SSE/setTimeout were
 * replaced by Supabase persistence (store.ts) and a client-driven `tick` action for bots.
 */

import {
  PaperGunRoom,
  PaperGunPlayer,
  PaperGunNumber,
  ActionChoice,
  RollOutcome,
} from '@/types/paperGun';
import {
  createInitialCharacters,
  createInitialWeapon,
  processTurnAction,
  advanceToNextPlayer,
  canPlayerShoot,
} from '@/utils/paperGunLogic';
import { GameError, getRoom, insertRoom, mutateRoom, normalizeCode, RoomRecord } from '../store';
import { json, randomId } from '../http';

const GAME = 'papergun' as const;

export const PAPERGUN_BOT_DELAY_MS = 850;
const BOT_DELAY_TOLERANCE_MS = 250;

const PAPERGUN_BOT_NAMES = ['Doodle Dan', 'Sketcher Sam', 'Paper Pete', 'Ink Ivy', 'Pencil Paul'];
const PAPERGUN_BOT_AVATARS = ['robot', 'ninja', 'cowboy', 'fox', 'alien'];

function generatePaperGunCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function sanitizePaperGunRoomForViewer(room: PaperGunRoom, viewerId?: string): PaperGunRoom {
  return {
    ...room,
    players: room.players.map((p) => ({
      ...p,
      // Mask opponent's secret shield unless match is completed
      shieldedCharacter:
        room.status === 'COMPLETED' || p.id === viewerId ? p.shieldedCharacter ?? null : null,
    })),
  };
}

function view(rec: RoomRecord<PaperGunRoom>, viewerId?: string, extra: Record<string, unknown> = {}) {
  return {
    success: true,
    room: sanitizePaperGunRoomForViewer(rec.state, viewerId),
    version: rec.version,
    ...extra,
  };
}

function executeBotStep(curRoom: PaperGunRoom): boolean {
  if (curRoom.status !== 'PLAYING') return false;
  const curPlayer = curRoom.players.find((p) => p.id === curRoom.currentTurnPlayerId);
  const opponent = curRoom.players.find((p) => p.id !== curRoom.currentTurnPlayerId);
  if (!curPlayer || !curPlayer.isBot || !opponent) return false;

  // 0. Bot places or bluffs its Hidden Shield on one of its top alive characters
  const botAliveNumbers = ([1, 3, 5, 7, 9] as PaperGunNumber[]).filter(
    (num) => !curPlayer.characters[num].isEliminated
  );
  if (botAliveNumbers.length > 0) {
    const currentShieldInvalid =
      !curPlayer.shieldedCharacter ||
      curPlayer.characters[curPlayer.shieldedCharacter]?.isEliminated;
    if (currentShieldInvalid || Math.random() < 0.35) {
      botAliveNumbers.sort(
        (a, b) => curPlayer.characters[b].stage - curPlayer.characters[a].stage
      );
      // 65% shield highest-stage character, 35% bluff on 2nd-highest character
      const pickIdx = botAliveNumbers.length > 1 && Math.random() < 0.35 ? 1 : 0;
      curPlayer.shieldedCharacter = botAliveNumbers[pickIdx];
    }
  }

  let action: ActionChoice = 'character';
  let targetCharacterNumber: PaperGunNumber | undefined;

  // 1. If a character just drew its Trigger (Stage 9), SHOOT an alive opponent character!
  if (canPlayerShoot(curPlayer, curRoom)) {
    const aliveOpponentNumbers = ([1, 3, 5, 7, 9] as PaperGunNumber[]).filter(
      (num) => !opponent.characters[num].isEliminated
    );
    if (aliveOpponentNumbers.length > 0) {
      aliveOpponentNumbers.sort(
        (a, b) => opponent.characters[b].stage - opponent.characters[a].stage
      );
      action = 'shoot';
      // Mind-game targeting: 70% shoot highest, 30% shoot 2nd highest to beat an obvious shield!
      const targetIdx = aliveOpponentNumbers.length > 1 && Math.random() < 0.3 ? 1 : 0;
      targetCharacterNumber = aliveOpponentNumbers[targetIdx];
    }
  }
  // 2. If 2 numbers were drawn, pick the better alive character!
  else if (curRoom.drawnChoices && curRoom.drawnChoices.length > 0) {
    const validChoices = curRoom.drawnChoices.filter(
      (n) => !curPlayer.characters[n].isEliminated
    );
    if (validChoices.length > 0) {
      validChoices.sort(
        (a, b) => curPlayer.characters[b].stage - curPlayer.characters[a].stage
      );
      action = 'pick_number';
      targetCharacterNumber = validChoices[0];
    }
  } else {
    // 3. Otherwise, roll the Number Dice (draws 2 numbers)!
    action = 'character';
  }

  processTurnAction(curRoom, curPlayer.id, action, targetCharacterNumber);
  return true;
}

// ---------------------- HANDLERS ----------------------

export async function createPaperGunRoom(body: Record<string, any>) {
  const { playerName, avatar } = body;
  const name = (playerName || 'Player 1').trim().slice(0, 16);

  const hostPlayer: PaperGunPlayer = {
    id: randomId('pg_'),
    name,
    avatar: avatar || 'cowboy',
    isHost: true,
    isReady: true,
    isBot: false,
    connected: true,
    characters: createInitialCharacters(),
    weapon: createInitialWeapon(),
    shotsFired: 0,
    eliminationsCount: 0,
  };

  const rec = await insertRoom<PaperGunRoom>(GAME, generatePaperGunCode, (code) => ({
    code,
    status: 'WAITING',
    players: [hostPlayer],
    currentTurnPlayerId: hostPlayer.id,
    turnIndex: 0,
    turnAttempt: 1,
    currentRoll: null,
    lastOutcome: null,
    reloadMatches: [],
    winnerId: null,
    logs: [`Room ${code} created. Waiting for opponent...`],
    createdAt: Date.now(),
  }));

  return json(view(rec, hostPlayer.id, { player: hostPlayer }));
}

export async function quickplayPaperGunRoom(body: Record<string, any>) {
  const { playerName, avatar } = body;
  const name = (playerName || 'Player 1').trim().slice(0, 16);

  const humanPlayer: PaperGunPlayer = {
    id: randomId('pg_'),
    name,
    avatar: avatar || 'cowboy',
    isHost: true,
    isReady: true,
    isBot: false,
    connected: true,
    characters: createInitialCharacters(),
    weapon: createInitialWeapon(),
    shotsFired: 0,
    eliminationsCount: 0,
  };

  const botName = PAPERGUN_BOT_NAMES[Math.floor(Math.random() * PAPERGUN_BOT_NAMES.length)];
  const botAvatar = PAPERGUN_BOT_AVATARS[Math.floor(Math.random() * PAPERGUN_BOT_AVATARS.length)];

  const botPlayer: PaperGunPlayer = {
    id: randomId('bot_'),
    name: botName,
    avatar: botAvatar,
    isHost: false,
    isReady: true,
    isBot: true,
    connected: true,
    characters: createInitialCharacters(),
    weapon: createInitialWeapon(),
    shotsFired: 0,
    eliminationsCount: 0,
  };

  const firstTurnIdx = Math.random() < 0.5 ? 0 : 1;
  const players = [humanPlayer, botPlayer];

  const rec = await insertRoom<PaperGunRoom>(GAME, generatePaperGunCode, (code) => ({
    code,
    status: 'PLAYING',
    players,
    currentTurnPlayerId: players[firstTurnIdx].id,
    turnIndex: 0,
    turnAttempt: 1,
    currentRoll: null,
    lastOutcome: null,
    reloadMatches: [],
    winnerId: null,
    logs: [
      `Quick Duel started between ${humanPlayer.name} and ${botPlayer.name}!`,
      `${players[firstTurnIdx].name} takes the first turn.`,
    ],
    createdAt: Date.now(),
  }));

  return json(view(rec, humanPlayer.id, { player: humanPlayer }));
}

export async function joinPaperGunRoom(body: Record<string, any>) {
  const cleanCode = normalizeCode(body.code);
  let newPlayer: PaperGunPlayer | null = null;

  const { record } = await mutateRoom<PaperGunRoom>(
    cleanCode,
    GAME,
    (room) => {
      if (room.status !== 'WAITING') {
        throw new GameError(400, 'This match is already in progress or completed.');
      }
      if (room.players.length >= 2) {
        throw new GameError(400, 'This duel room is already full (maximum 2 players).');
      }

      const name = (body.playerName || 'Player 2').trim().slice(0, 16);
      newPlayer = {
        id: randomId('pg_'),
        name,
        avatar: body.avatar || 'ninja',
        isHost: false,
        isReady: false,
        isBot: false,
        connected: true,
        characters: createInitialCharacters(),
        weapon: createInitialWeapon(),
        shotsFired: 0,
        eliminationsCount: 0,
      };

      room.players.push(newPlayer);
      room.logs.unshift(`${newPlayer.name} entered the duel room!`);
    },
    { notFoundMessage: `Room "${cleanCode}" not found.` }
  );

  return json(view(record!, newPlayer!.id, { player: newPlayer }));
}

export async function getPaperGunRoom(rawCode: string, playerId?: string) {
  const rec = await getRoom<PaperGunRoom>(normalizeCode(rawCode), GAME);
  if (!rec) throw new GameError(404, 'Room not found');
  const player = playerId ? rec.state.players.find((p) => p.id === playerId) || null : null;
  return json(view(rec, playerId, { player }));
}

export async function paperGunAction(rawCode: string, action: string, body: Record<string, any>) {
  const code = normalizeCode(rawCode);
  const playerId: string | undefined = typeof body.playerId === 'string' ? body.playerId : undefined;

  switch (action) {
    case 'ready': {
      const { record } = await mutateRoom<PaperGunRoom>(code, GAME, (room) => {
        const p = room.players.find((pl) => pl.id === playerId);
        if (!p) throw new GameError(404, 'Player not found');
        p.isReady = !p.isReady;
      });
      return json(view(record!, playerId));
    }

    case 'add-bot': {
      const { record } = await mutateRoom<PaperGunRoom>(code, GAME, (room) => {
        if (room.players.length >= 2) throw new GameError(400, 'Room already full');

        const botName = PAPERGUN_BOT_NAMES[Math.floor(Math.random() * PAPERGUN_BOT_NAMES.length)];
        const botAvatar = PAPERGUN_BOT_AVATARS[Math.floor(Math.random() * PAPERGUN_BOT_AVATARS.length)];

        const botPlayer: PaperGunPlayer = {
          id: randomId('bot_'),
          name: botName,
          avatar: botAvatar,
          isHost: false,
          isReady: true,
          isBot: true,
          connected: true,
          characters: createInitialCharacters(),
          weapon: createInitialWeapon(),
          shotsFired: 0,
          eliminationsCount: 0,
        };

        room.players.push(botPlayer);
        room.logs.unshift(`${botName} (Bot) joined the duel.`);
      });
      return json(view(record!, playerId));
    }

    case 'start': {
      const { record } = await mutateRoom<PaperGunRoom>(code, GAME, (room) => {
        const host = room.players.find((p) => p.id === playerId);
        if (!host || !host.isHost) throw new GameError(403, 'Only the room host can start the duel.');
        if (room.players.length !== 2) {
          throw new GameError(400, 'Paper Gun Battle requires exactly 2 players to start.');
        }
        if (!room.players.every((p) => p.isReady)) {
          throw new GameError(400, 'Both players must be ready before starting.');
        }

        const firstTurnIdx = Math.random() < 0.5 ? 0 : 1;
        room.status = 'PLAYING';
        room.currentTurnPlayerId = room.players[firstTurnIdx].id;
        room.turnIndex = 0;
        room.turnAttempt = 1;
        room.currentRoll = null;
        room.drawnChoices = null;
        room.pendingShotFromCharacter = null;
        room.lastOutcome = null;
        room.reloadMatches = [];
        room.winnerId = null;
        room.logs.unshift(
          `Duel started! ${room.players[firstTurnIdx].name} was randomly selected to take the first turn.`
        );
      });
      return json(view(record!, playerId));
    }

    case 'action': {
      const actionChoice = (body.actionChoice || 'character') as ActionChoice;
      const targetCharacterNumber = body.targetCharacterNumber as PaperGunNumber | undefined;
      let outcome: RollOutcome | null = null;
      let turnEnded = false;

      const { record } = await mutateRoom<PaperGunRoom>(code, GAME, (room) => {
        if (room.status !== 'PLAYING') throw new GameError(400, 'Match is not actively playing');
        if (room.currentTurnPlayerId !== playerId) {
          throw new GameError(403, 'It is not your turn to act.');
        }
        try {
          const res = processTurnAction(room, playerId as string, actionChoice, targetCharacterNumber);
          outcome = res.outcome;
          turnEnded = res.turnEnded;
        } catch (err) {
          throw new GameError(400, err instanceof Error ? err.message : 'Action failed');
        }
      });
      return json(view(record!, playerId, { outcome, turnEnded }));
    }

    case 'pass': {
      const { record } = await mutateRoom<PaperGunRoom>(code, GAME, (room) => {
        if (room.status !== 'PLAYING' || room.currentTurnPlayerId !== playerId) {
          throw new GameError(400, 'Cannot pass turn now');
        }
        const p = room.players.find((pl) => pl.id === playerId);
        room.logs.unshift(`${p?.name || 'Player'} passed their turn.`);
        advanceToNextPlayer(room);
      });
      return json(view(record!, playerId));
    }

    case 'rematch': {
      const { record } = await mutateRoom<PaperGunRoom>(code, GAME, (room) => {
        if (room.status !== 'COMPLETED') throw new GameError(400, 'Match is not completed');

        const firstTurnIdx = Math.random() < 0.5 ? 0 : 1;
        room.status = 'PLAYING';
        room.currentTurnPlayerId = room.players[firstTurnIdx].id;
        room.turnIndex = 0;
        room.turnAttempt = 1;
        room.currentRoll = null;
        room.drawnChoices = null;
        room.pendingShotFromCharacter = null;
        room.lastOutcome = null;
        room.reloadMatches = [];
        room.winnerId = null;
        room.lastShot = null;

        room.players.forEach((p) => {
          p.characters = createInitialCharacters();
          p.weapon = createInitialWeapon();
          p.shieldedCharacter = null;
          p.shotsFired = 0;
          p.eliminationsCount = 0;
          p.isReady = true;
        });

        room.logs = [
          `Rematch started! Fresh 5 characters for each duelist!`,
          `${room.players[firstTurnIdx].name} takes the first turn!`,
        ];
      });
      return json(view(record!, playerId));
    }

    case 'leave': {
      await mutateRoom<PaperGunRoom>(
        code,
        GAME,
        (room) => {
          const pIndex = room.players.findIndex((p) => p.id === playerId);
          if (pIndex === -1) return 'noop';

          const wasHost = room.players[pIndex].isHost;
          room.players.splice(pIndex, 1);

          const remainingHumans = room.players.filter((p) => !p.isBot);
          if (remainingHumans.length === 0) return 'delete';

          if (wasHost && remainingHumans.length > 0) {
            remainingHumans[0].isHost = true;
            remainingHumans[0].isReady = true;
          }

          if (room.status === 'PLAYING' && room.players.length > 0) {
            room.winnerId = room.players[0].id;
            room.status = 'COMPLETED';
            room.logs.unshift(`${room.players[0].name} wins by default! Opponent left the duel.`);
          }
        },
        { allowMissing: true }
      );
      return json({ success: true });
    }

    case 'tick': {
      let acted = false;
      const { record } = await mutateRoom<PaperGunRoom>(code, GAME, (room, rec) => {
        acted = false;
        if (room.status !== 'PLAYING') return 'noop';
        const curPlayer = room.players.find((p) => p.id === room.currentTurnPlayerId);
        if (!curPlayer || !curPlayer.isBot) return 'noop';
        if (Date.now() - rec.updatedAt < PAPERGUN_BOT_DELAY_MS - BOT_DELAY_TOLERANCE_MS) return 'noop';

        try {
          if (!executeBotStep(room)) return 'noop';
          acted = true;
        } catch (err) {
          console.error('Error executing Paper Gun bot turn:', err);
          return 'noop';
        }
      });
      return json(view(record!, playerId, { acted }));
    }

    default:
      throw new GameError(404, `Unknown action "${action}"`);
  }
}
