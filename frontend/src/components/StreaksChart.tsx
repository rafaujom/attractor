import type { StreakEntry } from '@shared/types';

interface Props {
  streaks: StreakEntry[] | null;
  loading: boolean;
}

function barColor(drawsAbsent: number): string {
  if (drawsAbsent > 10) return '#ef4444'; // red
  if (drawsAbsent >= 6)  return '#f59e0b'; // amber
  return '#22c55e';                         // green
}

export default function StreaksChart({ streaks, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="h-5 w-64 bg-slate-200 rounded animate-pulse mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-6 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }
  if (!streaks?.length) return null;

  const max = Math.max(...streaks.map((s) => s.drawsAbsent), 1);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-base font-semibold text-slate-700 mb-1">
        Sequência de Ausência por Número
      </h2>
      <p className="text-xs text-slate-400 mb-4">
        Quantos sorteios consecutivos cada número não foi sorteado
      </p>

      <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-green-500" /> 0–5 sorteios
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-amber-400" /> 6–10 sorteios
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-red-500" /> &gt;10 sorteios
        </span>
      </div>

      <div className="space-y-1.5">
        {streaks.map(({ number, drawsAbsent }) => {
          const pct = (drawsAbsent / max) * 100;
          const color = barColor(drawsAbsent);
          const label = String(number).padStart(2, '0');
          return (
            <div key={number} className="flex items-center gap-2 text-sm">
              <span className="w-7 text-right font-mono text-slate-600 shrink-0">{label}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: color, minWidth: drawsAbsent > 0 ? '4px' : '0' }}
                />
              </div>
              <span className="w-20 text-xs text-slate-500 shrink-0">
                {drawsAbsent} {drawsAbsent === 1 ? 'sorteio' : 'sorteios'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
