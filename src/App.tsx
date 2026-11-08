'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useBingoRealtime } from './hooks/useBingoRealtime';
import { useDotsRealtime } from './hooks/useDotsRealtime';
import { GameHub } from './components/GameHub';
import { TitleScreen } from './components/TitleScreen';
import { LobbyScreen } from './components/LobbyScreen';
import { GameScreen } from './components/GameScreen';
import { VictoryModal } from './components/VictoryModal';
import { DotsTitleScreen } from './components/dots/DotsTitleScreen';
import { DotsLobbyScreen } from './components/dots/DotsLobbyScreen';
import { DotsGameScreen } from './components/dots/DotsGameScreen';
import { DotsVictoryModal } from './components/dots/DotsVictoryModal';
import { usePaperGunRealtime } from './hooks/usePaperGunRealtime';
import { PaperGunTitleScreen } from './components/papergun/PaperGunTitleScreen';
import { PaperGunLobbyScreen } from './components/papergun/PaperGunLobbyScreen';
import { PaperGunGameScreen } from './components/papergun/PaperGunGameScreen';
import { PaperGunVictoryModal } from './components/papergun/PaperGunVictoryModal';

type ActiveView = 'HOME' | 'BINGO' | 'DOTS' | 'PAPERGUN';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('HOME');
  const [globalError, setGlobalError] = useState<string | null>(null);

  const bingo = useBingoRealtime();
  const dots = useDotsRealtime();
  const paperGun = usePaperGunRealtime();

  // If a session was restored from storage, route directly to the active match
  useEffect(() => {
    if (bingo.room && bingo.player) {
      setActiveView('BINGO');
    }
  }, [bingo.room, bingo.player]);

  useEffect(() => {
    if (dots.room && dots.player) {
      setActiveView('DOTS');
    }
  }, [dots.room, dots.player]);

  useEffect(() => {
    if (paperGun.room && paperGun.player) {
      setActiveView('PAPERGUN');
    }
  }, [paperGun.room, paperGun.player]);

  // Handle URL query parameters for direct invite links (?room=CODE or ?game=dots&room=CODE)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    const gameParam = params.get('game');

    if (roomParam && !bingo.room && !dots.room && !paperGun.room) {
      const code = roomParam.toUpperCase();
      const storedName =
        localStorage.getItem('party_username') ||
        localStorage.getItem('bingo_username') ||
        'Player 1';
      const storedAvatar =
        localStorage.getItem('party_avatar') ||
        localStorage.getItem('bingo_avatar') ||
        'cowboy';

      if (gameParam === 'papergun') {
        setActiveView('PAPERGUN');
        paperGun.joinRoom(code, storedName, storedAvatar);
      } else if (gameParam === 'dots') {
        setActiveView('DOTS');
        dots.joinRoom(code, storedName, storedAvatar);
      } else if (gameParam === 'bingo') {
        setActiveView('BINGO');
        bingo.joinRoom(code, storedName, storedAvatar);
      } else {
        fetch(`/api/rooms/inspect/${code}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.gameType === 'papergun') {
              setActiveView('PAPERGUN');
              paperGun.joinRoom(code, storedName, storedAvatar);
            } else if (data.gameType === 'dots') {
              setActiveView('DOTS');
              dots.joinRoom(code, storedName, storedAvatar);
            } else if (data.gameType === 'bingo') {
              setActiveView('BINGO');
              bingo.joinRoom(code, storedName, storedAvatar);
            }
          })
          .catch(() => {
            // Stay on home
          });
      }
    }
  }, [bingo.room, dots.room, paperGun.room, bingo, dots, paperGun]);

  // Leave room and return to home cleanly
  const handleLeaveBingo = async (): Promise<void> => {
    await bingo.leaveRoom();
    setActiveView('HOME');
  };

  const handleLeaveDots = async (): Promise<void> => {
    await dots.leaveRoom();
    setActiveView('HOME');
  };

  const handleLeavePaperGun = async (): Promise<void> => {
    await paperGun.leaveRoom();
    setActiveView('HOME');
  };

  // Direct join code handler from Home page
  const handleJoinRoomDirect = async (code: string) => {
    setGlobalError(null);
    const storedName =
      localStorage.getItem('party_username') ||
      localStorage.getItem('bingo_username') ||
      'Player 1';
    const storedAvatar =
      localStorage.getItem('party_avatar') ||
      localStorage.getItem('bingo_avatar') ||
      'cowboy';

    try {
      const res = await fetch(`/api/rooms/inspect/${code}`);
      const data = await res.json();
      if (!res.ok || !data.exists) {
        setGlobalError(`Room "${code}" not found.`);
        return;
      }

      if (data.gameType === 'papergun') {
        setActiveView('PAPERGUN');
        paperGun.joinRoom(code, storedName, storedAvatar);
      } else if (data.gameType === 'bingo') {
        setActiveView('BINGO');
        bingo.joinRoom(code, storedName, storedAvatar);
      } else if (data.gameType === 'dots') {
        setActiveView('DOTS');
        dots.joinRoom(code, storedName, storedAvatar);
      } else {
        setGlobalError(`Unrecognized room code "${code}".`);
      }
    } catch {
      setGlobalError('Network error checking room code.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans relative selection:bg-blue-600 selection:text-white">
      {/* 1. HOME SCREEN: SELECT A GAME */}
      {activeView === 'HOME' && !bingo.room && !dots.room && !paperGun.room && (
        <GameHub
          onOpenBingoLanding={() => {
            setGlobalError(null);
            setActiveView('BINGO');
          }}
          onOpenDotsLanding={() => {
            setGlobalError(null);
            setActiveView('DOTS');
          }}
          onOpenPaperGunLanding={() => {
            setGlobalError(null);
            setActiveView('PAPERGUN');
          }}
          onJoinRoomDirect={handleJoinRoomDirect}
          errorMessage={globalError || bingo.error || dots.error || paperGun.error}
          onClearError={() => {
            setGlobalError(null);
            bingo.clearError();
            dots.clearError();
            paperGun.clearError();
          }}
        />
      )}

      {/* 2. BINGO 25 VIEWS */}
      {activeView === 'BINGO' && (
        <>
          {!bingo.room || !bingo.player ? (
            /* Dedicated Bingo Landing / Setup */
            <TitleScreen
              onCreateRoom={bingo.createRoom}
              onQuickPlayVsBots={bingo.quickPlayVsBots}
              onJoinRoom={bingo.joinRoom}
              onBackToHub={() => setActiveView('HOME')}
              isLoading={bingo.isLoading}
              errorMessage={bingo.error}
              onClearError={bingo.clearError}
            />
          ) : bingo.room.status === 'WAITING' ? (
            <LobbyScreen
              room={bingo.room}
              player={bingo.player}
              onToggleReady={bingo.toggleReady}
              onAddBot={bingo.addBot}
              onStartGame={bingo.startGame}
              onLeaveRoom={handleLeaveBingo}
              isLoading={bingo.isLoading}
              errorMessage={bingo.error}
              onClearError={bingo.clearError}
            />
          ) : (
            <>
              <GameScreen
                room={bingo.room}
                player={bingo.player}
                onPickNumber={bingo.pickNumber}
                onDrawNextNumber={bingo.drawNextNumber}
                onLeaveRoom={handleLeaveBingo}
                onUnIdle={bingo.unIdle}
              />

              {bingo.room.status === 'COMPLETED' && (
                <VictoryModal
                  room={bingo.room}
                  player={bingo.player}
                  onRematch={bingo.rematch}
                  onLeaveRoom={handleLeaveBingo}
                  isLoading={bingo.isLoading}
                />
              )}
            </>
          )}
        </>
      )}

      {/* 3. MULTIPLAYER DOTS AND BOXES VIEWS */}
      {activeView === 'DOTS' && (
        <>
          {!dots.room || !dots.player ? (
            /* Dedicated Dots & Boxes Landing / Setup */
            <DotsTitleScreen
              onCreateRoom={dots.createRoom}
              onQuickPlayVsBots={dots.quickPlayVsBots}
              onJoinRoom={dots.joinRoom}
              onBackToHome={() => setActiveView('HOME')}
              isLoading={dots.isLoading}
              errorMessage={dots.error}
              onClearError={dots.clearError}
            />
          ) : dots.room.status === 'WAITING' ? (
            <DotsLobbyScreen
              room={dots.room}
              player={dots.player}
              onToggleReady={dots.toggleReady}
              onAddBot={dots.addBot}
              onUpdateSettings={dots.updateSettings}
              onStartGame={dots.startGame}
              onLeaveRoom={handleLeaveDots}
              isLoading={dots.isLoading}
              errorMessage={dots.error}
              onClearError={dots.clearError}
            />
          ) : (
            <>
              <DotsGameScreen
                room={dots.room}
                player={dots.player}
                onDrawLine={dots.drawLine}
                onLeaveRoom={handleLeaveDots}
              />

              {dots.room.status === 'COMPLETED' && (
                <DotsVictoryModal
                  room={dots.room}
                  player={dots.player}
                  onRematch={dots.rematch}
                  onLeaveRoom={handleLeaveDots}
                  isLoading={dots.isLoading}
                />
              )}
            </>
          )}
        </>
      )}

      {/* 4. PAPER GUN BATTLE VIEWS */}
      {activeView === 'PAPERGUN' && (
        <>
          {!paperGun.room || !paperGun.player ? (
            /* Dedicated Paper Gun Battle Landing / Setup */
            <PaperGunTitleScreen
              onCreateRoom={paperGun.createRoom}
              onQuickPlayVsBots={paperGun.quickPlayVsBots}
              onJoinRoom={paperGun.joinRoom}
              onBackToHome={() => setActiveView('HOME')}
              isLoading={paperGun.isLoading}
              errorMessage={paperGun.error}
              onClearError={paperGun.clearError}
            />
          ) : paperGun.room.status === 'WAITING' ? (
            <PaperGunLobbyScreen
              room={paperGun.room}
              player={paperGun.player}
              onToggleReady={paperGun.toggleReady}
              onAddBot={paperGun.addBot}
              onStartGame={paperGun.startGame}
              onLeaveRoom={handleLeavePaperGun}
              isLoading={paperGun.isLoading}
              errorMessage={paperGun.error}
              onClearError={paperGun.clearError}
            />
          ) : (
            <>
              <PaperGunGameScreen
                room={paperGun.room}
                player={paperGun.player}
                onPerformAction={paperGun.performAction}
                onPassTurn={paperGun.passTurn}
                onLeaveRoom={handleLeavePaperGun}
              />

              {paperGun.room.status === 'COMPLETED' && (
                <PaperGunVictoryModal
                  room={paperGun.room}
                  player={paperGun.player}
                  onRematch={paperGun.rematch}
                  onLeaveRoom={handleLeavePaperGun}
                  isLoading={paperGun.isLoading}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
