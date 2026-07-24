import type { SequentialStreakEntry } from '../../shared/types/index.js';

interface DrawNumbers {
  numbers: number[];
}

// Draws must be supplied in chronological order (ascending by concurso).
function computeSequentialStreaks(draws: DrawNumbers[]): SequentialStreakEntry[] {
  const entries: SequentialStreakEntry[] = [];

  for (let number = 1; number <= 25; number++) {
    let current = 0;
    const completedRuns: number[] = [];

    for (const draw of draws) {
      if (draw.numbers.includes(number)) {
        current += 1;
      } else {
        if (current > 0) completedRuns.push(current);
        current = 0;
      }
    }

    const rawMean = completedRuns.length > 0
      ? completedRuns.reduce((sum, run) => sum + run, 0) / completedRuns.length
      : 0;
    const avgStreak = Math.round(rawMean * 10) / 10;

    const sortedRuns = [...completedRuns].sort((a, b) => a - b);
    const medianStreak = sortedRuns.length > 0
      ? (sortedRuns.length % 2 === 1
          ? sortedRuns[(sortedRuns.length - 1) / 2]
          : (sortedRuns[sortedRuns.length / 2 - 1] + sortedRuns[sortedRuns.length / 2]) / 2)
      : 0;

    const stdDevStreak = completedRuns.length > 0
      ? Math.round(
          Math.sqrt(
            completedRuns.reduce((sum, run) => sum + (run - rawMean) ** 2, 0) / completedRuns.length,
          ) * 10,
        ) / 10
      : 0;

    entries.push({
      number,
      currentStreak: current,
      maxStreak: Math.max(current, ...completedRuns, 0),
      avgStreak,
      medianStreak,
      stdDevStreak,
    });
  }

  return entries;
}

export { computeSequentialStreaks };
