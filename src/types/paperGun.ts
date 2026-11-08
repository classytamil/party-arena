/**
 * Types & Constants for Paper Gun Battle
 * Includes:
 * 1. 9-Stage Per-Character Progression (Body -> Ears -> Hands -> Legs -> Empty Gun -> 3 Bullets -> Trigger & Shoot)
 * 2. "Pick 1 of 2 Numbers" Tactical Choice on every Number Dice roll
 * 3. "Hidden Shield / Duck" Bluff (1 secret shield per player that blocks an opponent's shot!)
 */

export type PaperGunNumber = 1 | 3 | 5 | 7 | 9;

export const PAPER_GUN_NUMBERS: PaperGunNumber[] = [1, 3, 5, 7, 9];

export type DevelopmentStage = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export const STAGE_NAMES = [
  'Blank',
  'Body',
  'Ears',
  'Hands',
  'Legs',
  'Empty Gun',
  'Bullet 1/3',
  'Bullet 2/3',
  'Bullet 3/3',
  'Trigger (SHOOT!)',
] as const;

export interface CharacterParts {
  body: boolean;       // Stage >= 1 (1st draw)
  ears: boolean;       // Stage >= 2 (2nd draw)
  hands: boolean;      // Stage >= 3 (3rd draw)
  legs: boolean;       // Stage >= 4 (4th draw)
  hasGun: boolean;     // Stage >= 5 (5th draw: Empty Gun)
  bullets: number;     // 0 at Stage 5, 1 at Stage 6, 2 at Stage 7, 3 at Stage 8 & 9
  hasTrigger: boolean; // True at Stage 9 (fires shot, then resets to Stage 7: 2 bullets, no trigger)
}

export interface IndividualCharacter {
  number: PaperGunNumber;
  stage: DevelopmentStage;
  isEliminated: boolean;
  parts: CharacterParts;
}

export interface WeaponInventory {
  hasGun: boolean;
  hasTrigger: boolean;
  bullets: number;
}

export interface PaperGunPlayer {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  isBot: boolean;
  connected: boolean;
  characters: Record<PaperGunNumber, IndividualCharacter>;
  weapon: WeaponInventory;
  shieldedCharacter?: PaperGunNumber | null; // Secret shield (masked from opponent)
  shotsFired: number;
  eliminationsCount: number;
  isIdle?: boolean;
  missedTurns?: number;
}

export type ActionChoice =
  | 'character'
  | 'pick_number'
  | 'set_shield'
  | 'weapon'
  | 'shoot'
  | 'reload';

export interface RollOutcome {
  number: PaperGunNumber;
  secondNumber?: PaperGunNumber;
  attempt: number;
  valid: boolean;
  actionType:
    | 'choices_drawn'
    | 'character_stage'
    | 'craft_gun'
    | 'craft_trigger'
    | 'add_bullet'
    | 'character_eliminated'
    | 'shot_blocked'
    | 'shield_placed'
    | 'reload_success'
    | 'reload_attempt'
    | 'unavailable';
  targetCharacterNumber?: PaperGunNumber;
  stageAdded?: string;
  description: string;
}

export interface PaperGunRoom {
  code: string;
  status: 'WAITING' | 'PLAYING' | 'COMPLETED';
  players: PaperGunPlayer[];
  currentTurnPlayerId: string;
  turnIndex: number;
  startTurnIndex?: number;
  turnDeadline?: number | null;
  turnTimerSeconds?: number;
  turnAttempt: number; // 1, 2, or 3
  currentRoll: PaperGunNumber | null;
  drawnChoices?: PaperGunNumber[] | null; // Two drawn numbers for the player to pick from
  lastOutcome: RollOutcome | null;
  pendingShotFromCharacter?: PaperGunNumber | null; // Set when a character reaches Stage 9 (Trigger)
  reloadMatches: PaperGunNumber[];
  winnerId: string | null;
  lastShot?: {
    shooterId: string;
    shooterCharacterNumber?: PaperGunNumber;
    targetPlayerId: string;
    targetCharacterNumber: PaperGunNumber;
    blocked?: boolean;
    shooterName: string;
    targetName: string;
  } | null;
  logs: string[];
  createdAt: number;
}
