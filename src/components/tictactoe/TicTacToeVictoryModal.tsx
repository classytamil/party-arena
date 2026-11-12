/**
 * Professional Tic-Tac-Toe Victory Modal & Match Summary
 * Features confetti animations, victory chimes, score leaderboards,
 * and quick rematch controls matching the Dots & Bingo styles.
 */

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Home, Sparkles, Handshake } from 'lucide-react';
import { TicTacToeRoom, TicTacToePlayer } from '../../types/ticTacToe';
import { AVATAR_OPTIONS } from '../../types/bingo';
import { playClickSound, playVictorySound } from '../../utils/sound';

interface TicTacToeVictoryModalProps {
  room: TicTacToeRoom;
  player: TicTacToePlayer;
  onRematch: () => void;
  onLeaveRoom: () => void;
  isLoading: boolean;
}

export const TicTacToeVictoryModal: React.FC<TicTacToeVictoryModalProps> = ({
  room,
  player,
  onRematch,
  onLeaveRoom,
  isLoading,
}) => {
  const winner = room.players.find((p) => p.id === room.winnerId);
  const isWinner = room.winnerId === player.id;
  const isDraw = !room.winnerId;

  // Trigger celebration confetti & victory audio
  useEffect(() => {
    try {
      if (isWinner) {
        playVictorySound();
      }
      confetti({
        particleCount: isDraw ? 40 : 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: isDraw
          ? ['#94a3b8', '#64748b', '#cbd5e1']
          : ['#4f46e5', '#6366f1', '#10b981', '#f59e0b', '#ec4899'],
      });
    } catch {
      // Ignore in non-browser env
    }
  }, [isWinner, isDraw]);

  const getAvatarEmoji = (avatarId: string) =>
    AVATAR_OPTIONS.find((a) => a.id === avatarId)?.emoji || '👤';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/90 p-6 sm:p-8 flex flex-col items-center text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Glow Accent */}
        <div
          className={`absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
            isDraw
              ? 'bg-slate-400/20'
              : isWinner
              ? 'bg-emerald-400/25'
              : 'bg-indigo-400/20'
          }`}
        />

        {/* Big Icon */}
        <div
          className={`w-16 h-16 rounded-3xl flex items-center justify-center text-3xl mb-4 shadow-sm border ${
            isDraw
              ? 'bg-slate-50 border-slate-200 text-slate-500'
              : isWinner
              ? 'bg-amber-50 border-amber-200 text-amber-500'
              : 'bg-indigo-50 border-indigo-200 text-indigo-600'
          }`}
        >
          {isDraw ? (
            <Handshake className="w-8 h-8 text-slate-500" />
          ) : (
            <Trophy className="w-8 h-8 text-amber-500 fill-amber-400" />
          )}
        </div>

        {/* Heading */}
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-1">
          {isDraw
            ? "It's a Draw!"
            : isWinner
            ? 'Victory Is Yours!'
            : `${winner?.name || 'Opponent'} Wins!`}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mb-6">
          {isDraw
            ? 'All 9 cells marked with no 3-in-a-row line'
            : isWinner
            ? 'You aligned 3 marks across the board!'
            : `${winner?.name || 'Opponent'} successfully aligned 3 in a row!`}
        </p>

        {/* Head-to-Head Scoreboard */}
        <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 space-y-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-left mb-2 flex items-center justify-between">
            <span>Match Series Score</span>
            <span className="text-slate-500 font-black">
              {room.players.reduce((sum, p) => sum + p.wins, 0) + (room.players[0]?.draws || 0)} Rounds Total
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {room.players.map((p) => {
              const isPWinner = room.winnerId === p.id;
              const isMe = p.id === player.id;
              return (
                <div
                  key={p.id}
                  className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all ${
                    isPWinner
                      ? 'border-emerald-300 bg-emerald-50/60 shadow-xs'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="text-2xl mb-1">{getAvatarEmoji(p.avatar)}</div>
                  <div className="font-extrabold text-xs text-slate-900 truncate max-w-full">
                    {p.name} {isMe && '(You)'}
                  </div>
                  <div className="mt-1 font-black text-base text-indigo-700">
                    {p.wins} {p.wins === 1 ? 'Win' : 'Wins'}
                  </div>
                </div>
              );
            })}
          </div>

          {room.players[0] && (
            <div className="text-[11px] font-semibold text-slate-400 text-center pt-1">
              🤝 {room.players[0].draws} {room.players[0].draws === 1 ? 'Draw' : 'Draws'} recorded in this room
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            disabled={isLoading || room.players.length !== 2}
            onClick={() => {
              playClickSound();
              onRematch();
            }}
            className="flex-1 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Rematch</span>
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              playClickSound();
              onLeaveRoom();
            }}
            className="h-12 px-5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-sm flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer"
          >
            <Home className="w-4 h-4 text-slate-500" />
            <span>Leave</span>
          </button>
        </div>
      </div>
    </div>
  );
};

