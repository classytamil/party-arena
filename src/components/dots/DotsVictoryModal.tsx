/**
 * Dots and Boxes Victory Modal & Match Summary
 */

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Home, Sparkles } from 'lucide-react';
import { DotsRoom, DotsPlayer, PLAYER_COLORS } from '../../types/dots';
import { AVATAR_OPTIONS } from '../../types/bingo';
import { playClickSound } from '../../utils/sound';

interface DotsVictoryModalProps {
  room: DotsRoom;
  player: DotsPlayer;
  onRematch: () => void;
  onLeaveRoom: () => void;
  isLoading: boolean;
}

export const DotsVictoryModal: React.FC<DotsVictoryModalProps> = ({
  room,
  player,
  onRematch,
  onLeaveRoom,
  isLoading,
}) => {
  const totalBoxes = (room.gridSize - 1) * (room.gridSize - 1);

  // Trigger celebration confetti
  useEffect(() => {
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6'],
      });
    } catch {
      // Ignore in non-browser env
    }
  }, []);

  // Sort players by score descending
  const rankedPlayers = [...room.players].sort((a, b) => b.score - a.score);
  const isWinner = room.winners.some((w) => w.id === player.id);
  const isTie = room.isTie;

  const getAvatarEmoji = (avatarId: string) => {
    return AVATAR_OPTIONS.find((a) => a.id === avatarId)?.emoji || '👤';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/80 p-6 sm:p-8 flex flex-col items-center text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Glow Accent */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />

        {/* Icon & Heading */}
        <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center text-3xl mb-4 shadow-sm">
          <Trophy className="w-8 h-8 text-amber-500 fill-amber-400" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-1">
          {isTie
            ? "It's a Tie Match!"
            : isWinner
            ? 'Victory Is Yours!'
            : `${room.winners[0]?.name || 'Opponent'} Wins!`}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mb-6">
          All {totalBoxes} boxes have been claimed on the board
        </p>

        {/* Final Leaderboard */}
        <div className="w-full space-y-2 mb-6">
          {rankedPlayers.map((p, idx) => {
            const pColor = PLAYER_COLORS[p.colorIndex % PLAYER_COLORS.length];
            const isMe = p.id === player.id;
            const percentage = totalBoxes > 0 ? Math.round((p.score / totalBoxes) * 100) : 0;
            const isRankWinner = room.winners.some((w) => w.id === p.id);

            return (
              <div
                key={p.id}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  isRankWinner
                    ? 'border-amber-300 bg-amber-50/50 shadow-xs'
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 text-xs font-black text-slate-400">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                  </div>
                  <div className="text-xl">{getAvatarEmoji(p.avatar)}</div>
                  <div className="text-left">
                    <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{p.name}</span>
                      {isMe && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-semibold">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      {percentage}% of board
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className="text-lg font-black tabular-nums"
                    style={{ color: pColor.primary }}
                  >
                    {p.score}{' '}
                    <span className="text-xs font-semibold text-slate-400">boxes</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => {
              playClickSound();
              onLeaveRoom();
            }}
            className="w-full sm:flex-1 py-3.5 px-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            <Home className="w-4 h-4 text-slate-500" />
            <span>Return to Hub</span>
          </button>

          <button
            disabled={isLoading}
            onClick={() => {
              playClickSound();
              onRematch();
            }}
            className="w-full sm:flex-1 py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/25 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{isLoading ? 'Resetting...' : 'Play Again'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
