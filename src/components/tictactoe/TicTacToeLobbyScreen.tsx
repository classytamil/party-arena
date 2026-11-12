/**
 * Professional Tic-Tac-Toe Waiting Lobby Screen
 * Matches the clean layout, 2-column player cards, copy invite links,
 * and inline "+ Add AI Bot" features of Bingo & Dots.
 */

import React, { useState } from 'react';
import {
  Users,
  Copy,
  Check,
  Play,
  Bot,
  ArrowLeft,
  Volume2,
  VolumeX,
  Share2,
  Crown,
} from 'lucide-react';

import { TicTacToeRoom, TicTacToePlayer } from '../../types/ticTacToe';
import { AVATAR_OPTIONS } from '../../types/bingo';
import { getSoundMuted, setSoundMuted, playClickSound } from '../../utils/sound';

interface TicTacToeLobbyScreenProps {
  room: TicTacToeRoom;
  player: TicTacToePlayer;
  onToggleReady: () => void;
  onAddBot: () => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  isLoading: boolean;
  errorMessage: string | null;
  onClearError: () => void;
}

export const TicTacToeLobbyScreen: React.FC<TicTacToeLobbyScreenProps> = ({
  room,
  player,
  onToggleReady,
  onAddBot,
  onStartGame,
  onLeaveRoom,
  isLoading,
  errorMessage,
  onClearError,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isMuted, setIsMuted] = useState(getSoundMuted());

  const handleCopyCode = () => {
    playClickSound();
    navigator.clipboard.writeText(room.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyInviteLink = () => {
    playClickSound();
    const url = `${window.location.origin}?game=tictactoe&room=${room.code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    setSoundMuted(next);
  };

  const opponent = room.players.find((p) => p.id !== player.id);
  const allReady = room.players.length === 2 && room.players.every((p) => p.isReady);
  const canStart = player.isHost && allReady;

  const getAvatarEmoji = (avatarId: string) =>
    AVATAR_OPTIONS.find((a) => a.id === avatarId)?.emoji || '👤';

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-10 flex flex-col items-center select-none touch-manipulation">
      {/* Top Bar with Navigation and Sound */}
      <div className="w-full flex items-center justify-between mb-6">
        <button
          onClick={() => {
            playClickSound();
            onLeaveRoom();
          }}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Leave Room</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleMute}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all shadow-xs cursor-pointer"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Error notification */}
      {errorMessage && (
        <div className="w-full max-w-md mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-sm text-rose-700 flex items-center justify-between shadow-xs">
          <span>{errorMessage}</span>
          <button onClick={onClearError} className="font-bold text-rose-800 ml-2">✕</button>
        </div>
      )}

      {/* Main Console Box */}
      <div className="w-full max-w-xl bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 flex flex-col items-center">
        {/* Room Code Banner */}
        <div className="text-center mb-6 w-full">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-200/60 px-3 py-1 rounded-full inline-block mb-3">
            Tic-Tac-Toe Waiting Lobby
          </span>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            Room Code
          </h2>
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="font-mono text-4xl sm:text-5xl font-black text-slate-900 tracking-wider">
              {room.code}
            </span>
          </div>

          <div className="flex items-center justify-center gap-2">
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Code Copied' : 'Copy Code'}</span>
            </button>
            <button
              onClick={handleCopyInviteLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied' : 'Share Link'}</span>
            </button>
          </div>
        </div>

        {/* Players Two-Column Cards Grid */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Slot 1: Host / Current Player */}
          {(() => {
            const hostPlayer = room.players[0];
            const isMe = hostPlayer?.id === player.id;
            return (
              <div
                className={`relative flex flex-col items-center justify-center p-5 rounded-2xl border transition-all text-center ${
                  hostPlayer?.isReady
                    ? 'bg-emerald-50/40 border-emerald-200/80'
                    : 'bg-slate-50/80 border-slate-200'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-3xl mb-2.5">
                  {hostPlayer ? getAvatarEmoji(hostPlayer.avatar) : '⏳'}
                </div>
                <div className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                  <span className="truncate max-w-[120px]">{hostPlayer?.name || 'Player 1'}</span>
                  {isMe && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.2 rounded-md">
                      You
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md">
                    <Crown className="w-3 h-3 text-amber-500" /> Host
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                      hostPlayer?.isReady
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-slate-200 text-slate-600 border-slate-300'
                    }`}
                  >
                    {hostPlayer?.isReady ? 'Ready ✓' : 'Waiting'}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Slot 2: Opponent or Empty Slot */}
          {opponent ? (
            <div
              className={`relative flex flex-col items-center justify-center p-5 rounded-2xl border transition-all text-center ${
                opponent.isReady
                  ? 'bg-emerald-50/40 border-emerald-200/80'
                  : 'bg-slate-50/80 border-slate-200'
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-3xl mb-2.5">
                {getAvatarEmoji(opponent.avatar)}
              </div>
              <div className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <span className="truncate max-w-[120px]">{opponent.name}</span>
                {opponent.id === player.id && (
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.2 rounded-md">
                    You
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 mt-1.5">
                {opponent.isBot && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-md">
                    <Bot className="w-3 h-3 text-indigo-600" /> AI Bot
                  </span>
                )}
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                    opponent.isReady
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-slate-200 text-slate-600 border-slate-300'
                  }`}
                >
                  {opponent.isReady ? 'Ready ✓' : 'Waiting'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/40 text-center">
              <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 mb-2.5">
                <Users className="w-6 h-6 animate-pulse" />
              </div>
              <span className="text-xs font-bold text-slate-400 mb-2.5">
                Waiting for 2nd Player
              </span>
              {player.isHost && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    playClickSound();
                    onAddBot();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>+ Add AI Bot</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom Controls */}
        <div className="w-full flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-2.5 w-full">
            <button
              onClick={() => {
                playClickSound();
                onToggleReady();
              }}
              disabled={isLoading}
              className={`flex-1 h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border transition-all active:scale-98 cursor-pointer disabled:opacity-50 ${
                player.isReady
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {player.isReady ? <Check className="w-4 h-4 text-emerald-600" /> : null}
              <span>{player.isReady ? "I'm Ready ✓" : 'Ready Up'}</span>
            </button>

            {player.isHost && (
              <button
                onClick={() => {
                  playClickSound();
                  onStartGame();
                }}
                disabled={isLoading || !canStart}
                className="flex-1 h-12 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 active:scale-98 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start Match</span>
              </button>
            )}
          </div>

          {player.isHost && !canStart && (
            <p className="text-center text-[11px] text-slate-400 font-medium">
              {room.players.length < 2
                ? 'Add an AI bot or share your room code with a friend to begin.'
                : 'Both players must be ready before starting.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

