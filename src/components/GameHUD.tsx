import React from 'react';
import {
  Pause,
  Volume2,
  VolumeX,
  Users,
  ShieldAlert,
  Megaphone,
  Flame,
  Camera,
  Flag,
  Compass,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Crosshair,
  GitFork,
  Fuel,
  Shield,
  Zap,
  Magnet,
  Sun,
  Wind,
  CloudRain,
  CloudDrizzle,
  Snowflake,
  Radio,
} from 'lucide-react';
import { HudState } from '../game/types';

interface GameHUDProps {
  hud: HudState;
  onPause: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onCycleRadio: () => void;
  onHorn: () => void;
  onVirtualControl: (
    control: 'accel' | 'brake' | 'left' | 'right' | 'boost' | 'fire',
    active: boolean,
  ) => void;
}

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  onPause,
  onToggleMute,
  onToggleCamera,
  onCycleRadio,
  onHorn,
  onVirtualControl,
}) => {
  const healthPct = Math.max(0, Math.min(100, (hud.health / hud.maxHealth) * 100));
  const healthColor =
    healthPct > 55 ? 'bg-emerald-500' : healthPct > 28 ? 'bg-amber-400' : 'bg-rose-500';

  const fuelPct = Math.max(0, Math.min(100, (hud.fuel / hud.maxFuel) * 100));
  const fuelColor =
    fuelPct > 45 ? 'bg-amber-400' : fuelPct > 22 ? 'bg-orange-500' : 'bg-rose-500';

  const maxGaugeSpeed = hud.vehicleType === 'taxi' ? 210 : 160;
  const speedRatio = Math.min(1, hud.speedKmh / maxGaugeSpeed);
  const arcLen = 220;
  const dashOffset = arcLen * (1 - speedRatio);

  const integrityLabel =
    hud.vehicleType === 'taxi'
      ? 'Taxi Integrity'
      : hud.vehicleType === 'jungleJeep'
        ? 'Jeep Integrity'
        : hud.vehicleType === 'flota'
          ? 'Flota Integrity'
          : 'Micro Integrity';

  const missionQuotaMet = hud.missionCommutersPicked >= hud.missionTargetCommuters;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 sm:p-4 select-none">
      {/* TOP PERIMETER CLUSTER */}
      <div className="flex items-start justify-between gap-2">
        {/* Top-Left: Compact Telemetry & Objective Box */}
        <div className="flex flex-col gap-1.5 min-w-[205px] sm:min-w-[238px] max-w-[255px]">
          <div className="rounded-xl border-2 border-amber-400/70 bg-stone-950/88 px-3 py-2 shadow-lg">
            <div className="flex items-center justify-between text-[10px] font-extrabold tracking-wider text-amber-200 uppercase">
              <span>{integrityLabel}</span>
              <span className="tabular-nums text-white">{hud.health}%</span>
            </div>
            <div className="mt-1 h-2.5 w-full overflow-hidden rounded bg-stone-800 border border-stone-700">
              <div
                className={`h-full transition-all duration-150 ${healthColor}`}
                style={{ width: `${healthPct}%` }}
              />
            </div>

            <div className="mt-1.5 flex items-center justify-between text-[10px] font-extrabold tracking-wider uppercase">
              <span
                className={`flex items-center gap-1 ${
                  fuelPct <= 22 ? 'text-rose-400' : 'text-amber-300'
                }`}
              >
                <Fuel className="h-3 w-3" />
                <span>Fuel {fuelPct <= 22 ? 'LOW!' : ''}</span>
              </span>
              <span
                className={`tabular-nums ${
                  fuelPct <= 22 ? 'text-rose-300' : 'text-white'
                }`}
              >
                {hud.fuel}%
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded bg-stone-800 border border-stone-700">
              <div
                className={`h-full transition-all duration-150 ${fuelColor}`}
                style={{ width: `${fuelPct}%` }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-stone-800 pt-1.5">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-stone-400">
                  Score
                </div>
                <div className="text-base sm:text-lg font-black tabular-nums text-yellow-300 leading-none">
                  {hud.score.toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {hud.combo > 1 && (
                  <div className="rounded bg-pink-600 px-1.5 py-0.5 text-[11px] font-black tabular-nums text-white">
                    {hud.combo}x
                  </div>
                )}
                {hud.vehicleType === 'taxi' ? (
                  <div className="flex items-center gap-1 rounded bg-amber-900/90 border border-amber-500/60 px-1.5 py-0.5 text-[11px] font-bold text-amber-200 tabular-nums">
                    <Flag className="h-3 w-3 text-amber-300" />
                    <span>STG {hud.taxiStage}</span>
                  </div>
                ) : hud.vehicleType === 'jungleJeep' ? (
                  <div className="flex items-center gap-1 rounded bg-emerald-900/90 border border-emerald-500/60 px-1.5 py-0.5 text-[11px] font-bold text-emerald-200 tabular-nums">
                    <Crosshair className="h-3 w-3 text-amber-300" />
                    <span>{hud.obstaclesDestroyed + hud.raidersDestroyed}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 rounded bg-emerald-900/90 border border-emerald-500/50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-200 tabular-nums">
                    <Flag className="h-3 w-3 text-yellow-300" />
                    <span>L{hud.missionLevel}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Compact Vehicle Objective Row */}
            {(hud.vehicleType === 'micro' || hud.vehicleType === 'flota') && (
              <div className="mt-1.5 flex items-center justify-between border-t border-stone-800 pt-1.5 text-[10px] font-extrabold uppercase tracking-wider tabular-nums">
                <span className={missionQuotaMet ? 'text-emerald-300' : 'text-amber-300'}>
                  <Users className="mr-1 inline h-3 w-3" />
                  {hud.missionCommutersPicked}/{hud.missionTargetCommuters} COMMUTERS
                </span>
                <span className="text-sky-300">{hud.missionDistanceLeft}m</span>
              </div>
            )}

            {hud.vehicleType === 'taxi' && (
              <div className="mt-1.5 flex items-center justify-between border-t border-stone-800 pt-1.5 text-[10px] font-extrabold uppercase tracking-wider tabular-nums">
                <span className="truncate text-emerald-300 mr-2">
                  {hud.taxiDistanceLeft}m TO FINISH
                </span>
                <span className={hud.taxiTimeLeft < 25 ? 'text-rose-400' : 'text-yellow-300'}>
                  {hud.taxiTimeLeft >= 60
                    ? formatClock(hud.taxiTimeLeft)
                    : `${hud.taxiTimeLeft.toFixed(1)}s`}
                </span>
              </div>
            )}

            {/* Threat / Pursuit Row */}
            {hud.worldType === 'jungle' ? (
              <div className="mt-1.5 flex items-center justify-between border-t border-stone-800 pt-1.5 text-[10px] font-extrabold uppercase tracking-wider">
                <span className="text-emerald-300 tabular-nums">TRAIL: {hud.jungleDistance}m</span>
                <span className={hud.jungleChaserActive ? 'text-red-400' : 'text-amber-300 tabular-nums'}>
                  {hud.jungleChaserActive
                    ? 'CHASER ACTIVE!'
                    : hud.jungleChaserIn > 0
                      ? `CHASER ${formatClock(hud.jungleChaserIn)}`
                      : 'AMBUSH READY'}
                </span>
              </div>
            ) : (
              <div className="mt-1.5 flex items-center justify-between border-t border-stone-800 pt-1.5">
                <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-stone-300">
                  <ShieldAlert
                    className={`h-3 w-3 ${
                      hud.policeActive
                        ? 'text-red-400'
                        : hud.pedestrianStrikes >= 2
                          ? 'text-amber-400'
                          : 'text-stone-400'
                    }`}
                  />
                  <span>{hud.policeActive ? 'POLICE!' : 'WANTED'}</span>
                </div>
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map((idx) => {
                    const filled = hud.policeActive || idx < hud.pedestrianStrikes;
                    return (
                      <span
                        key={idx}
                        className={`h-2 w-3.5 rounded-sm border ${
                          filled
                            ? hud.policeActive || hud.pedestrianStrikes >= 3
                              ? 'border-red-300 bg-red-500'
                              : 'border-amber-300 bg-amber-400'
                            : 'border-stone-700 bg-stone-800'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Realm & Weather Compact Row */}
            <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-stone-800 pt-1.5 text-[9px] font-extrabold uppercase tracking-wider">
              <div className="flex items-center gap-1 min-w-0 text-sky-300">
                <Compass className="h-3 w-3 shrink-0" />
                <span className="truncate">{hud.realmName}</span>
              </div>
              <div
                className={`flex items-center gap-1 shrink-0 ${
                  hud.weather === 'blizzard'
                    ? 'text-sky-200'
                    : hud.weather === 'monsoon'
                      ? 'text-cyan-300'
                      : hud.weather === 'heavyRain'
                        ? 'text-blue-300'
                        : hud.weather === 'dusty'
                          ? 'text-amber-300'
                          : 'text-yellow-300'
                }`}
              >
                {hud.weather === 'blizzard' ? (
                  <Snowflake className="h-3 w-3" />
                ) : hud.weather === 'monsoon' ? (
                  <CloudRain className="h-3 w-3" />
                ) : hud.weather === 'heavyRain' ? (
                  <CloudDrizzle className="h-3 w-3" />
                ) : hud.weather === 'dusty' ? (
                  <Wind className="h-3 w-3" />
                ) : (
                  <Sun className="h-3 w-3" />
                )}
                <span>
                  {hud.weather === 'heavyRain'
                    ? 'HEAVY RAIN'
                    : hud.weather === 'dusty'
                      ? 'DUST STORM'
                      : hud.weather.toUpperCase()}
                </span>
              </div>
            </div>

            {hud.activeBooster && (
              <div
                className={`mt-1.5 flex items-center justify-between border-t border-stone-800 pt-1.5 text-[10px] font-black uppercase tracking-wider ${
                  hud.activeBooster === 'nitro'
                    ? 'text-sky-300'
                    : hud.activeBooster === 'shield'
                      ? 'text-yellow-300'
                      : 'text-fuchsia-300'
                }`}
              >
                <span className="flex items-center gap-1">
                  {hud.activeBooster === 'nitro' ? (
                    <Zap className="h-3 w-3" />
                  ) : hud.activeBooster === 'shield' ? (
                    <Shield className="h-3 w-3" />
                  ) : (
                    <Magnet className="h-3 w-3" />
                  )}
                  <span>{hud.activeBooster.toUpperCase()}</span>
                </span>
                <span className="tabular-nums">{hud.activeBoosterTimer.toFixed(1)}s</span>
              </div>
            )}
          </div>
        </div>

        {/* Top-Center: Minimal Single-Line Strips ONLY for Urgent Pursuit / Parada / Fork (No Giant Popups!) */}
        <div className="flex flex-col items-center gap-1.5">
          {hud.policeActive && hud.worldType !== 'jungle' && (
            <div className="flex items-center gap-2 rounded-lg border border-red-400 bg-red-950/90 px-3 py-1 text-[11px] font-black tracking-wider text-yellow-300 uppercase tabular-nums shadow">
              <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
              <span>POLICE · {hud.policeTimer.toFixed(1)}s · GAP {hud.policeDistance}m/58m</span>
            </div>
          )}

          {hud.jungleChaserActive && hud.worldType === 'jungle' && (
            <div className="flex items-center gap-2 rounded-lg border border-orange-400 bg-red-950/90 px-3 py-1 text-[11px] font-black tracking-wider text-yellow-300 uppercase tabular-nums shadow">
              <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
              <span>CHASER · {hud.jungleChaserTimer.toFixed(1)}s · GAP {hud.jungleChaserDistance}m/62m</span>
            </div>
          )}

          {hud.pickupActive && (hud.vehicleType === 'micro' || hud.vehicleType === 'flota') && (
            <div
              className={`flex items-center gap-2 rounded-lg border px-3 py-1 text-[11px] font-black tracking-wider uppercase tabular-nums shadow ${
                hud.inPickupZone
                  ? 'border-emerald-300 bg-emerald-950/92 text-emerald-200'
                  : 'border-amber-400/80 bg-stone-950/88 text-amber-200'
              }`}
            >
              <Users className="h-3.5 w-3.5 text-emerald-300" />
              <span>
                {hud.inPickupZone
                  ? hud.speedKmh < 44
                    ? `BOARDING ${Math.round(hud.pickupProgress * 100)}%`
                    : 'SLOW < 44 KM/H TO BOARD'
                  : `PARADA ${hud.pickupDistance}m RIGHT · ${hud.pickupTimer.toFixed(0)}s`}
              </span>
            </div>
          )}

          {hud.forkActive && (
            <div className="flex items-center gap-2 rounded-lg border border-cyan-400/80 bg-stone-950/88 px-3 py-1 text-[11px] font-black tracking-wider text-cyan-200 uppercase tabular-nums shadow">
              <GitFork className="h-3.5 w-3.5 text-cyan-300" />
              <span>
                {hud.forkPhase === 'approaching'
                  ? `FORK ${hud.forkDistance}m: ← ${hud.forkLeftLabel} | ${hud.forkRightLabel} →`
                  : `${hud.forkChosenSide === 'left' ? hud.forkLeftLabel : hud.forkRightLabel} · MERGE ${hud.forkDistance}m`}
              </span>
            </div>
          )}
        </div>

        {/* Top-Right: Radio Station Toggle, Camera View Toggle, Mute, Pause */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onCycleRadio}
            className={`flex h-9 items-center gap-1.5 rounded-xl border-2 bg-stone-950/90 px-2.5 text-xs font-black tracking-wide transition-colors hover:bg-stone-900 ${
              hud.radioStation === 'bollywood'
                ? 'border-amber-400 text-amber-300'
                : hud.radioStation === 'techno'
                  ? 'border-sky-400 text-sky-300'
                  : hud.radioStation === 'street'
                    ? 'border-emerald-400 text-emerald-300'
                    : 'border-stone-600 text-stone-300 hover:border-amber-400/70'
            }`}
            aria-label="Cycle Radio Station"
            title="Cycle Radio Station [R]"
          >
            <Radio className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">
              {hud.radioStation === 'bollywood'
                ? 'BOLLYWOOD [R]'
                : hud.radioStation === 'techno'
                  ? 'TECHNO [R]'
                  : hud.radioStation === 'street'
                    ? 'STREET [R]'
                    : 'RADIO OFF [R]'}
            </span>
          </button>
          <button
            type="button"
            onClick={onToggleCamera}
            className="flex h-9 items-center gap-1.5 rounded-xl border-2 border-emerald-400/80 bg-stone-950/90 px-2.5 text-xs font-black tracking-wide text-emerald-300 transition-colors hover:border-emerald-300 hover:bg-stone-900"
            aria-label="Toggle Camera View"
          >
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">
              {hud.cameraMode === 'driver' ? 'DRIVER [C]' : 'CHASE [C]'}
            </span>
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-amber-400/70 bg-stone-950/90 text-amber-200 transition-colors hover:border-amber-300 hover:bg-stone-900"
            aria-label={hud.muted ? 'Unmute audio' : 'Mute audio'}
          >
            {hud.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onPause}
            className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-amber-400/70 bg-stone-950/90 text-amber-200 transition-colors hover:border-amber-300 hover:bg-stone-900"
            aria-label="Pause game"
          >
            <Pause className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* BOTTOM PERIMETER CLUSTER */}
      <div className="flex items-end justify-between gap-4">
        {/* Bottom-Left: Touch & Quick Action Buttons */}
        <div className="pointer-events-auto flex items-end gap-2">
          <div className="flex sm:hidden items-center gap-1.5">
            <button
              type="button"
              onPointerDown={() => onVirtualControl('left', true)}
              onPointerUp={() => onVirtualControl('left', false)}
              onPointerLeave={() => onVirtualControl('left', false)}
              className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-amber-400/70 bg-stone-950/88 text-amber-200 active:bg-amber-500 active:text-stone-950"
              aria-label="Steer Left"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onPointerDown={() => onVirtualControl('accel', true)}
                onPointerUp={() => onVirtualControl('accel', false)}
                onPointerLeave={() => onVirtualControl('accel', false)}
                className="flex h-11 w-12 items-center justify-center rounded-xl border-2 border-emerald-400/70 bg-stone-950/88 text-emerald-300 active:bg-emerald-500 active:text-stone-950"
                aria-label="Accelerate"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
              <button
                type="button"
                onPointerDown={() => onVirtualControl('brake', true)}
                onPointerUp={() => onVirtualControl('brake', false)}
                onPointerLeave={() => onVirtualControl('brake', false)}
                className="flex h-11 w-12 items-center justify-center rounded-xl border-2 border-rose-400/70 bg-stone-950/88 text-rose-300 active:bg-rose-500 active:text-stone-950"
                aria-label="Brake"
              >
                <ArrowDown className="h-5 w-5" />
              </button>
            </div>
            <button
              type="button"
              onPointerDown={() => onVirtualControl('right', true)}
              onPointerUp={() => onVirtualControl('right', false)}
              onPointerLeave={() => onVirtualControl('right', false)}
              className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-amber-400/70 bg-stone-950/88 text-amber-200 active:bg-amber-500 active:text-stone-950"
              aria-label="Steer Right"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onHorn}
            className="flex items-center gap-2 rounded-xl border-2 border-yellow-300 bg-amber-500 px-3 py-2 text-xs font-black tracking-wide text-stone-950 shadow-lg transition-transform active:scale-95"
          >
            <Megaphone className="h-4 w-4" />
            <span className="hidden sm:inline">AIR HORN [SPACE]</span>
          </button>

          <button
            type="button"
            onPointerDown={() => onVirtualControl('boost', true)}
            onPointerUp={() => onVirtualControl('boost', false)}
            onPointerLeave={() => onVirtualControl('boost', false)}
            onPointerCancel={() => onVirtualControl('boost', false)}
            className={`flex items-center gap-1.5 rounded-xl border-2 px-3 py-2 text-xs font-black tracking-wide shadow-lg transition-colors ${
              hud.isBoosting
                ? 'border-sky-300 bg-sky-500 text-stone-950'
                : 'border-sky-400/70 bg-stone-950/90 text-sky-300'
            }`}
          >
            <Flame className="h-4 w-4" />
            <span className="hidden sm:inline">BOOST [SHIFT]</span>
          </button>

          {hud.hasMachineGun && (
            <div className="flex flex-col gap-1 rounded-xl border-2 border-orange-400/80 bg-stone-950/92 p-1.5 shadow-lg">
              <button
                type="button"
                onPointerDown={() => onVirtualControl('fire', true)}
                onPointerUp={() => onVirtualControl('fire', false)}
                onPointerLeave={() => onVirtualControl('fire', false)}
                onPointerCancel={() => onVirtualControl('fire', false)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-black tracking-wide transition-colors ${
                  hud.gunOverheated
                    ? 'bg-rose-700 text-rose-100'
                    : 'bg-orange-500 text-stone-950 active:bg-yellow-400'
                }`}
              >
                <Crosshair className="h-3.5 w-3.5" />
                <span>{hud.gunOverheated ? 'OVERHEAT' : 'FIRE [F]'}</span>
              </button>
              <div className="flex items-center gap-1.5 px-1">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-orange-300">
                  HEAT
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-800">
                  <div
                    className={`h-full transition-all duration-75 ${
                      hud.gunOverheated
                        ? 'bg-rose-500'
                        : hud.gunHeat > 72
                          ? 'bg-amber-400'
                          : 'bg-orange-400'
                    }`}
                    style={{ width: `${Math.min(100, Math.round(hud.gunHeat))}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom-Right: Compact Speedometer & Turbo Bar */}
        <div className="rounded-2xl border-2 border-amber-400/70 bg-stone-950/90 px-3.5 py-2.5 shadow-xl">
          <div className="relative flex flex-col items-center">
            <svg viewBox="0 0 160 95" className="w-28 sm:w-36">
              <path
                d="M 20 82 A 60 60 0 0 1 140 82"
                fill="none"
                stroke="#292524"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <path
                d="M 20 82 A 60 60 0 0 1 140 82"
                fill="none"
                stroke={hud.isBoosting ? '#38bdf8' : '#10b981'}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={arcLen}
                strokeDashoffset={dashOffset}
              />
              <text
                x="80"
                y="68"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="28"
                fontWeight="900"
                className="tabular-nums"
              >
                {hud.speedKmh}
              </text>
              <text
                x="80"
                y="86"
                textAnchor="middle"
                fill="#fbbf24"
                fontSize="10"
                fontWeight="800"
                letterSpacing="1.6"
              >
                KM / H
              </text>
            </svg>

            <div className="mt-0.5 w-full">
              <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-sky-300">
                <span>Turbo</span>
                <span className="tabular-nums">{hud.boostCharge}%</span>
              </div>
              <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-800">
                <div
                  className="h-full bg-sky-400 transition-all duration-100"
                  style={{ width: `${hud.boostCharge}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
