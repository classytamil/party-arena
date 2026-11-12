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
  isBot?: boolean;
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

export function calculateTicTacToeBotMove(
  board: (TicTacToeSymbol | null)[],
  botSymbol: TicTacToeSymbol
): number {
  const opponentSymbol: TicTacToeSymbol = botSymbol === 'X' ? 'O' : 'X';
  const available = board
    .map((cell, idx) => (cell === null ? idx : null))
    .filter((idx): idx is number => idx !== null);

  if (available.length === 0) return -1;
  if (available.length === 1) return available[0];

  const checkWin = (sym: TicTacToeSymbol, idx: number) => {
    const nextBoard = [...board];
    nextBoard[idx] = sym;
    return getTicTacToeWinningCells(nextBoard).length > 0;
  };

  // 1. Immediate win
  for (const idx of available) {
    if (checkWin(botSymbol, idx)) return idx;
  }

  // 2. Immediate block
  for (const idx of available) {
    if (checkWin(opponentSymbol, idx)) return idx;
  }

  const countThreats = (sym: TicTacToeSymbol, b: (TicTacToeSymbol | null)[]) => {
    let threats = 0;
    for (const [a, bIdx, c] of TIC_TAC_TOE_WINNING_LINES) {
      const line = [b[a], b[bIdx], b[c]];
      const symCount = line.filter((s) => s === sym).length;
      const emptyCount = line.filter((s) => s === null).length;
      if (symCount === 2 && emptyCount === 1) {
        threats++;
      }
    }
    return threats;
  };

  // 3. Create fork
  for (const idx of available) {
    const nextBoard = [...board];
    nextBoard[idx] = botSymbol;
    if (countThreats(botSymbol, nextBoard) >= 2) {
      return idx;
    }
  }

  // 4. Block opponent fork
  for (const idx of available) {
    const nextBoard = [...board];
    nextBoard[idx] = opponentSymbol;
    if (countThreats(opponentSymbol, nextBoard) >= 2) {
      return idx;
    }
  }

  // 5. Center
  if (board[4] === null) return 4;

  // 6. Opposite corner
  const oppositeCorners: [number, number][] = [
    [0, 8],
    [2, 6],
    [8, 0],
    [6, 2],
  ];
  for (const [opp, myCorner] of oppositeCorners) {
    if (board[opp] === opponentSymbol && board[myCorner] === null) {
      return myCorner;
    }
  }

  // 7. Open corners
  const openCorners = [0, 2, 6, 8].filter((idx) => board[idx] === null);
  if (openCorners.length > 0) {
    return openCorners[Math.floor(Math.random() * openCorners.length)];
  }

  // 8. Open sides
  const openSides = [1, 3, 5, 7].filter((idx) => board[idx] === null);
  if (openSides.length > 0) {
    return openSides[Math.floor(Math.random() * openSides.length)];
  }

  return available[0];
}
