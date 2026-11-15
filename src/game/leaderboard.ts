import { GameMode } from './types';

export interface LeaderboardEntry {
  id: string;
  initials: string;
  score: number;
  mode: GameMode;
  level: number;
  date: number;
}

const LEADERBOARD_KEY = 'scz_leaderboard_v1';
const INITIALS_KEY = 'scz_player_initials';
const MAX_LEADERBOARD_ENTRIES = 5;

export function sanitizeInitials(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
}

export function getSavedInitials(): string {
  try {
    const stored = localStorage.getItem(INITIALS_KEY);
    const cleaned = stored ? sanitizeInitials(stored) : '';
    return cleaned || 'SCZ';
  } catch {
    return 'SCZ';
  }
}

export function savePlayerInitials(initials: string): void {
  const cleaned = sanitizeInitials(initials);
  if (!cleaned) return;
  try {
    localStorage.setItem(INITIALS_KEY, cleaned);
  } catch {
    // ignore storage errors
  }
}

export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const valid: LeaderboardEntry[] = parsed
      .filter(
        (item): item is LeaderboardEntry =>
          Boolean(item) &&
          typeof item.id === 'string' &&
          typeof item.initials === 'string' &&
          typeof item.score === 'number' &&
          Number.isFinite(item.score) &&
          item.score > 0 &&
          typeof item.mode === 'string',
      )
      .map((item) => ({
        id: item.id,
        initials: sanitizeInitials(item.initials) || 'PLR',
        score: Math.floor(item.score),
        mode: (['city', 'flota', 'taxi', 'jungle'].includes(item.mode)
          ? item.mode
          : 'city') as GameMode,
        level: typeof item.level === 'number' && item.level > 0 ? Math.floor(item.level) : 1,
        date: typeof item.date === 'number' ? item.date : Date.now(),
      }))
      .sort((a, b) => b.score - a.score || b.date - a.date)
      .slice(0, MAX_LEADERBOARD_ENTRIES);

    return valid;
  } catch {
    return [];
  }
}

export function qualifiesForLeaderboard(score: number, existing?: LeaderboardEntry[]): boolean {
  const cleanScore = Math.floor(score);
  if (cleanScore <= 0) return false;
  const list = existing ?? loadLeaderboard();
  if (list.length < MAX_LEADERBOARD_ENTRIES) return true;
  return cleanScore > list[list.length - 1].score;
}

export function saveLeaderboardScore(params: {
  initials: string;
  score: number;
  mode: GameMode;
  level: number;
}): { entries: LeaderboardEntry[]; savedEntry: LeaderboardEntry | null } {
  const cleanScore = Math.floor(params.score);
  const existing = loadLeaderboard();
  if (cleanScore <= 0) {
    return { entries: existing, savedEntry: null };
  }

  const cleanedInitials = sanitizeInitials(params.initials) || 'PLR';
  savePlayerInitials(cleanedInitials);

  const newEntry: LeaderboardEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    initials: cleanedInitials,
    score: cleanScore,
    mode: params.mode,
    level: Math.max(1, Math.floor(params.level)),
    date: Date.now(),
  };

  const merged = [...existing, newEntry]
    .sort((a, b) => b.score - a.score || b.date - a.date)
    .slice(0, MAX_LEADERBOARD_ENTRIES);

  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(merged));
  } catch {
    // ignore storage errors
  }

  const madeTop5 = merged.some((entry) => entry.id === newEntry.id);
  return {
    entries: merged,
    savedEntry: madeTop5 ? newEntry : null,
  };
}

export function getModeShortLabel(mode: GameMode): string {
  switch (mode) {
    case 'flota':
      return 'FLOTA';
    case 'taxi':
      return 'TAXI';
    case 'jungle':
      return 'JUNGLE';
    case 'city':
    default:
      return 'LÍNEA 18';
  }
}
