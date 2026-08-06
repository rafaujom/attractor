import type { PairEntry } from '../../shared/types/index.js';

interface DrawNumbers {
  numbers: number[];
}

// Returns all 300 (25 choose 2) pairs, sorted by count desc.
function computePairCounts(draws: DrawNumbers[]): PairEntry[] {
  const counts = new Map<string, number>();
  const totalDraws = draws.length;

  for (const draw of draws) {
    const nums = [...draw.numbers].sort((a, b) => a - b);
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const key = `${nums[i]}-${nums[j]}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }

  const entries: PairEntry[] = [];
  for (let a = 1; a <= 25; a++) {
    for (let b = a + 1; b <= 25; b++) {
      const count = counts.get(`${a}-${b}`) ?? 0;
      entries.push({
        a,
        b,
        count,
        pct: totalDraws > 0 ? Math.round((count / totalDraws) * 1000) / 10 : 0,
      });
    }
  }

  return entries.sort((x, y) => y.count - x.count);
}

export { computePairCounts };
