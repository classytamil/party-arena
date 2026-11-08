import React, { useMemo, useState } from 'react';
import { Room, Player, AVATAR_OPTIONS, WINNING_LINES, CallLogEntry } from '../types/bingo';
import {
  Volume2,
  VolumeX,
  ArrowLeft,
  History,
  CheckCircle2,
  ArrowUpDown,
  X,
} from 'lucide-react';
import { getSoundMuted, setSoundMuted, playClickSound, playDaubSound } from '../utils/sound';


interface GameScreenProps {
  room: Room;
  player: Player;
  onPickNumber: (number: number) => Promise<void>;
  onDrawNextNumber: () => Promise<void>;
  onLeaveRoom: () => Promise<void>;
}

/**
 * SVG coordinate mapping for each of the 12 winning lines on a 100x100 viewBox
 * Grid centers are at 10, 30, 50, 70, 90 along X and Y.
 */
const LINE_SVG_COORDS: { x1: number; y1: number; x2: number; y2: number }[] = [
  // 5 Horizontal rows (0..4)
  { x1: 6, y1: 10, x2: 94, y2: 10 },
  { x1: 6, y1: 30, x2: 94, y2: 30 },
  { x1: 6, y1: 50, x2: 94, y2: 50 },
  { x1: 6, y1: 70, x2: 94, y2: 70 },
  { x1: 6, y1: 90, x2: 94, y2: 90 },

  // 5 Vertical columns (5..9)
  { x1: 10, y1: 6, x2: 10, y2: 94 },
  { x1: 30, y1: 6, x2: 30, y2: 94 },
  { x1: 50, y1: 6, x2: 50, y2: 94 },
  { x1: 70, y1: 6, x2: 70, y2: 94 },
  { x1: 90, y1: 6, x2: 90, y2: 94 },

  // 2 Diagonals (10..11)
  { x1: 7, y1: 7, x2: 93, y2: 93 },
  { x1: 93, y1: 7, x2: 7, y2: 93 },
];

function getLetterBadge(num: number): { letter: string; colorClass: string } {
  if (num <= 5) return { letter: 'B', colorClass: 'bg-blue-600 text-white' };
  if (num <= 10) return { letter: 'I', colorClass: 'bg-emerald-500 text-white' };
  if (num <= 15) return { letter: 'N', colorClass: 'bg-amber-500 text-white' };
  if (num <= 20) return { letter: 'G', colorClass: 'bg-rose-500 text-white' };
  return { letter: 'O', colorClass: 'bg-indigo-600 text-white' };
}

export const GameScreen: React.FC<GameScreenProps> = ({
  room,
  player,
  onPickNumber,
  onLeaveRoom,
}) => {
  const [isMuted, setIsMuted] = useState(getSoundMuted());
  const [newestFirst, setNewestFirst] = useState(true);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    setSoundMuted(next);
  };

  const isMyTurn = room.currentTurnPlayerId === player.id;
  const currentTurnPlayer =
    room.players.find((p) => p.id === room.currentTurnPlayerId) || room.players[0];

  // Set of cell indices that belong to completed lines
  const winningCellIndices = useMemo(() => {
    const indices = new Set<number>();
    player.completedLines.forEach((lineIdx) => {
      const line = WINNING_LINES[lineIdx];
      if (line) {
        line.indices.forEach((cellIdx) => indices.add(cellIdx));
      }
    });
    return indices;
  }, [player.completedLines]);

  // Build chronological call history entries (fallback if callHistory array wasn't initialized)
  const callHistoryList: CallLogEntry[] = useMemo(() => {
    const base: CallLogEntry[] =
      room.callHistory && room.callHistory.length === room.calledNumbers.length
        ? room.callHistory
        : room.calledNumbers.map((num, idx) => ({
            callOrder: idx + 1,
            number: num,
            callerName: idx === room.calledNumbers.length - 1 && room.lastCallerName ? room.lastCallerName : 'Caller',
            timestamp: Date.now(),
          }));

    return newestFirst ? [...base].reverse() : base;
  }, [room.callHistory, room.calledNumbers, room.lastCallerName, newestFirst]);

  const getAvatar = (id: string) => {
    return AVATAR_OPTIONS.find((a) => a.id === id) || AVATAR_OPTIONS[0];
  };

  const BINGO_LETTERS = [
    { letter: 'B', activeBg: 'bg-blue-600 text-white shadow-[0_3px_0_#1d4ed8]' },
    { letter: 'I', activeBg: 'bg-emerald-500 text-white shadow-[0_3px_0_#047857]' },
    { letter: 'N', activeBg: 'bg-amber-500 text-white shadow-[0_3px_0_#b45309]' },
    { letter: 'G', activeBg: 'bg-rose-500 text-white shadow-[0_3px_0_#be123c]' },
    { letter: 'O', activeBg: 'bg-indigo-600 text-white shadow-[0_3px_0_#4338ca]' },
  ];

  const renderCallHistoryContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-blue-600" />
          <h3 className="font-display font-extrabold text-sm text-slate-900">
            Call History
          </h3>
          <span className="text-xs font-mono font-bold text-slate-400">
            ({room.calledNumbers.length}/25)
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            setNewestFirst(!newestFirst);
          }}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-[11px] font-semibold text-slate-600 transition-colors"
          title="Toggle chronological sort order"
        >
          <ArrowUpDown className="w-3 h-3" />
          <span>{newestFirst ? 'Newest' : '#1 First'}</span>
        </button>
      </div>

      {/* Quick 1-25 Verification Strip */}
      <div className="mb-3">
        <div className="text-[11px] font-semibold text-slate-400 mb-1.5">
          All Numbers (1–25)
        </div>
        <div className="grid grid-cols-5 gap-1">
          {Array.from({ length: 25 }, (_, i) => i + 1).map((num) => {
            const isCalled = room.calledNumbers.includes(num);
            const isLatest = room.currentNumber === num;
            return (
              <div
                key={num}
                className={`h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold transition-all ${
                  isLatest
                    ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-500/40'
                    : isCalled
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {num}
              </div>
            );
          })}
        </div>
      </div>

      {/* Chronological Call List */}
      <div className="text-[11px] font-semibold text-slate-400 mb-1.5">
        Chronological Log
      </div>

      {callHistoryList.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-xs text-slate-400">
          <p>No numbers called yet.</p>
          <p className="text-[11px] mt-0.5">Called numbers will appear here in order.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[260px] lg:max-h-[310px]">
          {callHistoryList.map((entry) => {
            const badge = getLetterBadge(entry.number);
            const cellIdx = player.card.indexOf(entry.number);
            const isMarkedOnMyCard = cellIdx !== -1 && player.daubed[cellIdx];
            const isLatest = room.currentNumber === entry.number;

            return (
              <div
                key={entry.callOrder}
                className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs transition-all ${
                  isLatest
                    ? 'bg-amber-50/90 border-amber-300 shadow-2xs'
                    : 'bg-slate-50/80 border-slate-200/70'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono font-bold text-[11px] text-slate-400 w-6 shrink-0">
                    #{entry.callOrder}
                  </span>
                  <span
                    className={`w-6 h-6 rounded-lg ${badge.colorClass} font-display font-black text-xs flex items-center justify-center shrink-0`}
                  >
                    {entry.number}
                  </span>
                  <div className="truncate">
                    <span className="font-semibold text-slate-700 truncate">
                      {entry.callerName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {isMarkedOnMyCard ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Marked</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-amber-600">
                      Missed
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col justify-between p-3 sm:p-5 select-none">
      {/* 1. Minimal Top Bar */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between pt-0.5">
        <button
          type="button"
          onClick={onLeaveRoom}
          className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-semibold shadow-2xs transition-all active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Leave</span>
        </button>

        <div className="text-xs font-mono font-bold text-slate-400 tracking-wider">
          ROOM: <span className="text-slate-700">{room.code}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Call History Drawer Toggle */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setMobileHistoryOpen(true);
            }}
            className="lg:hidden flex items-center gap-1.5 px-3 h-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-semibold shadow-2xs transition-all active:scale-95"
          >
            <History className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-mono">{room.calledNumbers.length}/25</span>
          </button>

          <button
            type="button"
            onClick={handleToggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            className="w-9 h-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-600 flex items-center justify-center shadow-2xs transition-all active:scale-95"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-500" />
            ) : (
              <Volume2 className="w-4 h-4 text-slate-700" />
            )}
          </button>
        </div>
      </header>

      {/* Main Arena: Center Board + Call History Side Panel */}
      <main className="max-w-4xl mx-auto w-full my-auto py-2 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left/Center Column: The 5x5 Game Board (lg:col-span-7) */}
        <div className="lg:col-span-7 flex flex-col gap-3.5 max-w-md mx-auto w-full">
          {/* 2. Compact Player Avatars Strip (Opponent line counts kept secret!) */}
          <div className="flex items-center justify-center gap-2 sm:gap-2.5 overflow-x-auto py-1 px-1">
            {room.players.map((p) => {
              const avatar = getAvatar(p.avatar);
              const isTurn = room.currentTurnPlayerId === p.id;
              const isMe = p.id === player.id;
              const myLines = Math.min(5, p.completedLines.length);

              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border transition-all shrink-0 ${
                    isTurn
                      ? 'bg-white border-blue-500 ring-2 ring-blue-500/20 shadow-xs scale-[1.02]'
                      : 'bg-white/70 border-slate-200/80 opacity-80'
                  }`}
                >
                  <div className="relative text-lg leading-none">
                    <span>{avatar.emoji}</span>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-1">
                      <span className="font-display font-bold text-xs text-slate-800 max-w-[76px] truncate">
                        {isMe ? 'You' : p.name}
                      </span>
                      {isMe && (
                        <span className="text-[10px] font-mono font-extrabold px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-600">
                          {myLines}/5
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-semibold leading-tight">
                      {isTurn ? (
                        <span className="text-blue-600">
                          {isMe ? 'Your Turn' : 'Picking...'}
                        </span>
                      ) : (
                        <span className="text-slate-400">Waiting</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Turn Status & Last Called Pill */}
          <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isMyTurn ? 'bg-blue-600 animate-ping' : 'bg-amber-500'
                }`}
              />
              <span className="font-display font-bold text-xs sm:text-sm text-slate-800">
                {isMyTurn
                  ? 'Your turn — tap any number'
                  : `${currentTurnPlayer?.name}'s turn...`}
              </span>
            </div>

            {room.currentNumber ? (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400">Last:</span>
                <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-white font-mono font-extrabold text-xs">
                  {room.currentNumber}
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-400 font-mono">0/25 called</span>
            )}
          </div>

          {/* 3 & 4. Unified B-I-N-G-O Progress Header + 5x5 Tactile Grid */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-3.5 sm:p-5 shadow-[0_10px_35px_rgb(0,0,0,0.05)]">
            {/* Unified B - I - N - G - O 5-Line Progress Header */}
            <div className="grid grid-cols-5 gap-2 sm:gap-2.5 mb-3">
              {BINGO_LETTERS.map((item, idx) => {
                const isLit = player.completedLines.length > idx;
                return (
                  <div
                    key={item.letter}
                    className={`h-11 sm:h-12 rounded-2xl flex flex-col items-center justify-center font-display font-black transition-all ${
                      isLit
                        ? `${item.activeBg} scale-[1.03] animate-pop`
                        : 'bg-slate-100 text-slate-400 border border-slate-200/60'
                    }`}
                  >
                    <span className="text-lg sm:text-xl leading-none">{item.letter}</span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-1 ${
                        isLit ? 'bg-white' : 'bg-slate-300'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* 5x5 Board Container with Continuous Strikethrough SVG Overlay */}
            <div className="relative touch-manipulation">
              <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
                {player.card.map((num, idx) => {
                  const isCalled = room.calledNumbers.includes(num);
                  const isPartWinningLine = winningCellIndices.has(idx);
                  const isLastCalled = room.currentNumber === num;
                  const canPickThis = isMyTurn && !isCalled;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (canPickThis) {
                          onPickNumber(num);
                        }
                      }}
                      disabled={isCalled || !isMyTurn}
                      className={`aspect-square rounded-2xl flex flex-col items-center justify-center font-display font-black relative select-none touch-manipulation transition-transform duration-75 ${
                        isCalled
                          ? isPartWinningLine
                            ? 'bg-emerald-500 text-white shadow-[0_3px_0_#047857] scale-[1.02]'
                            : 'bg-blue-600 text-white shadow-[0_3px_0_#1d4ed8]'
                          : canPickThis
                          ? 'bg-slate-50 hover:bg-blue-50 text-slate-800 hover:text-blue-600 border-2 border-slate-200 hover:border-blue-400 shadow-[0_3px_0_#e2e8f0] cursor-pointer hover:scale-[1.02] active:scale-95'
                          : 'bg-slate-50/80 text-slate-700 border border-slate-200/80 cursor-default opacity-85'
                      }`}
                    >
                      <span className="text-xl sm:text-2xl tabular-nums leading-none">
                        {num}
                      </span>

                      {isLastCalled && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-300 ring-2 ring-white" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* SVG Continuous Strikethrough Lines for Completed Lines */}
              {player.completedLines.length > 0 && (
                <svg
                  viewBox="0 0 100 100"
                  className="absolute inset-0 w-full h-full pointer-events-none z-10"
                  preserveAspectRatio="none"
                >
                  {player.completedLines.map((lineIdx) => {
                    const coords = LINE_SVG_COORDS[lineIdx];
                    if (!coords) return null;
                    return (
                      <line
                        key={lineIdx}
                        x1={coords.x1}
                        y1={coords.y1}
                        x2={coords.x2}
                        y2={coords.y2}
                        stroke="#fde047"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        className="animate-strike drop-shadow-xs"
                      />
                    );
                  })}
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Desktop Call History Side Panel (lg:col-span-5) */}
        <aside className="hidden lg:block lg:col-span-5 bg-white border border-slate-200/90 rounded-3xl p-5 shadow-[0_10px_35px_rgb(0,0,0,0.05)]">
          {renderCallHistoryContent()}
        </aside>
      </main>

      {/* Mobile Slide-Over Call History Drawer */}
      {mobileHistoryOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xs h-full p-5 shadow-2xl flex flex-col justify-between animate-pop">
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex justify-end mb-2">
                <button
                  type="button"
                  onClick={() => setMobileHistoryOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {renderCallHistoryContent()}
            </div>
          </div>
        </div>
      )}

      {/* 5. Quiet 1-Line Footer */}
      <footer className="max-w-4xl mx-auto w-full text-center text-xs text-slate-400 pb-1">
        {room.lastCallerName && room.currentNumber ? (
          <span>
            Last called: <strong className="text-slate-600">#{room.currentNumber}</strong> by{' '}
            <strong className="text-slate-600">{room.lastCallerName}</strong>
          </span>
        ) : (
          <span>Complete 5 lines horizontally, vertically, or diagonally to win</span>
        )}
      </footer>
    </div>
  );
};
