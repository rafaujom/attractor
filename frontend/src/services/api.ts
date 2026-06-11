import axios from 'axios';
import type {
  StatsResponse,
  DrawsResponse,
  FetchResponse,
  RecencyResponse,
  Ticket,
  TicketPerformance,
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

export const getTickets = (): Promise<Ticket[]> =>
  api.get('/tickets').then((r) => r.data as Ticket[]);

export const createTicket = (data: { numbers: number[]; label?: string }): Promise<Ticket> =>
  api.post('/tickets', data).then((r) => r.data as Ticket);

export const deleteTicket = (id: string): Promise<void> =>
  api.delete(`/tickets/${id}`).then(() => undefined);

export const getTicketPerformance = (id: string): Promise<TicketPerformance> =>
  api.get(`/tickets/${id}/performance`).then((r) => r.data as TicketPerformance);
