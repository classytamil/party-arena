/**
 * Professional Tic-Tac-Toe Gameplay Screen
 * Featuring 2-column top player cards, active turn highlights,
 * sound effects on placement, and tactile 3×3 grid animations.
 */

import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  ArrowLeft,
  Bot,
  Sparkles,
} from 'lucide-react';

import { TicTacToeRoom, TicTacToePlayer } from '../../types/ticTacToe';
import { AVATAR_OPTIONS } from '../../types/bingo';
import { getSoundMuted, setSoundMuted, playClickSound, playDaubSound } from '../../utils/sound';

interface TicTacToeGameScreenProps {
  room: TicTacToeRoom;
  player: TicTacToePlayer;
  onPlayCell: (index: number) => void;
  onLeaveRoom: () => void;
  isLoading: boolean;
}

export const TicTacToeGameScreen: React.FC<TicTacToeGameScreenProps> = ({
  room,
  player,
  onPlayCell,
  onLeaveRoom,
  isLoading,
}) => {
  const [isMuted, setIsMuted] = useState(getSoundMuted());

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    setSoundMuted(next);
  };

  const opponent = room.players.find((p) => p.id !== player.id);
  const isMyTurn = room.status === 'PLAYING' && room.currentTurnPlayerId === player.id;
  const currentTurnPlayer = room.players.find((p) => p.id === room.currentTurnPlayerId);

  const getAvatarEmoji = (avatarId: string) =>
    AVATAR_OPTIONS.find((a) => a.id === avatarId)?.emoji || '👤';

  const handleCellClick = (index: number) => {
    if (isLoading || room.status !== 'PLAYING' || !isMyTurn || room.board[index] !== null) {
      return;
    }
    playDaubSound();
    onPlayCell(index);
  };

  return (
    <div className="w-full min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 select-none touch-manipulation">
      {/* Top Header Bar */}
      <header className="w-full bg-white border-b border-slate-200/90 px-4 py-3 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                playClickSound();
                if (window.confirm('Leave the active match?')) {
                  onLeaveRoom();
                }
              }}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all active:scale-95 cursor-pointer"
              title="Leave Room"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                  Tic-Tac-Toe
                </span>
                <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md border border-slate-200">
                  {room.code}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Align 3 in a row to win · Private Match
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleMute}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all active:scale-95 cursor-pointer shadow-xs"
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Arena */}
      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-5 flex flex-col justify-between items-center">
        {/* TOP: Two-Column Player Cards (Matching Dots & Boxes Style) */}
        <div className="w-full grid grid-cols-2 gap-3 sm:gap-4 mb-4">
          {[player, opponent].map((p, idx) => {
            if (!p) return null;
            const isTurn = room.currentTurnPlayerId === p.id;
            const isMe = p.id === player.id;
            const symbol = p.symbol || (idx === 0 ? 'X' : 'O');
            const isX = symbol === 'X';

            return (
              <div
                key={p.id}
                className={`relative p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 flex flex-col items-center text-center ${
                  isTurn
                    ? 'border-indigo-400 bg-white ring-4 ring-indigo-500/15 shadow-md'
                    : 'border-slate-200 bg-white/70 shadow-xs'
                }`}
              >
                {/* Turn Pulse Indicator */}
                {isTurn && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
                    Turn
                  </span>
                )}

                <div className="relative mb-2">
                  <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-2xl sm:text-3xl shadow-xs">
                    {getAvatarEmoji(p.avatar)}
                  </div>
                  <span
                    className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center shadow-xs text-white ${
                      isX ? 'bg-indigo-600' : 'bg-rose-500'
                    }`}
                  >
                    {symbol}
                  </span>
                </div>

                <div className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1 max-w-full">
                  <span className="truncate">{p.name}</span>
                  {isMe && (
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 rounded">
                      You
                    </span>
                  )}
                  {p.isBot && (
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 font-black px-1 rounded flex items-center gap-0.5">
                      <Bot className="w-2.5 h-2.5" /> Bot
                    </span>
                  )}
                </div>

                {/* Score Stats */}
                <div className="mt-1.5 flex items-center gap-2 text-[11px] font-bold text-slate-500">
                  <span>🏆 {p.wins} {p.wins === 1 ? 'Win' : 'Wins'}</span>
                  <span>·</span>
                  <span>🤝 {p.draws} {p.draws === 1 ? 'Draw' : 'Draws'}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Turn Status Message Banner */}
        <div className="w-full text-center mb-4">
          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-extrabold transition-all ${
              room.status === 'COMPLETED'
                ? 'bg-slate-100 text-slate-800 border border-slate-300'
                : isMyTurn
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 animate-pulse'
                : currentTurnPlayer?.isBot
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {room.status === 'COMPLETED' ? (
              <span>Round Finished</span>
            ) : isMyTurn ? (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Your Turn — Place your {player.symbol || 'mark'}</span>
              </>
            ) : currentTurnPlayer?.isBot ? (
              <>
                <Bot className="w-3.5 h-3.5 animate-spin" />
                <span>{currentTurnPlayer.name} (Bot) is thinking…</span>
              </>
            ) : (
              <span>Waiting for {currentTurnPlayer?.name || 'opponent'}…</span>
            )}
          </div>
        </div>

        {/* Tactile 3×3 Board */}
        <div className="w-full max-w-[380px] sm:max-w-[400px] aspect-square bg-slate-200/80 p-3 sm:p-4 rounded-3xl border border-slate-300/80 shadow-inner grid grid-cols-3 gap-2.5 sm:gap-3">
          {room.board.map((symbol, index) => {
            const isWinningCell = room.winningCells.includes(index);
            const isOccupied = symbol !== null;
            const disabled = isLoading || room.status !== 'PLAYING' || !isMyTurn || isOccupied;

            return (
              <button
                key={index}
                type="button"
                disabled={disabled}
                onClick={() => handleCellClick(index)}
                aria-label={`Cell ${index + 1}${symbol ? `: ${symbol}` : ''}`}
                className={`relative rounded-2xl flex items-center justify-center font-black transition-all duration-150 text-5xl sm:text-6xl ${
                  isWinningCell
                    ? 'bg-gradient-to-br from-emerald-100 to-teal-100 border-2 border-emerald-400 text-emerald-600 shadow-md animate-bounce scale-102'
                    : isOccupied
                    ? symbol === 'X'
                      ? 'bg-white text-indigo-600 shadow-xs border border-slate-200'
                      : 'bg-white text-rose-500 shadow-xs border border-slate-200'
                    : isMyTurn
                    ? 'bg-white hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-300 hover:shadow-md active:scale-95 cursor-pointer'
                    : 'bg-white/80 border border-slate-200 cursor-not-allowed opacity-80'
                }`}
              >
                {symbol}
              </button>
            );
          })}
        </div>

        {/* Bottom Subtitle / Info */}
        <div className="w-full text-center mt-4">
          <p className="text-[11px] text-slate-400 font-medium">
            3-in-a-row in any direction wins the round.
          </p>
        </div>
      </main>
    </div>
  );
};

