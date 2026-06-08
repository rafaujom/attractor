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

export interface StreakEntry {
  number: number;
  drawsAbsent: number;
}

export interface StreaksResponse {
  streaks: StreakEntry[];
}
