/**
 * Match Results & Victory Modal for Paper Gun Battle (5-Character Elimination Strategy)
 */

import React from 'react';
import { PaperGunRoom, PaperGunPlayer, PAPER_GUN_NUMBERS } from '../../types/paperGun';
import { Trophy, RotateCcw, Home, Sparkles, Target, Skull } from 'lucide-react';
import { playClickSound } from '../../utils/sound';

interface PaperGunVictoryModalProps {
  room: PaperGunRoom;
  player: PaperGunPlayer;
  onRematch: () => Promise<void>;
  onLeaveRoom: () => Promise<void>;
  isLoading: boolean;
}

export const PaperGunVictoryModal: React.FC<PaperGunVictoryModalProps> = ({
  room,
  player,
  onRematch,
  onLeaveRoom,
  isLoading,
}) => {
  const winner = room.players.find((p) => p.id === room.winnerId);
  const isMeWinner = winner?.id === player.id;
  const opponent = room.players.find((p) => p.id !== player.id);

  const getAliveCount = (p: PaperGunPlayer) =>
    PAPER_GUN_NUMBERS.filter((n) => !p.characters[n]?.isEliminated).length;

  const playerAlive = getAliveCount(player);
  const opponentAlive = opponent ? getAliveCount(opponent) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        {/* Trophy / Icon */}
        <div
          className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-4 shadow-xl rotate-1 ${
            isMeWinner
              ? 'bg-amber-400 text-amber-950 ring-4 ring-amber-300/40'
              : 'bg-slate-800 text-amber-400'
          }`}
        >
          {isMeWinner ? (
            <Trophy className="w-10 h-10 animate-bounce" />
          ) : (
            <Skull className="w-10 h-10 text-slate-300" />
          )}
        </div>

        {/* Winner Title */}
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Battle Concluded</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
          {isMeWinner ? 'Victory is Yours!' : `${winner?.name || 'Opponent'} Wins!`}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mb-6">
          {isMeWinner
            ? `You successfully eliminated all 5 of ${opponent?.name || 'your opponent'}'s characters!`
            : `All 5 of your characters were eliminated. Better sharpen your pencils for a rematch.`}
        </p>

        {/* Final Stats Grid */}
        <div className="w-full bg-slate-50 rounded-2xl border border-slate-200/90 p-4 mb-6 grid grid-cols-2 gap-3 text-left">
          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block mb-0.5">
              {player.name}
            </span>
            <div className="flex items-center justify-between">
              <span className={`text-sm font-black ${playerAlive > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                {playerAlive}/5 Alive
              </span>
              <span className="text-xs font-medium text-slate-500">
                {player.shotsFired} shots
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-medium">
              {player.eliminationsCount} eliminations
            </div>
          </div>

          {opponent && (
            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block mb-0.5">
                {opponent.name}
              </span>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-black ${opponentAlive > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {opponentAlive}/5 Alive
                </span>
                <span className="text-xs font-medium text-slate-500">
                  {opponent.shotsFired} shots
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-medium">
                {opponent.eliminationsCount} eliminations
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2.5">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              playClickSound();
              onRematch();
            }}
            className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-black text-sm tracking-wide shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again (Rematch)</span>
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              playClickSound();
              onLeaveRoom();
            }}
            className="w-full py-3 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5 text-slate-500" />
            <span>Return to Games Hub</span>
          </button>
        </div>
      </div>
    </div>
  );
};
