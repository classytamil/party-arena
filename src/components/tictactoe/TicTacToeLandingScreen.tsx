/**
 * Professional Tic-Tac-Toe Landing Screen
 * Features avatar picker, randomized fun names, rules modal, sound toggle,
 * instant bot matches, private room creation, and room joining.
 */

import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Users,
  Hash,
  ArrowRight,
  Shuffle,
  Bot,
  HelpCircle,
  X as CloseIcon,
  Sparkles,
} from 'lucide-react';
import { AVATAR_OPTIONS } from '../../types/bingo';
import { getSoundMuted, setSoundMuted, playClickSound } from '../../utils/sound';

interface TicTacToeLandingScreenProps {
  onCreateRoom: (playerName: string, avatar: string) => void;
  onQuickPlayVsBots: (playerName: string, avatar: string) => void;
  onJoinRoom: (code: string, playerName: string, avatar: string) => void;
  onBack: () => void;
  isLoading: boolean;
  errorMessage: string | null;
  onClearError: () => void;
}

const FUN_NAMES = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Riley', 'Casey', 'Quinn', 'Avery', 'Charlie'];

export const TicTacToeLandingScreen: React.FC<TicTacToeLandingScreenProps> = ({
  onCreateRoom,
  onQuickPlayVsBots,
  onJoinRoom,
  onBack,
  isLoading,
  errorMessage,
  onClearError,
}) => {
  const [playerName, setPlayerName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('party_username') ||
        localStorage.getItem('bingo_username') ||
        'Player 1'
      );
    }
    return 'Player 1';
  });

  const [selectedAvatar, setSelectedAvatar] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('party_avatar') ||
        localStorage.getItem('bingo_avatar') ||
        'fox'
      );
    }
    return 'fox';
  });

  const [joinCode, setJoinCode] = useState<string>('');
  const [showAvatarPicker, setShowAvatarPicker] = useState<boolean>(false);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(getSoundMuted());

  const currentAvatarObj =
    AVATAR_OPTIONS.find((a) => a.id === selectedAvatar) || AVATAR_OPTIONS[0];

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    setSoundMuted(next);
  };

  const handleRandomizeName = () => {
    playClickSound();
    const random = FUN_NAMES[Math.floor(Math.random() * FUN_NAMES.length)];
    setPlayerName(random);
    saveIdentity(random, selectedAvatar);
  };

  const saveIdentity = (name: string, avatar: string) => {
    const clean = name.trim().slice(0, 16) || 'Player 1';
    if (typeof window !== 'undefined') {
      localStorage.setItem('party_username', clean);
      localStorage.setItem('party_avatar', avatar);
      localStorage.setItem('bingo_username', clean);
      localStorage.setItem('bingo_avatar', avatar);
    }
    return clean;
  };

  const handleQuickPlay = () => {
    playClickSound();
    onClearError();
    const name = saveIdentity(playerName, selectedAvatar);
    onQuickPlayVsBots(name, selectedAvatar);
  };

  const handleCreate = () => {
    playClickSound();
    onClearError();
    const name = saveIdentity(playerName, selectedAvatar);
    onCreateRoom(name, selectedAvatar);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    onClearError();
    const code = joinCode.trim().toUpperCase();
    if (!code || code.length < 4) return;
    playClickSound();
    const name = saveIdentity(playerName, selectedAvatar);
    onJoinRoom(code, name, selectedAvatar);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col justify-between p-4 sm:p-6 select-none touch-manipulation">
      {/* Simple Top Navigation Header */}
      <header className="flex items-center justify-between max-w-sm mx-auto w-full pt-1">
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onBack();
          }}
          className="text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span>← Back to Games</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleMute}
            className="w-9 h-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center shadow-xs transition-all active:scale-95 cursor-pointer"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setShowHowToPlay(true);
            }}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
            <span>Rules</span>
          </button>
        </div>
      </header>

      {/* Main Center Card */}
      <main className="max-w-sm mx-auto w-full my-auto py-6">
        {/* Title Header with Modern Badge */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Classic 3×3 Grid Duel</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Tic-Tac-Toe
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Play vs smart AI bots or challenge a friend online
          </p>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs sm:text-sm text-rose-700 flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={onClearError} className="font-bold ml-2">✕</button>
          </div>
        )}

        {/* Clean Single Card Console */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl shadow-slate-200/50 space-y-4">
          {/* Player Profile */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Your Player Name
            </label>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setShowAvatarPicker(!showAvatarPicker);
                }}
                title="Change Avatar"
                className="w-12 h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-2xl shrink-0 transition-transform active:scale-95 cursor-pointer"
              >
                {currentAvatarObj.emoji}
              </button>

              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  maxLength={16}
                  value={playerName}
                  onChange={(e) => {
                    setPlayerName(e.target.value);
                    saveIdentity(e.target.value, selectedAvatar);
                  }}
                  placeholder="Your Name"
                  className="w-full h-12 px-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={handleRandomizeName}
                  title="Randomize Name"
                  className="p-3 bg-slate-50 rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-500 active:scale-95 transition-all cursor-pointer"
                >
                  <Shuffle className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Avatar Dropdown Picker */}
            {showAvatarPicker && (
              <div className="grid grid-cols-4 gap-2 mt-2 p-2 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
                {AVATAR_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setSelectedAvatar(opt.id);
                      saveIdentity(playerName, opt.id);
                      setShowAvatarPicker(false);
                    }}
                    className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                      selectedAvatar === opt.id
                        ? 'border-indigo-500 bg-indigo-50 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xl">{opt.emoji}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Play vs Bot (Primary highlight button) */}
          <button
            type="button"
            disabled={isLoading}
            onClick={handleQuickPlay}
            className="w-full h-13 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
          >
            <Bot className="w-4 h-4" />
            <span>{isLoading ? 'Starting…' : 'Play Instant Match (vs Bot)'}</span>
          </button>

          {/* Create Private Room */}
          <button
            type="button"
            disabled={isLoading}
            onClick={handleCreate}
            className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
          >
            <Users className="w-4 h-4" />
            <span>{isLoading ? 'Creating room…' : 'Create Private Room'}</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center py-1">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider absolute">
              or join with code
            </span>
          </div>

          {/* Join Code Input Form */}
          <form onSubmit={handleJoin} className="flex gap-2">
            <div className="relative flex-1">
              <Hash className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                maxLength={8}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                className="w-full h-11 pl-9 pr-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-black text-sm tracking-widest placeholder:font-bold placeholder:tracking-normal focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !joinCode.trim()}
              className="h-11 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-40"
            >
              <span>Join</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="text-center py-2">
        <p className="text-[11px] text-slate-400 font-medium">
          Party Arena · Multiplayer Game Hub
        </p>
      </footer>

      {/* Rules Modal */}
      {showHowToPlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-black text-sm">
                  #
                </div>
                <h3 className="text-lg font-black text-slate-900">How to Play</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setShowHowToPlay(false);
                }}
                className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 font-medium leading-relaxed">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-900 block mb-0.5">1. Turn Based 3×3 Grid</span>
                Players take alternating turns placing their assigned symbol (<span className="text-indigo-600 font-bold">X</span> or <span className="text-rose-500 font-bold">O</span>) on an empty cell.
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-900 block mb-0.5">2. Win Condition</span>
                Align 3 of your symbols horizontally, vertically, or diagonally across the board to claim the round.
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-900 block mb-0.5">3. Draws & Rematches</span>
                If all 9 cells are filled without a line of 3, the round ends in a draw. Keep playing with instant rematches to build your score!
              </div>
              <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-950">
                <span className="font-bold text-indigo-700 block mb-0.5">💡 Strategy Tip</span>
                Control the center cell early, watch out for opponent forks, and defend corner setups!
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setShowHowToPlay(false);
              }}
              className="mt-5 w-full h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
            >
              Got It, Let&apos;s Play!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
