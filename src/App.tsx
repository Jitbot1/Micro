/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { SantaCruzMicroEngine } from './game/engine';
import {
  HudState,
  INITIAL_HUD_STATE,
  PaintJobId,
  StickerId,
  VehicleType,
  WorldType,
} from './game/types';
import {
  LeaderboardEntry,
  loadLeaderboard,
  saveLeaderboardScore,
} from './game/leaderboard';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { OverlayModals } from './components/OverlayModals';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<SantaCruzMicroEngine | null>(null);
  const [hud, setHud] = useState<HudState>(INITIAL_HUD_STATE);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => loadLeaderboard());

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new SantaCruzMicroEngine(mount, (nextHud) => {
      setHud(nextHud);
    });
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleStart = useCallback(() => {
    engineRef.current?.startGame();
  }, []);

  const handleSelectVehicle = useCallback((vehicle: VehicleType) => {
    engineRef.current?.setVehicleType(vehicle);
  }, []);

  const handleSelectWorld = useCallback((world: WorldType) => {
    engineRef.current?.setWorldType(world);
  }, []);

  const handleSelectDecoration = useCallback((paintJob: PaintJobId, sticker: StickerId) => {
    engineRef.current?.setDecoration(paintJob, sticker);
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.pauseGame();
  }, []);

  const handleResume = useCallback(() => {
    engineRef.current?.resumeGame();
  }, []);

  const handleTitle = useCallback(() => {
    engineRef.current?.returnToTitle();
  }, []);

  const handleToggleMute = useCallback(() => {
    engineRef.current?.toggleMute();
  }, []);

  const handleToggleCamera = useCallback(() => {
    engineRef.current?.toggleCameraMode();
  }, []);

  const handleCycleRadio = useCallback(() => {
    engineRef.current?.cycleRadioStation();
  }, []);

  const handleHorn = useCallback(() => {
    engineRef.current?.triggerHorn();
  }, []);

  const handleVirtualControl = useCallback(
    (control: 'accel' | 'brake' | 'left' | 'right' | 'boost' | 'fire', active: boolean) => {
      engineRef.current?.setVirtualControl(control, active);
    },
    [],
  );

  const handleSaveLeaderboardScore = useCallback(
    (initials: string): LeaderboardEntry | null => {
      const level =
        hud.vehicleType === 'taxi'
          ? hud.taxiStage
          : hud.vehicleType === 'micro' || hud.vehicleType === 'flota'
            ? hud.missionLevel
            : 1;
      const { entries, savedEntry } = saveLeaderboardScore({
        initials,
        score: hud.score,
        mode: hud.gameMode,
        level,
      });
      setLeaderboard(entries);
      return savedEntry;
    },
    [hud.gameMode, hud.missionLevel, hud.score, hud.taxiStage, hud.vehicleType],
  );

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-stone-900">
      {/* Isolated WebGL Mount Container — never re-rendered by HUD updates */}
      <div ref={canvasMountRef} className="absolute inset-0 h-full w-full" />

      {hud.phase === 'title' && (
        <TitleScreen
          vehicleType={hud.vehicleType}
          worldType={hud.worldType}
          paintJob={hud.paintJob}
          sticker={hud.sticker}
          highScore={hud.highScore}
          leaderboard={leaderboard}
          muted={hud.muted}
          onSelectVehicle={handleSelectVehicle}
          onSelectWorld={handleSelectWorld}
          onSelectDecoration={handleSelectDecoration}
          onStart={handleStart}
          onToggleMute={handleToggleMute}
        />
      )}

      {(hud.phase === 'playing' || hud.phase === 'paused') && (
        <GameHUD
          hud={hud}
          onPause={handlePause}
          onToggleMute={handleToggleMute}
          onToggleCamera={handleToggleCamera}
          onCycleRadio={handleCycleRadio}
          onHorn={handleHorn}
          onVirtualControl={handleVirtualControl}
        />
      )}

      <OverlayModals
        hud={hud}
        leaderboard={leaderboard}
        onSaveLeaderboardScore={handleSaveLeaderboardScore}
        onResume={handleResume}
        onRestart={handleStart}
        onTitle={handleTitle}
      />
    </div>
  );
}
