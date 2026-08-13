import { useState, useEffect } from 'react';
import { getTicketReview, extractErrorMessage } from '../services/api';
import type { TicketReview as TicketReviewType } from '@shared/types';
import SnapshotStatsTable from './SnapshotStatsTable';

interface Props {
  ticketId: string;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export default function TicketReview({ ticketId }: Props) {
  const [data, setData] = useState<TicketReviewType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getTicketReview(ticketId)
      .then((res) => { if (!cancelled) setData(res); })
      .catch((err) => {
        if (!cancelled) {
          setError(extractErrorMessage(err, 'Não foi possível carregar a análise deste bilhete.'));
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ticketId]);

  if (loading) {
    return <p className="text-sm text-slate-400 text-center py-6">Carregando análise…</p>;
  }
  if (error || !data) {
    return <p className="text-sm text-red-600 text-center py-6">⚠️ {error ?? 'Análise indisponível.'}</p>;
  }

  const drawnSet = new Set(data.draw?.numbers ?? []);
  const verdictMap = new Map(data.picks.map((p) => [p.number, p]));
  const { categories } = data.snapshot.gravityStats;
  const repeatedFromPrevious = data.previousDraw
    ? data.snapshot.pickedNumbers.filter((n) => data.previousDraw!.numbers.includes(n))
    : [];

  return (
    <div className="space-y-4">
      {/* Panel 1 — My Picks vs Result */}
      <section>
        <p className="text-xs font-semibold text-slate-500 mb-1.5">1 · Meus Números vs Resultado</p>
        <div className="rounded-lg border border-slate-200 p-3 space-y-2">
          <p className="text-sm font-semibold text-center">
            {data.matches} acertos {data.hasPrize ? '— 🏆 Premiado!' : ''}
          </p>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {data.snapshot.pickedNumbers.map((n) => (
              <span
                key={n}
                className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                  drawnSet.has(n) ? 'bg-green-500 text-white' : 'bg-red-400 text-white'
                }`}
              >
                {pad(n)}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Panel 2 — Stats at time of entry */}
      <section>
        <p className="text-xs font-semibold text-slate-500 mb-1.5">2 · Estatísticas no momento da aposta</p>
        <div className="rounded-lg border border-slate-200 p-3 space-y-2">
          <p className="text-xs text-slate-500">
            {categories['small-gravity']} eventos small-gravity · {categories['mid-gravity']} mid-gravity ·{' '}
            {categories['high-gravity']} high-gravity até então
          </p>
          <SnapshotStatsTable
            snapshot={data.snapshot}
            pickedNumbers={data.snapshot.pickedNumbers}
            drawnSet={drawnSet}
          />
        </div>
      </section>

      {/* Panel 3 — Outcome analysis */}
      <section>
        <p className="text-xs font-semibold text-slate-500 mb-1.5">3 · Análise do Resultado</p>
        <div className="rounded-lg border border-slate-200 p-3 space-y-2">
          <ul className="text-xs space-y-1">
            {data.snapshot.pickedNumbers.map((n) => {
              const v = verdictMap.get(n);
              return (
                <li key={n} className={v?.hit ? 'text-green-700 font-medium' : 'text-slate-500'}>
                  {pad(n)} — {v?.verdict}
                </li>
              );
            })}
          </ul>
          <p className="text-xs font-semibold text-slate-700 pt-2 border-t border-slate-100">
            {data.summary.summaryText}
          </p>
        </div>
      </section>

      {/* Panel 4 — Repetition from previous result */}
      <section>
        <p className="text-xs font-semibold text-slate-500 mb-1.5">4 · Repetição do Resultado Anterior</p>
        <div className="rounded-lg border border-slate-200 p-3 space-y-2">
          {!data.previousDraw ? (
            <p className="text-xs text-slate-400 text-center py-1">Sem resultado anterior disponível.</p>
          ) : (
            <>
              <p className="text-xs text-slate-500">
                {repeatedFromPrevious.length === 0
                  ? `Nenhum número repetido do concurso ${data.previousDraw.concurso}.`
                  : `${repeatedFromPrevious.length} número(s) repetido(s) do concurso ${data.previousDraw.concurso}.`}
              </p>
              {repeatedFromPrevious.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {repeatedFromPrevious.map((n) => (
                    <span
                      key={n}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold bg-amber-500 text-white"
                    >
                      {pad(n)}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
