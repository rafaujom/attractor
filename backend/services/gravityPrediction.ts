import type { GravityCategory, GravityPredictionResponse, GravityPredictionEntry } from '../../shared/types/index.js';

// Number of most-recent draws inspected for a same-category streak. Tune here.
export const GRAVITY_STREAK_LOOKBACK = 5;

// Fraction of the streaking category's base probability moved to the other
// categories when the streak fills the entire look-back window.
export const GRAVITY_STREAK_MAX_SHIFT = 0.5;

const CATEGORIES: GravityCategory[] = ['high-gravity', 'mid-gravity', 'small-gravity'];

interface DrawRecord {
  category: GravityCategory;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// Draws must be supplied in chronological order (ascending by concurso).
function computeGravityPrediction(
  draws: DrawRecord[],
  lookback: number = GRAVITY_STREAK_LOOKBACK,
): GravityPredictionResponse {
  const total = draws.length;
  const base: Record<GravityCategory, number> = { 'high-gravity': 0, 'mid-gravity': 0, 'small-gravity': 0 };
  for (const d of draws) base[d.category]++;
  for (const c of CATEGORIES) base[c] = total ? base[c] / total : 1 / CATEGORIES.length;

  // Length of the trailing run of identical categories, capped at the window.
  let streakCategory: GravityCategory | null = null;
  let streakLength = 0;
  if (total > 0) {
    streakCategory = draws[total - 1].category;
    for (let i = total - 1; i >= Math.max(0, total - lookback); i--) {
      if (draws[i].category !== streakCategory) break;
      streakLength++;
    }
  }

  const adjusted = { ...base };
  if (streakCategory) {
    const moved = base[streakCategory] * GRAVITY_STREAK_MAX_SHIFT * (streakLength / lookback);
    const othersBase = 1 - base[streakCategory];
    adjusted[streakCategory] = base[streakCategory] - moved;
    for (const c of CATEGORIES) {
      if (c === streakCategory) continue;
      adjusted[c] = base[c] + (othersBase > 0 ? moved * (base[c] / othersBase) : moved / (CATEGORIES.length - 1));
    }
  }

  const favored = total
    ? CATEGORIES.reduce((best, c) => (adjusted[c] > adjusted[best] ? c : best), CATEGORIES[0])
    : null;

  const entries: GravityPredictionEntry[] = CATEGORIES.map((c) => ({
    category: c,
    basePct: round1(base[c] * 100),
    adjustedPct: round1(adjusted[c] * 100),
    favored: c === favored,
  }));

  return { entries, lookback, streakCategory, streakLength, basedOnDraws: total };
}

export { computeGravityPrediction };
