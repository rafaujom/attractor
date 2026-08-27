// shared/types/index.ts
export type GravityCategory = 'high-gravity' | 'mid-gravity' | 'small-gravity';

export interface Draw {
  concurso: number;
  date: string;
  numbers: number[];
  min: number;
  max: number;
  category: GravityCategory;
  dateFormatted?: string;
}

export interface MonthlyEntry {
  month: string;
  label: string;
  total: number;
  highGravity: number;
  midGravity: number;
  smallGravity: number;
  special: number;
}

export interface StatsResponse {
  total: number;
  categories: Record<GravityCategory, number>;
  monthly: MonthlyEntry[];
  latestConcurso: number;
  avgSum: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface DrawsResponse {
  draws: Draw[];
  pagination: Pagination;
}

export interface DrawInput {
  concurso: number;
  date: Date;
  numbers: number[];
  min: number;
  max: number;
  category: GravityCategory;
}

export interface FetchResponse {
  inserted: number;
  modified: number;
  message: string;
}

export interface RecencyEntry {
  number: number;
  lastDate: string;
  drawsAbsent: number;
}

export type RecencyResponse = RecencyEntry[];

export interface SequentialStreakEntry {
  number: number;
  currentStreak: number;
  maxStreak: number;
  avgStreak: number;
  medianStreak: number;
  stdDevStreak: number;
}

export type SequentialStreakResponse = SequentialStreakEntry[];

export interface PairEntry {
  a: number;
  b: number;
  count: number;
  pct: number; // % of total draws containing both a and b
}

export type PairsResponse = PairEntry[];

export interface RepeatRateEntry {
  concurso: number;      // the later draw (N+1)
  previousConcurso: number;
  repeats: number;       // count of numbers shared with previous draw
}

export interface RepeatRateResponse {
  entries: RepeatRateEntry[];
  average: number;
  distribution: Record<number, number>; // repeats(0-15) -> occurrence count
}

// ── Tickets ──────────────────────────────────────────────────────────────────
// A ticket is the player's guess for a single draw (keyed by concurso). The
// match count and prize flag are scored against that draw's winning numbers.
export interface Ticket {
  id: string;
  concurso: number;
  numbers: number[];
  matches: number | null;
  hasPrize: boolean | null;
  label?: string;
  description?: string;
  createdAt?: string;
  snapshotId?: string;
}

// Payload the client sends to save/update a ticket for a draw. matches/hasPrize
// are computed authoritatively on the server from the draw's numbers.
export interface TicketInput {
  concurso: number;
  numbers: number[];
  label?: string;
  description?: string;
}

// ── Ticket snapshot ─────────────────────────────────────────────────────────
// Frozen copy of every stats indicator as it stood the moment a ticket was
// first saved. Immutable — never recomputed after creation, even as new draws
// come in, so a later review reflects exactly what the player saw at the time.
export interface GravityStatsSnapshot {
  total: number;
  categories: Record<GravityCategory, number>;
}

export interface AbsenceStreakEntry {
  number: number;
  daysAbsent: number;
}

export interface NumberRecencySnapshotEntry {
  number: number;
  drawsAbsent: number;
}

export interface Snapshot {
  id: string;
  ticketId: string;
  targetConcurso: number;
  pickedNumbers: number[];
  createdAt: string;
  gravityStats: GravityStatsSnapshot;
  monthlyBreakdown: MonthlyEntry[];
  absenceStreaks: AbsenceStreakEntry[];
  sequentialStreaks: SequentialStreakEntry[];
  numberRecency: NumberRecencySnapshotEntry[];
}

// Per-number outcome analysis for the post-draw review (Panel 3): was this
// pick statistically "justified" by the snapshot data, and did it hit?
export interface PickVerdict {
  number: number;
  hit: boolean;
  daysAbsentAtEntry: number;
  drawsAbsentAtEntry: number;
  currentStreakAtEntry: number;
  isColdPick: boolean;
  isHotPick: boolean;
  verdict: string;
}

// ── Suggested ticket ─────────────────────────────────────────────────────────
// A data-driven 15-number suggestion computed on demand from the full draw
// history. Never persisted — recomputed fresh every time it's requested, so
// it always reflects the latest draw in the database.
export interface SuggestedNumberReasoning {
  number: number;
  freqPct: number;
  currentStreak: number;
  maxStreak: number;
  wasInLastDraw: boolean;
  score: number;
}

export interface SuggestedTicketShape {
  category: GravityCategory;
  sum: number;
  odd: number;
  even: number;
  maxConsecutiveRun: number;
}

export interface SuggestedTicketResponse {
  numbers: number[];
  reasoning: SuggestedNumberReasoning[];
  shape: SuggestedTicketShape;
  basedOnDraws: number;
  latestConcurso: number;
}

export interface TicketReview {
  ticket: Ticket;
  snapshot: Snapshot;
  draw: Draw | null;
  previousDraw: Draw | null;
  matches: number | null;
  hasPrize: boolean | null;
  picks: PickVerdict[];
  summary: {
    coldPicksCount: number;
    coldHitsCount: number;
    summaryText: string;
  };
}
