import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const getStats = () =>
  api.get('/draws/stats').then((r) => r.data);

export const getDraws = (params = {}) =>
  api.get('/draws', { params }).then((r) => r.data);

export const fetchLatest = () =>
  api.post('/draws/fetch').then((r) => r.data);
