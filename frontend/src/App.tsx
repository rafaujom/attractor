import { useState, useEffect, useCallback } from 'react';
import { getStats, getStreaks } from './services/api';
import type { StatsResponse, StreakEntry } from '@shared/types';
import Header           from './components/Header';
import StatsCards       from './components/StatsCards';
import GravityPieChart  from './components/GravityPieChart';
import MonthlyBarChart  from './components/MonthlyBarChart';
import MonthlyBreakdown from './components/MonthlyBreakdown';
import ResultsTable     from './components/ResultsTable';
import StreaksChart     from './components/StreaksChart';

export default function App() {
  const [stats,          setStats]          = useState<StatsResponse | null>(null);
  const [streaks,        setStreaks]        = useState<StreakEntry[] | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [streaksLoading, setStreaksLoading] = useState(true);
  const [error,          setError]          = useState<string | null>(null);

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

  const loadStreaks = useCallback(async () => {
    try {
      setStreaksLoading(true);
      const data = await getStreaks();
      setStreaks(data.streaks);
    } catch {
      // streaks chart will simply not render
    } finally {
      setStreaksLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadStreaks();
  }, [loadStats, loadStreaks]);

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

        <StreaksChart streaks={streaks} loading={streaksLoading} />

        <ResultsTable onDataChange={loadStats} />
      </main>

      <footer className="text-center text-xs text-slate-400 py-6 border-t border-slate-200">
        Dados de caráter informativo. Fonte oficial: Caixa Econômica Federal.
      </footer>
    </div>
  );
}
