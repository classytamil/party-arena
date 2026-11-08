/**
 * Dots and Boxes Waiting Lobby Screen
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
  Clock,
  Grid,
  ChevronDown,
} from 'lucide-react';

import {
  DotsRoom,
  DotsPlayer,
  GRID_OPTIONS,
  DotsGridSize,
  PLAYER_COLORS,
} from '../../types/dots';
import { AVATAR_OPTIONS } from '../../types/bingo';
import { getSoundMuted, setSoundMuted, playClickSound } from '../../utils/sound';

interface DotsLobbyScreenProps {
  room: DotsRoom;
  player: DotsPlayer;
  onToggleReady: () => void;
  onAddBot: () => void;
  onUpdateSettings: (gridSize?: DotsGridSize, timerSeconds?: number) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  isLoading: boolean;
  errorMessage: string | null;
  onClearError: () => void;
}

export const DotsLobbyScreen: React.FC<DotsLobbyScreenProps> = ({
  room,
  player,
  onToggleReady,
  onAddBot,
  onUpdateSettings,
  onStartGame,
  onLeaveRoom,
  isLoading,
  errorMessage,
  onClearError,
}) => {
  const [copied, setCopied] = useState(false);
  const [isMuted, setIsMuted] = useState(getSoundMuted());

  const handleCopyCode = () => {
    playClickSound();
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyInviteLink = () => {
    playClickSound();
    const url = `${window.location.origin}?game=dots&room=${room.code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    setSoundMuted(next);
  };

  const allHumansReady = room.players.filter((p) => !p.isBot).every((p) => p.isReady);
  const canStart = player.isHost && room.players.length >= 2 && allHumansReady;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-10 flex flex-col items-center select-none touch-manipulation">
      {/* Top Bar with Navigation and Sound */}
      <div className="w-full flex items-center justify-between mb-6">
        <button
          onClick={() => {
            playClickSound();
            onLeaveRoom();
          }}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Leave Room</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleMute}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all shadow-xs"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Room Card */}
      <div className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-6 sm:p-8">
        {/* Header with Room Code */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
              <span>Multiplayer Dots & Boxes</span>
              <span>·</span>
              <span>Waiting Lobby</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Room Code:{' '}
              <span className="font-mono bg-blue-50 text-blue-700 px-3 py-1 rounded-xl border border-blue-200/70 inline-block tracking-widest">
                {room.code}
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCode}
              className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-all shadow-xs"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied Code!' : 'Copy Code'}</span>
            </button>
            <button
              onClick={handleCopyInviteLink}
              className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 transition-all shadow-md shadow-blue-500/20"
            >
              <span>Share Invite Link</span>
            </button>
          </div>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-sm text-rose-700">
            <span>{errorMessage}</span>
            <button onClick={onClearError} className="font-bold ml-2">✕</button>
          </div>
        )}

        {/* Two-Column Setup: Settings & Players */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Match Settings (Grid Size & Timer) */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-2">
                <Grid className="w-4 h-4 text-blue-600" />
                <span>Box Size</span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Choose box count. 5×5 Boxes (25 boxes) is the standard match.
              </p>

              <div className="relative">
                <select
                  disabled={!player.isHost}
                  value={room.gridSize}
                  onChange={(e) => {
                    playClickSound();
                    onUpdateSettings(Number(e.target.value) as DotsGridSize);
                  }}
                  className={`w-full h-12 pl-4 pr-10 rounded-2xl border text-sm font-bold appearance-none transition-colors ${
                    player.isHost
                      ? 'bg-slate-50 border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer'
                      : 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed opacity-90'
                  }`}
                >
                  {GRID_OPTIONS.map((opt) => (
                    <option key={opt.size} value={opt.size}>
                      {opt.label} ({opt.boxCount} boxes)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>


              {!player.isHost && (
                <p className="text-[11px] text-slate-400 mt-2 italic">
                  Only the host can modify the board size.
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Turn Timer</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 0, label: 'Off' },
                  { value: 15, label: '15 sec' },
                  { value: 30, label: '30 sec' },
                ].map((t) => {
                  const isSelected = room.timerSeconds === t.value;
                  return (
                    <button
                      key={t.value}
                      disabled={!player.isHost}
                      onClick={() => {
                        playClickSound();
                        onUpdateSettings(undefined, t.value);
                      }}
                      className={`py-2 px-3 text-center rounded-xl text-xs font-bold border transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                      } ${!player.isHost ? 'opacity-80 cursor-default' : 'cursor-pointer'}`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Rules Snapshot */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
              <div className="font-bold text-slate-900 text-sm mb-1">Game Rules</div>
              <p>• Connect adjacent dots with a line on your turn.</p>
              <p>• Closing the 4th side of any box claims it for +1 point.</p>
              <p>• Claiming a box awards an <strong>immediate extra turn</strong>!</p>
              <p>• Most claimed boxes when board is full wins.</p>
            </div>
          </div>

          {/* Right Column: Player Roster & Ready State */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-700" />
                  <span className="font-bold text-slate-900 text-sm">
                    Players ({room.players.length} / {room.maxPlayers})
                  </span>
                </div>

                {room.players.length < room.maxPlayers && player.isHost && (
                  <button
                    onClick={() => {
                      playClickSound();
                      onAddBot();
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-200/60 transition-all"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Add AI Bot</span>
                  </button>
                )}
              </div>

              {/* Player list */}
              <div className="space-y-3">
                {room.players.map((p, idx) => {
                  const avatar = AVATAR_OPTIONS.find((a) => a.id === p.avatar);
                  const colorTheme = PLAYER_COLORS[p.colorIndex % PLAYER_COLORS.length];
                  const isMe = p.id === player.id;

                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                        isMe
                          ? 'border-blue-300 bg-blue-50/40 shadow-xs'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-xs border ${colorTheme.border} ${colorTheme.bgLight}`}
                        >
                          {avatar?.emoji || '👤'}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {p.name}
                            </span>
                            {isMe && (
                              <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">
                                You
                              </span>
                            )}
                            {p.isHost && (
                              <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                                Host
                              </span>
                            )}
                            {p.isBot && (
                              <span className="text-[10px] font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Bot className="w-3 h-3" /> Bot
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block"
                              style={{ backgroundColor: colorTheme.primary }}
                            />
                            <span>Player {idx + 1} ({colorTheme.name})</span>
                          </div>
                        </div>
                      </div>

                      {/* Ready status */}
                      <div>
                        {p.isReady ? (
                          <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200/80">
                            <Check className="w-3.5 h-3.5" />
                            <span>Ready</span>
                          </div>
                        ) : (
                          <div className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl">
                            Waiting
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Empty slots */}
                {Array.from({ length: room.maxPlayers - room.players.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="p-3.5 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400 gap-2 bg-slate-50/50"
                  >
                    <Users className="w-4 h-4 opacity-40" />
                    <span>Empty Player Slot</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
              {!player.isHost && (
                <button
                  onClick={() => {
                    playClickSound();
                    onToggleReady();
                  }}
                  className={`w-full sm:w-auto px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-md ${
                    player.isReady
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                  }`}
                >
                  {player.isReady ? 'Cancel Ready' : "I'm Ready!"}
                </button>
              )}

              {player.isHost && (
                <button
                  disabled={!canStart || isLoading}
                  onClick={() => {
                    playClickSound();
                    onStartGame();
                  }}
                  className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    canStart && !isLoading
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 active:scale-95 cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{isLoading ? 'Starting Match...' : 'Start Match'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
