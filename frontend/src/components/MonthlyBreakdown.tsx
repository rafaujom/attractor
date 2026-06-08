import type { StatsResponse } from '@shared/types';
import Tooltip from './Tooltip';

interface Props {
  stats: StatsResponse | null;
  loading: boolean;
}

const COLUMN_TOOLTIPS: Record<string, string> = {
  '🔴 High':
    'High-Gravity — Numbers span the full range. At least one number ≤ 03 and at least one ≥ 22. Most common outcome (~90% of draws).',
  '🔵 Mid':
    'Mid-Gravity — All numbers within 04–25. No number below 04. Rare event (~5% of draws).',
  '🟢 Small':
    'Small-Gravity — All numbers within 01–21. No number above 21. Rare event (~4% of draws).',
  '⭐ Especiais':
    'Count of draws classified as either Mid-Gravity or Small-Gravity — the "special" events to watch for.',
};

export default function MonthlyBreakdown({ stats, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
        <div className="h-5 w-56 bg-slate-200 rounded mb-4" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 bg-slate-100 rounded" />
          ))}
        </div>
      </div>
    );
  }
  if (!stats?.monthly?.length) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-base font-semibold text-slate-700 mb-4">
        🗓️ Resumo Mensal
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800 text-white text-left">
              {['Mês', 'Total', '🔴 High', '🔵 Mid', '🟢 Small', '⭐ Especiais', '% Especiais'].map((h) => (
                <th key={h} className="px-4 py-2 font-semibold">
                  {COLUMN_TOOLTIPS[h] ? (
                    <Tooltip content={COLUMN_TOOLTIPS[h]}>{h}</Tooltip>
                  ) : (
                    h
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.monthly.map((m, i) => (
              <tr
                key={m.month}
                className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
              >
                <td className="px-4 py-2 font-medium text-slate-700 uppercase">{m.label}</td>
                <td className="px-4 py-2 text-center">{m.total}</td>
                <td className="px-4 py-2 text-center text-red-600 font-medium">{m.highGravity}</td>
                <td className="px-4 py-2 text-center">
                  <span className={m.midGravity > 0 ? 'text-blue-600 font-bold' : 'text-slate-400'}>
                    {m.midGravity}
                  </span>
                </td>
                <td className="px-4 py-2 text-center">
                  <span className={m.smallGravity > 0 ? 'text-green-600 font-bold' : 'text-slate-400'}>
                    {m.smallGravity}
                  </span>
                </td>
                <td className="px-4 py-2 text-center">
                  {m.special > 0 ? (
                    <span className="bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">
                      {m.special}
                    </span>
                  ) : (
                    <span className="text-slate-300">0</span>
                  )}
                </td>
                <td className="px-4 py-2 text-center text-slate-500">
                  {((m.special / m.total) * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
