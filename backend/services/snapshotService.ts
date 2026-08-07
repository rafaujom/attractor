import mongoose from 'mongoose';
import Draw from '../models/Draw.js';
import { computeSequentialStreaks } from './streaks.js';
import type {
  GravityCategory,
  GravityStatsSnapshot,
  MonthlyEntry,
  AbsenceStreakEntry,
  NumberRecencySnapshotEntry,
  SequentialStreakEntry,
} from '../../shared/types/index.js';

export interface SnapshotData {
  gravityStats: GravityStatsSnapshot;
  monthlyBreakdown: MonthlyEntry[];
  absenceStreaks: AbsenceStreakEntry[];
  sequentialStreaks: SequentialStreakEntry[];
  numberRecency: NumberRecencySnapshotEntry[];
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Recomputes every stats indicator from the draws collected so far, exactly
// as the dashboard would show them right now. Runs inside the same Mongo
// session as the ticket write when provided, so it sees a consistent view of
// the data and the whole capture can be rolled back atomically on failure.
export async function captureSnapshot(session?: mongoose.ClientSession): Promise<SnapshotData> {
  const query = Draw.find().sort({ concurso: 1 }).select('date numbers category -_id');
  if (session) query.session(session);
  const draws = await query;

  const categories: Record<GravityCategory, number> = {
    'high-gravity': 0,
    'mid-gravity': 0,
    'small-gravity': 0,
  };
  for (const d of draws) categories[d.category] += 1;
  const gravityStats: GravityStatsSnapshot = { total: draws.length, categories };

  const monthlyMap = new Map<
    string,
    { year: number; month: number; total: number; highGravity: number; midGravity: number; smallGravity: number }
  >();
  for (const d of draws) {
    const year = d.date.getFullYear();
    const month = d.date.getMonth() + 1;
    const key = `${year}-${month}`;
    const entry = monthlyMap.get(key) ?? { year, month, total: 0, highGravity: 0, midGravity: 0, smallGravity: 0 };
    entry.total += 1;
    if (d.category === 'high-gravity') entry.highGravity += 1;
    else if (d.category === 'mid-gravity') entry.midGravity += 1;
    else entry.smallGravity += 1;
    monthlyMap.set(key, entry);
  }
  const monthlyBreakdown: MonthlyEntry[] = [...monthlyMap.values()]
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .map((m) => ({
      month: `${m.year}-${String(m.month).padStart(2, '0')}`,
      label: new Date(m.year, m.month - 1).toLocaleString('pt-BR', { month: 'short', year: '2-digit' }),
      total: m.total,
      highGravity: m.highGravity,
      midGravity: m.midGravity,
      smallGravity: m.smallGravity,
      special: m.midGravity + m.smallGravity,
    }));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastSeenDate = new Map<number, Date>();
  const lastSeenIndex = new Map<number, number>();
  draws.forEach((d, idx) => {
    for (const n of d.numbers) {
      lastSeenDate.set(n, d.date);
      lastSeenIndex.set(n, idx);
    }
  });

  const absenceStreaks: AbsenceStreakEntry[] = [];
  const numberRecency: NumberRecencySnapshotEntry[] = [];
  for (let n = 1; n <= 25; n++) {
    const lastDate = lastSeenDate.get(n);
    const daysAbsent = lastDate
      ? Math.round((today.getTime() - new Date(lastDate).setHours(0, 0, 0, 0)) / MS_PER_DAY)
      : 9999;
    absenceStreaks.push({ number: n, daysAbsent });

    const idx = lastSeenIndex.get(n);
    const drawsAbsent = idx !== undefined ? draws.length - 1 - idx : draws.length;
    numberRecency.push({ number: n, drawsAbsent });
  }

  const sequentialStreaks = computeSequentialStreaks(draws);

  return { gravityStats, monthlyBreakdown, absenceStreaks, sequentialStreaks, numberRecency };
}
