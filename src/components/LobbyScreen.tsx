import React, { useState } from 'react';
import { Room, Player, AVATAR_OPTIONS } from '../types/bingo';
import {
  Copy,
  Check,
  Crown,
  Bot,
  Play,
  ArrowLeft,
  Volume2,
  VolumeX,
  Share2,
} from 'lucide-react';
import { getSoundMuted, setSoundMuted, playClickSound } from '../utils/sound';

interface LobbyScreenProps {
  room: Room;
  player: Player;
  onToggleReady: (isReady: boolean) => Promise<void>;
  onAddBot: () => Promise<void>;
  onStartGame: () => Promise<void>;
  onLeaveRoom: () => Promise<void>;
  isLoading: boolean;
  errorMessage: string | null;
  onClearError: () => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
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

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    setSoundMuted(next);
  };

  const handleCopyCode = () => {
    playClickSound();
    navigator.clipboard.writeText(room.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    playClickSound();
    const url = typeof window !== 'undefined' ? `${window.location.origin}?room=${room.code}` : room.code;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const readyCount = room.players.filter((p) => p.isReady || p.isHost).length;
  const canStart = player.isHost && room.players.length >= 2 && readyCount >= 2;

  const getAvatarInfo = (avatarId: string) => {
    return AVATAR_OPTIONS.find((a) => a.id === avatarId) || AVATAR_OPTIONS[0];
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col justify-between p-4 sm:p-6 select-none">
      {/* Minimal Top Bar */}
      <header className="max-w-md mx-auto w-full flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onLeaveRoom}
          className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-semibold shadow-xs transition-all active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Leave</span>
        </button>

        <span className="font-display font-extrabold text-sm text-slate-500">
          Waiting Lobby
        </span>

        <button
          type="button"
          onClick={handleToggleMute}
          aria-label={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          className="w-9 h-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-600 flex items-center justify-center shadow-xs transition-all active:scale-95"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-slate-700" />}
        </button>
      </header>

      {/* Main Single-Column Lobby Card */}
      <main className="max-w-md mx-auto w-full my-auto py-4 space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={onClearError} className="font-bold text-rose-500 ml-2">
              ✕
            </button>
          </div>
        )}

        {/* Room Code Invite Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center">
          <div className="text-xs font-semibold text-slate-400 mb-1.5">
            Room Code
          </div>
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-slate-900">
              {room.code}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              title="Copy Code"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-blue-600" />}
            <span>{copiedLink ? 'Invite Link Copied!' : 'Share Invite Link with Friends'}</span>
          </button>
        </div>

        {/* Players List Card */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-slate-500">
              Players ({room.players.length}/{room.maxPlayers})
            </div>

            {player.isHost && room.players.length < room.maxPlayers && (
              <button
                type="button"
                onClick={onAddBot}
                disabled={isLoading}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold transition-colors disabled:opacity-50"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>+ Add Bot</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            {room.players.map((p) => {
              const avatar = getAvatarInfo(p.avatar);
              const isCurrent = p.id === player.id;
              const isReady = p.isReady || p.isHost;

              return (
                <div
                  key={p.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                    isCurrent
                      ? 'bg-blue-50/50 border-blue-200'
                      : 'bg-slate-50/70 border-slate-200/70'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xl shrink-0 shadow-2xs">
                      {avatar.emoji}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="font-display font-bold text-sm text-slate-900 truncate">
                          {p.name}
                        </span>
                        {isCurrent && (
                          <span className="text-xs font-medium text-blue-600">(You)</span>
                        )}
                        {p.isHost && (
                          <span title="Host">
                            <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">
                        {p.isBot ? 'AI Opponent' : p.isHost ? 'Room Host' : 'Player'}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 ml-2 text-xs font-bold">
                    {isReady ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Ready
                      </span>
                    ) : (
                      <span className="text-slate-400">Waiting...</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Primary Start / Ready Button */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            {player.isHost ? (
              <div className="space-y-2 text-center">
                <button
                  type="button"
                  onClick={onStartGame}
                  disabled={!canStart || isLoading}
                  className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-display font-extrabold text-sm sm:text-base shadow-[0_4px_0_#1d4ed8] active:translate-y-0.5 active:shadow-[0_2px_0_#1d4ed8] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>
                    {room.players.length < 2
                      ? 'Add a Bot or Wait for Friend'
                      : !canStart
                      ? 'Waiting for Players...'
                      : 'Start Game'}
                  </span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onToggleReady(!player.isReady)}
                className={`w-full py-3.5 px-6 rounded-2xl font-display font-extrabold text-sm sm:text-base transition-all flex items-center justify-center gap-2 ${
                  player.isReady
                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_4px_0_#047857]'
                }`}
              >
                {player.isReady ? (
                  <span>Ready (Tap to Cancel)</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>I&apos;m Ready!</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-slate-400 max-w-md mx-auto w-full pb-1">
        Game starts as soon as 2+ players are ready
      </footer>
    </div>
  );
};
