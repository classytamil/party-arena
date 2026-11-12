import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Bot, Hash, Users } from 'lucide-react';
import { AVATAR_OPTIONS } from '../../types/bingo';
import { playClickSound } from '../../utils/sound';

interface TicTacToeLandingScreenProps {
  onCreateRoom: (name: string, avatar: string) => void;
  onQuickPlayVsBots: (name: string, avatar: string) => void;
  onJoinRoom: (code: string, name: string, avatar: string) => void;
  onBack: () => void;
  isLoading: boolean;
  errorMessage: string | null;
  onClearError: () => void;
}

export const TicTacToeLandingScreen: React.FC<TicTacToeLandingScreenProps> = ({
  onCreateRoom,
  onQuickPlayVsBots,
  onJoinRoom,
  onBack,
  isLoading,
  errorMessage,
  onClearError,
}) => {
  const [name, setName] = useState(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem('party_username') || 'Player 1'
      : 'Player 1'
  );
  const [avatar, setAvatar] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('party_avatar') || 'fox' : 'fox'
  );
  const [code, setCode] = useState('');
  const avatarEmoji = AVATAR_OPTIONS.find((option) => option.id === avatar)?.emoji || '🦊';

  const saveProfile = () => {
    const cleanName = name.trim().slice(0, 16) || 'Player 1';
    localStorage.setItem('party_username', cleanName);
    localStorage.setItem('party_avatar', avatar);
    setName(cleanName);
    return cleanName;
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] p-4 text-slate-900">
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Games
        </button>
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 grid h-20 w-20 grid-cols-3 gap-1 rounded-2xl bg-indigo-50 p-2 text-xl font-black text-indigo-600">
              {['X', 'O', 'X', 'O', 'X', 'O', 'X', 'O', 'X'].map((cell, index) => (
                <span key={index} className="grid place-items-center rounded-lg bg-white">
                  {index % 3 === 1 ? '' : cell}
                </span>
              ))}
            </div>
            <h1 className="text-3xl font-black tracking-tight">Tic-Tac-Toe</h1>
            <p className="mt-1 text-sm text-slate-500">A classic head-to-head game</p>
          </div>

          {errorMessage && (
            <div className="mb-4 flex justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {errorMessage}
              <button type="button" onClick={onClearError} aria-label="Dismiss error">✕</button>
            </div>
          )}

          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Your player
          </label>
          <div className="mb-5 flex gap-2">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-2xl">
              {avatarEmoji}
            </span>
            <input
              value={name}
              maxLength={16}
              onChange={(event) => setName(event.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 font-semibold outline-none focus:border-indigo-500"
              aria-label="Player name"
            />
            <select
              value={avatar}
              onChange={(event) => setAvatar(event.target.value)}
              className="w-16 rounded-xl border border-slate-200 bg-white text-center text-xl"
              aria-label="Avatar"
            >
              {AVATAR_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.emoji}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              playClickSound();
              onQuickPlayVsBots(saveProfile(), avatar);
            }}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-md hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50"
          >
            <Bot className="h-4 w-4" />
            {isLoading ? 'Starting…' : 'Play Instant Match (vs Bot)'}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              playClickSound();
              onCreateRoom(saveProfile(), avatar);
            }}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50"
          >
            <Users className="h-4 w-4" />
            {isLoading ? 'Creating room…' : 'Create Private Room'}
          </button>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              const cleanCode = code.trim().toUpperCase();
              if (!cleanCode) return;
              playClickSound();
              onJoinRoom(cleanCode, saveProfile(), avatar);
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-200 p-2"
          >
            <Hash className="ml-1 h-4 w-4 text-slate-400" />
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              maxLength={8}
              placeholder="Enter room code"
              aria-label="Room code"
              className="min-w-0 flex-1 py-2 text-sm font-bold tracking-widest outline-none"
            />
            <button
              type="submit"
              disabled={isLoading || !code.trim()}
              className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-40"
            >
              Join <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>
          <p className="mt-4 text-center text-xs text-slate-400">Create a room and share its code with a friend.</p>
        </section>
      </div>
    </main>
  );
};
