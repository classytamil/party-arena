/**
 * Dots and Boxes Multiplayer Game Types & Configurations
 */

export type DotsGridSize = 4 | 5 | 6 | 7 | 8 | 9; // Number of dots along one edge

export interface GridConfigOption {
  size: DotsGridSize;
  label: string;
  dotGrid: string;
  boxCount: number;
  description: string;
}

export const GRID_OPTIONS: GridConfigOption[] = [
  { size: 5, label: '4 × 4 Boxes', dotGrid: '5 × 5 Dots', boxCount: 16, description: '16 Boxes · Fast Match' },
  { size: 6, label: '5 × 5 Boxes', dotGrid: '6 × 6 Dots', boxCount: 25, description: '25 Boxes · Recommended' },
  { size: 7, label: '6 × 6 Boxes', dotGrid: '7 × 7 Dots', boxCount: 36, description: '36 Boxes · Tactical Arena' },
  { size: 8, label: '7 × 7 Boxes', dotGrid: '8 × 8 Dots', boxCount: 49, description: '49 Boxes · Grand Strategy' },
  { size: 9, label: '8 × 8 Boxes', dotGrid: '9 × 9 Dots', boxCount: 64, description: '64 Boxes · Ultimate Board' },
];



export interface PlayerColorTheme {
  name: string;
  primary: string; // Hex color for lines and text
  border: string;
  bg: string;
  bgLight: string;
  badgeBg: string;
  badgeText: string;
  ring: string;
}

export const PLAYER_COLORS: PlayerColorTheme[] = [
  {
    name: 'Blue',
    primary: '#3b82f6',
    border: 'border-blue-500',
    bg: 'bg-blue-500',
    bgLight: 'bg-blue-50',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
    ring: 'ring-blue-500',
  },
  {
    name: 'Rose',
    primary: '#f43f5e',
    border: 'border-rose-500',
    bg: 'bg-rose-500',
    bgLight: 'bg-rose-50',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-800',
    ring: 'ring-rose-500',
  },
  {
    name: 'Emerald',
    primary: '#10b981',
    border: 'border-emerald-500',
    bg: 'bg-emerald-500',
    bgLight: 'bg-emerald-50',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    ring: 'ring-emerald-500',
  },
  {
    name: 'Amber',
    primary: '#f59e0b',
    border: 'border-amber-500',
    bg: 'bg-amber-500',
    bgLight: 'bg-amber-50',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    ring: 'ring-amber-500',
  },
];

export interface DotsPlayer {
  id: string;
  name: string;
  avatar: string;
  colorIndex: number;
  score: number;
  isHost: boolean;
  isReady: boolean;
  isBot: boolean;
  connected: boolean;
}

export interface ClaimedBox {
  row: number;
  col: number;
  ownerId: string;
  ownerName: string;
  ownerColorIndex: number;
  completedMoveIndex: number;
}

export interface DotsMove {
  moveIndex: number;
  playerId: string;
  playerName: string;
  playerColorIndex: number;
  lineId: string;
  boxesCompleted: number; // 0, 1, or 2
  timestamp: number;
}

export type DotsRoomStatus = 'WAITING' | 'PLAYING' | 'COMPLETED';

export interface DotsRoom {
  code: string;
  status: DotsRoomStatus;
  gridSize: DotsGridSize; // e.g. 5 => 5x5 dots, 4x4 boxes (16 total)
  maxPlayers: number; // 2..4
  timerSeconds: number; // 0 = off, 15, 30
  players: DotsPlayer[];
  currentTurnPlayerId: string;
  turnIndex: number;
  lines: Record<string, string>; // edgeId -> playerId
  boxes: Record<string, ClaimedBox>; // `${r}-${c}` -> ClaimedBox
  moves: DotsMove[];
  winners: DotsPlayer[]; // Array to handle ties cleanly
  isTie: boolean;
  turnDeadline: number | null; // Timestamp if timer active
  lastDrawnLineId: string | null;
  lastCompletedBoxes: { row: number; col: number }[];
  comboActive: boolean; // Extra turn indicator
  createdAt: number;
}
