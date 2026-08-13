import { useState, useEffect, useCallback } from 'react';
import { getStats, getRecency, getSequentialStreaks, getPairs, getRepeatRate } from './services/api';
import type { StatsResponse, RecencyResponse, SequentialStreakResponse, PairsResponse, RepeatRateResponse } from '@shared/types';
import Header                from './components/Header';
import StatsCards            from './components/StatsCards';
import GravityPieChart       from './components/GravityPieChart';
import MonthlyBarChart       from './components/MonthlyBarChart';
import MonthlyBreakdown      from './components/MonthlyBreakdown';
import RepeatRateChart       from './components/RepeatRateChart';
import RecencyChart          from './components/RecencyChart';
import SequentialStreakChart from './components/SequentialStreakChart';
import PairHeatmap           from './components/PairHeatmap';
import ResultsTable          from './components/ResultsTable';

export default function App() {
  const [stats,      setStats]      = useState<StatsResponse | null>(null);
  const [recency,    setRecency]    = useState<RecencyResponse | null>(null);
  const [streaks,    setStreaks]    = useState<SequentialStreakResponse | null>(null);
  const [pairs,      setPairs]      = useState<PairsResponse | null>(null);
  const [repeatRate, setRepeatRate] = useState<RepeatRateResponse | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsData, recencyData, streaksData, pairsData, repeatRateData] = await Promise.all([
        getStats(),
        getRecency(),
        getSequentialStreaks(),
        getPairs(),
        getRepeatRate(),
      ]);
      setStats(statsData);
      setRecency(recencyData);
      setStreaks(streaksData);
      setPairs(pairsData);
      setRepeatRate(repeatRateData);
    } catch {
      setError('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    await loadData();
    setRefreshKey((k) => k + 1);
  }, [loadData]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header onRefresh={handleRefresh} />

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

        <RepeatRateChart data={repeatRate} loading={loading} />

        <RecencyChart data={recency} loading={loading} />

        <SequentialStreakChart data={streaks} recency={recency} loading={loading} />

        <PairHeatmap data={pairs} loading={loading} />

        <ResultsTable refreshKey={refreshKey} latestConcurso={stats?.latestConcurso} streaks={streaks} />
      </main>

      <footer className="text-center text-xs text-slate-400 py-6 border-t border-slate-200">
        Dados de caráter informativo. Fonte oficial: Caixa Econômica Federal.
      </footer>
    </div>
  );
}
