export type TicTacToeSymbol = 'X' | 'O';
export type TicTacToeStatus = 'WAITING' | 'PLAYING' | 'COMPLETED';

export interface TicTacToePlayer {
  id: string;
  name: string;
  avatar: string;
  symbol: TicTacToeSymbol | null;
  wins: number;
  draws: number;
  isHost: boolean;
  isReady: boolean;
}

export interface TicTacToeRoom {
  code: string;
  status: TicTacToeStatus;
  players: TicTacToePlayer[];
  board: (TicTacToeSymbol | null)[];
  currentTurnPlayerId: string | null;
  winnerId: string | null;
  winningCells: number[];
  createdAt: number;
}

export const TIC_TAC_TOE_WINNING_LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function getTicTacToeWinningCells(
  board: (TicTacToeSymbol | null)[]
): number[] {
  const line = TIC_TAC_TOE_WINNING_LINES.find(
    ([a, b, c]) => board[a] !== null && board[a] === board[b] && board[b] === board[c]
  );
  return line ?? [];
}
