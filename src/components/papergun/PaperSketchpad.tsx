/**
 * Hand-drawn vertical column component for Paper Gun Battle.
 * Renders the 5 characters (9, 7, 5, 3, 1) on graph paper with:
 * 1. Dynamic multi-layer SVG line sketches that animate as each body part & weapon piece is added.
 * 2. Mini hand-drawn SVG body-part icons (Body, Head/Ears, Hands, Legs, Gun & Bullets).
 * 3. Interactive "Pick 1 of 2" choice highlight and "Hidden Shield (🛡️)" bluff button on the player's own column.
 */

import React from 'react';
import {
  PaperGunPlayer,
  PaperGunNumber,
  IndividualCharacter,
  STAGE_NAMES,
} from '../../types/paperGun';
import { Crosshair, Skull, Shield, CheckCircle2 } from 'lucide-react';
import { playClickSound } from '../../utils/sound';

// Vertical top-to-bottom order matching the reference sketch: 9, 7, 5, 3, 1
const VERTICAL_NUMBERS: PaperGunNumber[] = [9, 7, 5, 3, 1];

interface PaperSketchpadProps {
  player: PaperGunPlayer;
  side: 'left' | 'right';
  isCurrentTurn: boolean;
  isMe: boolean;
  targetSelectable?: boolean;
  onSelectTarget?: (characterNumber: PaperGunNumber) => void;
  pickableChoices?: PaperGunNumber[] | null;
  onPickChoice?: (characterNumber: PaperGunNumber) => void;
  onToggleShield?: (characterNumber: PaperGunNumber) => void;
  lastShotTarget?: PaperGunNumber | null;
  lastShotBlocked?: boolean;
  highlightedNumber?: PaperGunNumber | null;
  pendingShooterNumber?: PaperGunNumber | null;
}

/**
 * Mini hand-drawn SVG icon for each body/weapon part in the character's progression checklist
 */
const PartSketchIcon: React.FC<{
  type: 'body' | 'ears' | 'hands' | 'legs' | 'gun';
  active: boolean;
  isNext: boolean;
  label: string;
}> = ({ type, active, isNext, label }) => {
  return (
    <div
      title={label}
      className={`flex flex-col items-center justify-center px-1 py-0.5 rounded-md border transition-all duration-300 ${
        active
          ? 'bg-amber-100/90 border-slate-900 text-slate-950 shadow-[1px_1px_0px_#0f172a] scale-100'
          : isNext
          ? 'bg-blue-50/80 border-blue-500 border-dashed text-blue-700 animate-pulse'
          : 'bg-white/50 border-slate-300 border-dashed text-slate-300'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="w-3.5 h-3.5 sm:w-4 sm:h-4 overflow-visible"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? '2.4' : '1.8'}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {type === 'body' && (
          <path d="M 6 5 Q 12 4 18 5 Q 19 12 18 19 Q 12 20 6 19 Q 5 12 6 5 Z" />
        )}
        {type === 'ears' && (
          <g>
            <circle cx="12" cy="13" r="6" />
            <path d="M 6 11 C 2 8, 2 16, 6 15" />
            <path d="M 18 11 C 22 8, 22 16, 18 15" />
          </g>
        )}
        {type === 'hands' && (
          <g>
            <line x1="12" y1="6" x2="12" y2="18" strokeOpacity="0.4" />
            <path d="M 12 10 L 3 14 L 2 11" />
            <path d="M 12 10 L 21 14 L 22 11" />
          </g>
        )}
        {type === 'legs' && (
          <g>
            <path d="M 10 5 L 7 19 L 4 19" />
            <path d="M 14 5 L 17 19 L 20 19" />
          </g>
        )}
        {type === 'gun' && (
          <g>
            <rect x="4" y="7" width="16" height="6" rx="1" />
            <path d="M 5 13 L 4 19 L 9 19 L 10 13" />
          </g>
        )}
      </svg>
      <span className="text-[8px] font-black leading-none mt-0.5 tracking-tighter">
        {type === 'body'
          ? 'Body'
          : type === 'ears'
          ? 'Head/Ear'
          : type === 'hands'
          ? 'Hands'
          : type === 'legs'
          ? 'Legs'
          : 'Gun'}
      </span>
    </div>
  );
};

export const PaperSketchpad: React.FC<PaperSketchpadProps> = ({
  player,
  side,
  isCurrentTurn,
  isMe,
  targetSelectable = false,
  onSelectTarget,
  pickableChoices = null,
  onPickChoice,
  onToggleShield,
  lastShotTarget = null,
  lastShotBlocked = false,
  highlightedNumber = null,
  pendingShooterNumber = null,
}) => {
  const { characters, shieldedCharacter } = player;
  const aliveCount = VERTICAL_NUMBERS.filter((n) => !characters[n]?.isEliminated).length;

  return (
    <div className="flex flex-col items-center w-full select-none">
      {/* Player Column Header Box (Hand-Drawn Sketch Style) */}
      <div
        className={`w-full rounded-xl border-2 px-3 py-2 mb-3 transition-all ${
          isCurrentTurn
            ? 'bg-amber-50/95 border-slate-900 shadow-[3px_3px_0px_#0f172a]'
            : 'bg-white/85 border-slate-700/80 shadow-[2px_2px_0px_rgba(15,23,42,0.35)]'
        }`}
      >
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-black text-sm sm:text-base text-slate-900 truncate">
              {player.name}
            </span>
            {isMe && (
              <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-800/30">
                You
              </span>
            )}
          </div>
          <span className="text-[11px] font-black text-slate-700 shrink-0">
            {aliveCount}/5 Alive
          </span>
        </div>

        {/* Secret Shield Bluff Indicator Bar */}
        <div className="mt-1 pt-1 border-t border-dashed border-slate-300 flex items-center justify-between text-[10px] font-bold">
          {isMe ? (
            <span className="text-sky-800 flex items-center gap-1">
              <Shield className="w-3 h-3 text-sky-600 fill-sky-200" />
              {shieldedCharacter
                ? `Secret Shield on #${shieldedCharacter} (Hidden)`
                : 'Tap 🛡️ on a character to hide Shield!'}
            </span>
          ) : (
            <span className="text-slate-600 flex items-center gap-1">
              <Shield className="w-3 h-3 text-slate-500" />
              <span>1 Hidden Shield Active (Mind Game!)</span>
            </span>
          )}
        </div>
      </div>

      {/* Vertical Column of 5 Characters: 9, 7, 5, 3, 1 */}
      <div className="flex flex-col items-center gap-2.5 w-full">
        {VERTICAL_NUMBERS.map((charNum) => {
          const char: IndividualCharacter = characters[charNum] || {
            number: charNum,
            stage: 0,
            isEliminated: false,
            parts: {
              body: false,
              ears: false,
              hands: false,
              legs: false,
              hasGun: false,
              bullets: 0,
              hasTrigger: false,
            },
          };

          const isShieldedByMe = isMe && shieldedCharacter === charNum && !char.isEliminated;
          const isPendingShooter = pendingShooterNumber === charNum;
          const wasJustShot = lastShotTarget === charNum;
          const isJustDrawn = highlightedNumber === charNum;
          const canBeTargeted = targetSelectable && !char.isEliminated && onSelectTarget;
          const canBePicked =
            isMe &&
            isCurrentTurn &&
            !char.isEliminated &&
            pickableChoices?.includes(charNum) &&
            onPickChoice;

          return (
            <div
              key={charNum}
              onClick={() => {
                if (canBeTargeted && onSelectTarget) {
                  playClickSound();
                  onSelectTarget(charNum);
                } else if (canBePicked && onPickChoice) {
                  playClickSound();
                  onPickChoice(charNum);
                }
              }}
              className={`group relative w-full rounded-xl border-2 p-2 sm:px-3 sm:py-2 flex flex-col sm:flex-row items-center justify-between gap-2 transition-all duration-300 ${
                char.isEliminated
                  ? 'bg-rose-50/40 border-dashed border-rose-300/80 opacity-65'
                  : canBeTargeted
                  ? 'cursor-pointer bg-rose-50/95 border-rose-600 shadow-[3px_3px_0px_#e11d48] hover:-translate-y-0.5 ring-2 ring-rose-400/50'
                  : canBePicked
                  ? 'cursor-pointer bg-blue-50/95 border-blue-600 shadow-[3px_3px_0px_#2563eb] hover:-translate-y-0.5 ring-2 ring-blue-400/60'
                  : isPendingShooter
                  ? 'bg-amber-100 border-rose-600 shadow-[3px_3px_0px_#e11d48] ring-2 ring-amber-400'
                  : isShieldedByMe
                  ? 'bg-sky-50/90 border-sky-700 shadow-[3px_3px_0px_#0369a1]'
                  : isJustDrawn
                  ? 'bg-amber-50/95 border-slate-900 shadow-[3px_3px_0px_#0f172a] scale-[1.01]'
                  : char.stage >= 8
                  ? 'bg-emerald-50/70 border-slate-900 shadow-[2px_2px_0px_rgba(15,23,42,0.5)]'
                  : 'bg-white/85 border-slate-700/75 shadow-[2px_2px_0px_rgba(15,23,42,0.2)]'
              } ${wasJustShot ? 'animate-shake' : ''}`}
            >
              {/* Left Column: Character Number, Stage Status, Shield Toggle & Hand-Drawn Part Icons */}
              <div className="w-full sm:w-auto flex flex-col items-start justify-between gap-1.5 z-10">
                <div className="flex items-center gap-2 w-full justify-between sm:justify-start">
                  {/* Character Number Badge */}
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border-2 flex items-center justify-center font-black text-sm sm:text-base font-mono shadow-[1px_1px_0px_#0f172a] shrink-0 ${
                      char.isEliminated
                        ? 'bg-slate-200 text-slate-500 border-slate-400 line-through'
                        : canBePicked
                        ? 'bg-blue-600 text-white border-slate-900 animate-bounce'
                        : isPendingShooter
                        ? 'bg-rose-600 text-white border-slate-900 animate-pulse'
                        : char.stage >= 5
                        ? 'bg-amber-300 text-slate-950 border-slate-900'
                        : 'bg-white text-slate-900 border-slate-800'
                    }`}
                  >
                    {charNum}
                  </div>

                  {/* Current Development Stage Title */}
                  <div className="flex flex-col">
                    <span
                      className={`text-[11px] font-black leading-tight ${
                        char.isEliminated
                          ? 'text-rose-600'
                          : canBePicked
                          ? 'text-blue-700'
                          : isPendingShooter
                          ? 'text-rose-700'
                          : char.stage >= 8
                          ? 'text-emerald-800'
                          : 'text-slate-800'
                      }`}
                    >
                      {char.isEliminated
                        ? '☠️ Eliminated'
                        : char.stage === 0
                        ? 'Blank Character'
                        : STAGE_NAMES[char.stage]}
                    </span>
                    <span className="text-[9px] font-bold text-slate-500">
                      {char.isEliminated
                        ? 'Cannot be rebuilt'
                        : canBePicked
                        ? `Tap to add ${STAGE_NAMES[Math.min(9, char.stage + 1)]}!`
                        : char.stage < 5
                        ? `Body Parts: ${char.stage}/4`
                        : char.parts.hasTrigger
                        ? '🔥 Trigger Ready — Shoot!'
                        : `🔫 Gun + ${char.parts.bullets}/3 Bullets`}
                    </span>
                  </div>

                  {/* Secret Shield Button (on Player's own alive characters) */}
                  {isMe && !char.isEliminated && onToggleShield && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playClickSound();
                        onToggleShield(charNum);
                      }}
                      title={
                        isShieldedByMe
                          ? 'Secret Shield Active! Blocks 1 opponent shot.'
                          : 'Move your Secret Shield to this character'
                      }
                      className={`ml-auto sm:ml-1 px-1.5 py-0.5 rounded-lg border text-[9px] font-black flex items-center gap-0.5 transition-all cursor-pointer ${
                        isShieldedByMe
                          ? 'bg-sky-600 text-white border-slate-900 shadow-[1px_1px_0px_#0f172a]'
                          : 'bg-white/90 hover:bg-sky-50 text-slate-500 hover:text-sky-700 border-slate-300'
                      }`}
                    >
                      <Shield className="w-2.5 h-2.5 fill-current" />
                      <span>{isShieldedByMe ? 'Shielded' : 'Shield'}</span>
                    </button>
                  )}
                </div>

                {/* Mini Hand-Drawn Body-Part Icons Strip */}
                {!char.isEliminated && (
                  <div className="flex flex-wrap items-center gap-1 mt-0.5">
                    <PartSketchIcon
                      type="body"
                      active={char.parts.body}
                      isNext={char.stage === 0}
                      label="1st Draw: Body"
                    />
                    <PartSketchIcon
                      type="ears"
                      active={char.parts.ears}
                      isNext={char.stage === 1}
                      label="2nd Draw: Head & Ears"
                    />
                    <PartSketchIcon
                      type="hands"
                      active={char.parts.hands}
                      isNext={char.stage === 2}
                      label="3rd Draw: Hands"
                    />
                    <PartSketchIcon
                      type="legs"
                      active={char.parts.legs}
                      isNext={char.stage === 3}
                      label="4th Draw: Legs"
                    />
                    <PartSketchIcon
                      type="gun"
                      active={char.parts.hasGun}
                      isNext={char.stage === 4}
                      label="5th Draw: Empty Gun"
                    />
                  </div>
                )}

                {/* Bullet & Trigger Progress Pills once Gun is drawn (Stage >= 5) */}
                {char.parts.hasGun && !char.isEliminated && (
                  <div className="flex items-center gap-1.5 mt-0.5 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-300">
                    <span className="text-[9px] font-black text-slate-700">Ammo:</span>
                    <div className="flex items-center gap-1">
                      {[0, 1, 2].map((bIdx) => {
                        const loaded = bIdx < char.parts.bullets;
                        return (
                          <span
                            key={bIdx}
                            className={`w-2.5 h-2.5 rounded-full border border-slate-900 transition-transform duration-300 ${
                              loaded ? 'bg-amber-400 scale-110' : 'bg-white'
                            }`}
                            title={`Bullet ${bIdx + 1}`}
                          />
                        );
                      })}
                    </div>
                    <span
                      className={`text-[9px] font-black ml-1 px-1 rounded ${
                        char.parts.hasTrigger
                          ? 'bg-rose-600 text-white animate-pulse'
                          : char.parts.bullets === 3
                          ? 'bg-amber-200 text-amber-950'
                          : 'text-slate-500'
                      }`}
                    >
                      {char.parts.hasTrigger
                        ? 'Trig: YES'
                        : char.parts.bullets === 3
                        ? 'Next: Trig'
                        : `${char.parts.bullets}/3`}
                    </span>
                  </div>
                )}
              </div>

              {/* Right Column: Live Dynamic Hand-Drawn SVG Stickman Canvas */}
              <div className="relative w-28 sm:w-32 h-22 sm:h-24 flex items-center justify-center shrink-0">
                <svg
                  viewBox="0 0 150 118"
                  className="w-full h-full overflow-visible"
                >
                  {/* Hand-Drawn Secret Shield Aura (Visible only to owner!) */}
                  {isShieldedByMe && (
                    <path
                      d="M 70 2 L 116 18 C 116 64, 98 96, 70 114 C 42 96, 24 64, 24 18 Z"
                      fill="rgba(14, 165, 233, 0.12)"
                      stroke="#0284c7"
                      strokeWidth="2.2"
                      strokeDasharray="5 3"
                    />
                  )}

                  {/* Subtle Dashed Blueprint Outline for Undrawn Parts */}
                  {!char.isEliminated && (
                    <g stroke="#cbd5e1" strokeWidth="1.3" strokeDasharray="3 3" fill="none">
                      {!char.parts.body && (
                        <rect x="54" y="40" width="32" height="34" rx="4" />
                      )}
                      {!char.parts.ears && (
                        <g>
                          <circle cx="70" cy="24" r="13" />
                          <path d="M 57 22 C 49 17, 49 29, 57 27" />
                          <path d="M 83 22 C 91 17, 91 29, 83 27" />
                        </g>
                      )}
                      {!char.parts.hands && (
                        <g>
                          <line x1="54" y1="50" x2="30" y2="58" />
                          <line x1="86" y1="50" x2="110" y2="58" />
                        </g>
                      )}
                      {!char.parts.legs && (
                        <g>
                          <line x1="63" y1="74" x2="57" y2="104" />
                          <line x1="77" y1="74" x2="83" y2="104" />
                        </g>
                      )}
                    </g>
                  )}

                  {/* Center Number Watermark when Stage === 0 */}
                  {char.stage === 0 && !char.isEliminated && (
                    <text
                      x="70"
                      y="63"
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="20"
                      fontWeight="900"
                      fontFamily="monospace"
                    >
                      {charNum}
                    </text>
                  )}

                  {/* 1. STAGE 1 (BODY): Hand-Sketched Torso Box & Head Outline */}
                  {char.parts.body && (
                    <g
                      className="transition-all duration-300"
                      stroke="#0f172a"
                      strokeWidth="2.6"
                      fill="#fffdf7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M 54 40 Q 70 38 86 40 Q 88 57 85 74 Q 70 76 55 74 Q 52 57 54 40 Z" />
                      <text
                        x="70"
                        y="63"
                        textAnchor="middle"
                        fill="#0f172a"
                        stroke="none"
                        fontSize="17"
                        fontWeight="900"
                        fontFamily="monospace"
                      >
                        {charNum}
                      </text>
                      {!char.parts.ears && (
                        <circle cx="70" cy="24" r="13" stroke="#64748b" strokeWidth="1.8" strokeDasharray="3 2" fill="#fffdf7" />
                      )}
                    </g>
                  )}

                  {/* 2. STAGE 2 (HEAD & EARS): Expressive Head, Eyes, Smile & Hand-Drawn Ear Loops */}
                  {char.parts.ears && (
                    <g
                      stroke="#0f172a"
                      strokeWidth="2.5"
                      fill="#fffdf7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M 57 22 C 46 15, 46 31, 57 27" />
                      <circle cx="52" cy="23.5" r="1.8" fill="#0f172a" />
                      <path d="M 83 22 C 94 15, 94 31, 83 27" />
                      <circle cx="88" cy="23.5" r="1.8" fill="#0f172a" />
                      <circle cx="70" cy="24" r="13" />
                      <circle cx="65" cy="22" r="1.7" fill="#0f172a" stroke="none" />
                      <circle cx="75" cy="22" r="1.7" fill="#0f172a" stroke="none" />
                      <path d="M 65 28 Q 70 32 75 28" strokeWidth="1.9" fill="none" />
                      <path d="M 66 11 L 70 5 L 74 11" strokeWidth="2" fill="none" />
                    </g>
                  )}

                  {/* 3. STAGE 3 (HANDS): Left & Right Sketchy Arms with Fingers */}
                  {char.parts.hands && (
                    <g stroke="#0f172a" strokeWidth="2.6" strokeLinecap="round" fill="none">
                      <path d="M 54 50 L 30 58" />
                      <path d="M 30 58 L 24 54 M 30 58 L 24 61" strokeWidth="2" />
                      <path d="M 86 50 L 110 58" />
                      <path d="M 110 58 L 116 54 M 110 58 L 116 61" strokeWidth="2" />
                    </g>
                  )}

                  {/* 4. STAGE 4 (LEGS): Two Sketchy Stick Legs & Shoes */}
                  {char.parts.legs && (
                    <g stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" fill="none">
                      <path d="M 63 75 L 57 104 L 49 105" />
                      <path d="M 77 75 L 83 104 L 91 105" />
                    </g>
                  )}

                  {/* 5. STAGE 5..9: HAND-DRAWN 3-CHAMBER GUN + BULLETS + TRIGGER */}
                  {char.parts.hasGun && !char.isEliminated && (
                    <g stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {side === 'left' ? (
                        <g>
                          <rect x="108" y="45" width="34" height="13" rx="2" fill="#f8fafc" />
                          <line x1="119.3" y1="45" x2="119.3" y2="58" />
                          <line x1="130.6" y1="45" x2="130.6" y2="58" />
                          <path d="M 108 58 L 106 68 L 113 68 L 115 58 Z" fill="#cbd5e1" />

                          {char.parts.bullets >= 1 && (
                            <circle cx="113.6" cy="51.5" r="3.2" fill="#f59e0b" stroke="#78350f" strokeWidth="1.2" />
                          )}
                          {char.parts.bullets >= 2 && (
                            <circle cx="125" cy="51.5" r="3.2" fill="#f59e0b" stroke="#78350f" strokeWidth="1.2" />
                          )}
                          {char.parts.bullets >= 3 && (
                            <circle cx="136.3" cy="51.5" r="3.2" fill="#f59e0b" stroke="#78350f" strokeWidth="1.2" />
                          )}

                          {char.parts.hasTrigger && (
                            <g>
                              <path d="M 116 58 Q 120 64 115 66" fill="none" stroke="#dc2626" strokeWidth="2.5" />
                              <path d="M 144 47 L 149 44 M 145 51.5 L 150 51.5 M 144 56 L 149 59" stroke="#ef4444" strokeWidth="2" />
                            </g>
                          )}
                        </g>
                      ) : (
                        <g>
                          <rect x="8" y="45" width="34" height="13" rx="2" fill="#f8fafc" />
                          <line x1="19.3" y1="45" x2="19.3" y2="58" />
                          <line x1="30.6" y1="45" x2="30.6" y2="58" />
                          <path d="M 42 58 L 44 68 L 37 68 L 35 58 Z" fill="#cbd5e1" />

                          {char.parts.bullets >= 1 && (
                            <circle cx="36.3" cy="51.5" r="3.2" fill="#f59e0b" stroke="#78350f" strokeWidth="1.2" />
                          )}
                          {char.parts.bullets >= 2 && (
                            <circle cx="25" cy="51.5" r="3.2" fill="#f59e0b" stroke="#78350f" strokeWidth="1.2" />
                          )}
                          {char.parts.bullets >= 3 && (
                            <circle cx="13.6" cy="51.5" r="3.2" fill="#f59e0b" stroke="#78350f" strokeWidth="1.2" />
                          )}

                          {char.parts.hasTrigger && (
                            <g>
                              <path d="M 34 58 Q 30 64 35 66" fill="none" stroke="#dc2626" strokeWidth="2.5" />
                              <path d="M 6 47 L 1 44 M 5 51.5 L 0 51.5 M 6 56 L 1 59" stroke="#ef4444" strokeWidth="2" />
                            </g>
                          )}
                        </g>
                      )}
                    </g>
                  )}

                  {/* ELIMINATED: Bold Red Marker Cross-Out */}
                  {char.isEliminated && (
                    <g stroke="#e11d48" strokeWidth="4" strokeLinecap="round">
                      <line x1="25" y1="12" x2="120" y2="104" />
                      <line x1="120" y1="12" x2="25" y2="104" />
                    </g>
                  )}
                </svg>

                {/* Pick Choice Overlay Button when 2 numbers are drawn */}
                {canBePicked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-blue-500/15 rounded-lg">
                    <span className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 animate-bounce border-2 border-white">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Pick #{charNum}</span>
                    </span>
                  </div>
                )}

                {/* Target Shoot Overlay Button when opponent is targetable */}
                {canBeTargeted && (
                  <div className="absolute inset-0 flex items-center justify-center bg-rose-500/15 rounded-lg">
                    <span className="bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 animate-bounce border-2 border-white">
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>Shoot #{charNum}</span>
                    </span>
                  </div>
                )}

                {/* Shot Blocked Feedback Badge */}
                {wasJustShot && lastShotBlocked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-sky-500/20 rounded-lg">
                    <span className="bg-sky-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md border border-white">
                      🛡️ BLOCKED!
                    </span>
                  </div>
                )}

                {char.isEliminated && (
                  <div className="absolute top-1 right-1">
                    <Skull className="w-4 h-4 text-rose-600" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
