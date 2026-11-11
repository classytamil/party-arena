/**
 * Clean Home Page / Game Hub
 * Shows game selection cards, clicking a game transitions directly to that game's landing page!
 */

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, ArrowRight, User, Hash, Sparkles, Download } from 'lucide-react';
import { AVATAR_OPTIONS } from '../types/bingo';
import { getSoundMuted, setSoundMuted, playClickSound } from '../utils/sound';
import { usePwaInstall } from '../hooks/usePwaInstall';

interface GameHubProps {
  onOpenBingoLanding: () => void;
  onOpenDotsLanding: () => void;
  onOpenPaperGunLanding: () => void;
  onOpenTicTacToeLanding: () => void;
  onJoinRoomDirect: (code: string) => void;
  errorMessage: string | null;
  onClearError: () => void;
}

export const GameHub: React.FC<GameHubProps> = ({
  onOpenBingoLanding,
  onOpenDotsLanding,
  onOpenPaperGunLanding,
  onOpenTicTacToeLanding,
  onJoinRoomDirect,
  errorMessage,
  onClearError,
}) => {
  const [playerName, setPlayerName] = useState('Player 1');
  const [selectedAvatar, setSelectedAvatar] = useState('fox');
  const [joinCode, setJoinCode] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isMuted, setIsMuted] = useState(getSoundMuted());
  const { canInstall, promptInstall } = usePwaInstall();

  // Load saved profile
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedName =
      localStorage.getItem('party_username') ||
      localStorage.getItem('bingo_username') ||
      'Player 1';
    const storedAvatar =
      localStorage.getItem('party_avatar') ||
      localStorage.getItem('bingo_avatar') ||
      'fox';

    setPlayerName(storedName);
    setSelectedAvatar(storedAvatar);
  }, []);

  const saveProfile = (name: string, avatarId: string) => {
    const cleanName = name.trim().slice(0, 16) || 'Player 1';
    setPlayerName(cleanName);
    setSelectedAvatar(avatarId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('party_username', cleanName);
      localStorage.setItem('party_avatar', avatarId);
      localStorage.setItem('bingo_username', cleanName);
      localStorage.setItem('bingo_avatar', avatarId);
    }
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    setSoundMuted(next);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinCode.trim().toUpperCase();
    if (!clean) return;
    playClickSound();
    onJoinRoomDirect(clean);
  };

  const currentAvatarObj = AVATAR_OPTIONS.find((a) => a.id === selectedAvatar) || AVATAR_OPTIONS[0];

  return (
    <div className="w-full min-h-screen flex flex-col justify-between bg-[#f8fafc] text-slate-900 select-none">
      {/* Top Bar */}
      <header className="w-full bg-white border-b border-slate-200/90 px-4 py-3.5 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-slate-900">Party Arena</span>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60 hidden sm:inline-block">
              Multiplayer
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Install PWA Button (Shows when browser can install) */}
            {canInstall && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  promptInstall();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer animate-pulse"
                title="Install Party Arena on your device"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Install App</span>
                <span className="sm:hidden">Install</span>
              </button>
            )}

            {/* Player profile badge */}
            <button
              onClick={() => {
                playClickSound();
                setIsEditingProfile(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all text-left shadow-xs cursor-pointer"
              title="Edit Profile"
            >
              <span className="text-lg">{currentAvatarObj.emoji}</span>
              <span className="font-bold text-xs sm:text-sm text-slate-800 max-w-[120px] truncate">
                {playerName}
              </span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={handleToggleMute}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all shadow-xs"
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Game Showcase */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col items-center justify-center">
        {/* Title */}
        <div className="text-center max-w-xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Select a Game to Play</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
            Game Room
          </h1>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="w-full max-w-md mb-6 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs sm:text-sm text-rose-700 flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={onClearError} className="font-bold ml-2">✕</button>
          </div>
        )}

        {/* Game Showcase Grid */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mb-10">
          {/* 1. Bingo 25 Game Card */}
          <div
            onClick={() => {
              playClickSound();
              onOpenBingoLanding();
            }}
            className="group relative bg-white rounded-3xl border border-slate-200/90 shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 overflow-hidden cursor-pointer flex flex-col"
          >
            <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-100">
              <img
                src="/images/game_card_bingo_1794069371686.jpg"
                alt="Bingo 25"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex flex-col justify-end p-5 text-white">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                  Party Game
                </span>
                <h2 className="text-2xl font-black tracking-tight text-white">
                  Bingo 25
                </h2>
              </div>
            </div>

            <div className="p-4 flex items-center justify-between border-t border-slate-100 bg-white">
              <span className="text-xs font-semibold text-slate-600">
                5×5 Number Rush · 5-Line Win
              </span>
              <div className="flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                <span>Play</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Tic-Tac-Toe Game Card */}
          <div
            onClick={() => {
              playClickSound();
              onOpenTicTacToeLanding();
            }}
            className="group relative bg-white rounded-3xl border border-slate-200/90 shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 overflow-hidden cursor-pointer flex flex-col"
          >
            <div className="relative aspect-16/10 w-full overflow-hidden bg-gradient-to-br from-indigo-100 via-white to-rose-100">
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-1 p-8 text-3xl font-black text-indigo-600 sm:text-4xl">
                {['X', '', 'O', '', 'X', '', 'O', '', 'X'].map((cell, index) => (
                  <span key={index} className="grid place-items-center rounded-lg bg-white/80 shadow-sm">
                    {cell}
                  </span>
                ))}
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent p-5 pt-12 text-white">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-200">
                  Classic Duel
                </span>
                <h2 className="text-2xl font-black tracking-tight">Tic-Tac-Toe</h2>
              </div>
            </div>

            <div className="p-4 flex items-center justify-between border-t border-slate-100 bg-white">
              <span className="text-xs font-semibold text-slate-600">3×3 · Two-player strategy</span>
              <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
                <span>Play</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* 2. Dots & Boxes Game Card */}
          <div
            onClick={() => {
              playClickSound();
              onOpenDotsLanding();
            }}
            className="group relative bg-white rounded-3xl border border-slate-200/90 shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 overflow-hidden cursor-pointer flex flex-col"
          >
            <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-100">
              <img
                src="/images/game_card_dots_1794069372078.jpg"
                alt="Dots and Boxes"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex flex-col justify-end p-5 text-white">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300">
                  Grid Strategy
                </span>
                <h2 className="text-2xl font-black tracking-tight text-white">
                  Dots & Boxes
                </h2>
              </div>
            </div>

            <div className="p-4 flex items-center justify-between border-t border-slate-100 bg-white">
              <span className="text-xs font-semibold text-slate-600">
                Connect Dots · Claim Boxes
              </span>
              <div className="flex items-center gap-1 text-xs font-bold text-rose-600 group-hover:translate-x-1 transition-transform">
                <span>Play</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* 3. Paper Gun Battle Game Card */}
          <div
            onClick={() => {
              playClickSound();
              onOpenPaperGunLanding();
            }}
            className="group relative bg-white rounded-3xl border border-slate-200/90 shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 overflow-hidden cursor-pointer flex flex-col"
          >
            <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-100">
              <img
                src="/images/game_card_papergun_1794071992846.jpg"
                alt="Paper Gun Battle"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex flex-col justify-end p-5 text-white">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                  Paper Dueling
                </span>
                <h2 className="text-2xl font-black tracking-tight text-white">
                  Paper Gun Battle
                </h2>
              </div>
            </div>

            <div className="p-4 flex items-center justify-between border-t border-slate-100 bg-white">
              <span className="text-xs font-semibold text-slate-600">
                Draw 1, 3, 5, 7, 9 · 5-Character Duel
              </span>
              <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
                <span>Play</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Direct Room Code Join Bar */}
        <div className="w-full max-w-sm">
          <form
            onSubmit={handleJoinSubmit}
            className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm"
          >
            <div className="flex-1 flex items-center gap-1.5 px-2.5">
              <Hash className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Have a room code?"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={8}
                className="w-full text-xs sm:text-sm font-bold tracking-wider text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={!joinCode.trim()}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                joinCode.trim()
                  ? 'bg-slate-900 text-white cursor-pointer active:scale-95'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              Join
            </button>
          </form>
        </div>
      </main>

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 flex flex-col animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-lg">Player Profile</h3>
              </div>
              <button
                onClick={() => setIsEditingProfile(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Choose Avatar
                </label>
                <div className="grid grid-cols-4 gap-2.5">
                  {AVATAR_OPTIONS.map((av) => {
                    const isSelected = selectedAvatar === av.id;
                    return (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setSelectedAvatar(av.id);
                        }}
                        className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-xs'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-2xl">{av.emoji}</span>
                        <span className="text-[10px] font-medium text-slate-600 truncate max-w-full">
                          {av.label.split(' ')[1] || av.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  saveProfile(playerName, selectedAvatar);
                  setIsEditingProfile(false);
                }}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all shadow-md shadow-blue-500/20"
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-4">
        Party Arena · Real-time Multiplayer Web Games
      </footer>
    </div>
  );
};
