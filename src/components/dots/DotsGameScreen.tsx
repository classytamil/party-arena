/**
 * Main Dots and Boxes Gameplay Screen
 */

import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  ArrowLeft,
  Flame,
  Clock,
  History,
  X,
  Award,
} from 'lucide-react';
import { DotsRoom, DotsPlayer, PLAYER_COLORS } from '../../types/dots';
import { AVATAR_OPTIONS } from '../../types/bingo';
import { DotsBoard } from './DotsBoard';
import { getSoundMuted, setSoundMuted, playClickSound } from '../../utils/sound';

interface DotsGameScreenProps {
  room: DotsRoom;
  player: DotsPlayer;
  onDrawLine: (lineId: string) => void;
  onLeaveRoom: () => void;
}

export const DotsGameScreen: React.FC<DotsGameScreenProps> = ({
  room,
  player,
  onDrawLine,
  onLeaveRoom,
}) => {
  const [isMuted, setIsMuted] = useState(getSoundMuted());
  const [showHistory, setShowHistory] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const totalBoxes = (room.gridSize - 1) * (room.gridSize - 1);
  const claimedCount = Object.keys(room.boxes).length;
  const remainingCount = totalBoxes - claimedCount;

  const isMyTurn = room.status === 'PLAYING' && room.currentTurnPlayerId === player.id;
  const activePlayer = room.players.find((p) => p.id === room.currentTurnPlayerId);
  const activeColor = activePlayer ? PLAYER_COLORS[activePlayer.colorIndex % PLAYER_COLORS.length] : PLAYER_COLORS[0];

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    setSoundMuted(next);
  };

  // Turn timer countdown effect
  useEffect(() => {
    if (!room.turnDeadline || room.status !== 'PLAYING') {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const remainingMs = room.turnDeadline! - Date.now();
      const sec = Math.max(0, Math.ceil(remainingMs / 1000));
      setTimeLeft(sec);
      if (sec <= 0) {
        clearInterval(interval);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [room.turnDeadline, room.status]);

  const getAvatarEmoji = (avatarId: string) => {
    return AVATAR_OPTIONS.find((a) => a.id === avatarId)?.emoji || '👤';
  };

  return (
    <div className="w-full min-h-screen flex flex-col bg-[#f8fafc] text-slate-900">
      {/* Top Navigation Bar */}
      <header className="w-full bg-white border-b border-slate-200/90 px-4 py-3 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Left: Back / Leave & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                playClickSound();
                if (window.confirm('Leave the active match?')) {
                  onLeaveRoom();
                }
              }}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all touch-manipulation active:scale-95 duration-75 cursor-pointer"
              title="Leave Room"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                  Dots & Boxes
                </span>
                <span className="text-xs font-mono font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                  {room.code}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
                {room.gridSize}×{room.gridSize} Dots · {totalBoxes} Boxes
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playClickSound();
                setShowHistory(!showHistory);
              }}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs touch-manipulation active:scale-95 duration-75 cursor-pointer ${
                showHistory
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
              }`}
              title="Move Log"
            >
              <History className="w-4 h-4" />
              <span className="hidden md:inline">Moves</span>
            </button>

            <button
              onClick={handleToggleMute}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all shadow-xs touch-manipulation active:scale-95 duration-75 cursor-pointer"
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-4 sm:py-6 flex flex-col items-center">
        {/* Dynamic Turn & Combo Banner */}
        <div className="w-full max-w-xl mb-4">
          {room.comboActive && (
            <div className="w-full mb-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl py-2 px-4 shadow-md flex items-center justify-center gap-2 animate-bounce">
              <Flame className="w-4 h-4 fill-current" />
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wide">
                Box Claimed! Extra Turn Awarded!
              </span>
            </div>
          )}

          <div
            className={`w-full p-3 sm:p-4 rounded-2xl border transition-all flex items-center justify-between shadow-xs ${
              isMyTurn
                ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-xs border"
                style={{
                  borderColor: activeColor.primary,
                  backgroundColor: `${activeColor.primary}15`,
                }}
              >
                {getAvatarEmoji(activePlayer?.avatar || '')}
              </div>

              <div>
                <div className="text-xs text-slate-500 font-medium">
                  {isMyTurn ? 'Your Turn' : "Opponent's Turn"}
                </div>
                <div className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <span>{isMyTurn ? 'Draw any line' : `${activePlayer?.name}'s move`}</span>
                  <span
                    className="w-2.5 h-2.5 rounded-full animate-pulse"
                    style={{ backgroundColor: activeColor.primary }}
                  />
                </div>
              </div>
            </div>

            {/* Timer countdown if enabled */}
            {timeLeft !== null && (
              <div className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-xl font-mono text-xs font-bold">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{timeLeft}s</span>
              </div>
            )}
          </div>
        </div>

        {/* Live Scoreboard Strip */}
        <div className="w-full max-w-xl mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {room.players.map((p) => {
            const pColor = PLAYER_COLORS[p.colorIndex % PLAYER_COLORS.length];
            const isTurn = p.id === room.currentTurnPlayerId;
            const isMe = p.id === player.id;

            return (
              <div
                key={p.id}
                className={`p-2.5 sm:p-3 rounded-2xl border transition-all flex flex-col justify-between ${
                  isTurn
                    ? 'border-blue-400 bg-white ring-2 ring-blue-500/30 shadow-md'
                    : 'border-slate-200 bg-white shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-base">{getAvatarEmoji(p.avatar)}</span>
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {p.name} {isMe ? '(You)' : ''}
                    </span>
                  </div>
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: pColor.primary }}
                  />
                </div>

                <div className="flex items-end justify-between mt-1 pt-1 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400 font-medium">Boxes</span>
                  <span
                    className="text-lg font-black tabular-nums"
                    style={{ color: pColor.primary }}
                  >
                    {p.score}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress bar of claimed boxes */}
        <div className="w-full max-w-xl mb-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-slate-800">Board Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">{claimedCount} / {totalBoxes} Claimed</span>
            <span className="text-slate-400">({remainingCount} left)</span>
          </div>
        </div>

        {/* The Interactive Dots Board */}
        <DotsBoard
          room={room}
          player={player}
          onDrawLine={onDrawLine}
          disabled={room.status !== 'PLAYING'}
        />
      </main>

      {/* Move History Drawer (Side slide-in) */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-6 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-lg">Move History</h3>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 touch-manipulation active:scale-95 duration-75 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-2">
              {room.moves.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No moves yet. Make the first line!</p>
              ) : (
                room.moves.map((m) => {
                  const mColor = PLAYER_COLORS[m.playerColorIndex % PLAYER_COLORS.length];
                  return (
                    <div
                      key={m.moveIndex}
                      className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400 font-semibold w-5">
                          #{m.moveIndex}
                        </span>
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: mColor.primary }}
                        />
                        <span className="font-bold text-slate-800">{m.playerName}</span>
                      </div>

                      <div>
                        {m.boxesCompleted > 0 ? (
                          <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                            +{m.boxesCompleted} Box{m.boxesCompleted > 1 ? 'es' : ''} (Extra Turn)
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">Drew line</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
