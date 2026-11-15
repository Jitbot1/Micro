import React, { useEffect, useState } from 'react';
import {
  RotateCcw,
  Play,
  Home,
  Trophy,
  Users,
  ShieldCheck,
  Flag,
  Trees,
  Timer,
  Check,
} from 'lucide-react';
import { HudState } from '../game/types';
import { getVehicleOption, getWorldOption } from '../game/customization';
import {
  LeaderboardEntry,
  getModeShortLabel,
  getSavedInitials,
  qualifiesForLeaderboard,
  sanitizeInitials,
} from '../game/leaderboard';

interface OverlayModalsProps {
  hud: HudState;
  leaderboard: LeaderboardEntry[];
  onSaveLeaderboardScore: (initials: string) => LeaderboardEntry | null;
  onResume: () => void;
  onRestart: () => void;
  onTitle: () => void;
}

export const OverlayModals: React.FC<OverlayModalsProps> = ({
  hud,
  leaderboard,
  onSaveLeaderboardScore,
  onResume,
  onRestart,
  onTitle,
}) => {
  const [initials, setInitials] = useState<string>(() => getSavedInitials());
  const [submittedEntryId, setSubmittedEntryId] = useState<string | null>(null);

  useEffect(() => {
    if (hud.phase !== 'gameover') {
      setSubmittedEntryId(null);
      setInitials(getSavedInitials());
    }
  }, [hud.phase]);

  if (hud.phase !== 'paused' && hud.phase !== 'gameover') return null;

  const isGameOver = hud.phase === 'gameover';
  const qualifies = isGameOver && hud.score > 0 && qualifiesForLeaderboard(hud.score, leaderboard);
  const showInitialsForm = isGameOver && qualifies && !submittedEntryId;

  const handleSaveInitials = (e: React.FormEvent) => {
    e.preventDefault();
    const saved = onSaveLeaderboardScore(initials || 'PLR');
    setSubmittedEntryId(saved ? saved.id : 'saved');
  };

  const vehLabel = getVehicleOption(hud.vehicleType).shortName;
  const worldLabel = getWorldOption(hud.worldType).shortName;
  const modeBadge = `${vehLabel} · ${worldLabel} · ${isGameOver ? 'Ended' : 'Paused'}`;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-stone-950/75 p-4 select-none">
      <div className="max-h-[94vh] w-full max-w-md overflow-y-auto rounded-2xl border-2 border-amber-400 bg-stone-900 p-5 sm:p-6 text-center shadow-2xl">
        <div className="mx-auto mb-2 inline-block rounded-lg border border-amber-400/50 bg-emerald-900 px-3 py-1 text-xs font-extrabold tracking-widest text-yellow-300 uppercase">
          {modeBadge}
        </div>

        <h2 className="text-3xl font-black tracking-tight text-white">
          {isGameOver ? 'GAME OVER' : 'PAUSED'}
        </h2>

        {isGameOver && hud.gameOverReason && (
          <p className="mt-2 rounded-lg border border-rose-500/40 bg-rose-950/70 px-3.5 py-2 text-sm font-semibold text-rose-200">
            {hud.gameOverReason}
          </p>
        )}

        {/* Run Summary Stats */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 text-left">
          <div className="rounded-xl border border-stone-700 bg-stone-950 p-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Score</div>
            <div className="mt-0.5 text-xl font-black tabular-nums text-yellow-300">
              {hud.score.toLocaleString()}
            </div>
          </div>

          <div className="rounded-xl border border-stone-700 bg-stone-950 p-3">
            <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-stone-400">
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              <span>Best</span>
            </div>
            <div className="mt-0.5 text-xl font-black tabular-nums text-amber-300">
              {hud.highScore.toLocaleString()}
            </div>
          </div>

          {hud.vehicleType === 'taxi' ? (
            <>
              <div className="rounded-xl border border-stone-700 bg-stone-950 p-3">
                <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  <Flag className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Stage</span>
                </div>
                <div className="mt-0.5 text-xl font-black tabular-nums text-emerald-300">
                  {hud.taxiStage}
                </div>
              </div>

              <div className="rounded-xl border border-stone-700 bg-stone-950 p-3">
                <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  <Timer className="h-3.5 w-3.5 text-sky-400" />
                  <span>Best Stage Time</span>
                </div>
                <div className="mt-0.5 text-xl font-black tabular-nums text-sky-300">
                  {hud.taxiBestTime !== null
                    ? `${Math.floor(hud.taxiBestTime / 60)}:${Math.floor(hud.taxiBestTime % 60)
                        .toString()
                        .padStart(2, '0')}`
                    : '--'}
                </div>
              </div>
            </>
          ) : hud.vehicleType === 'jungleJeep' ? (
            <>
              <div className="rounded-xl border border-stone-700 bg-stone-950 p-3">
                <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  <Trees className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Distance ({hud.jungleDodged} Dodged)</span>
                </div>
                <div className="mt-0.5 text-xl font-black tabular-nums text-emerald-300">
                  {hud.jungleDistance}m
                </div>
              </div>

              <div className="rounded-xl border border-stone-700 bg-stone-950 p-3">
                <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                  <span>Blasted ({hud.raidersDestroyed} Raiders)</span>
                </div>
                <div className="mt-0.5 text-xl font-black tabular-nums text-amber-300">
                  {hud.obstaclesDestroyed + hud.raidersDestroyed}
                </div>
                <div className="text-[10px] font-bold text-sky-300">
                  {hud.worldType === 'jungle'
                    ? `${hud.jungleChaserEscapes} Chaser Escapes`
                    : `${hud.policeEscapes} Police Escapes`}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-stone-700 bg-stone-950 p-3">
                <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  <Users className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Commuters (Lvl {hud.missionLevel})</span>
                </div>
                <div className="mt-0.5 text-xl font-black tabular-nums text-emerald-300">
                  {hud.passengersPicked}
                </div>
              </div>

              <div className="rounded-xl border border-stone-700 bg-stone-950 p-3">
                <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
                  <span>Escapes ({hud.totalPedestriansHit} Hits)</span>
                </div>
                <div className="mt-0.5 text-xl font-black tabular-nums text-sky-300">
                  {hud.policeEscapes}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-2.5 flex items-center justify-between rounded-xl border border-stone-700 bg-stone-950 px-3.5 py-2 text-xs font-bold text-stone-300">
          <span>
            Fuel Cans: <span className="tabular-nums text-amber-300">{hud.fuelCollected}</span>
          </span>
          <span>
            Boosters Grabbed:{' '}
            <span className="tabular-nums text-sky-300">{hud.boostersCollected}</span>
          </span>
        </div>

        {/* Top-5 Leaderboard Initials Prompt & Table (Game Over) */}
        {isGameOver && (
          <div className="mt-3 rounded-xl border border-amber-400/50 bg-stone-950 p-3 text-left">
            {showInitialsForm && (
              <form
                onSubmit={handleSaveInitials}
                className="mb-3 rounded-lg border border-emerald-400/60 bg-emerald-950/60 p-2.5"
              >
                <div className="text-[11px] font-black uppercase tracking-wider text-yellow-300">
                  NEW TOP 5 HIGH SCORE! ENTER INITIALS
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={initials}
                    onChange={(e) => setInitials(sanitizeInitials(e.target.value))}
                    maxLength={3}
                    placeholder="AAA"
                    autoFocus
                    aria-label="Player initials"
                    className="w-24 rounded-lg border-2 border-amber-400 bg-stone-900 px-2.5 py-1.5 text-center text-base font-black uppercase tracking-[0.25em] text-yellow-300 outline-none focus:border-emerald-400"
                  />
                  <button
                    type="submit"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-600 px-3 py-2 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-emerald-500"
                  >
                    <Check className="h-4 w-4" />
                    <span>SAVE SCORE</span>
                  </button>
                </div>
              </form>
            )}

            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-amber-300">
              <span className="flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-yellow-300" />
                <span>TOP 5 HIGH SCORES</span>
              </span>
              {submittedEntryId && (
                <span className="text-emerald-300">SAVED TO LEADERBOARD</span>
              )}
            </div>

            {leaderboard.length === 0 ? (
              <div className="mt-2 text-center text-xs font-semibold text-stone-400 py-1.5">
                No scores saved yet. Score above 0 to claim #1!
              </div>
            ) : (
              <div className="mt-2 flex flex-col gap-1">
                {leaderboard.map((entry, idx) => {
                  const isMine = entry.id === submittedEntryId;
                  return (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs font-bold ${
                        isMine
                          ? 'border-emerald-400 bg-emerald-950/70 text-white'
                          : 'border-stone-800 bg-stone-900/90 text-stone-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-5 text-center font-black tabular-nums ${
                            idx === 0
                              ? 'text-yellow-300'
                              : idx === 1
                                ? 'text-stone-200'
                                : idx === 2
                                  ? 'text-amber-500'
                                  : 'text-stone-400'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <span className="rounded bg-stone-800 px-1.5 py-0.5 font-mono text-xs font-black tracking-widest text-amber-200">
                          {entry.initials}
                        </span>
                        <span className="truncate text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                          {getModeShortLabel(entry.mode)}
                          {entry.mode === 'taxi'
                            ? ` · S${entry.level}`
                            : entry.mode === 'city' || entry.mode === 'flota'
                              ? ` · L${entry.level}`
                              : ''}
                        </span>
                      </div>
                      <span className="tabular-nums font-black text-yellow-300">
                        {entry.score.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex flex-col gap-2.5">
          {!isGameOver && (
            <button
              type="button"
              onClick={onResume}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-yellow-300 bg-amber-500 py-3 text-base font-black text-stone-950 transition-colors hover:bg-amber-400"
            >
              <Play className="h-5 w-5 fill-stone-950" />
              <span>RESUME ROUTE</span>
            </button>
          )}

          <button
            type="button"
            onClick={onRestart}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-400 bg-emerald-600 py-3 text-base font-black text-white transition-colors hover:bg-emerald-500"
          >
            <RotateCcw className="h-5 w-5" />
            <span>{isGameOver ? 'DRIVE AGAIN [ENTER]' : 'RESTART ROUTE'}</span>
          </button>

          <button
            type="button"
            onClick={onTitle}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-700 bg-stone-800 py-2.5 text-sm font-bold text-stone-200 transition-colors hover:bg-stone-700"
          >
            <Home className="h-4 w-4" />
            <span>TITLE SCREEN</span>
          </button>
        </div>
      </div>
    </div>
  );
};
