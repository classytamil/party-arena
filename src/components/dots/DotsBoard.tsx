/**
 * Interactive Dots and Boxes Grid Board with High-Performance Drag-and-Drop
 * - Zero idle/placeholder lines (clean authentic dots board)
 * - No "1 LEFT!" hints (pure strategic gameplay)
 * - Direct DOM ref updates during pointer move for 60fps+ zero-lag dragging
 * - Directional vector + magnetic proximity snapping for effortless line connection
 */

import React, { useState, useRef, useCallback } from 'react';
import { DotsRoom, DotsPlayer, PLAYER_COLORS } from '../../types/dots';
import { AVATAR_OPTIONS } from '../../types/bingo';

interface DotsBoardProps {
  room: DotsRoom;
  player: DotsPlayer;
  onDrawLine: (lineId: string) => void;
  disabled?: boolean;
}

interface DotCoord {
  r: number;
  c: number;
}

export const DotsBoard: React.FC<DotsBoardProps> = ({
  room,
  player,
  onDrawLine,
  disabled = false,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const freeDragLineRef = useRef<SVGLineElement | null>(null);
  const dragStartRef = useRef<DotCoord | null>(null);
  const magneticTargetRef = useRef<DotCoord | null>(null);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);

  // React state only updates when start dot or snapped target dot changes (not on every pixel!)
  const [dragStartDot, setDragStartDot] = useState<DotCoord | null>(null);
  const [magneticTargetDot, setMagneticTargetDot] = useState<DotCoord | null>(null);
  const [selectedDot, setSelectedDot] = useState<DotCoord | null>(null);

  const gridSize = room.gridSize; // e.g. 6 dots for 5x5 boxes
  const boxRows = gridSize - 1;
  const boxCols = gridSize - 1;

  const isMyTurn = room.status === 'PLAYING' && room.currentTurnPlayerId === player.id;
  const myColor = PLAYER_COLORS[player.colorIndex % PLAYER_COLORS.length];
  const activePlayer = room.players.find((p) => p.id === room.currentTurnPlayerId);
  const activeColor = activePlayer ? PLAYER_COLORS[activePlayer.colorIndex % PLAYER_COLORS.length] : myColor;

  // Board dimensions in virtual SVG units (0 to 560)
  const SVG_SIZE = 560;
  const PADDING = 45;
  const playableSpan = SVG_SIZE - PADDING * 2;
  const step = playableSpan / (gridSize - 1);

  // Helper: Virtual SVG coordinates for dot (r, c)
  const getDotSvgPos = useCallback(
    (r: number, c: number) => ({
      x: PADDING + c * step,
      y: PADDING + r * step,
    }),
    [step]
  );

  // Convert browser client pointer coordinates (mouse/touch) into SVG virtual coords
  const getSvgCoordinates = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * SVG_SIZE,
      y: ((clientY - rect.top) / rect.height) * SVG_SIZE,
    };
  }, []);

  // Check if two dots are orthogonal adjacent neighbors (distance = 1)
  const areDotsAdjacent = (d1: DotCoord, d2: DotCoord) => {
    const dr = Math.abs(d1.r - d2.r);
    const dc = Math.abs(d1.c - d2.c);
    return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
  };

  // Compute line ID between two adjacent dots
  const getLineIdBetween = (d1: DotCoord, d2: DotCoord): string | null => {
    if (!areDotsAdjacent(d1, d2)) return null;
    if (d1.r === d2.r) {
      return `h-${d1.r}-${Math.min(d1.c, d2.c)}`;
    }
    if (d1.c === d2.c) {
      return `v-${Math.min(d1.r, d2.r)}-${d1.c}`;
    }
    return null;
  };

  // Find dot closest to a virtual SVG point within maxDistance
  const findDotNearPos = useCallback(
    (x: number, y: number, maxDistance: number = step * 0.62): DotCoord | null => {
      let closest: { dot: DotCoord; dist: number } | null = null;
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const dotPos = getDotSvgPos(r, c);
          const dist = Math.hypot(dotPos.x - x, dotPos.y - y);
          if (dist <= maxDistance) {
            if (!closest || dist < closest.dist) {
              closest = { dot: { r, c }, dist };
            }
          }
        }
      }
      return closest ? closest.dot : null;
    },
    [gridSize, getDotSvgPos, step]
  );

  // Directional vector + proximity snapping from source dot
  const resolveSnapTarget = useCallback(
    (startDot: DotCoord, x: number, y: number): DotCoord | null => {
      const startPos = getDotSvgPos(startDot.r, startDot.c);
      const dx = x - startPos.x;
      const dy = y - startPos.y;
      const dist = Math.hypot(dx, dy);

      // Must drag at least 18% of a grid step to snap
      if (dist < step * 0.18 || dist > step * 1.75) {
        return null;
      }

      // Determine primary axis of the drag vector
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (absX >= absY) {
        // Horizontal drag: check perpendicular drift is reasonable
        if (absY <= step * 0.58) {
          const targetCol = startDot.c + (dx > 0 ? 1 : -1);
          if (targetCol >= 0 && targetCol < gridSize) {
            return { r: startDot.r, c: targetCol };
          }
        }
      } else {
        // Vertical drag: check perpendicular drift is reasonable
        if (absX <= step * 0.58) {
          const targetRow = startDot.r + (dy > 0 ? 1 : -1);
          if (targetRow >= 0 && targetRow < gridSize) {
            return { r: targetRow, c: startDot.c };
          }
        }
      }

      return null;
    },
    [getDotSvgPos, gridSize, step]
  );

  // Update the live SVG line element directly without triggering React re-renders
  const updateFreeDragLineDOM = (startDot: DotCoord | null, currentX: number, currentY: number, snappedDot: DotCoord | null) => {
    const lineEl = freeDragLineRef.current;
    if (!lineEl) return;

    if (!startDot || snappedDot) {
      lineEl.setAttribute('opacity', '0');
      return;
    }

    const startPos = getDotSvgPos(startDot.r, startDot.c);
    lineEl.setAttribute('x1', String(startPos.x));
    lineEl.setAttribute('y1', String(startPos.y));
    lineEl.setAttribute('x2', String(currentX));
    lineEl.setAttribute('y2', String(currentY));
    lineEl.setAttribute('opacity', '0.75');
  };

  // Pointer Down (Start dragging from a dot)
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isMyTurn || disabled) return;

    const coords = getSvgCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    const dot = findDotNearPos(coords.x, coords.y, step * 0.62);
    if (dot) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture is unsupported
      }

      dragStartRef.current = dot;
      magneticTargetRef.current = null;
      pointerDownPosRef.current = coords;

      setDragStartDot(dot);
      setMagneticTargetDot(null);
      updateFreeDragLineDOM(dot, coords.x, coords.y, null);
    } else {
      setSelectedDot(null);
    }
  };

  // Pointer Move (Smoothly track pointer and snap to adjacent neighbor)
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const startDot = dragStartRef.current;
    if (!startDot || !isMyTurn || disabled) return;

    const coords = getSvgCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    const nextTarget = resolveSnapTarget(startDot, coords.x, coords.y);
    const prevTarget = magneticTargetRef.current;

    const changed =
      (nextTarget === null && prevTarget !== null) ||
      (nextTarget !== null && prevTarget === null) ||
      (nextTarget !== null &&
        prevTarget !== null &&
        (nextTarget.r !== prevTarget.r || nextTarget.c !== prevTarget.c));

    if (changed) {
      magneticTargetRef.current = nextTarget;
      setMagneticTargetDot(nextTarget);
    }

    updateFreeDragLineDOM(startDot, coords.x, coords.y, nextTarget);
  };

  // Pointer Up (Complete drag connection or handle tap-to-connect)
  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const startDot = dragStartRef.current;
    if (!startDot || !isMyTurn || disabled) {
      dragStartRef.current = null;
      magneticTargetRef.current = null;
      setDragStartDot(null);
      setMagneticTargetDot(null);
      updateFreeDragLineDOM(null, 0, 0, null);
      return;
    }

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    const coords = getSvgCoordinates(e.clientX, e.clientY);
    const target =
      magneticTargetRef.current ||
      (coords ? resolveSnapTarget(startDot, coords.x, coords.y) : null);

    // Case 1: User dragged and snapped to an adjacent dot
    if (target && areDotsAdjacent(startDot, target)) {
      const lineId = getLineIdBetween(startDot, target);
      if (lineId && !room.lines[lineId]) {
        onDrawLine(lineId);
        setSelectedDot(null);
      }
    } else {
      // Case 2: User tapped a dot without dragging (tap-A then tap-B fallback)
      const downPos = pointerDownPosRef.current;
      const tapMoveDist =
        coords && downPos ? Math.hypot(coords.x - downPos.x, coords.y - downPos.y) : 0;

      if (tapMoveDist < step * 0.18) {
        if (selectedDot && areDotsAdjacent(selectedDot, startDot)) {
          const lineId = getLineIdBetween(selectedDot, startDot);
          if (lineId && !room.lines[lineId]) {
            onDrawLine(lineId);
            setSelectedDot(null);
          } else {
            setSelectedDot(startDot);
          }
        } else if (selectedDot && selectedDot.r === startDot.r && selectedDot.c === startDot.c) {
          setSelectedDot(null);
        } else {
          setSelectedDot(startDot);
        }
      }
    }

    dragStartRef.current = null;
    magneticTargetRef.current = null;
    pointerDownPosRef.current = null;
    setDragStartDot(null);
    setMagneticTargetDot(null);
    updateFreeDragLineDOM(null, 0, 0, null);
  };

  const handlePointerCancel = () => {
    dragStartRef.current = null;
    magneticTargetRef.current = null;
    pointerDownPosRef.current = null;
    setDragStartDot(null);
    setMagneticTargetDot(null);
    updateFreeDragLineDOM(null, 0, 0, null);
  };

  const getAvatarEmoji = (avatarId: string) => {
    return AVATAR_OPTIONS.find((a) => a.id === avatarId)?.emoji || '🎮';
  };

  const dragStartSvgPos = dragStartDot ? getDotSvgPos(dragStartDot.r, dragStartDot.c) : null;
  const magneticTargetSvgPos = magneticTargetDot ? getDotSvgPos(magneticTargetDot.r, magneticTargetDot.c) : null;
  const isTargetAlreadyDrawn =
    dragStartDot && magneticTargetDot
      ? Boolean(room.lines[getLineIdBetween(dragStartDot, magneticTargetDot) || ''])
      : false;

  return (
    <div className="w-full flex flex-col justify-center items-center py-2 select-none">
      {/* Visual Gesture Clue */}
      {isMyTurn && (
        <div className="mb-2 text-xs font-semibold text-blue-600 bg-blue-50/90 border border-blue-200/70 px-3.5 py-1 rounded-full shadow-xs flex items-center gap-1.5">
          <span>👆 Drag from dot to adjacent dot to connect</span>
        </div>
      )}

      <div className="relative w-full max-w-[500px] aspect-square bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-2 sm:p-4 flex items-center justify-center">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          className="w-full h-full touch-none overflow-visible cursor-crosshair select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          {/* 1. RENDER CLAIMED BOXES ONLY (No "1 LEFT!" hints) */}
          {Array.from({ length: boxRows }).map((_, r) =>
            Array.from({ length: boxCols }).map((_, c) => {
              const boxKey = `${r}-${c}`;
              const claimed = room.boxes[boxKey];
              if (!claimed) return null;

              const x = PADDING + c * step;
              const y = PADDING + r * step;
              const width = step;
              const height = step;

              const isRecentlyClaimed = room.lastCompletedBoxes?.some(
                (b) => b.row === r && b.col === c
              );

              const ownerColor = PLAYER_COLORS[claimed.ownerColorIndex % PLAYER_COLORS.length];
              const owner = room.players.find((p) => p.id === claimed.ownerId);
              const emoji = owner ? getAvatarEmoji(owner.avatar) : '★';

              return (
                <g key={`box-${boxKey}`} className={isRecentlyClaimed ? 'animate-pop' : ''}>
                  <rect
                    x={x + 4}
                    y={y + 4}
                    width={width - 8}
                    height={height - 8}
                    rx={Math.min(12, step * 0.12)}
                    fill={ownerColor.primary}
                    fillOpacity={0.22}
                    stroke={ownerColor.primary}
                    strokeWidth={2}
                    strokeOpacity={0.4}
                  />

                  <text
                    x={x + width / 2}
                    y={y + height / 2 + (step > 90 ? 10 : 6)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="font-bold select-none pointer-events-none"
                    fontSize={Math.max(16, Math.min(30, step * 0.36))}
                  >
                    {emoji}
                  </text>

                  {step >= 85 && (
                    <text
                      x={x + width / 2}
                      y={y + height / 2 + step * 0.3}
                      textAnchor="middle"
                      fontSize={Math.max(10, step * 0.12)}
                      fontWeight="700"
                      fill={ownerColor.primary}
                      className="select-none pointer-events-none"
                    >
                      {claimed.ownerName.slice(0, 6)}
                    </text>
                  )}
                </g>
              );
            })
          )}

          {/* 2. RENDER DRAWN HORIZONTAL LINES */}
          {Array.from({ length: gridSize }).map((_, r) =>
            Array.from({ length: gridSize - 1 }).map((_, c) => {
              const lineId = `h-${r}-${c}`;
              const isDrawn = Boolean(room.lines[lineId]);
              if (!isDrawn) return null;

              const ownerPlayerId = room.lines[lineId];
              const owner = room.players.find((p) => p.id === ownerPlayerId);
              const ownerColor = owner ? PLAYER_COLORS[owner.colorIndex % PLAYER_COLORS.length] : null;

              const x1 = PADDING + c * step;
              const y1 = PADDING + r * step;
              const x2 = PADDING + (c + 1) * step;
              const y2 = y1;
              const isLastDrawn = room.lastDrawnLineId === lineId;

              return (
                <g key={lineId} className="pointer-events-none">
                  <line
                    x1={x1 + 4}
                    y1={y1}
                    x2={x2 - 4}
                    y2={y2}
                    stroke={ownerColor?.primary || '#3b82f6'}
                    strokeWidth={isLastDrawn ? 7 : 6}
                    strokeLinecap="round"
                  />
                  {isLastDrawn && (
                    <line
                      x1={x1 + 4}
                      y1={y1}
                      x2={x2 - 4}
                      y2={y2}
                      stroke="#ffffff"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeOpacity={0.8}
                    />
                  )}
                </g>
              );
            })
          )}

          {/* 3. RENDER DRAWN VERTICAL LINES */}
          {Array.from({ length: gridSize - 1 }).map((_, r) =>
            Array.from({ length: gridSize }).map((_, c) => {
              const lineId = `v-${r}-${c}`;
              const isDrawn = Boolean(room.lines[lineId]);
              if (!isDrawn) return null;

              const ownerPlayerId = room.lines[lineId];
              const owner = room.players.find((p) => p.id === ownerPlayerId);
              const ownerColor = owner ? PLAYER_COLORS[owner.colorIndex % PLAYER_COLORS.length] : null;

              const x1 = PADDING + c * step;
              const y1 = PADDING + r * step;
              const x2 = x1;
              const y2 = PADDING + (r + 1) * step;
              const isLastDrawn = room.lastDrawnLineId === lineId;

              return (
                <g key={lineId} className="pointer-events-none">
                  <line
                    x1={x1}
                    y1={y1 + 4}
                    x2={x2}
                    y2={y2 - 4}
                    stroke={ownerColor?.primary || '#3b82f6'}
                    strokeWidth={isLastDrawn ? 7 : 6}
                    strokeLinecap="round"
                  />
                  {isLastDrawn && (
                    <line
                      x1={x1}
                      y1={y1 + 4}
                      x2={x2}
                      y2={y2 - 4}
                      stroke="#ffffff"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeOpacity={0.8}
                    />
                  )}
                </g>
              );
            })
          )}

          {/* 4. DIRECT DOM FREE-DRAG LINE (Updated via ref at 60fps+) */}
          <line
            ref={freeDragLineRef}
            x1={0}
            y1={0}
            x2={0}
            y2={0}
            stroke={activeColor.primary}
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray="6 6"
            opacity={0}
            className="pointer-events-none"
          />

          {/* 5. SNAPPED MAGNETIC LINE PREVIEW */}
          {dragStartSvgPos && magneticTargetSvgPos && (
            <line
              x1={dragStartSvgPos.x}
              y1={dragStartSvgPos.y}
              x2={magneticTargetSvgPos.x}
              y2={magneticTargetSvgPos.y}
              stroke={isTargetAlreadyDrawn ? '#ef4444' : activeColor.primary}
              strokeWidth={6.5}
              strokeLinecap="round"
              strokeOpacity={0.92}
              className="pointer-events-none"
            />
          )}

          {/* 6. RENDER GRID DOTS */}
          {Array.from({ length: gridSize }).map((_, r) =>
            Array.from({ length: gridSize }).map((_, c) => {
              const cx = PADDING + c * step;
              const cy = PADDING + r * step;

              const isDragSource = dragStartDot?.r === r && dragStartDot?.c === c;
              const isMagneticTarget = magneticTargetDot?.r === r && magneticTargetDot?.c === c;
              const isSelected = selectedDot?.r === r && selectedDot?.c === c;

              const activeAnchor = dragStartDot || selectedDot;
              const isAdjacentToActive =
                activeAnchor ? areDotsAdjacent(activeAnchor, { r, c }) : false;

              return (
                <g key={`dot-${r}-${c}`} className="pointer-events-none">
                  {/* Ring for Drag Source or Selected Dot */}
                  {(isDragSource || isSelected) && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={14}
                      fill={`${activeColor.primary}20`}
                      stroke={activeColor.primary}
                      strokeWidth={2.5}
                    />
                  )}

                  {/* Magnetic snap halo when locked onto valid adjacent target */}
                  {isMagneticTarget && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={16}
                      fill={isTargetAlreadyDrawn ? '#fef2f2' : `${activeColor.primary}25`}
                      stroke={isTargetAlreadyDrawn ? '#ef4444' : activeColor.primary}
                      strokeWidth={2.5}
                    />
                  )}

                  {/* Subtle neighbor guide ring when a source dot is active */}
                  {isAdjacentToActive && !isMagneticTarget && isMyTurn && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={10.5}
                      fill="none"
                      stroke={activeColor.primary}
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                      strokeOpacity={0.55}
                    />
                  )}

                  {/* Main Tactile Dot */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isDragSource || isMagneticTarget ? 8.5 : gridSize >= 6 ? 6.5 : 7.5}
                    fill={isDragSource || isMagneticTarget ? activeColor.primary : '#1e293b'}
                  />

                  {/* Specular 3D highlight */}
                  <circle
                    cx={cx - 1.5}
                    cy={cy - 1.5}
                    r={isDragSource || isMagneticTarget ? 2.5 : 2}
                    fill={isDragSource || isMagneticTarget ? '#ffffff' : '#94a3b8'}
                  />
                </g>
              );
            })
          )}
        </svg>

        {/* Turn prompt overlay if waiting for opponent */}
        {!isMyTurn && room.status === 'PLAYING' && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/85 backdrop-blur-md text-white text-xs px-3.5 py-1.5 rounded-full font-medium shadow-md flex items-center gap-2 pointer-events-none whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Waiting for {activePlayer?.name || 'opponent'}...</span>
          </div>
        )}
      </div>
    </div>
  );
};
