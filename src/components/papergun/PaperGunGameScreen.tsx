/**
 * Main Battle Duel Screen for Paper Gun Battle.
 * Includes:
 * 1. Authentic Graph Paper notebook background & hand-drawn sketch styling
 * 2. "Pick 1 of 2 Drawn Numbers" tactical choice buttons at the bottom-center Number Dice box
 * 3. "Hidden Shield / Duck" secret bluff mechanic on any alive character
 */

import React, { useState } from 'react';
import {
  PaperGunRoom,
  PaperGunPlayer,
  ActionChoice,
  PaperGunNumber,
  STAGE_NAMES,
} from '../../types/paperGun';
import { canPlayerShoot } from '../../utils/paperGunLogic';
import { PaperSketchpad } from './PaperSketchpad';
import {
  Volume2,
  VolumeX,
  ArrowLeft,
  Crosshair,
  Dices,
  History,
  ChevronUp,
  ChevronDown,
  Shield,
} from 'lucide-react';
import { getSoundMuted, setSoundMuted, playClickSound } from '../../utils/sound';

interface PaperGunGameScreenProps {
  room: PaperGunRoom;
  player: PaperGunPlayer;
  onPerformAction: (actionChoice: ActionChoice, targetCharacterNumber?: PaperGunNumber) => Promise<void>;
  onPassTurn: () => Promise<void>;
  onLeaveRoom: () => Promise<void>;
}

export const PaperGunGameScreen: React.FC<PaperGunGameScreenProps> = ({
  room,
  player,
  onPerformAction,
  onPassTurn,
  onLeaveRoom,
}) => {
  const [isMuted, setIsMuted] = useState(getSoundMuted());
  const [actionLoading, setActionLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const opponent = room.players.find((p) => p.id !== player.id);
  const isMyTurn = room.currentTurnPlayerId === player.id;
  const readyToShoot = isMyTurn && canPlayerShoot(player, room);
  const drawnChoices = isMyTurn && room.drawnChoices?.length ? room.drawnChoices : null;

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    setSoundMuted(next);
  };

  // 1. Tap Number Dice to draw 2 random numbers
  const handleNumberDiceClick = async () => {
    if (!isMyTurn || actionLoading || readyToShoot || drawnChoices) return;
    playClickSound();
    setActionLoading(true);
    try {
      await onPerformAction('character');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Pick 1 of the 2 drawn numbers
  const handlePickNumber = async (chosenNum: PaperGunNumber) => {
    if (!isMyTurn || actionLoading || !drawnChoices?.includes(chosenNum)) return;
    setActionLoading(true);
    try {
      await onPerformAction('pick_number', chosenNum);
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Place or move Secret Shield (🛡️)
  const handleToggleShield = async (charNum: PaperGunNumber) => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await onPerformAction('set_shield', charNum);
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Shoot an opponent character when Trigger (Stage 9) is unlocked
  const handleShootTarget = async (targetNum: PaperGunNumber) => {
    if (!isMyTurn || actionLoading || !readyToShoot) return;
    setActionLoading(true);
    try {
      await onPerformAction('shoot', targetNum);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div
      className="w-full min-h-screen bg-[#f4f1ea] text-slate-900 flex flex-col items-center justify-between py-2 sm:py-5 px-2 sm:px-4 select-none touch-manipulation"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(59, 130, 246, 0.08) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(59, 130, 246, 0.08) 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px',
      }}
    >
      {/* Top Notebook Controls Bar */}
      <div className="w-full max-w-3xl flex items-center justify-between px-1 mb-2.5">
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onLeaveRoom();
          }}
          className="flex items-center gap-1.5 text-xs font-black text-slate-800 hover:bg-amber-100 bg-white px-3 py-1.5 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a] touch-manipulation active:scale-95 duration-75 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Leave</span>
        </button>

        {/* Turn Status Banner */}
        <div
          className={`px-3.5 py-1 rounded-xl border-2 border-slate-900 text-xs font-black tracking-wide flex items-center gap-1.5 shadow-[2px_2px_0px_#0f172a] ${
            readyToShoot
              ? 'bg-rose-600 text-white animate-pulse'
              : drawnChoices
              ? 'bg-blue-600 text-white'
              : isMyTurn
              ? 'bg-amber-300 text-slate-950'
              : 'bg-white text-slate-700'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              readyToShoot || drawnChoices
                ? 'bg-white'
                : isMyTurn
                ? 'bg-emerald-600 animate-ping'
                : 'bg-slate-400'
            }`}
          />
          <span>
            {readyToShoot
              ? `🎯 Trigger Ready! Tap an Unshielded Opponent Character!`
              : drawnChoices
              ? `🎲 Pick 1 of the 2 Drawn Numbers: [${drawnChoices.join(' or ')}]`
              : isMyTurn
              ? `YOUR TURN (Attempt ${room.turnAttempt}/3)`
              : `${opponent?.name || 'OPPONENT'}'S TURN`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-block font-mono text-xs font-black text-slate-800 bg-white px-2.5 py-1 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_#0f172a]">
            #{room.code}
          </span>
          <button
            type="button"
            onClick={handleToggleMute}
            className="p-1.5 rounded-xl bg-white border-2 border-slate-900 text-slate-800 hover:bg-amber-50 shadow-[2px_2px_0px_#0f172a] touch-manipulation active:scale-95 duration-75 cursor-pointer"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-600" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* GRAPH PAPER NOTEBOOK SHEET */}
      <div
        className="w-full max-w-3xl flex-1 bg-[#fffdf9] rounded-2xl border-2 border-slate-900 shadow-[6px_6px_0px_#0f172a] px-3 sm:px-8 py-4 sm:py-6 flex flex-col justify-between relative overflow-hidden"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(239, 68, 68, 0.28) 2px, transparent 2px),
            linear-gradient(to right, rgba(59, 130, 246, 0.16) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(59, 130, 246, 0.16) 1px, transparent 1px),
            linear-gradient(to right, rgba(59, 130, 246, 0.07) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(59, 130, 246, 0.07) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 100px 100px, 100px 100px, 20px 20px, 20px 20px',
          backgroundPosition: '28px 0, 0 0, 0 0, 0 0, 0 0',
        }}
      >
        {/* Left Notebook Binder Holes Accent */}
        <div className="hidden sm:flex flex-col justify-around absolute left-2 top-8 bottom-8 pointer-events-none">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full bg-[#f4f1ea] border-2 border-slate-400/70 shadow-inner"
            />
          ))}
        </div>

        {/* Stage Progression & Mind-Trick Cheat Strip at Top of Notebook */}
        <div className="mb-3 sm:pl-3 flex flex-wrap items-center justify-center gap-1.5 text-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-white/85 border border-slate-300 text-[10px] font-bold text-slate-600">
            <span>Order:</span>
            <span className="text-slate-900">1.Body</span>→
            <span className="text-slate-900">2.Ears</span>→
            <span className="text-slate-900">3.Hands</span>→
            <span className="text-slate-900">4.Legs</span>→
            <span className="text-slate-900">5.Gun</span>→
            <span className="text-amber-700">6-8.Bullets(×3)</span>→
            <span className="text-rose-700 font-black">9.Trigger(Shoot!)</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-50 border border-sky-300 text-[10px] font-black text-sky-900">
            <Shield className="w-3 h-3 text-sky-600 fill-sky-200" />
            <span>Secret Shield blocks 1 shot!</span>
          </div>
        </div>

        {/* TWO VERTICAL COLUMNS: Player 1 (Left) & Player 2 (Right) */}
        <div className="w-full grid grid-cols-2 gap-2.5 sm:gap-8 z-10 sm:pl-3">
          {/* Left Column: Player 1 (You) */}
          <PaperSketchpad
            player={player}
            side="left"
            isCurrentTurn={room.currentTurnPlayerId === player.id}
            isMe={true}
            pickableChoices={drawnChoices}
            onPickChoice={handlePickNumber}
            onToggleShield={isMyTurn ? handleToggleShield : undefined}
            pendingShooterNumber={
              room.currentTurnPlayerId === player.id
                ? room.pendingShotFromCharacter || null
                : null
            }
            highlightedNumber={
              room.lastOutcome?.valid
                ? room.lastOutcome.targetCharacterNumber || null
                : null
            }
            lastShotTarget={
              room.lastShot?.targetPlayerId === player.id
                ? room.lastShot.targetCharacterNumber
                : null
            }
            lastShotBlocked={
              room.lastShot?.targetPlayerId === player.id
                ? !!room.lastShot.blocked
                : false
            }
          />

          {/* Right Column: Player 2 (Opponent) */}
          {opponent ? (
            <PaperSketchpad
              player={opponent}
              side="right"
              isCurrentTurn={room.currentTurnPlayerId === opponent.id}
              isMe={false}
              targetSelectable={readyToShoot}
              onSelectTarget={(targetNum) => handleShootTarget(targetNum)}
              pendingShooterNumber={
                room.currentTurnPlayerId === opponent.id
                  ? room.pendingShotFromCharacter || null
                  : null
              }
              lastShotTarget={
                room.lastShot?.targetPlayerId === opponent.id
                  ? room.lastShot.targetCharacterNumber
                  : null
              }
              lastShotBlocked={
                room.lastShot?.targetPlayerId === opponent.id
                  ? !!room.lastShot.blocked
                  : false
              }
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full rounded-xl border-2 border-dashed border-slate-400 p-4 text-slate-500 font-bold text-xs text-center">
              Waiting for Player 2...
            </div>
          )}
        </div>

        {/* BOTTOM CENTER: Hand-Drawn "Number Dice" Box & Pick-1-of-2 Selector */}
        <div className="mt-5 pt-3 border-t-2 border-dashed border-slate-300/90 flex flex-col items-center z-10 sm:pl-3">
          {/* Outcome / Roll Feedback Banner */}
          {room.lastOutcome && (
            <div
              className={`mb-3 px-3.5 py-1.5 rounded-xl border-2 border-slate-900 text-xs font-bold text-center shadow-[2px_2px_0px_#0f172a] max-w-lg ${
                room.lastOutcome.actionType === 'shot_blocked'
                  ? 'bg-sky-100 text-sky-950 border-sky-800'
                  : readyToShoot
                  ? 'bg-rose-100 text-rose-950 border-rose-700'
                  : room.lastOutcome.valid
                  ? 'bg-emerald-100 text-slate-900'
                  : 'bg-amber-100 text-slate-900'
              }`}
            >
              {room.lastOutcome.description}
            </div>
          )}

          {/* Pass Turn Button when retrying on eliminated numbers */}
          {isMyTurn && !readyToShoot && !drawnChoices && room.turnAttempt > 1 && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => {
                playClickSound();
                onPassTurn();
              }}
              className="mb-2.5 px-3 py-1 rounded-xl border-2 border-slate-900 bg-white hover:bg-slate-100 text-slate-800 text-xs font-black shadow-[2px_2px_0px_#0f172a] touch-manipulation active:scale-95 duration-75 cursor-pointer"
            >
              Pass Turn
            </button>
          )}

          {/* STATE A: Ready to Shoot -> Prompt to tap an opponent character */}
          {readyToShoot ? (
            <div className="px-5 py-3 rounded-2xl bg-rose-600 text-white border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] flex items-center gap-2 font-black text-xs sm:text-sm animate-bounce">
              <Crosshair className="w-5 h-5" />
              <span>
                Trigger Ready on #{room.pendingShotFromCharacter}! Watch out for their Hidden Shield & Tap an Opponent Character!
              </span>
            </div>
          ) : drawnChoices ? (
            /* STATE B: 2 Numbers Drawn -> "Pick 1 of 2" Tactical Choice Buttons! */
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-black text-blue-900 uppercase tracking-wider">
                🎲 Pick 1 of the 2 Drawn Numbers:
              </span>
              <div className="flex items-center gap-3">
                {drawnChoices.map((num) => {
                  const myChar = player.characters[num];
                  const isDead = myChar?.isEliminated;
                  const nextStageName = isDead
                    ? 'Eliminated'
                    : STAGE_NAMES[Math.min(9, (myChar?.stage || 0) + 1)];

                  return (
                    <button
                      key={num}
                      type="button"
                      disabled={isDead || actionLoading}
                      onClick={() => {
                        playClickSound();
                        handlePickNumber(num);
                      }}
                      className={`px-4 py-2.5 rounded-2xl border-3 border-slate-900 flex items-center gap-2.5 transition-all touch-manipulation duration-75 ${
                        isDead
                          ? 'bg-slate-100 text-slate-400 border-slate-400 opacity-60 cursor-not-allowed'
                          : 'bg-blue-500 hover:bg-blue-400 text-white shadow-[4px_4px_0px_#0f172a] hover:-translate-y-0.5 active:scale-95 active:shadow-[1px_1px_0px_#0f172a] cursor-pointer'
                      }`}
                    >
                      <span className="w-9 h-9 rounded-xl bg-white text-slate-950 border-2 border-slate-900 flex items-center justify-center font-mono font-black text-xl shadow-[1px_1px_0px_#0f172a]">
                        {num}
                      </span>
                      <div className="flex flex-col items-start text-left">
                        <span className="font-black text-xs sm:text-sm leading-tight">
                          Pick #{num}
                        </span>
                        <span className="text-[10px] font-bold opacity-90">
                          {isDead ? '☠️ Dead' : `+ ${nextStageName}`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* STATE C: Roll Number Dice (Draws 2 Numbers) */
            <button
              type="button"
              disabled={!isMyTurn || actionLoading}
              onClick={handleNumberDiceClick}
              className={`group relative w-56 sm:w-64 py-3 px-5 rounded-2xl border-3 border-slate-900 flex flex-col items-center justify-center transition-all touch-manipulation duration-75 ${
                isMyTurn
                  ? 'bg-amber-300 hover:bg-amber-200 shadow-[4px_4px_0px_#0f172a] hover:-translate-y-0.5 active:scale-95 active:shadow-[1px_1px_0px_#0f172a] cursor-pointer'
                  : 'bg-slate-100 text-slate-400 border-slate-400 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white border-2 border-slate-900 flex items-center justify-center font-mono font-black text-2xl text-slate-950 shadow-[2px_2px_0px_#0f172a]">
                  {room.currentRoll ?? room.lastOutcome?.number ?? '?'}
                </div>
                <div className="flex flex-col items-start text-left">
                  <div className="flex items-center gap-1">
                    <Dices className="w-4 h-4 text-slate-900" />
                    <span className="font-black text-sm sm:text-base text-slate-950 tracking-tight">
                      Number Dice (Draw 2)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-700">
                    {isMyTurn
                      ? room.turnAttempt > 1
                        ? `Retry ${room.turnAttempt}/3 · Roll 2 Numbers`
                        : 'Tap to Roll 2 Numbers & Pick 1!'
                      : 'Waiting for opponent...'}
                  </span>
                </div>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Compact Notebook Log Drawer Below Sheet */}
      <div className="w-full max-w-3xl mt-2.5 bg-white rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] overflow-hidden">
        <button
          type="button"
          onClick={() => {
            playClickSound();
            setShowLogs(!showLogs);
          }}
          className="w-full px-3.5 py-2 bg-amber-50/70 hover:bg-amber-100/70 flex items-center justify-between text-xs font-black text-slate-800 cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-slate-900" />
            <span>Battle Log ({room.logs.length})</span>
          </div>
          {showLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showLogs && (
          <div className="p-3 max-h-32 overflow-y-auto space-y-1 text-xs text-slate-700 bg-white border-t-2 border-slate-900 font-mono">
            {room.logs.map((log, idx) => (
              <div key={idx} className="pb-1 border-b border-dashed border-slate-200 last:border-none">
                {log}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
