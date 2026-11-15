import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Trophy,
  Bus,
  Mountain,
  Car,
  Trees,
  Building2,
  Paintbrush,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';
import { PaintJobId, StickerId, VehicleType, WorldType } from '../game/types';
import {
  PAINT_JOBS,
  STICKERS,
  VEHICLE_OPTIONS,
  WORLD_OPTIONS,
  getPaintJob,
  getStickerOption,
  getVehicleOption,
  getWorldOption,
} from '../game/customization';
import { LeaderboardEntry, getModeShortLabel } from '../game/leaderboard';

interface TitleScreenProps {
  vehicleType: VehicleType;
  worldType: WorldType;
  paintJob: PaintJobId;
  sticker: StickerId;
  highScore: number;
  leaderboard: LeaderboardEntry[];
  muted: boolean;
  onSelectVehicle: (vehicle: VehicleType) => void;
  onSelectWorld: (world: WorldType) => void;
  onSelectDecoration: (paintJob: PaintJobId, sticker: StickerId) => void;
  onStart: () => void;
  onToggleMute: () => void;
}

const VEHICLE_ICONS: Record<VehicleType, React.ReactNode> = {
  micro: <Bus className="h-3.5 w-3.5" />,
  flota: <Mountain className="h-3.5 w-3.5" />,
  taxi: <Car className="h-3.5 w-3.5" />,
  jungleJeep: <Trees className="h-3.5 w-3.5" />,
};

const WORLD_ICONS: Record<WorldType, React.ReactNode> = {
  city: <Building2 className="h-3.5 w-3.5" />,
  mountain: <Mountain className="h-3.5 w-3.5" />,
  jungle: <Trees className="h-3.5 w-3.5" />,
};

export const TitleScreen: React.FC<TitleScreenProps> = ({
  vehicleType,
  worldType,
  paintJob,
  sticker,
  highScore,
  leaderboard,
  muted,
  onSelectVehicle,
  onSelectWorld,
  onSelectDecoration,
  onStart,
  onToggleMute,
}) => {
  const [activeTab, setActiveTab] = useState<'ride' | 'deco' | 'scores'>('ride');
  const [panelHidden, setPanelHidden] = useState(false);

  const activeVeh = getVehicleOption(vehicleType);
  const activeWorld = getWorldOption(worldType);
  const activePaint = getPaintJob(paintJob);
  const activeSticker = getStickerOption(sticker);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-5 select-none">
      {/* Top Row: Compact Title Badge (Left) + Utility Buttons (Right) */}
      <div className="flex items-start justify-between gap-3">
        <div className="pointer-events-auto flex flex-col gap-1.5">
          <div className="rounded-xl border-2 border-amber-400/85 bg-stone-950/90 px-3.5 py-2 shadow-xl">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-300">
              <span>{activeWorld.name} · Bolivia</span>
              {highScore > 0 && (
                <span className="flex items-center gap-1 text-amber-300 tabular-nums">
                  · <Trophy className="h-3 w-3 text-amber-400" /> {highScore.toLocaleString()}
                </span>
              )}
            </div>
            <h1 className="mt-0.5 text-lg sm:text-2xl font-black tracking-tight text-yellow-300 leading-none">
              {activeVeh.name.toUpperCase()}
            </h1>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPanelHidden((v) => !v)}
            className="flex h-9 items-center gap-1.5 rounded-xl border-2 border-amber-400/70 bg-stone-950/90 px-2.5 text-xs font-black tracking-wide text-amber-200 transition-colors hover:border-amber-300 hover:bg-stone-900 whitespace-nowrap"
            aria-label={panelHidden ? 'Show garage options' : 'Hide garage panel'}
          >
            {panelHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            <span>{panelHidden ? 'GARAGE' : 'HIDE UI'}</span>
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-amber-400/70 bg-stone-950/90 text-amber-200 transition-colors hover:border-amber-300 hover:bg-stone-900"
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Middle-Left Compact Dock + Bottom-Right Start CTA — Center 3D Vehicle Completely Unobstructed */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
        {!panelHidden ? (
          <div className="pointer-events-auto w-full max-w-[285px] rounded-2xl border-2 border-amber-400/75 bg-stone-950/90 p-2.5 shadow-2xl">
            {/* Compact Tab Bar */}
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-stone-900 p-1">
              <button
                type="button"
                onClick={() => setActiveTab('ride')}
                className={`rounded-lg py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
                  activeTab === 'ride'
                    ? 'bg-amber-500 text-stone-950'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                Car & World
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('deco')}
                className={`rounded-lg py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
                  activeTab === 'deco'
                    ? 'bg-amber-500 text-stone-950'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                Bus Deco
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('scores')}
                className={`rounded-lg py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
                  activeTab === 'scores'
                    ? 'bg-amber-500 text-stone-950'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                Top 5
              </button>
            </div>

            {activeTab === 'ride' && (
              <div className="mt-2.5 flex flex-col gap-2.5">
                <div>
                  <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-amber-300">
                    Vehicle Type
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {VEHICLE_OPTIONS.map((v) => {
                      const active = vehicleType === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => onSelectVehicle(v.id)}
                          className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left transition-colors ${
                            active
                              ? 'border-yellow-300 bg-stone-800 text-white'
                              : 'border-stone-800 bg-stone-900/80 text-stone-300 hover:border-amber-400/50'
                          }`}
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${
                              active
                                ? 'bg-amber-500 text-stone-950'
                                : 'bg-stone-800 text-stone-400'
                            }`}
                          >
                            {VEHICLE_ICONS[v.id]}
                          </span>
                          <span className="truncate text-[11px] font-black uppercase">
                            {v.shortName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-1 text-[10px] font-medium text-stone-400">
                    {activeVeh.subtitle}
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                    World Type
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {WORLD_OPTIONS.map((w) => {
                      const active = worldType === w.id;
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => onSelectWorld(w.id)}
                          className={`flex flex-col items-center gap-1 rounded-lg border px-1.5 py-1.5 text-center transition-colors ${
                            active
                              ? 'border-emerald-400 bg-emerald-950/80 text-white'
                              : 'border-stone-800 bg-stone-900/80 text-stone-300 hover:border-emerald-400/50'
                          }`}
                        >
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded ${
                              active
                                ? 'bg-emerald-500 text-stone-950'
                                : 'bg-stone-800 text-stone-400'
                            }`}
                          >
                            {WORLD_ICONS[w.id]}
                          </span>
                          <span className="truncate w-full text-[10px] font-black uppercase">
                            {w.shortName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-1 text-[10px] font-medium text-stone-400">
                    {activeWorld.subtitle}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'deco' && (
              <div className="mt-2.5 flex flex-col gap-2.5">
                <div>
                  <div className="mb-1 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-yellow-300">
                    <span className="flex items-center gap-1">
                      <Paintbrush className="h-3 w-3" />
                      <span>Paint Job</span>
                    </span>
                    <span className="text-stone-300">{activePaint.name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PAINT_JOBS.map((p) => {
                      const active = paintJob === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => onSelectDecoration(p.id, sticker)}
                          className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left transition-colors ${
                            active
                              ? 'border-yellow-300 bg-stone-800 text-white'
                              : 'border-stone-800 bg-stone-900/80 text-stone-300 hover:border-amber-400/50'
                          }`}
                        >
                          <span className="flex h-4 w-4 shrink-0 flex-col overflow-hidden rounded border border-white/40">
                            <span className="h-2.5 w-full" style={{ backgroundColor: p.primaryCss }} />
                            <span className="h-1.5 w-full" style={{ backgroundColor: p.stripeCss }} />
                          </span>
                          <span className="truncate text-[10px] font-extrabold uppercase">
                            {p.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-sky-300">
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      <span>Sticker Art</span>
                    </span>
                    <span className="text-stone-300">{activeSticker.shortLabel}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {STICKERS.map((s) => {
                      const active = sticker === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => onSelectDecoration(paintJob, s.id)}
                          className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left transition-colors ${
                            active
                              ? 'border-sky-400 bg-sky-950/70 text-white'
                              : 'border-stone-800 bg-stone-900/80 text-stone-300 hover:border-sky-400/50'
                          }`}
                        >
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-sm border border-white/50"
                            style={{ backgroundColor: s.accentCss }}
                          />
                          <span className="truncate text-[10px] font-extrabold uppercase">
                            {s.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'scores' && (
              <div className="mt-2.5">
                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
                  <Trophy className="h-3.5 w-3.5 text-yellow-300" />
                  <span>Top 5 High Scores</span>
                </div>
                {leaderboard.length === 0 ? (
                  <div className="rounded-lg border border-stone-800 bg-stone-900/70 px-3 py-4 text-center text-xs font-medium text-stone-400">
                    Finish a run to set the #1 record!
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {leaderboard.map((entry, idx) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between rounded-lg bg-stone-900/95 px-2.5 py-1.5 text-[11px] font-bold"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`w-4 font-black tabular-nums ${
                              idx === 0 ? 'text-yellow-300' : 'text-stone-400'
                            }`}
                          >
                            #{idx + 1}
                          </span>
                          <span className="font-mono font-black tracking-wider text-amber-200">
                            {entry.initials}
                          </span>
                          <span className="truncate text-[10px] font-bold text-stone-400">
                            {getModeShortLabel(entry.mode)}
                          </span>
                        </div>
                        <span className="tabular-nums font-black text-yellow-300">
                          {entry.score.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div />
        )}

        {/* Bottom-Right Primary CTA & Compact Control Hint */}
        <div className="pointer-events-auto flex flex-col items-stretch sm:items-end gap-1.5 self-stretch sm:self-end">
          <button
            type="button"
            onClick={onStart}
            className="flex items-center justify-center gap-2.5 rounded-2xl border-2 border-yellow-300 bg-gradient-to-b from-emerald-500 to-emerald-700 px-6 py-3 text-base sm:text-lg font-black tracking-wide text-white shadow-[0_6px_0_#064e3b,0_12px_24px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_#064e3b] whitespace-nowrap"
          >
            <Play className="h-5 w-5 fill-white" />
            <span>
              DRIVE {activeVeh.shortName.toUpperCase()} · {activeWorld.shortName.toUpperCase()}
            </span>
          </button>

          <div className="rounded-lg border border-amber-500/35 bg-stone-950/88 px-2.5 py-1 text-center text-[10px] font-semibold tracking-wide text-amber-100/90">
            WASD Drive · Space Horn · Shift Boost · F / Click MG · C Camera
          </div>
        </div>
      </div>
    </div>
  );
};
