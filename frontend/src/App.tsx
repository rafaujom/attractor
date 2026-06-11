import { useState, useEffect, useCallback, useRef } from 'react';
import { getStats, getRecency } from './services/api';
import type { StatsResponse, RecencyResponse } from '@shared/types';
import Header           from './components/Header';
import StatsCards       from './components/StatsCards';
import GravityPieChart  from './components/GravityPieChart';
import MonthlyBarChart  from './components/MonthlyBarChart';
import MonthlyBreakdown from './components/MonthlyBreakdown';
import RecencyChart     from './components/RecencyChart';
import ResultsTable     from './components/ResultsTable';
import MinhasApostas    from './components/MinhasApostas';

export default function App() {
  const [stats,            setStats]            = useState<StatsResponse | null>(null);
  const [recency,          setRecency]          = useState<RecencyResponse | null>(null);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState<string | null>(null);
  const [ticketRefreshKey, setTicketRefreshKey] = useState(0);
  const isInitialLoad = useRef(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (!isInitialLoad.current) {
        setTicketRefreshKey((k) => k + 1);
      }
      const [statsData, recencyData] = await Promise.all([getStats(), getRecency()]);
      setStats(statsData);
      setRecency(recencyData);
    } catch {
      setError('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header onRefresh={loadData} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
            ⚠️ {error}
          </div>
        )}

        <StatsCards stats={stats} loading={loading} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GravityPieChart stats={stats} loading={loading} />
          <MonthlyBarChart stats={stats} loading={loading} />
        </div>

        <MonthlyBreakdown stats={stats} loading={loading} />

        <RecencyChart data={recency} loading={loading} />

        <MinhasApostas refreshKey={ticketRefreshKey} />

        <ResultsTable onDataChange={loadData} />
      </main>

      <footer className="text-center text-xs text-slate-400 py-6 border-t border-slate-200">
        Dados de caráter informativo. Fonte oficial: Caixa Econômica Federal.
      </footer>
    </div>
  );
}
