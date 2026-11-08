/**
 * Simple, Clean Dots & Boxes Landing Screen with Box Size Dropdown
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
  ChevronDown,
} from 'lucide-react';
import { AVATAR_OPTIONS } from '../../types/bingo';
import { GRID_OPTIONS, DotsGridSize } from '../../types/dots';
import { getSoundMuted, setSoundMuted, playClickSound } from '../../utils/sound';

interface DotsTitleScreenProps {
  onCreateRoom: (playerName: string, avatar: string, gridSize: DotsGridSize, timerSeconds?: number) => void;
  onQuickPlayVsBots: (playerName: string, avatar: string, gridSize: DotsGridSize, botCount?: number) => void;
  onJoinRoom: (code: string, playerName: string, avatar: string) => void;
  onBackToHome: () => void;
  isLoading: boolean;
  errorMessage: string | null;
  onClearError: () => void;
}

const FUN_NAMES = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Riley', 'Casey', 'Quinn', 'Avery', 'Charlie'];

export const DotsTitleScreen: React.FC<DotsTitleScreenProps> = ({
  onCreateRoom,
  onQuickPlayVsBots,
  onJoinRoom,
  onBackToHome,
  isLoading,
  errorMessage,
  onClearError,
}) => {
  const [playerName, setPlayerName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('party_username') || localStorage.getItem('bingo_username') || 'Player 1';
    }
    return 'Player 1';
  });

  const [selectedAvatar, setSelectedAvatar] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('party_avatar') || localStorage.getItem('bingo_avatar') || 'fox';
    }
    return 'fox';
  });

  const [selectedGridSize, setSelectedGridSize] = useState<DotsGridSize>(6); // Default 5x5 boxes
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [joinCode, setJoinCode] = useState<string>('');
  const [showAvatarPicker, setShowAvatarPicker] = useState<boolean>(false);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(getSoundMuted());

  const currentAvatarObj = AVATAR_OPTIONS.find((a) => a.id === selectedAvatar) || AVATAR_OPTIONS[0];

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
    onQuickPlayVsBots(name, selectedAvatar, selectedGridSize, 1);
  };

  const handleCreate = () => {
    playClickSound();
    onClearError();
    const name = saveIdentity(playerName, selectedAvatar);
    onCreateRoom(name, selectedAvatar, selectedGridSize, timerSeconds);
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
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col justify-between p-4 sm:p-6 select-none">
      {/* Simple Header */}
      <header className="flex items-center justify-between max-w-sm mx-auto w-full pt-1">
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onBackToHome();
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
            <HelpCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Rules</span>
          </button>
        </div>
      </header>

      {/* Main Center Card */}
      <main className="max-w-sm mx-auto w-full my-auto py-6">
        {/* Simple Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-bold mb-2">
            <span>Multiplayer Grid Game</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Dots & Boxes
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Drag to connect dots · Claim boxes to score
          </p>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs sm:text-sm text-rose-700 flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={onClearError} className="font-bold ml-2">✕</button>
          </div>
        )}

        {/* Clean, Simple Single Card Console */}
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
                  className="w-full h-12 px-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm focus:outline-none focus:border-rose-500 focus:bg-white transition-colors"
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

            {/* Avatar Dropdown */}
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
                        ? 'border-rose-500 bg-rose-50 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xl">{opt.emoji}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* BOX SIZE OPTION: SIMPLE CLEAN DROPDOWN */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Box Size
            </label>
            <div className="relative">
              <select
                value={selectedGridSize}
                onChange={(e) => {
                  playClickSound();
                  setSelectedGridSize(Number(e.target.value) as DotsGridSize);
                }}
                className="w-full h-12 pl-4 pr-10 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-bold text-sm focus:outline-none focus:border-rose-500 focus:bg-white transition-colors appearance-none cursor-pointer"
              >
                {GRID_OPTIONS.map((opt) => (
                  <option key={opt.size} value={opt.size}>
                    {opt.label} ({opt.boxCount} boxes)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={handleQuickPlay}
              className="w-full py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm shadow-md shadow-rose-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Bot className="w-4 h-4" />
              <span>{isLoading ? 'Starting...' : 'Play Instant Match (vs Bot)'}</span>
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={handleCreate}
              className="w-full py-3 px-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Users className="w-4 h-4 text-slate-500" />
              <span>Create Private Room</span>
            </button>
          </div>

          {/* Room Code Join Form */}
          <div className="pt-2 border-t border-slate-100">
            <form onSubmit={handleJoin} className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                className="flex-1 h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-center font-mono font-bold text-sm tracking-widest text-slate-800 placeholder-slate-400 uppercase focus:outline-none focus:border-rose-500 focus:bg-white transition-colors"
              />
              <button
                type="submit"
                disabled={isLoading || joinCode.length < 4}
                className="px-4 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-40 shrink-0 cursor-pointer"
              >
                <span>Join</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Rules Modal */}
      {showHowToPlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-left animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900">How to Play Dots & Boxes</h3>
              <button
                onClick={() => {
                  playClickSound();
                  setShowHowToPlay(false);
                }}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-600">
              <p>• <strong>Connect Dots</strong>: Drag your finger or mouse between two adjacent dots to draw a line.</p>
              <p>• <strong>Claim Boxes</strong>: Drawing the 4th line of any box completes it and gives you +1 point.</p>
              <p>• <strong>Chain Extra Turns</strong>: Every claimed box awards an <em>immediate extra turn</em>!</p>
              <p>• <strong>Winner</strong>: Most claimed boxes when the board is full wins!</p>
            </div>

            <button
              onClick={() => {
                playClickSound();
                setShowHowToPlay(false);
              }}
              className="mt-6 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-2">
        Real-time Multiplayer · No registration needed
      </footer>
    </div>
  );
};
