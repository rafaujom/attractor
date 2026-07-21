import axios from 'axios';
import type {
  StatsResponse,
  DrawsResponse,
  FetchResponse,
  RecencyResponse,
  SequentialStreakResponse,
  Ticket,
  TicketInput,
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

export const getTickets = (concursos: number[]): Promise<Ticket[]> =>
  api
    .get('/tickets', { params: { concursos: concursos.join(',') } })
    .then((r) => r.data as Ticket[]);

export const getPendingTickets = (): Promise<Ticket[]> =>
  api.get('/tickets/pending').then((r) => r.data as Ticket[]);

export const saveTicket = (ticket: TicketInput): Promise<Ticket> =>
  api.post('/tickets', ticket).then((r) => r.data as Ticket);
