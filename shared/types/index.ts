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
  daysAbsent: number;
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

// ── Tickets ──────────────────────────────────────────────────────────────────
// A ticket is the player's guess for a single draw (keyed by concurso). The
// match count and prize flag are scored against that draw's winning numbers.
export interface Ticket {
  concurso: number;
  numbers: number[];
  matches: number | null;
  hasPrize: boolean | null;
  label?: string;
  description?: string;
  createdAt?: string;
}

// Payload the client sends to save/update a ticket for a draw. matches/hasPrize
// are computed authoritatively on the server from the draw's numbers.
export interface TicketInput {
  concurso: number;
  numbers: number[];
  label?: string;
  description?: string;
}
