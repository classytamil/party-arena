/**
 * Graph-Paper Notebook Landing / Setup Screen for Paper Gun Battle
 */

import React, { useState, useEffect } from 'react';
import { Bot, Plus, LogIn, ArrowLeft, HelpCircle, Crosshair } from 'lucide-react';
import { playClickSound } from '../../utils/sound';

interface PaperGunTitleScreenProps {
  onCreateRoom: (playerName: string, avatar: string) => Promise<void>;
  onQuickPlayVsBots: (playerName: string, avatar: string) => Promise<void>;
  onJoinRoom: (code: string, playerName: string, avatar: string) => Promise<void>;
  onBackToHome: () => void;
  isLoading: boolean;
  errorMessage: string | null;
  onClearError: () => void;
}

export const PaperGunTitleScreen: React.FC<PaperGunTitleScreenProps> = ({
  onCreateRoom,
  onQuickPlayVsBots,
  onJoinRoom,
  onBackToHome,
  isLoading,
  errorMessage,
  onClearError,
}) => {
  const [playerName, setPlayerName] = useState('Player 1');
  const [avatar, setAvatar] = useState('cowboy');
  const [joinCode, setJoinCode] = useState('');
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedName =
      localStorage.getItem('party_username') ||
      localStorage.getItem('bingo_username') ||
      'Player 1';
    const storedAvatar =
      localStorage.getItem('party_avatar') ||
      localStorage.getItem('bingo_avatar') ||
      'cowboy';
    setPlayerName(storedName);
    setAvatar(storedAvatar);
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    onCreateRoom(playerName.trim() || 'Player 1', avatar);
  };

  const handleQuickPlay = () => {
    playClickSound();
    onQuickPlayVsBots(playerName.trim() || 'Player 1', avatar);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinCode.trim().toUpperCase();
    if (!clean) return;
    playClickSound();
    onJoinRoom(clean, playerName.trim() || 'Player 2', avatar);
  };

  return (
    <div
      className="w-full min-h-screen bg-[#fffdf9] text-slate-900 flex flex-col justify-between select-none touch-manipulation"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(239, 68, 68, 0.22) 2px, transparent 2px),
          linear-gradient(to right, rgba(59, 130, 246, 0.14) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(59, 130, 246, 0.14) 1px, transparent 1px),
          linear-gradient(to right, rgba(59, 130, 246, 0.06) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(59, 130, 246, 0.06) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 100px 100px, 100px 100px, 20px 20px, 20px 20px',
        backgroundPosition: '36px 0, 0 0, 0 0, 0 0, 0 0',
      }}
    >
      {/* Top Header */}
      <header className="w-full bg-white/90 backdrop-blur-xs border-b-2 border-slate-900 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onBackToHome();
            }}
            className="flex items-center gap-1.5 text-xs font-black text-slate-900 px-3 py-1.5 rounded-xl border-2 border-slate-900 bg-white hover:bg-amber-100 shadow-[2px_2px_0px_#0f172a] transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Games Hub</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-slate-900 tracking-tight">Paper Gun Battle</span>
            <span className="text-[10px] font-black text-slate-950 bg-amber-300 px-2 py-0.5 rounded-md border-2 border-slate-900">
              5 Characters
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              setShowHowToPlay(true);
            }}
            className="p-2 rounded-xl border-2 border-slate-900 bg-white hover:bg-amber-100 text-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all cursor-pointer"
            title="How to Play"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-8 flex flex-col items-center justify-center">
        {/* Title & Hand-Sketched Icon */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-300 text-slate-950 border-3 border-slate-900 flex items-center justify-center mx-auto mb-3 shadow-[4px_4px_0px_#0f172a] -rotate-2">
            <Crosshair className="w-8 h-8 text-slate-950" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
            Paper Gun Battle
          </h1>
          <p className="text-xs sm:text-sm font-bold text-slate-600 mt-1">
            Graph-paper stickman duel · Numbers 9, 7, 5, 3, 1
          </p>
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div className="w-full mb-4 p-3 bg-rose-100 border-2 border-slate-900 rounded-2xl text-xs sm:text-sm font-bold text-rose-900 flex items-center justify-between shadow-[3px_3px_0px_#0f172a]">
            <span>{errorMessage}</span>
            <button onClick={onClearError} className="font-black ml-2">✕</button>
          </div>
        )}

        {/* Setup Sketch Card */}
        <div className="w-full bg-white rounded-3xl border-3 border-slate-900 shadow-[6px_6px_0px_#0f172a] p-5 sm:p-7 space-y-4">
          {/* Quick Play vs Bot button */}
          <button
            type="button"
            disabled={isLoading}
            onClick={handleQuickPlay}
            className="w-full py-4 px-4 rounded-2xl bg-amber-300 hover:bg-amber-200 border-2 border-slate-900 text-slate-950 font-black text-sm tracking-wide shadow-[4px_4px_0px_#0f172a] active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Bot className="w-5 h-5" />
            <span>Instant Duel vs Bot</span>
          </button>

          <div className="relative flex items-center justify-center my-1">
            <div className="border-t-2 border-dashed border-slate-300 w-full" />
            <span className="bg-white px-3 text-[11px] font-black text-slate-500 uppercase tracking-wider">
              Or Multiplayer
            </span>
          </div>

          {/* Create Duel Room */}
          <form onSubmit={handleCreate}>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border-2 border-slate-900 text-white font-black text-xs sm:text-sm tracking-wide shadow-[4px_4px_0px_#475569] active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Private Duel Room</span>
            </button>
          </form>

          {/* Join Room */}
          <form onSubmit={handleJoin} className="flex gap-2 pt-1">
            <input
              type="text"
              placeholder="Room Code (e.g. PG42)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={8}
              className="flex-1 px-3.5 py-2.5 rounded-xl border-2 border-slate-900 text-xs sm:text-sm font-black tracking-wider placeholder:font-medium uppercase text-slate-900 focus:outline-none bg-slate-50 shadow-[2px_2px_0px_#0f172a]"
            />
            <button
              type="submit"
              disabled={isLoading || !joinCode.trim()}
              className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-50 border-2 border-slate-900 text-white font-black text-xs sm:text-sm transition-all shadow-[2px_2px_0px_#0f172a] cursor-pointer flex items-center gap-1.5"
            >
              <LogIn className="w-4 h-4" />
              <span>Join</span>
            </button>
          </form>
        </div>
      </main>

      {/* How to Play Modal */}
      {showHowToPlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#fffdf9] rounded-3xl border-3 border-slate-900 shadow-[8px_8px_0px_#0f172a] p-6 flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b-2 border-dashed border-slate-300 mb-4">
              <h3 className="font-black text-lg text-slate-900">Paper Gun Battle – Rules</h3>
              <button
                type="button"
                onClick={() => setShowHowToPlay(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-700 leading-relaxed font-medium">
              <div>
                <span className="font-black text-slate-950 block text-sm mb-0.5">1. Five Characters (9, 7, 5, 3, 1)</span>
                Each player has 5 separate stickman characters stacked vertically (`9, 7, 5, 3, 1`).
              </div>

              <div>
                <span className="font-black text-slate-950 block text-sm mb-0.5">2. Step-by-Step Progression (Per Character)</span>
                Each time you draw a character's number from the <strong>Number Dice</strong>, that character adds its next step:
                <ul className="list-disc list-inside space-y-0.5 mt-1 pl-1">
                  <li><strong>1st draw</strong>: Body</li>
                  <li><strong>2nd draw</strong>: Ears</li>
                  <li><strong>3rd draw</strong>: Hands</li>
                  <li><strong>4th draw</strong>: Legs</li>
                  <li><strong>5th draw</strong>: Empty Gun</li>
                  <li><strong>6th, 7th, 8th draws</strong>: 3 Bullets (1 bullet added per turn)</li>
                  <li><strong>9th draw</strong>: Trigger — <strong>Immediately Shoots & Eliminates an Opponent Character!</strong></li>
                </ul>
              </div>

              <div>
                <span className="font-black text-slate-950 block text-sm mb-0.5">3. Reloading After a Shot</span>
                After firing a shot, that character keeps 2 bullets in its gun — you only need to draw its number <strong>once to reload that single bullet</strong>, and <strong>once more for the trigger</strong> to shoot again!
              </div>

              <div>
                <span className="font-black text-slate-950 block text-sm mb-0.5">4. Winning Condition</span>
                Eliminated characters are crossed out permanently. The first player to eliminate all 5 opponent characters wins!
              </div>
            </div>

            <div className="pt-4 border-t-2 border-dashed border-slate-300 mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHowToPlay(false)}
                className="px-5 py-2 rounded-xl bg-amber-300 border-2 border-slate-900 text-slate-950 font-black text-xs shadow-[2px_2px_0px_#0f172a] cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center text-xs font-bold text-slate-500 py-4">
        Paper Gun Battle · Graph-Paper Notebook Strategy
      </footer>
    </div>
  );
};
