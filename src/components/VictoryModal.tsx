import React from 'react';
import { Room, Player, AVATAR_OPTIONS } from '../types/bingo';
import { Trophy, RotateCcw, Home } from 'lucide-react';
import { playClickSound } from '../utils/sound';

interface VictoryModalProps {
  room: Room;
  player: Player;
  onRematch: () => Promise<void>;
  onLeaveRoom: () => Promise<void>;
  isLoading: boolean;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  room,
  player,
  onRematch,
  onLeaveRoom,
  isLoading,
}) => {
  const winner = room.winner || room.players[0];
  const isWinner = winner?.id === player.id;
  const winnerAvatar = AVATAR_OPTIONS.find((a) => a.id === winner?.avatar) || AVATAR_OPTIONS[0];

  const rankedPlayers = [...room.players].sort(
    (a, b) => b.completedLines.length - a.completedLines.length
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs select-none">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center animate-pop">
        {/* Trophy Badge */}
        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-amber-400 shadow-[0_4px_0_#d97706] flex items-center justify-center text-white">
          <Trophy className="w-8 h-8" />
        </div>

        <div className="text-xs font-extrabold uppercase tracking-wider text-amber-600 mb-1">
          B I N G O ! 5 Lines Completed
        </div>

        <h2 className="text-2xl sm:text-3xl font-display font-black text-slate-900 mb-1">
          {isWinner ? 'You Won!' : `${winner.name} Won!`}
        </h2>

        <p className="text-xs text-slate-500 mb-5">
          Completed in {room.calledNumbers.length} numbers called
        </p>

        {/* Standings List */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 mb-5 space-y-1.5 text-left">
          {rankedPlayers.map((p, rank) => {
            const avatar = AVATAR_OPTIONS.find((a) => a.id === p.avatar) || AVATAR_OPTIONS[0];
            const isCurrent = p.id === player.id;
            const isChamp = p.id === winner.id;

            return (
              <div
                key={p.id}
                className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between ${
                  isChamp
                    ? 'bg-amber-50 border border-amber-200 font-bold text-slate-900'
                    : 'bg-white border border-slate-200/60 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-bold text-slate-400 w-4">#{rank + 1}</span>
                  <span className="text-base">{avatar.emoji}</span>
                  <span className="truncate font-semibold text-slate-800">
                    {p.name} {isCurrent ? '(You)' : ''}
                  </span>
                </div>
                <span className="font-mono font-extrabold text-blue-600 shrink-0 ml-2">
                  {Math.min(5, p.completedLines.length)}/5 Lines
                </span>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-2.5">
          {player.isHost ? (
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onRematch();
              }}
              disabled={isLoading}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-display font-extrabold text-sm shadow-[0_4px_0_#1d4ed8] active:translate-y-0.5 active:shadow-[0_2px_0_#1d4ed8] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isLoading ? 'Resetting...' : 'Play Again'}</span>
            </button>
          ) : (
            <div className="flex-1 py-3 px-3 rounded-2xl bg-slate-100 text-slate-500 text-xs font-semibold flex items-center justify-center">
              Waiting for host...
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              playClickSound();
              onLeaveRoom();
            }}
            className="py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-display font-bold text-sm flex items-center justify-center gap-1.5 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};
