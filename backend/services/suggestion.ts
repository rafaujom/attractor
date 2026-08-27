import { classify } from './classifier.js';
import { computeSequentialStreaks } from './streaks.js';
import { computePairCounts } from './pairs.js';
import type { SuggestedNumberReasoning, SuggestedTicketResponse } from '../../shared/types/index.js';

interface DrawRecord {
  concurso: number;
  numbers: number[];
}

// How much each signal contributes to a number's base score. Frequency is the
// stable long-run signal; recencyScore is a decayed-weighted occurrence rate
// (see below) standing in for both streak momentum and repeat-rate — it's
// deliberately NOT a flat "was in the last draw" bonus, because that would be
// redundant with raw streak data (currentStreak > 0 if and only if a number
// was in the very last draw) and together they'd drown out frequency,
// degenerating into just re-picking the last draw's numbers verbatim.
const FREQ_WEIGHT = 0.5;
const RECENCY_WEIGHT = 0.5;

// Half-life of ~13.5 draws: a number's recent form fades out gradually over
// roughly the last couple months of draws rather than being gated by a
// single all-or-nothing "in the last draw" flag.
const RECENCY_DECAY = 0.95;

// Added on top of the base score during greedy selection, biasing picks
// toward numbers that historically co-occur with what's already chosen.
const PAIR_SYNERGY_WEIGHT = 0.15;

const TICKET_SIZE = 15;

function computeMaxConsecutiveRun(numbers: number[]): number {
  const sorted = [...numbers].sort((a, b) => a - b);
  let maxRun = 1;
  let curRun = 1;
  for (let i = 1; i < sorted.length; i++) {
    curRun = sorted[i] === sorted[i - 1] + 1 ? curRun + 1 : 1;
    maxRun = Math.max(maxRun, curRun);
  }
  return maxRun;
}

function computeSuggestedTicket(draws: DrawRecord[]): SuggestedTicketResponse {
  const sortedDraws = [...draws].sort((a, b) => a.concurso - b.concurso);
  const total = sortedDraws.length;
  const latestDraw = sortedDraws[total - 1];
  const latestSet = new Set(latestDraw?.numbers ?? []);

  const freqCount = new Map<number, number>();
  for (let n = 1; n <= 25; n++) freqCount.set(n, 0);
  for (const d of sortedDraws) {
    for (const n of d.numbers) freqCount.set(n, (freqCount.get(n) ?? 0) + 1);
  }

  const streakByNumber = new Map(
    computeSequentialStreaks(sortedDraws).map((s) => [s.number, s])
  );

  // Recency-weighted occurrence rate: the most recent draw counts fully,
  // each draw further back counts for progressively less. Comparable in
  // scale to freqPct (both land roughly in the 0.5-0.7 range), but shifted
  // toward whichever numbers have been showing up lately.
  let decayWeightSum = 0;
  const decayedCount = new Map<number, number>();
  for (let n = 1; n <= 25; n++) decayedCount.set(n, 0);
  for (let i = 0; i < total; i++) {
    const distanceFromLatest = total - 1 - i;
    const weight = RECENCY_DECAY ** distanceFromLatest;
    decayWeightSum += weight;
    for (const n of sortedDraws[i].numbers) {
      decayedCount.set(n, (decayedCount.get(n) ?? 0) + weight);
    }
  }

  const pairPctByKey = new Map<string, number>();
  for (const p of computePairCounts(sortedDraws)) {
    pairPctByKey.set(`${p.a}-${p.b}`, p.pct / 100);
  }
  function pairAffinity(a: number, b: number): number {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    return pairPctByKey.get(key) ?? 0;
  }

  const reasoningByNumber = new Map<number, SuggestedNumberReasoning>();
  const baseScoreByNumber = new Map<number, number>();

  for (let n = 1; n <= 25; n++) {
    const freqPct = total > 0 ? (freqCount.get(n) ?? 0) / total : 0;
    const recencyScore = decayWeightSum > 0 ? (decayedCount.get(n) ?? 0) / decayWeightSum : 0;
    const streakInfo = streakByNumber.get(n);
    const currentStreak = streakInfo?.currentStreak ?? 0;
    const maxStreak = streakInfo?.maxStreak ?? 0;
    const wasInLastDraw = latestSet.has(n);

    const score = FREQ_WEIGHT * freqPct + RECENCY_WEIGHT * recencyScore;

    baseScoreByNumber.set(n, score);
    reasoningByNumber.set(n, {
      number: n,
      freqPct: Math.round(freqPct * 1000) / 10,
      currentStreak,
      maxStreak,
      wasInLastDraw,
      score: Math.round(score * 1000) / 1000,
    });
  }

  // Greedy build: at each step, pick the remaining number with the highest
  // base score plus a pair-synergy bonus against what's already picked, so
  // synergy genuinely influences selection order rather than just being
  // reported afterward.
  const picked: number[] = [];
  const remaining = new Set<number>(Array.from({ length: 25 }, (_, i) => i + 1));

  while (picked.length < TICKET_SIZE) {
    let best: number | null = null;
    let bestScore = -Infinity;
    for (const n of remaining) {
      const synergy =
        picked.length > 0
          ? picked.reduce((sum, m) => sum + pairAffinity(n, m), 0) / picked.length
          : 0;
      const effectiveScore = (baseScoreByNumber.get(n) ?? 0) + PAIR_SYNERGY_WEIGHT * synergy;
      if (effectiveScore > bestScore) {
        bestScore = effectiveScore;
        best = n;
      }
    }
    picked.push(best as number);
    remaining.delete(best as number);
  }

  picked.sort((a, b) => a - b);

  const { category } = classify(picked);
  const sum = picked.reduce((a, b) => a + b, 0);
  const odd = picked.filter((n) => n % 2 === 1).length;

  return {
    numbers: picked,
    reasoning: picked
      .map((n) => reasoningByNumber.get(n) as SuggestedNumberReasoning)
      .sort((a, b) => b.score - a.score),
    shape: {
      category,
      sum,
      odd,
      even: TICKET_SIZE - odd,
      maxConsecutiveRun: computeMaxConsecutiveRun(picked),
    },
    basedOnDraws: total,
    latestConcurso: latestDraw?.concurso ?? 0,
  };
}

export { computeSuggestedTicket };
