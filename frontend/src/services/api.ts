import axios from 'axios';
import type { StatsResponse, DrawsResponse, FetchResponse } from '@shared/types';

const api = axios.create({ baseURL: '/api' });

export const getStats = (): Promise<StatsResponse> =>
  api.get('/draws/stats').then((r) => r.data as StatsResponse);

export const getDraws = (params: Record<string, unknown> = {}): Promise<DrawsResponse> =>
  api.get('/draws', { params }).then((r) => r.data as DrawsResponse);

export const fetchLatest = (): Promise<FetchResponse> =>
  api.post('/draws/fetch').then((r) => r.data as FetchResponse);
