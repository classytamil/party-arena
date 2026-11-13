import React, { useState, useRef, useCallback } from 'react';
import { DotsRoom, DotsPlayer, ClaimedBox, PLAYER_COLORS } from '../../types/dots';
import { AVATAR_OPTIONS } from '../../types/bingo';

interface DotsBoardProps {
  room: DotsRoom;
  player: DotsPlayer;
  onDrawLine: (lineId: string) => void;
  disabled?: boolean;
  /** Optional board snapshot to render instead of the live board (move review). */
  lines?: Record<string, string>;
  boxes?: Record<string, ClaimedBox>;
  /** Line + boxes of the move to highlight (defaults to the live last move). */
  highlightLineId?: string | null;
  highlightBoxes?: { row: number; col: number }[];
  highlightPlayerName?: string | null;
  isReviewing?: boolean;
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
  lines: linesOverride,
  boxes: boxesOverride,
  highlightLineId,
  highlightBoxes,
  highlightPlayerName,
  isReviewing = false,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const freeDragLineRef = useRef<SVGLineElement | null>(null);
  const dragStartRef = useRef<DotCoord | null>(null);
  const magneticTargetRef = useRef<DotCoord | null>(null);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const [dragStartDot, setDragStartDot] = useState<DotCoord | null>(null);
  const [magneticTargetDot, setMagneticTargetDot] = useState<DotCoord | null>(null);
  const [selectedDot, setSelectedDot] = useState<DotCoord | null>(null);

  const gridSize = room.gridSize;
  const lines = linesOverride ?? room.lines;
  const boxes = boxesOverride ?? room.boxes;
  const lastLineId = highlightLineId !== undefined ? highlightLineId : room.lastDrawnLineId;
  const lastBoxes = highlightBoxes ?? room.lastCompletedBoxes ?? [];
  const lastBoxKeys = new Set(lastBoxes.map((b) => `${b.row}-${b.col}`));
  const isMyTurn = room.status === 'PLAYING' && room.currentTurnPlayerId === player.id;
  const canDraw = isMyTurn && !disabled;
  const myColor = PLAYER_COLORS[player.colorIndex % PLAYER_COLORS.length];
  const activePlayer = room.players.find((p) => p.id === room.currentTurnPlayerId);
  const activeColor = activePlayer
    ? PLAYER_COLORS[activePlayer.colorIndex % PLAYER_COLORS.length]
    : myColor;

  const SVG_SIZE = 560;
  const PADDING = 45;
  const step = (SVG_SIZE - PADDING * 2) / (gridSize - 1);

  const getDotSvgPos = useCallback(
    (r: number, c: number) => ({ x: PADDING + c * step, y: PADDING + r * step }),
    [step]
  );

  const getSvgCoordinates = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * SVG_SIZE,
      y: ((clientY - rect.top) / rect.height) * SVG_SIZE,
    };
  }, []);

  const areDotsAdjacent = (a: DotCoord, b: DotCoord) =>
    (Math.abs(a.r - b.r) === 1 && a.c === b.c) ||
    (Math.abs(a.c - b.c) === 1 && a.r === b.r);

  const getLineIdBetween = (a: DotCoord, b: DotCoord): string | null => {
    if (!areDotsAdjacent(a, b)) return null;
    if (a.r === b.r) return `h-${a.r}-${Math.min(a.c, b.c)}`;
    return `v-${Math.min(a.r, b.r)}-${a.c}`;
  };

  const findDotNearPos = useCallback(
    (x: number, y: number, maxDistance = step * 0.62): DotCoord | null => {
      let closest: { dot: DotCoord; dist: number } | null = null;
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const pos = getDotSvgPos(r, c);
          const dist = Math.hypot(pos.x - x, pos.y - y);
          if (dist <= maxDistance && (!closest || dist < closest.dist)) {
            closest = { dot: { r, c }, dist };
          }
        }
      }
      return closest?.dot ?? null;
    },
    [gridSize, getDotSvgPos, step]
  );

  const resolveSnapTarget = useCallback(
    (start: DotCoord, x: number, y: number): DotCoord | null => {
      const pos = getDotSvgPos(start.r, start.c);
      const dx = x - pos.x;
      const dy = y - pos.y;
      const distance = Math.hypot(dx, dy);
      if (distance < step * 0.18 || distance > step * 1.75) return null;

      if (Math.abs(dx) >= Math.abs(dy)) {
        if (Math.abs(dy) > step * 0.58) return null;
        const c = start.c + (dx > 0 ? 1 : -1);
        return c >= 0 && c < gridSize ? { r: start.r, c } : null;
      }

      if (Math.abs(dx) > step * 0.58) return null;
      const r = start.r + (dy > 0 ? 1 : -1);
      return r >= 0 && r < gridSize ? { r, c: start.c } : null;
    },
    [getDotSvgPos, gridSize, step]
  );

  const updateFreeDragLineDOM = (
    start: DotCoord | null,
    x: number,
    y: number,
    snapped: DotCoord | null
  ) => {
    const line = freeDragLineRef.current;
    if (!line) return;
    if (!start || snapped) {
      line.setAttribute('opacity', '0');
      return;
    }
    const pos = getDotSvgPos(start.r, start.c);
    line.setAttribute('x1', String(pos.x));
    line.setAttribute('y1', String(pos.y));
    line.setAttribute('x2', String(x));
    line.setAttribute('y2', String(y));
    line.setAttribute('opacity', '0.75');
  };

  const clearDrag = () => {
    dragStartRef.current = null;
    magneticTargetRef.current = null;
    pointerDownPosRef.current = null;
    setDragStartDot(null);
    setMagneticTargetDot(null);
    updateFreeDragLineDOM(null, 0, 0, null);
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!canDraw) return;
    const coords = getSvgCoordinates(e.clientX, e.clientY);
    if (!coords) return;
    const dot = findDotNearPos(coords.x, coords.y);
    if (!dot) {
      setSelectedDot(null);
      return;
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture may not be supported.
    }
    dragStartRef.current = dot;
    magneticTargetRef.current = null;
    pointerDownPosRef.current = coords;
    setDragStartDot(dot);
    setMagneticTargetDot(null);
    updateFreeDragLineDOM(dot, coords.x, coords.y, null);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const start = dragStartRef.current;
    if (!start || !canDraw) return;
    const coords = getSvgCoordinates(e.clientX, e.clientY);
    if (!coords) return;
    const target = resolveSnapTarget(start, coords.x, coords.y);
    const previous = magneticTargetRef.current;
    if (target?.r !== previous?.r || target?.c !== previous?.c) {
      magneticTargetRef.current = target;
      setMagneticTargetDot(target);
    }
    updateFreeDragLineDOM(start, coords.x, coords.y, target);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const start = dragStartRef.current;
    if (!start || !canDraw) {
      clearDrag();
      return;
    }

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Pointer capture may already have been released.
    }

    const coords = getSvgCoordinates(e.clientX, e.clientY);
    const target = magneticTargetRef.current ||
      (coords ? resolveSnapTarget(start, coords.x, coords.y) : null);

    if (target && areDotsAdjacent(start, target)) {
      const lineId = getLineIdBetween(start, target);
      if (lineId && !lines[lineId]) {
        onDrawLine(lineId);
        setSelectedDot(null);
      }
    } else {
      const downPos = pointerDownPosRef.current;
      const moved = coords && downPos ? Math.hypot(coords.x - downPos.x, coords.y - downPos.y) : 0;
      if (moved < step * 0.18) {
        if (selectedDot && areDotsAdjacent(selectedDot, start)) {
          const lineId = getLineIdBetween(selectedDot, start);
          if (lineId && !lines[lineId]) {
            onDrawLine(lineId);
            setSelectedDot(null);
          } else {
            setSelectedDot(start);
          }
        } else if (selectedDot?.r === start.r && selectedDot?.c === start.c) {
          setSelectedDot(null);
        } else {
          setSelectedDot(start);
        }
      }
    }
    clearDrag();
  };

  const getAvatarEmoji = (avatarId: string) =>
    AVATAR_OPTIONS.find((avatar) => avatar.id === avatarId)?.emoji || '🎮';

  const dragStartPos = dragStartDot ? getDotSvgPos(dragStartDot.r, dragStartDot.c) : null;
  const magneticTargetPos = magneticTargetDot
    ? getDotSvgPos(magneticTargetDot.r, magneticTargetDot.c)
    : null;
  const targetLineId = dragStartDot && magneticTargetDot
    ? getLineIdBetween(dragStartDot, magneticTargetDot)
    : null;
  const isTargetAlreadyDrawn = targetLineId ? Boolean(lines[targetLineId]) : false;

  // Geometry + colour for the highlighted (last) move
  const lastLineOwnerId = lastLineId ? lines[lastLineId] : undefined;
  const lastLineOwner = lastLineOwnerId
    ? room.players.find((p) => p.id === lastLineOwnerId)
    : undefined;
  const lastLineColor = lastLineOwner
    ? PLAYER_COLORS[lastLineOwner.colorIndex % PLAYER_COLORS.length]
    : (() => {
        const move = [...room.moves].reverse().find((m) => m.lineId === lastLineId);
        return move ? PLAYER_COLORS[move.playerColorIndex % PLAYER_COLORS.length] : myColor;
      })();
  const lastLineLabel =
    highlightPlayerName ??
    lastLineOwner?.name ??
    [...room.moves].reverse().find((m) => m.lineId === lastLineId)?.playerName ??
    '';
  const lastLineGeom = (() => {
    if (!lastLineId || !lastLineOwnerId) return null;
    const [type, rs, cs] = lastLineId.split('-');
    const r = parseInt(rs, 10);
    const c = parseInt(cs, 10);
    if (Number.isNaN(r) || Number.isNaN(c)) return null;
    if (type === 'h') {
      return {
        x1: PADDING + c * step + 4,
        y1: PADDING + r * step,
        x2: PADDING + (c + 1) * step - 4,
        y2: PADDING + r * step,
        horizontal: true,
      };
    }
    return {
      x1: PADDING + c * step,
      y1: PADDING + r * step + 4,
      x2: PADDING + c * step,
      y2: PADDING + (r + 1) * step - 4,
      horizontal: false,
    };
  })();
  const labelText = lastLineLabel.slice(0, 8);
  const labelWidth = Math.max(36, labelText.length * 7.2 + 16);

  return (
    <div className="w-full flex flex-col justify-center items-center py-2 select-none touch-manipulation">
      {canDraw && (
        <div className="mb-2 text-xs font-semibold text-blue-600 bg-blue-50/90 border border-blue-200/70 px-3.5 py-1 rounded-full shadow-xs flex items-center gap-1.5">
          <span>👆 Drag from dot to adjacent dot to connect</span>
        </div>
      )}

      <div className="relative w-full max-w-[500px] aspect-square bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-2 sm:p-4 flex items-center justify-center">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          className={`w-full h-full touch-none overflow-visible select-none ${
            canDraw ? 'cursor-crosshair' : 'cursor-default'
          }`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={clearDrag}
        >
          {Array.from({ length: gridSize - 1 }, (_, r) =>
            Array.from({ length: gridSize - 1 }, (_, c) => {
              const boxKey = `${r}-${c}`;
              const claimed = boxes[boxKey];
              if (!claimed) return null;
              const x = PADDING + c * step;
              const y = PADDING + r * step;
              const color = PLAYER_COLORS[claimed.ownerColorIndex % PLAYER_COLORS.length];
              const owner = room.players.find((p) => p.id === claimed.ownerId);
              const isFresh = lastBoxKeys.has(boxKey);
              return (
                <g key={`box-${boxKey}`}>
                  <rect
                    x={x + 4}
                    y={y + 4}
                    width={step - 8}
                    height={step - 8}
                    rx={Math.min(12, step * 0.12)}
                    fill={color.primary}
                    fillOpacity={isFresh ? 0.36 : 0.22}
                    stroke={color.primary}
                    strokeWidth={isFresh ? 3.5 : 2}
                    strokeOpacity={isFresh ? 1 : 0.4}
                    className={isFresh ? 'animate-pulse' : undefined}
                  />
                  <text
                    x={x + step / 2}
                    y={y + step / 2 + (step > 90 ? 10 : 6)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="font-bold select-none pointer-events-none"
                    fontSize={Math.max(16, Math.min(30, step * 0.36))}
                  >
                    {getAvatarEmoji(owner?.avatar || '')}
                  </text>
                  {step >= 85 && (
                    <text
                      x={x + step / 2}
                      y={y + step / 2 + step * 0.3}
                      textAnchor="middle"
                      fontSize={Math.max(10, step * 0.12)}
                      fontWeight="700"
                      fill={color.primary}
                      className="select-none pointer-events-none"
                    >
                      {claimed.ownerName.slice(0, 6)}
                    </text>
                  )}
                </g>
              );
            })
          )}

          {Array.from({ length: gridSize }, (_, r) =>
            Array.from({ length: gridSize - 1 }, (_, c) => {
              const lineId = `h-${r}-${c}`;
              const ownerId = lines[lineId];
              if (!ownerId || lineId === lastLineId) return null;
              const owner = room.players.find((p) => p.id === ownerId);
              const color = owner ? PLAYER_COLORS[owner.colorIndex % PLAYER_COLORS.length] : myColor;
              return (
                <line
                  key={lineId}
                  x1={PADDING + c * step + 4}
                  y1={PADDING + r * step}
                  x2={PADDING + (c + 1) * step - 4}
                  y2={PADDING + r * step}
                  stroke={color.primary}
                  strokeWidth={6}
                  strokeLinecap="round"
                  pointerEvents="none"
                />
              );
            })
          )}

          {Array.from({ length: gridSize - 1 }, (_, r) =>
            Array.from({ length: gridSize }, (_, c) => {
              const lineId = `v-${r}-${c}`;
              const ownerId = lines[lineId];
              if (!ownerId || lineId === lastLineId) return null;
              const owner = room.players.find((p) => p.id === ownerId);
              const color = owner ? PLAYER_COLORS[owner.colorIndex % PLAYER_COLORS.length] : myColor;
              return (
                <line
                  key={lineId}
                  x1={PADDING + c * step}
                  y1={PADDING + r * step + 4}
                  x2={PADDING + c * step}
                  y2={PADDING + (r + 1) * step - 4}
                  stroke={color.primary}
                  strokeWidth={6}
                  strokeLinecap="round"
                  pointerEvents="none"
                />
              );
            })
          )}

          {lastLineGeom && (
            <g key={`last-${lastLineId}`} pointerEvents="none">
              <line
                x1={lastLineGeom.x1}
                y1={lastLineGeom.y1}
                x2={lastLineGeom.x2}
                y2={lastLineGeom.y2}
                stroke={lastLineColor.primary}
                strokeWidth={18}
                strokeLinecap="round"
                strokeOpacity={0.22}
                className="animate-pulse"
              />
              <line
                x1={lastLineGeom.x1}
                y1={lastLineGeom.y1}
                x2={lastLineGeom.x2}
                y2={lastLineGeom.y2}
                stroke={lastLineColor.primary}
                strokeWidth={8}
                strokeLinecap="round"
              />
              <line
                x1={lastLineGeom.x1}
                y1={lastLineGeom.y1}
                x2={lastLineGeom.x2}
                y2={lastLineGeom.y2}
                stroke="#ffffff"
                strokeWidth={2}
                strokeLinecap="round"
                strokeOpacity={0.7}
                strokeDasharray="4 7"
              />
            </g>
          )}

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

          {dragStartPos && magneticTargetPos && (
            <line
              x1={dragStartPos.x}
              y1={dragStartPos.y}
              x2={magneticTargetPos.x}
              y2={magneticTargetPos.y}
              stroke={isTargetAlreadyDrawn ? '#ef4444' : activeColor.primary}
              strokeWidth={6.5}
              strokeLinecap="round"
              strokeOpacity={0.92}
              className="pointer-events-none"
            />
          )}

          {Array.from({ length: gridSize }, (_, r) =>
            Array.from({ length: gridSize }, (_, c) => {
              const cx = PADDING + c * step;
              const cy = PADDING + r * step;
              const isDragSource = dragStartDot?.r === r && dragStartDot?.c === c;
              const isMagneticTarget = magneticTargetDot?.r === r && magneticTargetDot?.c === c;
              const isSelected = selectedDot?.r === r && selectedDot?.c === c;
              const anchor = dragStartDot || selectedDot;
              const isAdjacent = anchor ? areDotsAdjacent(anchor, { r, c }) : false;
              return (
                <g key={`dot-${r}-${c}`} className="pointer-events-none">
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
                  {isAdjacent && !isMagneticTarget && canDraw && (
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
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isDragSource || isMagneticTarget ? 8.5 : gridSize >= 6 ? 6.5 : 7.5}
                    fill={isDragSource || isMagneticTarget ? activeColor.primary : '#1e293b'}
                  />
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

          {lastLineGeom && labelText && (() => {
            const midX = (lastLineGeom.x1 + lastLineGeom.x2) / 2;
            const midY = (lastLineGeom.y1 + lastLineGeom.y2) / 2;
            const nearRightEdge = midX + labelWidth + 20 > SVG_SIZE;
            const cx = lastLineGeom.horizontal
              ? midX
              : nearRightEdge
              ? midX - labelWidth / 2 - 12
              : midX + labelWidth / 2 + 12;
            const cy = lastLineGeom.horizontal ? midY - 20 : midY;
            return (
              <g pointerEvents="none" key={`last-label-${lastLineId}`}>
                <rect
                  x={cx - labelWidth / 2}
                  y={cy - 11}
                  width={labelWidth}
                  height={22}
                  rx={11}
                  fill={lastLineColor.primary}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
                <text
                  x={cx}
                  y={cy + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={12}
                  fontWeight="800"
                  fill="#ffffff"
                  className="select-none"
                >
                  {labelText}
                </text>
              </g>
            );
          })()}
        </svg>

        {isReviewing && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-amber-500/95 text-white text-[11px] px-3 py-1 rounded-full font-bold shadow-md flex items-center gap-1.5 whitespace-nowrap">
            <span>⏪ Viewing a past move · Board locked</span>
          </div>
        )}

        {!isMyTurn && room.status === 'PLAYING' && !isReviewing && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/85 backdrop-blur-md text-white text-xs px-3.5 py-1.5 rounded-full font-medium shadow-md flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Waiting for {activePlayer?.name || 'opponent'}...</span>
          </div>
        )}
      </div>
    </div>
  );
};
