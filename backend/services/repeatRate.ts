import type { RepeatRateEntry, RepeatRateResponse } from '../../shared/types/index.js';

interface DrawRecord {
  concurso: number;
  numbers: number[];
}

// Draws must be supplied in chronological order (ascending by concurso).
function computeRepeatRate(draws: DrawRecord[]): RepeatRateResponse {
  const entries: RepeatRateEntry[] = [];
  const distribution: Record<number, number> = {};
  for (let r = 0; r <= 15; r++) distribution[r] = 0;

  for (let i = 1; i < draws.length; i++) {
    const prevSet = new Set(draws[i - 1].numbers);
    const repeats = draws[i].numbers.filter((n) => prevSet.has(n)).length;
    entries.push({
      concurso: draws[i].concurso,
      previousConcurso: draws[i - 1].concurso,
      repeats,
    });
    distribution[repeats] += 1;
  }

  const average = entries.length > 0
    ? Math.round((entries.reduce((sum, e) => sum + e.repeats, 0) / entries.length) * 10) / 10
    : 0;

  return { entries, average, distribution };
}

export { computeRepeatRate };
