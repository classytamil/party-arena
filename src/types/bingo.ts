/**
 * Bingo 5x5 Game Types, Constants, and Pure Evaluation Logic
 */

export type RoomStatus = 'WAITING' | 'STARTING' | 'PLAYING' | 'COMPLETED';

export interface Player {
  id: string;
  name: string;
  avatar: string; // Avatar ID
  card: number[]; // 25 numbers (1-25) in 5x5 order (row 0 to 4)
  daubed: boolean[]; // 25 booleans tracking stamped cells
  completedLines: number[]; // indices into WINNING_LINES (0..11)
  isHost: boolean;
  isReady: boolean;
  isBot: boolean;
  connected: boolean;
}

export interface CallLogEntry {
  callOrder: number;
  number: number;
  callerName: string;
  timestamp: number;
}

export interface Room {
  code: string;
  status: RoomStatus;
  maxPlayers: number;
  players: Player[];
  drawSequence: number[]; // All numbers 1-25 shuffled at match start
  drawIndex: number; // Current index in drawSequence
  calledNumbers: number[]; // Numbers announced so far
  callHistory?: CallLogEntry[]; // Chronological log of all called numbers
  currentNumber: number | null; // Last announced number
  winner: Player | null; // Winner once 5 lines are formed
  autoDrawInterval: number; // 0 for manual, or milliseconds (e.g. 4000)
  currentTurnPlayerId: string; // ID of player whose turn it is to pick a number
  turnIndex: number; // Index in players array
  lastCallerName: string | null; // Name of player who called the last number
  createdAt: number;
}

// 12 possible winning lines on a 5x5 grid (indexed 0..24)
export const WINNING_LINES: { name: string; type: 'horizontal' | 'vertical' | 'diagonal'; indices: number[] }[] = [
  // 5 Horizontal rows
  { name: 'Row 1', type: 'horizontal', indices: [0, 1, 2, 3, 4] },
  { name: 'Row 2', type: 'horizontal', indices: [5, 6, 7, 8, 9] },
  { name: 'Row 3', type: 'horizontal', indices: [10, 11, 12, 13, 14] },
  { name: 'Row 4', type: 'horizontal', indices: [15, 16, 17, 18, 19] },
  { name: 'Row 5', type: 'horizontal', indices: [20, 21, 22, 23, 24] },

  // 5 Vertical columns
  { name: 'Col B', type: 'vertical', indices: [0, 5, 10, 15, 20] },
  { name: 'Col I', type: 'vertical', indices: [1, 6, 11, 16, 21] },
  { name: 'Col N', type: 'vertical', indices: [2, 7, 12, 17, 22] },
  { name: 'Col G', type: 'vertical', indices: [3, 8, 13, 18, 23] },
  { name: 'Col O', type: 'vertical', indices: [4, 9, 14, 19, 24] },

  // 2 Diagonals
  { name: 'Diagonal ↘', type: 'diagonal', indices: [0, 6, 12, 18, 24] },
  { name: 'Diagonal ↙', type: 'diagonal', indices: [4, 8, 12, 16, 20] },
];

export const WINNING_LINES_COUNT = 5; // First to 5 lines wins!

// 8 curated player avatars with colors & themes
export interface AvatarOption {
  id: string;
  label: string;
  emoji: string;
  bgGradient: string;
  borderColor: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'fox', label: 'Lucky Fox', emoji: '🦊', bgGradient: 'from-amber-500 to-orange-600', borderColor: 'border-amber-400' },
  { id: 'tiger', label: 'Golden Tiger', emoji: '🐯', bgGradient: 'from-yellow-500 to-amber-600', borderColor: 'border-yellow-400' },
  { id: 'panda', label: 'Chill Panda', emoji: '🐼', bgGradient: 'from-slate-600 to-slate-800', borderColor: 'border-slate-400' },
  { id: 'dragon', label: 'Blaze Dragon', emoji: '🐲', bgGradient: 'from-emerald-500 to-teal-700', borderColor: 'border-emerald-400' },
  { id: 'lion', label: 'Crown Lion', emoji: '🦁', bgGradient: 'from-orange-500 to-red-600', borderColor: 'border-orange-400' },
  { id: 'owl', label: 'Wise Owl', emoji: '🦉', bgGradient: 'from-indigo-600 to-purple-800', borderColor: 'border-indigo-400' },
  { id: 'cat', label: 'Neon Cat', emoji: '🐱', bgGradient: 'from-pink-500 to-rose-600', borderColor: 'border-pink-400' },
  { id: 'alien', label: 'Star Voyager', emoji: '👾', bgGradient: 'from-cyan-500 to-blue-600', borderColor: 'border-cyan-400' },
];

/**
 * Fisher-Yates array shuffle helper
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generates an independently randomized 5x5 card with numbers 1 to 25.
 * Every number 1..25 appears exactly once.
 */
export function generateBingoCard(): number[] {
  const numbers = Array.from({ length: 25 }, (_, i) => i + 1);
  return shuffleArray(numbers);
}

/**
 * Calculates which of the 12 lines are completed on a card.
 * A cell is considered active if it is daubed (or daubed with called validation).
 */
export function getCompletedLineIndices(daubed: boolean[]): number[] {
  const completed: number[] = [];
  WINNING_LINES.forEach((line, index) => {
    const isLineComplete = line.indices.every((cellIdx) => daubed[cellIdx]);
    if (isLineComplete) {
      completed.push(index);
    }
  });
  return completed;
}

/**
 * Generates a clean 6-character alphanumeric room code (e.g. 'BNG739')
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
