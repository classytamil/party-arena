/**
 * Core game engine & state transitions for Paper Gun Battle.
 * Features:
 * 1. 9-step per-character progression (1:Body, 2:Ears, 3:Hands, 4:Legs, 5:Empty Gun, 6-8: 3 Bullets, 9:Trigger & Shoot)
 * 2. "Pick 1 of 2 Numbers" Tactical Choice: Number Dice rolls 2 distinct numbers; player chooses which one to build!
 * 3. "Hidden Shield / Duck" Bluff: Each player can secretly shield 1 of their 5 characters. If the opponent shoots
 *    the shielded character, the shot is BLOCKED and the bullet is wasted!
 */

import {
  PaperGunNumber,
  PAPER_GUN_NUMBERS,
  IndividualCharacter,
  WeaponInventory,
  PaperGunPlayer,
  PaperGunRoom,
  ActionChoice,
  RollOutcome,
  STAGE_NAMES,
  DevelopmentStage,
} from '../types/paperGun';

export function createInitialCharacters(): Record<PaperGunNumber, IndividualCharacter> {
  const result = {} as Record<PaperGunNumber, IndividualCharacter>;
  for (const num of PAPER_GUN_NUMBERS) {
    result[num] = {
      number: num,
      stage: 0,
      isEliminated: false,
      parts: {
        body: false,
        ears: false,
        hands: false,
        legs: false,
        hasGun: false,
        bullets: 0,
        hasTrigger: false,
      },
    };
  }
  return result;
}

export function createInitialWeapon(): WeaponInventory {
  return {
    hasGun: false,
    hasTrigger: false,
    bullets: 0,
  };
}

export function syncCharacterPartsFromStage(char: IndividualCharacter) {
  const s = char.stage;
  char.parts.body = s >= 1;
  char.parts.ears = s >= 2;
  char.parts.hands = s >= 3;
  char.parts.legs = s >= 4;
  char.parts.hasGun = s >= 5;
  char.parts.bullets = s <= 5 ? 0 : s === 6 ? 1 : s === 7 ? 2 : 3;
  char.parts.hasTrigger = s >= 9;
}

export function syncPlayerWeaponSummary(player: PaperGunPlayer) {
  const aliveChars = PAPER_GUN_NUMBERS.map((n) => player.characters[n]).filter(
    (c) => c && !c.isEliminated
  );
  player.weapon.hasGun = aliveChars.some((c) => c.parts.hasGun);
  player.weapon.hasTrigger = aliveChars.some((c) => c.parts.hasTrigger);
  player.weapon.bullets = aliveChars.reduce((max, c) => Math.max(max, c.parts.bullets), 0);
}

export function areAllCharactersEliminated(player: PaperGunPlayer): boolean {
  return PAPER_GUN_NUMBERS.every((num) => player.characters[num].isEliminated);
}

export function canPlayerShoot(player: PaperGunPlayer, room?: PaperGunRoom): boolean {
  if (room?.pendingShotFromCharacter && room.currentTurnPlayerId === player.id) {
    return true;
  }
  return PAPER_GUN_NUMBERS.some(
    (n) => !player.characters[n].isEliminated && player.characters[n].stage >= 9
  );
}

export function getRandomPaperGunNumber(): PaperGunNumber {
  const idx = Math.floor(Math.random() * PAPER_GUN_NUMBERS.length);
  return PAPER_GUN_NUMBERS[idx];
}

/**
 * Generates 2 distinct random numbers from [1, 3, 5, 7, 9] for the "Pick 1 of 2" tactical mechanic
 */
export function getTwoRandomPaperGunNumbers(): [PaperGunNumber, PaperGunNumber] {
  const pool = [...PAPER_GUN_NUMBERS];
  const firstIdx = Math.floor(Math.random() * pool.length);
  const first = pool.splice(firstIdx, 1)[0];
  const secondIdx = Math.floor(Math.random() * pool.length);
  const second = pool[secondIdx];
  return [first, second];
}

/**
 * Applies a chosen number to advance that character by 1 stage
 */
function applyCharacterAdvance(
  room: PaperGunRoom,
  player: PaperGunPlayer,
  chosenNumber: PaperGunNumber,
  attempt: number
): { outcome: RollOutcome; turnEnded: boolean } {
  const targetChar = player.characters[chosenNumber];
  const prevStage = targetChar.stage;
  const nextStage = Math.min(9, prevStage + 1) as DevelopmentStage;
  targetChar.stage = nextStage;
  syncCharacterPartsFromStage(targetChar);
  syncPlayerWeaponSummary(player);

  room.currentRoll = chosenNumber;
  room.drawnChoices = null;

  const stageLabel = STAGE_NAMES[nextStage];

  if (nextStage === 9) {
    // Reached Stage 9: TRIGGER! Player immediately gets to shoot an opponent character!
    room.pendingShotFromCharacter = chosenNumber;
    const outcome: RollOutcome = {
      number: chosenNumber,
      attempt,
      valid: true,
      actionType: 'craft_trigger',
      targetCharacterNumber: chosenNumber,
      stageAdded: stageLabel,
      description: `🎯 ${player.name} picked #${chosenNumber}: Added TRIGGER to Character #${chosenNumber}! Tap an opponent character to SHOOT!`,
    };
    room.logs.unshift(outcome.description);
    return { outcome, turnEnded: false };
  }

  const actionType =
    nextStage === 5
      ? 'craft_gun'
      : nextStage >= 6 && nextStage <= 8
      ? 'add_bullet'
      : 'character_stage';

  const extraNote =
    nextStage === 5
      ? '🔫 Drew Empty Gun!'
      : nextStage === 6
      ? '🟡 Loaded Bullet 1/3!'
      : nextStage === 7
      ? '🟡 Loaded Bullet 2/3!'
      : nextStage === 8
      ? `🟡 Loaded Bullet 3/3 (Next #${chosenNumber} adds Trigger & Shoots!)`
      : `✏️ Added ${stageLabel}!`;

  const outcome: RollOutcome = {
    number: chosenNumber,
    attempt,
    valid: true,
    actionType,
    targetCharacterNumber: chosenNumber,
    stageAdded: stageLabel,
    description: `✏️ ${player.name} picked #${chosenNumber} → Character #${chosenNumber}: ${extraNote}`,
  };
  room.logs.unshift(outcome.description);
  return { outcome, turnEnded: true };
}

/**
 * Executes a player's turn action:
 * - 'set_shield': Places the player's secret Hidden Shield on one of their alive characters
 * - 'character': Rolls 2 distinct numbers (Pick 1 of 2). If both are eliminated, consumes an attempt.
 * - 'pick_number': Selects 1 of the 2 drawn numbers to advance that character.
 * - 'shoot': Fires at an opponent character. If the target has the opponent's Hidden Shield, the shot is BLOCKED!
 */
export function processTurnAction(
  room: PaperGunRoom,
  playerId: string,
  actionChoice: ActionChoice = 'character',
  targetCharacterNumber?: PaperGunNumber
): { updatedRoom: PaperGunRoom; outcome: RollOutcome; turnEnded: boolean } {
  const player = room.players.find((p) => p.id === playerId);
  const opponent = room.players.find((p) => p.id !== playerId);

  if (!player || !opponent || room.status !== 'PLAYING') {
    throw new Error('Invalid game state for action');
  }

  const attempt = room.turnAttempt;
  let valid = false;
  let turnEnded = false;
  let outcome: RollOutcome;

  // 0. SET HIDDEN SHIELD ACTION (Can be done on your turn without ending your turn)
  if (actionChoice === 'set_shield') {
    if (!targetCharacterNumber || !PAPER_GUN_NUMBERS.includes(targetCharacterNumber)) {
      throw new Error('Choose a valid character (9, 7, 5, 3, 1) to shield');
    }
    const myChar = player.characters[targetCharacterNumber];
    if (myChar.isEliminated) {
      throw new Error(`Cannot shield Character #${targetCharacterNumber} because it is eliminated`);
    }

    // Toggle or move shield
    player.shieldedCharacter =
      player.shieldedCharacter === targetCharacterNumber ? null : targetCharacterNumber;

    outcome = room.lastOutcome || {
      number: targetCharacterNumber,
      attempt,
      valid: true,
      actionType: 'shield_placed',
      targetCharacterNumber,
      description: `🛡️ Secret Shield updated.`,
    };

    return { updatedRoom: room, outcome, turnEnded: false };
  }

  // 1. SHOOT ACTION (Triggered when a character reaches Stage 9: Trigger)
  if (actionChoice === 'shoot') {
    const shooterCharNum =
      room.pendingShotFromCharacter ||
      PAPER_GUN_NUMBERS.find(
        (n) => !player.characters[n].isEliminated && player.characters[n].stage >= 9
      );

    if (!shooterCharNum) {
      throw new Error('Need a character with Gun, 3 Bullets, and Trigger to shoot!');
    }

    if (!targetCharacterNumber || !PAPER_GUN_NUMBERS.includes(targetCharacterNumber)) {
      throw new Error('Select a valid opponent character (9, 7, 5, 3, 1) to shoot');
    }

    const targetChar = opponent.characters[targetCharacterNumber];
    if (targetChar.isEliminated) {
      throw new Error(`Opponent's Character ${targetCharacterNumber} is already eliminated`);
    }

    const shooterChar = player.characters[shooterCharNum];

    // Consume 1 bullet and trigger: reset shooter character from Stage 9 back to Stage 7 (2 bullets, no trigger)
    shooterChar.stage = 7;
    syncCharacterPartsFromStage(shooterChar);
    syncPlayerWeaponSummary(player);

    player.shotsFired += 1;
    room.pendingShotFromCharacter = null;
    room.drawnChoices = null;
    valid = true;
    turnEnded = true;

    // CHECK HIDDEN SHIELD BLUFF!
    if (opponent.shieldedCharacter === targetCharacterNumber) {
      // SHOT BLOCKED BY HIDDEN SHIELD!
      opponent.shieldedCharacter = null; // Shield breaks after blocking the bullet!

      outcome = {
        number: targetCharacterNumber,
        attempt,
        valid: true,
        actionType: 'shot_blocked',
        targetCharacterNumber,
        description: `🛡️ BLOCKED! ${opponent.name} secretly shielded Character #${targetCharacterNumber} and deflected ${player.name}'s bullet!`,
      };

      room.lastShot = {
        shooterId: player.id,
        shooterCharacterNumber: shooterCharNum,
        targetPlayerId: opponent.id,
        targetCharacterNumber,
        blocked: true,
        shooterName: player.name,
        targetName: opponent.name,
      };

      room.logs.unshift(outcome.description);
    } else {
      // DIRECT HIT — ELIMINATE CHARACTER PERMANENTLY!
      targetChar.isEliminated = true;
      if (opponent.shieldedCharacter === targetCharacterNumber) {
        opponent.shieldedCharacter = null;
      }
      syncPlayerWeaponSummary(opponent);
      player.eliminationsCount += 1;

      outcome = {
        number: targetCharacterNumber,
        attempt,
        valid: true,
        actionType: 'character_eliminated',
        targetCharacterNumber,
        description: `💥 ${player.name}'s Character #${shooterCharNum} fired and ELIMINATED ${opponent.name}'s Character #${targetCharacterNumber}!`,
      };

      room.lastShot = {
        shooterId: player.id,
        shooterCharacterNumber: shooterCharNum,
        targetPlayerId: opponent.id,
        targetCharacterNumber,
        blocked: false,
        shooterName: player.name,
        targetName: opponent.name,
      };

      room.logs.unshift(outcome.description);

      // Check winning condition: all 5 opponent characters eliminated
      if (areAllCharactersEliminated(opponent)) {
        room.status = 'COMPLETED';
        room.winnerId = player.id;
        room.logs.unshift(`🏆 ${player.name} eliminated all 5 opponent characters and won the battle!`);
      }
    }
  }
  // 2. PICK 1 OF THE 2 DRAWN NUMBERS
  else if (actionChoice === 'pick_number') {
    if (!room.drawnChoices || room.drawnChoices.length === 0) {
      throw new Error('Draw from the Number Dice first!');
    }
    if (!targetCharacterNumber || !room.drawnChoices.includes(targetCharacterNumber)) {
      throw new Error('Pick one of the drawn numbers!');
    }
    if (player.characters[targetCharacterNumber].isEliminated) {
      throw new Error(`Character #${targetCharacterNumber} is eliminated! Pick the other number.`);
    }

    const res = applyCharacterAdvance(room, player, targetCharacterNumber, attempt);
    outcome = res.outcome;
    valid = true;
    turnEnded = res.turnEnded;
  }
  // 3. NUMBER DICE ROLL (Draws 2 Numbers for "Pick 1 of 2" Tactical Choice!)
  else {
    if (room.pendingShotFromCharacter) {
      throw new Error(
        `Character #${room.pendingShotFromCharacter} has Trigger ready! Select an opponent character to shoot first.`
      );
    }
    if (room.drawnChoices && room.drawnChoices.length > 0) {
      throw new Error(
        `Pick one of your drawn numbers (${room.drawnChoices.join(' or ')}) first!`
      );
    }

    const [n1, n2] = getTwoRandomPaperGunNumbers();
    const aliveChoices = [n1, n2].filter((n) => !player.characters[n].isEliminated);

    room.currentRoll = n1;

    if (aliveChoices.length === 0) {
      // Both drawn numbers are eliminated!
      valid = false;
      room.drawnChoices = null;
      outcome = {
        number: n1,
        secondNumber: n2,
        attempt,
        valid: false,
        actionType: 'unavailable',
        description: `🎲 ${player.name} drew [${n1}] & [${n2}], but both characters are eliminated! (Attempt ${attempt}/3)`,
      };

      if (attempt >= 3) {
        turnEnded = true;
        room.logs.unshift(`${player.name} used all 3 attempts on eliminated numbers. Turn passes.`);
      }
    } else if (aliveChoices.length === 1) {
      // Only 1 of the 2 numbers is alive -> present both but player can pick the alive one, or auto-present choices
      room.drawnChoices = [n1, n2];
      valid = true;
      turnEnded = false;
      outcome = {
        number: n1,
        secondNumber: n2,
        attempt,
        valid: true,
        actionType: 'choices_drawn',
        description: `🎲 ${player.name} drew [${n1}] & [${n2}]! Tap #${aliveChoices[0]} to build it!`,
      };
    } else {
      // Both numbers are alive -> Tactical Choice! Player picks which one to build!
      room.drawnChoices = [n1, n2];
      valid = true;
      turnEnded = false;
      outcome = {
        number: n1,
        secondNumber: n2,
        attempt,
        valid: true,
        actionType: 'choices_drawn',
        description: `🎲 ${player.name} drew [${n1}] or [${n2}] — Pick 1 number to build!`,
      };
    }
  }

  room.lastOutcome = outcome;

  if (turnEnded) {
    advanceToNextPlayer(room);
  } else if (!valid) {
    room.turnAttempt += 1;
  }

  return { updatedRoom: room, outcome, turnEnded };
}

/**
 * Advances the active turn to the opponent, resetting attempts.
 */
export function advanceToNextPlayer(room: PaperGunRoom) {
  if (room.status === 'COMPLETED') return;

  const currentIdx = room.players.findIndex((p) => p.id === room.currentTurnPlayerId);
  const nextIdx = (currentIdx + 1) % room.players.length;
  room.currentTurnPlayerId = room.players[nextIdx].id;
  room.turnIndex += 1;
  room.turnAttempt = 1;
  room.currentRoll = null;
  room.drawnChoices = null;
  room.pendingShotFromCharacter = null;
  room.reloadMatches = [];
}
