import type { ISnapshotDocument } from '../models/Snapshot.js';
import type { IDrawDocument } from '../models/Draw.js';
import type { PickVerdict } from '../../shared/types/index.js';

export interface ReviewSummary {
  coldPicksCount: number;
  coldHitsCount: number;
  summaryText: string;
}

// A pick is "hot" if it was mid-streak at entry time, "cold" if it had sat
// out longer than the median number. Hot takes priority over cold when a
// number happens to qualify as both, since an active streak is the more
// specific signal. Everything else is a neutral pick.
export function buildPickVerdicts(snapshot: ISnapshotDocument, draw: IDrawDocument | null): PickVerdict[] {
  const drawnSet = new Set(draw?.numbers ?? []);
  const recencyMap = new Map(snapshot.numberRecency.map((e) => [e.number, e.drawsAbsent]));
  const absenceMap = new Map(snapshot.absenceStreaks.map((e) => [e.number, e.daysAbsent]));
  const streakMap = new Map(snapshot.sequentialStreaks.map((e) => [e.number, e.currentStreak]));

  const sortedDrawsAbsent = [...recencyMap.values()].sort((a, b) => a - b);
  const median = sortedDrawsAbsent.length > 0 ? sortedDrawsAbsent[Math.floor(sortedDrawsAbsent.length / 2)] : 0;

  return snapshot.pickedNumbers.map((n) => {
    const drawsAbsentAtEntry = recencyMap.get(n) ?? 0;
    const daysAbsentAtEntry = absenceMap.get(n) ?? 0;
    const currentStreakAtEntry = streakMap.get(n) ?? 0;
    const hit = drawnSet.has(n);

    const isHotPick = currentStreakAtEntry >= 2;
    const isColdPick = !isHotPick && median > 0 && drawsAbsentAtEntry >= median;

    let verdict: string;
    if (isHotPick) {
      verdict = `Hot pick (streak of ${currentStreakAtEntry}) — ${hit ? 'Hit ✅' : 'Missed ❌'}`;
    } else if (isColdPick) {
      verdict = `Cold pick (${drawsAbsentAtEntry} draws absent) — ${hit ? 'Hit ✅' : 'Missed ❌'}`;
    } else {
      verdict = `Neutral pick — ${hit ? 'Hit ✅' : 'Missed ❌'}`;
    }

    return { number: n, hit, daysAbsentAtEntry, drawsAbsentAtEntry, currentStreakAtEntry, isColdPick, isHotPick, verdict };
  });
}

export function summarizeVerdicts(picks: PickVerdict[]): ReviewSummary {
  const coldPicks = picks.filter((p) => p.isColdPick);
  const coldHitsCount = coldPicks.filter((p) => p.hit).length;
  return {
    coldPicksCount: coldPicks.length,
    coldHitsCount,
    summaryText: `${coldPicks.length} of your 15 picks were supported by absence data. ${coldHitsCount} of those hit.`,
  };
}
