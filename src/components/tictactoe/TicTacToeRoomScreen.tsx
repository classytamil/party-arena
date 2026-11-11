import React, { useState } from 'react';
import { ArrowLeft, Check, RotateCcw, Share2, Trophy } from 'lucide-react';
import { AVATAR_OPTIONS } from '../../types/bingo';
import { TicTacToePlayer, TicTacToeRoom } from '../../types/ticTacToe';
import { playClickSound } from '../../utils/sound';

interface TicTacToeRoomScreenProps {
  room: TicTacToeRoom;
  player: TicTacToePlayer;
  isLoading: boolean;
  errorMessage: string | null;
  onClearError: () => void;
  onToggleReady: () => void;
  onStartGame: () => void;
  onPlayCell: (index: number) => void;
  onRematch: () => void;
  onLeaveRoom: () => void;
}

export const TicTacToeRoomScreen: React.FC<TicTacToeRoomScreenProps> = ({
  room,
  player,
  isLoading,
  errorMessage,
  onClearError,
  onToggleReady,
  onStartGame,
  onPlayCell,
  onRematch,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);
  const opponent = room.players.find((entry) => entry.id !== player.id);
  const currentPlayer = room.players.find((entry) => entry.id === room.currentTurnPlayerId);
  const isMyTurn = room.currentTurnPlayerId === player.id;
  const winner = room.players.find((entry) => entry.id === room.winnerId);
  const copyInvite = async () => {
    const invite = `${window.location.origin}?game=tictactoe&room=${room.code}`;
    await navigator.clipboard.writeText(invite);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  const avatarEmoji = (id: string) => AVATAR_OPTIONS.find((option) => option.id === id)?.emoji || '👤';

  return (
    <main className="min-h-screen bg-[#f8fafc] px-4 py-5 text-slate-900 sm:py-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onLeaveRoom();
            }}
            className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" /> Leave game
          </button>
          <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-sm font-bold tracking-widest">
            {room.code}
          </span>
        </header>

        {errorMessage && (
          <div className="mb-4 flex justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {errorMessage}
            <button type="button" onClick={onClearError} aria-label="Dismiss error">✕</button>
          </div>
        )}

        {room.status === 'WAITING' ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl sm:p-8">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Waiting lobby</p>
              <h1 className="mt-1 text-2xl font-black sm:text-3xl">Room {room.code}</h1>
              <p className="mt-2 text-sm text-slate-500">Invite one player, then both get ready.</p>
              <button
                type="button"
                onClick={copyInvite}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold hover:bg-slate-50"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
                {copied ? 'Invite copied' : 'Copy invite link'}
              </button>
            </div>

            <div className="my-7 grid grid-cols-2 gap-3">
              {[player, opponent].map((entry, index) => (
                <div key={entry?.id ?? `waiting-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <div className="text-3xl">{entry ? avatarEmoji(entry.avatar) : '⏳'}</div>
                  <div className="mt-2 truncate font-bold">{entry?.name ?? 'Waiting for player'}</div>
                  <div className={`mt-1 text-xs font-semibold ${entry?.isReady ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {entry?.isReady ? 'Ready' : entry ? 'Not ready' : 'Invite a friend'}
                  </div>
                  {entry?.id === player.id && <div className="text-[11px] text-slate-400">You</div>}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  playClickSound();
                  onToggleReady();
                }}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm font-bold ${player.isReady ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                {player.isReady ? 'I’m ready ✓' : 'Ready up'}
              </button>
              {player.isHost && (
                <button
                  type="button"
                  disabled={isLoading || room.players.length !== 2 || !room.players.every((entry) => entry.isReady)}
                  onClick={onStartGame}
                  className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Start game
                </button>
              )}
            </div>
            {player.isHost && room.players.length < 2 && (
              <p className="mt-3 text-center text-xs text-slate-400">A second player must join before the game can start.</p>
            )}
          </section>
        ) : (
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xl sm:p-7">
            <div className="relative mb-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
              {[player, opponent].map((entry, index) => (
                <React.Fragment key={entry?.id ?? index}>
                {index === 1 && <div className="px-1 text-xs font-black text-slate-300">VS</div>}
                <div className={`min-w-0 rounded-2xl border p-3 text-center ${entry?.id === room.currentTurnPlayerId ? 'border-indigo-300 bg-indigo-50 ring-2 ring-indigo-100' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="text-2xl">{entry ? avatarEmoji(entry.avatar) : '👤'}</div>
                  <div className="truncate text-sm font-bold">{entry?.name ?? 'Opponent'}</div>
                  <div className="font-black text-indigo-600">{entry?.symbol || '—'}</div>
                  <div className="text-[11px] text-slate-500">🏆 {entry?.wins ?? 0} · Draws {entry?.draws ?? 0}</div>
                </div>
                </React.Fragment>
              ))}
            </div>

            <div className="mb-4 min-h-7 text-center text-sm font-extrabold text-indigo-700" aria-live="polite">
              {room.status === 'COMPLETED'
                ? winner
                  ? `${winner.name} wins!`
                  : 'It’s a draw!'
                : isMyTurn
                  ? 'Your turn'
                  : `${currentPlayer?.name ?? 'Opponent'}’s turn`}
            </div>

            <div className="mx-auto grid aspect-square w-full max-w-[390px] grid-cols-3 gap-2 rounded-2xl bg-slate-200 p-2 sm:gap-3 sm:p-3">
              {room.board.map((symbol, index) => {
                const isWinningCell = room.winningCells.includes(index);
                const disabled = isLoading || room.status !== 'PLAYING' || !isMyTurn || symbol !== null;
                return (
                  <button
                    key={index}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      playClickSound();
                      onPlayCell(index);
                    }}
                    aria-label={`Cell ${index + 1}${symbol ? `: ${symbol}` : ''}`}
                    className={`grid place-items-center rounded-xl bg-white text-5xl font-black transition-colors sm:text-6xl ${isWinningCell ? 'bg-emerald-100 text-emerald-600' : symbol === 'X' ? 'text-indigo-600' : 'text-rose-500'} ${disabled ? 'cursor-default' : 'cursor-pointer hover:bg-indigo-50 active:scale-95'}`}
                  >
                    {symbol}
                  </button>
                );
              })}
            </div>

            {room.status === 'COMPLETED' && (
              <div className="mt-5 flex flex-col items-center gap-3 text-center">
                <div className="flex items-center gap-2 font-bold text-slate-700">
                  {winner ? <Trophy className="h-5 w-5 text-amber-500" /> : null}
                  {winner ? `${winner.name} takes the round` : 'Both players earn a draw'}
                </div>
                <button
                  type="button"
                  disabled={isLoading || room.players.length !== 2}
                  onClick={() => {
                    playClickSound();
                    onRematch();
                  }}
                  className="flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" /> Rematch
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
};
