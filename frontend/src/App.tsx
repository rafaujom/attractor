import { useState, useEffect, useCallback } from 'react';
import { getStats } from './services/api';
import type { StatsResponse } from '@shared/types';
import Header           from './components/Header';
import StatsCards       from './components/StatsCards';
import GravityPieChart  from './components/GravityPieChart';
import MonthlyBarChart  from './components/MonthlyBarChart';
import MonthlyBreakdown from './components/MonthlyBreakdown';
import ResultsTable     from './components/ResultsTable';

export default function App() {
  const [stats,   setStats]   = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStats();
      setStats(data);
    } catch {
      setError('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header onRefresh={loadStats} />

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

        <ResultsTable onDataChange={loadStats} />
      </main>

      <footer className="text-center text-xs text-slate-400 py-6 border-t border-slate-200">
        Dados de caráter informativo. Fonte oficial: Caixa Econômica Federal.
      </footer>
    </div>
  );
}
