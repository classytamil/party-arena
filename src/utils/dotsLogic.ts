/**
 * Dots and Boxes Pure Mathematical & Rule Validation Logic
 */
import { DotsGridSize } from '../types/dots';

export interface BoxCoord {
  row: number;
  col: number;
}

/**
 * Returns the 4 boundary edge IDs that form a box at (row, col)
 */
export function getBoxEdges(row: number, col: number): [string, string, string, string] {
  return [
    `h-${row}-${col}`,     // Top
    `h-${row + 1}-${col}`, // Bottom
    `v-${row}-${col}`,     // Left
    `v-${row}-${col + 1}`, // Right
  ];
}

/**
 * Given a line ID, returns up to 2 boxes that share this edge
 */
export function getBoxesAdjacentToEdge(lineId: string, gridSize: DotsGridSize): BoxCoord[] {
  const parts = lineId.split('-');
  const type = parts[0];
  const r = parseInt(parts[1], 10);
  const c = parseInt(parts[2], 10);
  const boxes: BoxCoord[] = [];
  const maxBoxRow = gridSize - 1;
  const maxBoxCol = gridSize - 1;

  if (type === 'h') {
    // Horizontal edge: separates box (r-1, c) above and box (r, c) below
    if (r > 0 && c < maxBoxCol) {
      boxes.push({ row: r - 1, col: c });
    }
    if (r < maxBoxRow && c < maxBoxCol) {
      boxes.push({ row: r, col: c });
    }
  } else if (type === 'v') {
    // Vertical edge: separates box (r, c-1) to the left and box (r, c) to the right
    if (c > 0 && r < maxBoxRow) {
      boxes.push({ row: r, col: c - 1 });
    }
    if (c < maxBoxCol && r < maxBoxRow) {
      boxes.push({ row: r, col: c });
    }
  }

  return boxes;
}

/**
 * Checks if a specific box has all 4 sides drawn
 */
export function isBoxComplete(row: number, col: number, lines: Record<string, string>): boolean {
  const [top, bottom, left, right] = getBoxEdges(row, col);
  return Boolean(lines[top] && lines[bottom] && lines[left] && lines[right]);
}

/**
 * Count how many edges of a box are currently drawn
 */
export function getBoxEdgeDrawnCount(row: number, col: number, lines: Record<string, string>): number {
  const edges = getBoxEdges(row, col);
  let count = 0;
  for (const edge of edges) {
    if (lines[edge]) count++;
  }
  return count;
}

/**
 * Returns all possible edge IDs for a given grid size
 */
export function getAllPossibleEdges(gridSize: DotsGridSize): string[] {
  const edges: string[] = [];
  // Horizontal edges: gridSize rows, gridSize - 1 cols
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize - 1; c++) {
      edges.push(`h-${r}-${c}`);
    }
  }
  // Vertical edges: gridSize - 1 rows, gridSize cols
  for (let r = 0; r < gridSize - 1; r++) {
    for (let c = 0; c < gridSize; c++) {
      edges.push(`v-${r}-${c}`);
    }
  }
  return edges;
}

/**
 * Evaluates which new boxes are closed when a specific line is placed
 */
export function checkNewCompletedBoxes(
  lineId: string,
  currentLines: Record<string, string>,
  gridSize: DotsGridSize
): BoxCoord[] {
  // Test adding the line
  const hypotheticalLines = { ...currentLines, [lineId]: '__test__' };
  const adjacentBoxes = getBoxesAdjacentToEdge(lineId, gridSize);
  const completed: BoxCoord[] = [];

  for (const box of adjacentBoxes) {
    if (isBoxComplete(box.row, box.col, hypotheticalLines)) {
      completed.push(box);
    }
  }

  return completed;
}

/**
 * Smart AI Bot Move Calculation
 * 1. Prioritize any line that completes 1 or 2 boxes (claiming points & bonus turn!)
 * 2. Avoid lines that leave a box with 3 sides (giving opponent a free box)
 * 3. Fallback to least damaging / sacrificial move
 */
export function calculateBotMove(
  gridSize: DotsGridSize,
  lines: Record<string, string>
): string {
  const allEdges = getAllPossibleEdges(gridSize);
  const availableEdges = allEdges.filter((edge) => !lines[edge]);

  if (availableEdges.length === 0) return '';
  if (availableEdges.length === 1) return availableEdges[0];

  // Priority 1: Check for any edge that claims boxes right now!
  const scoringEdges: { edge: string; score: number }[] = [];
  for (const edge of availableEdges) {
    const closed = checkNewCompletedBoxes(edge, lines, gridSize);
    if (closed.length > 0) {
      scoringEdges.push({ edge, score: closed.length });
    }
  }

  // If we can close 2 boxes at once, take that immediately; otherwise any 1-box closure
  if (scoringEdges.length > 0) {
    scoringEdges.sort((a, b) => b.score - a.score);
    return scoringEdges[0].edge;
  }

  // Priority 2: Find "safe" edges that do NOT create a 3rd edge for any box
  const safeEdges: string[] = [];
  for (const edge of availableEdges) {
    const adjBoxes = getBoxesAdjacentToEdge(edge, gridSize);
    let createsThirdEdge = false;

    for (const box of adjBoxes) {
      const drawnCount = getBoxEdgeDrawnCount(box.row, box.col, lines);
      // If currently 2 edges are drawn, adding this edge makes it 3 (free gift for opponent!)
      if (drawnCount === 2) {
        createsThirdEdge = true;
        break;
      }
    }

    if (!createsThirdEdge) {
      safeEdges.push(edge);
    }
  }

  if (safeEdges.length > 0) {
    // Pick randomly among safe edges to feel natural
    const randomIndex = Math.floor(Math.random() * safeEdges.length);
    return safeEdges[randomIndex];
  }

  // Priority 3: Forced sacrifice — choose the edge that affects the fewest boxes or fewest cascades
  availableEdges.sort((a, b) => {
    const aBoxes = getBoxesAdjacentToEdge(a, gridSize).length;
    const bBoxes = getBoxesAdjacentToEdge(b, gridSize).length;
    return aBoxes - bBoxes;
  });

  return availableEdges[0];
}
