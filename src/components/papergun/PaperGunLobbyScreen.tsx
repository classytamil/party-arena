/**
 * Graph-Paper Notebook Waiting Lobby for Paper Gun Battle
 */

import React, { useState } from 'react';
import { PaperGunRoom, PaperGunPlayer } from '../../types/paperGun';
import { Copy, Check, Play, Bot, ArrowLeft } from 'lucide-react';
import { playClickSound } from '../../utils/sound';

interface PaperGunLobbyScreenProps {
  room: PaperGunRoom;
  player: PaperGunPlayer;
  onToggleReady: () => Promise<void>;
  onAddBot: () => Promise<void>;
  onStartGame: () => Promise<void>;
  onLeaveRoom: () => Promise<void>;
  isLoading: boolean;
  errorMessage: string | null;
  onClearError: () => void;
}

export const PaperGunLobbyScreen: React.FC<PaperGunLobbyScreenProps> = ({
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
  const [copied, setCopied] = useState(false);

  const isHost = player.isHost;
  const canStart =
    isHost &&
    room.players.length === 2 &&
    room.players.every((p) => p.isReady);

  const handleCopyCode = () => {
    playClickSound();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const opponent = room.players.find((p) => p.id !== player.id);

  return (
    <div
      className="w-full min-h-screen bg-[#fffdf9] text-slate-900 flex flex-col justify-between select-none"
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
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onLeaveRoom();
            }}
            className="flex items-center gap-1.5 text-xs font-black text-slate-900 px-3 py-1.5 rounded-xl border-2 border-slate-900 bg-white hover:bg-amber-100 shadow-[2px_2px_0px_#0f172a] transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Leave Lobby</span>
          </button>

          <span className="text-sm font-black text-slate-900">Duel Notebook Lobby</span>

          <div className="w-16" />
        </div>
      </header>

      {/* Main Lobby Area */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-8 flex flex-col items-center justify-center">
        {/* Room Code Sketch Card */}
        <div className="w-full bg-white rounded-3xl border-3 border-slate-900 shadow-[6px_6px_0px_#0f172a] p-5 sm:p-6 mb-6 text-center">
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-1">
            Duel Room Code
          </span>
          <div className="flex items-center justify-center gap-3">
            <span className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-slate-950">
              {room.code}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="p-2 rounded-xl bg-amber-200 hover:bg-amber-300 border-2 border-slate-900 text-slate-950 transition-all cursor-pointer shadow-[2px_2px_0px_#0f172a]"
              title="Copy Room Code"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <span className="text-xs text-slate-600 font-bold mt-2 block">
            Share this code with Player 2 to join your notebook duel!
          </span>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="w-full mb-4 p-3 bg-rose-100 border-2 border-slate-900 rounded-2xl text-xs sm:text-sm font-bold text-rose-900 flex items-center justify-between shadow-[3px_3px_0px_#0f172a]">
            <span>{errorMessage}</span>
            <button onClick={onClearError} className="font-black ml-2">✕</button>
          </div>
        )}

        {/* 2 Player Dueling Lineup */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
          {/* Player 1 (You) */}
          <div className="p-4 rounded-2xl bg-amber-50 border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🤠</span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm text-slate-950">{player.name}</span>
                  <span className="text-[10px] font-black text-blue-900 bg-blue-100 border border-blue-900/30 px-1.5 py-0.2 rounded">
                    YOU
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-600">
                  {player.isHost ? 'Host' : 'Guest'}
                </span>
              </div>
            </div>

            <span
              className={`text-xs font-black px-2.5 py-1 rounded-xl border border-slate-900 ${
                player.isReady
                  ? 'bg-emerald-300 text-slate-950'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {player.isReady ? 'Ready' : 'Wait'}
            </span>
          </div>

          {/* Player 2 (Opponent or Slot) */}
          {opponent ? (
            <div className="p-4 rounded-2xl bg-white border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{opponent.isBot ? '🤖' : '🥷'}</span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm text-slate-950">{opponent.name}</span>
                    {opponent.isBot && (
                      <span className="text-[10px] font-black text-amber-900 bg-amber-200 border border-slate-900/30 px-1.5 py-0.2 rounded">
                        BOT
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-slate-600">
                    {opponent.isBot ? 'Computer' : 'Guest'}
                  </span>
                </div>
              </div>

              <span
                className={`text-xs font-black px-2.5 py-1 rounded-xl border border-slate-900 ${
                  opponent.isReady
                    ? 'bg-emerald-300 text-slate-950'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {opponent.isReady ? 'Ready' : 'Wait'}
              </span>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-white/80 border-2 border-dashed border-slate-500 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500">
                <span className="text-xl">👤</span>
                <span className="text-xs font-black">Waiting for Player 2...</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onAddBot();
                }}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-xl bg-amber-300 hover:bg-amber-200 border-2 border-slate-900 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer transition-all shadow-[2px_2px_0px_#0f172a]"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Add Bot</span>
              </button>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="w-full flex flex-col gap-2.5">
          {!player.isHost && (
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onToggleReady();
              }}
              disabled={isLoading}
              className={`w-full py-3.5 rounded-2xl font-black text-sm tracking-wide border-2 border-slate-900 shadow-[4px_4px_0px_#0f172a] transition-all cursor-pointer ${
                player.isReady
                  ? 'bg-slate-200 text-slate-900'
                  : 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
              }`}
            >
              {player.isReady ? 'Unready' : 'Ready Up'}
            </button>
          )}

          {isHost && (
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onStartGame();
              }}
              disabled={isLoading || !canStart}
              className={`w-full py-4 rounded-2xl font-black text-sm tracking-wide border-2 border-slate-900 transition-all flex items-center justify-center gap-2 ${
                canStart
                  ? 'bg-amber-300 hover:bg-amber-200 text-slate-950 shadow-[4px_4px_0px_#0f172a] cursor-pointer active:translate-y-0.5'
                  : 'bg-slate-200 text-slate-400 border-slate-400 cursor-not-allowed'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {room.players.length < 2
                  ? 'Waiting for Opponent...'
                  : !room.players.every((p) => p.isReady)
                  ? 'Waiting for Opponent to Ready...'
                  : 'Start Notebook Duel!'}
              </span>
            </button>
          )}
        </div>
      </main>

      <footer className="text-center text-xs font-bold text-slate-500 py-4">
        Paper Gun Battle · 2 Players Strategy
      </footer>
    </div>
  );
};
