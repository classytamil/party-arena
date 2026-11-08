/**
 * Random Number Draw Widget for Paper Gun Battle.
 * Generates random numbers (1, 3, 5, 7, or 9) with up to 3 attempts per turn.
 * Supports the 4 actions:
 * 1. Develop Character (Draws 1, 3, 5, 7, 9 to advance body components: Body -> Head -> Hands -> Legs -> Ears)
 * 2. Craft Weapon (1 = Gun, 3 = Trigger, 5/7/9 = Bullet)
 * 3. Shoot Opponent (Targets a specific opponent character and eliminates it permanently)
 * 4. Reload Ammo (2 bullets = 2 matches, 1 bullet = 1 match, 0 bullets = 3 matches)
 */

import React, { useState } from 'react';
import {
  PaperGunNumber,
  PaperGunRoom,
  PaperGunPlayer,
  ActionChoice,
} from '../../types/paperGun';
import { canPlayerShoot } from '../../utils/paperGunLogic';
import { Dices, RefreshCw, Crosshair, ArrowRight, Info, Wrench, PenTool } from 'lucide-react';
import { playClickSound } from '../../utils/sound';

interface BookFlipWidgetProps {
  room: PaperGunRoom;
  player: PaperGunPlayer;
  selectedMode: ActionChoice;
  onChangeMode: (mode: ActionChoice) => void;
  selectedTargetNumber: PaperGunNumber | null;
  onPerformAction: (actionChoice: ActionChoice, targetCharacterNumber?: PaperGunNumber) => Promise<void>;
  onPassTurn: () => Promise<void>;
  isLoading: boolean;
}

export const BookFlipWidget: React.FC<BookFlipWidgetProps> = ({
  room,
  player,
  selectedMode,
  onChangeMode,
  selectedTargetNumber,
  onPerformAction,
  onPassTurn,
  isLoading,
}) => {
  const [showLegend, setShowLegend] = useState(false);

  const isMyTurn = room.currentTurnPlayerId === player.id;
  const opponent = room.players.find((p) => p.id !== player.id);
  const turnAttempt = room.turnAttempt;
  const currentRoll = room.currentRoll;
  const lastOutcome = room.lastOutcome;

  const weaponReadyToShoot = canPlayerShoot(player, room);
  const canReload =
    player.weapon.hasGun &&
    player.weapon.hasTrigger &&
    player.weapon.bullets < 3;

  const handleAction = () => {
    if (!isMyTurn || isLoading) return;
    playClickSound();

    if (selectedMode === 'shoot') {
      if (!selectedTargetNumber) return;
      onPerformAction('shoot', selectedTargetNumber);
    } else {
      onPerformAction(selectedMode);
    }
  };

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-md p-4 sm:p-6 flex flex-col items-center">
      {/* Top Banner: Turn Status & Attempt Indicator */}
      <div className="w-full flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Dices className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="font-black text-sm sm:text-base text-slate-900 tracking-tight">
              {isMyTurn ? 'Number Draw · Your Turn' : `${opponent?.name || 'Opponent'}'s Turn`}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              {isMyTurn
                ? selectedMode === 'shoot'
                  ? '🎯 Shoot Mode · Select an opponent character to eliminate'
                  : selectedMode === 'reload'
                  ? `🔄 Reload Mode · Draw matching numbers (${player.weapon.bullets}/3 bullets)`
                  : selectedMode === 'weapon'
                  ? '🔫 Weapon Crafting · 1: Gun, 3: Trigger, 5/7/9: Bullet'
                  : '✏️ Character Development · Generate 1, 3, 5, 7 or 9'
                : 'Waiting for opponent to draw a number...'}
            </p>
          </div>
        </div>

        {/* 3 Attempts Tracker */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-500 mr-1 hidden sm:inline">Attempt:</span>
          {[1, 2, 3].map((att) => {
            const isCurrent = isMyTurn && turnAttempt === att;
            const isPast = isMyTurn && turnAttempt > att;
            return (
              <div
                key={att}
                className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center border transition-all ${
                  isCurrent
                    ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-500/20 scale-105'
                    : isPast
                    ? 'bg-slate-100 text-slate-400 border-slate-200'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {att}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Choice Tabs (Active when it's your turn) */}
      {isMyTurn && (
        <div className="w-full max-w-lg grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-4">
          {/* 1. Develop Character */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onChangeMode('character');
            }}
            className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer touch-manipulation active:scale-95 duration-75 ${
              selectedMode === 'character'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Character</span>
          </button>

          {/* 2. Craft Weapon */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onChangeMode('weapon');
            }}
            className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer touch-manipulation active:scale-95 duration-75 ${
              selectedMode === 'weapon'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Weapons</span>
          </button>

          {/* 3. Shoot Mode */}
          <button
            type="button"
            disabled={!weaponReadyToShoot}
            onClick={() => {
              playClickSound();
              onChangeMode('shoot');
            }}
            className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all touch-manipulation active:scale-95 duration-75 ${
              selectedMode === 'shoot'
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs cursor-pointer'
                : weaponReadyToShoot
                ? 'bg-slate-50 text-rose-700 border-rose-200 hover:bg-rose-50 cursor-pointer'
                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
            }`}
            title={weaponReadyToShoot ? 'Shoot opponent' : 'Requires Gun, Trigger, and Bullets'}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Shoot ({player.weapon.bullets})</span>
          </button>

          {/* 4. Reload Mode */}
          <button
            type="button"
            disabled={!canReload}
            onClick={() => {
              playClickSound();
              onChangeMode('reload');
            }}
            className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all touch-manipulation active:scale-95 duration-75 ${
              selectedMode === 'reload'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs cursor-pointer'
                : canReload
                ? 'bg-slate-50 text-amber-700 border-amber-200 hover:bg-amber-50 cursor-pointer'
                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
            }`}
            title={canReload ? 'Reload ammo' : 'Ammo full or weapons missing'}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload</span>
          </button>
        </div>
      )}

      {/* Main Random Number Draw Display Card */}
      <div className="w-full max-w-md bg-[#fffdfa] rounded-2xl border-2 border-slate-300/80 shadow-inner p-4 sm:p-5 flex flex-col items-center justify-center relative overflow-hidden mb-4">
        {/* Center Display: Generated Random Number */}
        <div className="my-2 flex flex-col items-center">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">
            Number Draw
          </div>
          <div className="w-20 h-24 rounded-2xl bg-white border-2 border-slate-800 shadow-md flex items-center justify-center relative">
            {currentRoll ? (
              <span className="font-black text-5xl text-slate-900 tracking-tighter animate-in zoom-in-75 duration-200 font-mono">
                {currentRoll}
              </span>
            ) : (
              <span className="font-black text-4xl text-slate-300 font-mono select-none">
                ?
              </span>
            )}
          </div>
          <span className="text-[11px] font-semibold text-slate-400 mt-1.5">
            Generate 1, 3, 5, 7 or 9
          </span>
        </div>

        {/* Outcome Description Message */}
        {lastOutcome && (
          <div
            className={`w-full mt-2 p-2.5 rounded-xl border text-xs sm:text-sm font-semibold text-center transition-all animate-in fade-in duration-200 ${
              lastOutcome.valid
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            {lastOutcome.description}
          </div>
        )}

        {/* Reload Target Helper Details */}
        {selectedMode === 'reload' && isMyTurn && (
          <div className="mt-2 text-xs text-amber-800 bg-amber-50/80 border border-amber-200 p-2 rounded-xl text-center w-full">
            <span className="font-bold">
              {player.weapon.bullets === 2
                ? '2 bullets remaining: Generate the same number 2 times'
                : player.weapon.bullets === 1
                ? '1 bullet remaining: Generate 1 number to reload'
                : '0 bullets remaining: Generate the same number 3 times'}
            </span>
            {room.reloadMatches.length > 0 && (
              <div className="mt-1 font-mono font-bold text-slate-700">
                Drawn so far: [{room.reloadMatches.join(', ')}]
              </div>
            )}
          </div>
        )}
      </div>

      {/* Primary Action Buttons */}
      <div className="w-full max-w-md flex flex-col sm:flex-row items-center gap-2">
        {isMyTurn ? (
          <>
            <button
              type="button"
              disabled={isLoading || (selectedMode === 'shoot' && !selectedTargetNumber)}
              onClick={handleAction}
              className={`flex-1 w-full py-3.5 px-6 rounded-2xl font-black text-sm tracking-wide text-white transition-all shadow-md touch-manipulation active:scale-[0.98] duration-75 flex items-center justify-center gap-2 cursor-pointer ${
                selectedMode === 'shoot'
                  ? selectedTargetNumber
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
                    : 'bg-rose-300 cursor-not-allowed'
                  : selectedMode === 'reload'
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                  : selectedMode === 'weapon'
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/25'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25'
              }`}
            >
              {selectedMode === 'shoot' ? (
                <>
                  <Crosshair className="w-4 h-4" />
                  <span>
                    {selectedTargetNumber
                      ? `Shoot Character #${selectedTargetNumber}!`
                      : 'Click an Opponent Character to Target'}
                  </span>
                </>
              ) : selectedMode === 'reload' ? (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>
                    {turnAttempt === 1 ? 'Draw Number (Reload)' : `Retry Reload (${turnAttempt}/3)`}
                  </span>
                </>
              ) : selectedMode === 'weapon' ? (
                <>
                  <Wrench className="w-4 h-4" />
                  <span>
                    {turnAttempt === 1 ? 'Draw Number (Weapon)' : `Retry Weapon (${turnAttempt}/3)`}
                  </span>
                </>
              ) : (
                <>
                  <Dices className="w-4 h-4" />
                  <span>
                    {turnAttempt === 1
                      ? 'Draw Number'
                      : `Retry Draw (Attempt ${turnAttempt}/3)`}
                  </span>
                </>
              )}
            </button>

            {/* Pass Turn Option (if attempt > 1) */}
            {turnAttempt > 1 && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onPassTurn();
                }}
                disabled={isLoading}
                className="w-full sm:w-auto py-3 px-4 rounded-2xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all touch-manipulation active:scale-95 duration-75 cursor-pointer flex items-center justify-center gap-1"
              >
                <span>Pass Turn</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        ) : (
          <div className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm bg-slate-100 text-slate-500 border border-slate-200 text-center">
            Waiting for {opponent?.name || 'opponent'} to draw a number...
          </div>
        )}
      </div>

      {/* Rules Cheat Sheet Toggle */}
      <div className="w-full max-w-md mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <button
          type="button"
          onClick={() => setShowLegend(!showLegend)}
          className="flex items-center gap-1 font-bold text-blue-600 hover:underline cursor-pointer"
        >
          <Info className="w-3.5 h-3.5" />
          <span>{showLegend ? 'Hide Game Rules' : 'Number Action Guide (1, 3, 5, 7, 9)'}</span>
        </button>
        <span className="font-medium text-slate-400">Max 3 attempts/turn</span>
      </div>

      {/* Expandable Rules Legend */}
      {showLegend && (
        <div className="w-full max-w-md mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2.5 animate-in fade-in duration-150">
          <div>
            <div className="font-bold text-slate-800 mb-1">5 Separate Characters (1, 3, 5, 7, 9):</div>
            <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200/80 space-y-0.5">
              <div>Each draw of that number adds the next body component:</div>
              <div className="font-medium text-slate-700 pl-2">
                1st: Body → 2nd: Head → 3rd: Hands → 4th: Legs → 5th: Ears (Complete!)
              </div>
            </div>
          </div>

          <div>
            <div className="font-bold text-slate-800 mb-1">Weapons Crafting:</div>
            <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200/80 space-y-0.5">
              <div><span className="font-black text-slate-900 font-mono">[1]</span> Paper Gun Frame</div>
              <div><span className="font-black text-slate-900 font-mono">[3]</span> Reusable Trigger</div>
              <div><span className="font-black text-slate-900 font-mono">[5, 7, 9]</span> Bullets (Max 3)</div>
            </div>
          </div>

          <div>
            <div className="font-bold text-slate-800 mb-1">Shooting & Elimination:</div>
            <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200/80 space-y-0.5">
              <div>Pick any alive opponent character. One bullet permanently ELIMINATES it!</div>
              <div className="text-amber-800 font-semibold">Eliminate all 5 characters to win the match immediately!</div>
            </div>
          </div>

          <div>
            <div className="font-bold text-slate-800 mb-1">Reload Requirements:</div>
            <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200/80 space-y-0.5">
              <div>• 2 bullets remaining: Generate the same number 2 times</div>
              <div>• 1 bullet remaining: Generate the same number 1 time</div>
              <div>• 0 bullets remaining: Generate the same number 3 times</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
