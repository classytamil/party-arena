/**
 * Main Dots and Boxes Gameplay Screen
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  ArrowLeft,
  Clock,
  History,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Radio,
  Trophy,
} from 'lucide-react';
import { DotsRoom, DotsPlayer, PLAYER_COLORS } from '../../types/dots';
import { AVATAR_OPTIONS } from '../../types/bingo';
import { DotsBoard } from './DotsBoard';
import { buildDotsSnapshot } from '../../utils/dotsLogic';
import { getSoundMuted, setSoundMuted, playClickSound } from '../../utils/sound';

interface DotsGameScreenProps {
  room: DotsRoom;
  player: DotsPlayer;
  onDrawLine: (lineId: string) => void;
  onLeaveRoom: () => void;
  /** Re-open the results popup after it was closed (completed match only). */
  onShowResults?: () => void;
}

export const DotsGameScreen: React.FC<DotsGameScreenProps> = ({
  room,
  player,
  onDrawLine,
  onLeaveRoom,
  onShowResults,
}) => {
  const [isMuted, setIsMuted] = useState(getSoundMuted());
  const [showHistory, setShowHistory] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  // null = live board, otherwise number of moves applied in the review snapshot
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const activeMoveRef = useRef<HTMLButtonElement | null>(null);

  const totalMoves = room.moves.length;
  const isCompleted = room.status === 'COMPLETED';
  const isReviewing = viewIndex !== null && viewIndex < totalMoves;
  const shownIndex = isReviewing ? (viewIndex as number) : totalMoves;

  const totalBoxes = (room.gridSize - 1) * (room.gridSize - 1);
  const isMyTurn = room.status === 'PLAYING' && room.currentTurnPlayerId === player.id;
  const activePlayer = room.players.find((p) => p.id === room.currentTurnPlayerId);
  const activeColor = activePlayer
    ? PLAYER_COLORS[activePlayer.colorIndex % PLAYER_COLORS.length]
    : PLAYER_COLORS[0];

  // Reset review when a new match starts (rematch clears moves) or the board snaps to live
  useEffect(() => {
    if (viewIndex !== null && viewIndex >= totalMoves) setViewIndex(null);
  }, [viewIndex, totalMoves]);

  useEffect(() => {
    if (room.status === 'PLAYING' && totalMoves === 0) setViewIndex(null);
  }, [room.status, totalMoves]);

  const snapshot = useMemo(
    () => (isReviewing ? buildDotsSnapshot(room.gridSize, room.moves, shownIndex) : null),
    [isReviewing, room.gridSize, room.moves, shownIndex]
  );

  const shownMove = shownIndex > 0 ? room.moves[shownIndex - 1] : null;
  const claimedCount = snapshot
    ? Object.keys(snapshot.boxes).length
    : Object.keys(room.boxes).length;
  const remainingCount = totalBoxes - claimedCount;

  const goTo = (index: number | null) => {
    if (index === null || index >= totalMoves) {
      setViewIndex(null);
      return;
    }
    setViewIndex(Math.max(0, index));
  };
  const stepBack = () => goTo(shownIndex - 1);
  const stepForward = () => goTo(shownIndex + 1);

  // Keyboard navigation: ← / → step, Home / End jump
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (totalMoves === 0) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goTo(shownIndex - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goTo(shownIndex + 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        goTo(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        goTo(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shownIndex, totalMoves]);

  // Keep the active move visible in the history panel
  useEffect(() => {
    if (showHistory) activeMoveRef.current?.scrollIntoView({ block: 'nearest' });
  }, [showHistory, shownIndex]);

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    setSoundMuted(next);
  };

  useEffect(() => {
    if (!room.turnDeadline || room.status !== 'PLAYING') {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const remainingMs = room.turnDeadline! - Date.now();
      const sec = Math.max(0, Math.ceil(remainingMs / 1000));
      setTimeLeft(sec);
      if (sec <= 0) clearInterval(interval);
    }, 250);

    return () => clearInterval(interval);
  }, [room.turnDeadline, room.status]);

  const getAvatarEmoji = (avatarId: string) =>
    AVATAR_OPTIONS.find((a) => a.id === avatarId)?.emoji || '👤';

  const resultText = room.isTie
    ? "It's a tie!"
    : room.winners.some((w) => w.id === player.id)
    ? 'You won!'
    : `${room.winners[0]?.name || 'Opponent'} won`;

  const navBtn =
    'p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed transition-all touch-manipulation active:scale-95 duration-75 cursor-pointer';

  return (
    <div className="w-full min-h-screen flex flex-col bg-[#f8fafc] text-slate-900">
      <header className="w-full bg-white border-b border-slate-200/90 px-4 py-3 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                playClickSound();
                if (isCompleted || window.confirm('Leave the active match?')) onLeaveRoom();
              }}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all touch-manipulation active:scale-95 duration-75 cursor-pointer"
              title="Leave Room"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                  Dots &amp; Boxes
                </span>
                <span className="text-xs font-mono font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                  {room.code}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
                {room.gridSize}×{room.gridSize} Dots · {totalBoxes} Boxes · {remainingCount} left
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCompleted && onShowResults && (
              <button
                onClick={() => {
                  playClickSound();
                  onShowResults();
                }}
                className="p-2.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs touch-manipulation active:scale-95 duration-75 cursor-pointer"
                title="Show Results"
              >
                <Trophy className="w-4 h-4" />
                <span className="hidden md:inline">Results</span>
              </button>
            )}
            <button
              onClick={() => {
                playClickSound();
                setShowHistory(!showHistory);
              }}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs touch-manipulation active:scale-95 duration-75 cursor-pointer ${
                showHistory
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
              }`}
              title="Move Log"
            >
              <History className="w-4 h-4" />
              <span className="hidden md:inline">Moves</span>
            </button>
            <button
              onClick={handleToggleMute}
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all shadow-xs touch-manipulation active:scale-95 duration-75 cursor-pointer"
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-4 sm:py-6 flex flex-col items-center">
        <div className="w-full max-w-xl mb-4">
          {isCompleted ? (
            <div className="w-full p-3 sm:p-4 rounded-2xl border bg-amber-50/80 border-amber-300 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-amber-200">
                  <Trophy className="w-5 h-5 text-amber-500 fill-amber-400" />
                </div>
                <div>
                  <div className="text-xs text-amber-700 font-medium">Match finished · {resultText}</div>
                  <div className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Final board is locked · Review the moves below
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`w-full p-3 sm:p-4 rounded-2xl border transition-all flex items-center justify-between shadow-xs ${
                isMyTurn
                  ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-xs border"
                  style={{
                    borderColor: activeColor.primary,
                    backgroundColor: `${activeColor.primary}15`,
                  }}
                >
                  {getAvatarEmoji(activePlayer?.avatar || '')}
                </div>

                <div>
                  <div className="text-xs text-slate-500 font-medium">
                    {isMyTurn ? 'Your Turn' : "Opponent's Turn"}
                  </div>
                  <div className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                    <span>
                      {isMyTurn
                        ? isReviewing
                          ? 'Go back to live to move'
                          : 'Draw any line'
                        : `${activePlayer?.name}'s move`}
                    </span>
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: activeColor.primary }}
                    />
                  </div>
                </div>
              </div>

              {timeLeft !== null && (
                <div className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-xl font-mono text-xs font-bold">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{timeLeft}s</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-full max-w-xl mb-4 grid grid-cols-2 gap-2.5">
          {room.players.map((p) => {
            const pColor = PLAYER_COLORS[p.colorIndex % PLAYER_COLORS.length];
            const isTurn = !isCompleted && !isReviewing && p.id === room.currentTurnPlayerId;
            const isMe = p.id === player.id;
            const score = snapshot ? snapshot.scores[p.id] || 0 : p.score;

            return (
              <div
                key={p.id}
                className={`p-2.5 sm:p-3 rounded-2xl border transition-all flex flex-col justify-between ${
                  isTurn
                    ? 'border-blue-400 bg-white ring-2 ring-blue-500/30 shadow-md'
                    : 'border-slate-200 bg-white shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-base">{getAvatarEmoji(p.avatar)}</span>
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {p.name} {isMe ? '(You)' : ''}
                    </span>
                  </div>
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: pColor.primary }}
                  />
                </div>

                <div className="flex items-end justify-between mt-1 pt-1 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400 font-medium">
                    Boxes{isReviewing ? ` @ #${shownIndex}` : ''}
                  </span>
                  <span
                    className="text-lg font-black tabular-nums"
                    style={{ color: pColor.primary }}
                  >
                    {score}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <DotsBoard
          room={room}
          player={player}
          onDrawLine={onDrawLine}
          disabled={room.status !== 'PLAYING' || isReviewing}
          isReviewing={isReviewing}
          lines={snapshot?.lines}
          boxes={snapshot?.boxes}
          highlightLineId={snapshot ? snapshot.lastLineId : undefined}
          highlightBoxes={snapshot ? snapshot.lastBoxes : undefined}
          highlightPlayerName={snapshot ? snapshot.lastMove?.playerName ?? null : undefined}
        />

        {/* Move navigator (chess-style, view only) */}
        <div className="w-full max-w-[500px] mt-3 bg-white border border-slate-200 rounded-2xl shadow-xs p-2.5 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                className={navBtn}
                onClick={() => goTo(0)}
                disabled={totalMoves === 0 || shownIndex === 0}
                title="First move (Home)"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                className={navBtn}
                onClick={stepBack}
                disabled={totalMoves === 0 || shownIndex === 0}
                title="Previous move (←)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-w-0 text-center">
              <div className="text-xs font-bold text-slate-800 tabular-nums">
                {totalMoves === 0 ? 'No moves yet' : `Move ${shownIndex} / ${totalMoves}`}
              </div>
              {shownMove ? (
                <div className="text-[11px] text-slate-500 font-medium truncate flex items-center justify-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full inline-block shrink-0"
                    style={{
                      backgroundColor:
                        PLAYER_COLORS[shownMove.playerColorIndex % PLAYER_COLORS.length].primary,
                    }}
                  />
                  <span className="truncate">
                    {shownMove.playerName}
                    {shownMove.boxesCompleted > 0
                      ? ` · +${shownMove.boxesCompleted} box${shownMove.boxesCompleted > 1 ? 'es' : ''}`
                      : ' · drew a line'}
                  </span>
                </div>
              ) : (
                totalMoves > 0 && (
                  <div className="text-[11px] text-slate-500 font-medium">Starting position</div>
                )
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                className={navBtn}
                onClick={stepForward}
                disabled={!isReviewing}
                title="Next move (→)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                className={navBtn}
                onClick={() => goTo(null)}
                disabled={!isReviewing}
                title="Latest move (End)"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {isReviewing && (
            <button
              onClick={() => {
                playClickSound();
                goTo(null);
              }}
              className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all touch-manipulation active:scale-95 duration-75 cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{isCompleted ? 'Jump to final board' : 'Back to live game'}</span>
            </button>
          )}
        </div>
      </main>

      {showHistory && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs"
          onClick={() => setShowHistory(false)}
        >
          <div
            className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-6 animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-lg">Move History</h3>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 touch-manipulation active:scale-95 duration-75 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 font-medium pt-3">
              Tap a move to view the board at that point. View only — moves can't be undone.
            </p>

            <div className="flex-1 overflow-y-auto py-3 space-y-2">
              {room.moves.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No moves yet. Make the first line!</p>
              ) : (
                room.moves.map((m, idx) => {
                  const mColor = PLAYER_COLORS[m.playerColorIndex % PLAYER_COLORS.length];
                  const isActive = idx + 1 === shownIndex;
                  return (
                    <button
                      key={m.moveIndex}
                      ref={isActive ? activeMoveRef : undefined}
                      onClick={() => {
                        playClickSound();
                        goTo(idx + 1);
                        setShowHistory(false);
                      }}
                      className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-xs text-left transition-all cursor-pointer touch-manipulation ${
                        isActive
                          ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-500/20'
                          : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400 font-semibold w-7">
                          #{m.moveIndex}
                        </span>
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: mColor.primary }}
                        />
                        <span className="font-bold text-slate-800">{m.playerName}</span>
                        {idx === totalMoves - 1 && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 rounded">
                            Latest
                          </span>
                        )}
                      </div>

                      <div>
                        {m.boxesCompleted > 0 ? (
                          <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                            +{m.boxesCompleted} Box{m.boxesCompleted > 1 ? 'es' : ''} (Extra Turn)
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">Drew line</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
