import axios from 'axios';
import type {
  StatsResponse,
  DrawsResponse,
  FetchResponse,
  RecencyResponse,
  SequentialStreakResponse,
  PairsResponse,
  RepeatRateResponse,
  SuggestedTicketResponse,
  Ticket,
  TicketInput,
  Snapshot,
  TicketReview,
} from '@shared/types';

const api = axios.create({ baseURL: '/api' });

export const getStats = (): Promise<StatsResponse> =>
  api.get('/draws/stats').then((r) => r.data as StatsResponse);

export const getDraws = (params: Record<string, unknown> = {}): Promise<DrawsResponse> =>
  api.get('/draws', { params }).then((r) => r.data as DrawsResponse);

export const fetchLatest = (): Promise<FetchResponse> =>
  api.post('/draws/fetch').then((r) => r.data as FetchResponse);

export const getRecency = (): Promise<RecencyResponse> =>
  api.get('/draws/recency').then((r) => r.data as RecencyResponse);

export const getSequentialStreaks = (): Promise<SequentialStreakResponse> =>
  api.get('/draws/streaks/sequential').then((r) => r.data as SequentialStreakResponse);

export const getPairs = (): Promise<PairsResponse> =>
  api.get('/draws/pairs').then((r) => r.data as PairsResponse);

export const getRepeatRate = (): Promise<RepeatRateResponse> =>
  api.get('/draws/repeat-rate').then((r) => r.data as RepeatRateResponse);

export const getSuggestedTicket = (): Promise<SuggestedTicketResponse> =>
  api.get('/draws/suggested-ticket').then((r) => r.data as SuggestedTicketResponse);

export const getTickets = (concursos: number[]): Promise<Ticket[]> =>
  api
    .get('/tickets', { params: { concursos: concursos.join(',') } })
    .then((r) => r.data as Ticket[]);

export const getPendingTickets = (): Promise<Ticket[]> =>
  api.get('/tickets/pending').then((r) => r.data as Ticket[]);

export function extractErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: unknown } | undefined;
    if (typeof data?.error === 'string') return data.error;
  }
  return fallback;
}

export const deleteTicket = (id: string): Promise<void> =>
  api.delete(`/tickets/${id}`).then(() => undefined);

export const saveTicket = (ticket: TicketInput): Promise<Ticket> =>
  api.post('/tickets', ticket).then((r) => r.data as Ticket);

export const updateTicket = (id: string, ticket: TicketInput): Promise<Ticket> =>
  api.put(`/tickets/${id}`, ticket).then((r) => r.data as Ticket);

export const getTicketSnapshot = (ticketId: string): Promise<Snapshot> =>
  api.get(`/tickets/${ticketId}/snapshot`).then((r) => r.data as Snapshot);

export const getTicketReview = (ticketId: string): Promise<TicketReview> =>
  api.get(`/tickets/${ticketId}/review`).then((r) => r.data as TicketReview);
