import { useState, useEffect, useRef } from 'react';
import { getTicketPerformance, deleteTicket } from '../services/api';
import type { Ticket, TicketPerformance } from '@shared/types';

interface Props {
  ticket: Ticket;
  index: number;
  refreshKey?: number;
  onDelete: (id: string) => void;
}

type SortKey = 'concurso' | 'date' | 'matches';
type SortDir = 'asc' | 'desc';

const PRIZE_TIERS = [11, 12, 13, 14, 15];

const TIER_COLORS: Record<number, string> = {
  11: 'bg-yellow-100 text-yellow-700',
  12: 'bg-orange-100 text-orange-700',
  13: 'bg-red-100 text-red-700',
  14: 'bg-pink-100 text-pink-700',
  15: 'bg-purple-100 text-purple-700',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export default function TicketCard({ ticket, index, refreshKey, onDelete }: Props) {
  const [perf,     setPerf]     = useState<TicketPerformance | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [sortKey,  setSortKey]  = useState<SortKey>('concurso');
  const [sortDir,  setSortDir]  = useState<SortDir>('desc');
  const [deleting, setDeleting] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const data = await getTicketPerformance(ticket._id);
        if (!cancelled && mounted.current) setPerf(data);
      } catch {
        if (!cancelled && mounted.current) setPerf(null);
      } finally {
        if (!cancelled && mounted.current) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [ticket._id, refreshKey]);

  const handleDelete = async () => {
    if (!confirm(`Remover "${ticket.label || `Aposta ${index + 1}`}"?`)) return;
    setDeleting(true);
    try {
      await deleteTicket(ticket._id);
      onDelete(ticket._id);
    } catch {
      setDeleting(false);
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedDraws = perf
    ? [...perf.draws].sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'concurso') cmp = a.concurso - b.concurso;
        else if (sortKey === 'date') cmp = a.date.localeCompare(b.date);
        else cmp = a.matches - b.matches;
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : [];

  const label = ticket.label || `Aposta ${index + 1}`;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 bg-slate-50">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">🎟️ {label}</p>
          <p className="mt-1 font-mono text-xs text-slate-500 tracking-wide break-all">
            {[...ticket.numbers].sort((a, b) => a - b).map((n) => String(n).padStart(2, '0')).join(' · ')}
          </p>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          title="Remover aposta"
          className="ml-3 flex-shrink-0 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-40 text-base leading-none p-1"
        >
          ✕
        </button>
      </div>

      {/* Performance summary */}
      <div className="px-5 py-4">
        {loading ? (
          <div className="space-y-2">
            <div className="h-4 bg-slate-100 rounded animate-pulse w-48" />
            <div className="flex gap-2">
              {PRIZE_TIERS.map((t) => (
                <div key={t} className="h-6 w-16 bg-slate-100 rounded-full animate-pulse" />
              ))}
            </div>
          </div>
        ) : perf ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="text-slate-500">
                <span className="font-semibold text-slate-700">{perf.totalDraws}</span> sorteios avaliados
              </span>
              <span className="text-slate-500">
                Taxa de acerto:{' '}
                <span className={`font-semibold ${perf.hitRate > 0 ? 'text-green-600' : 'text-slate-700'}`}>
                  {perf.hitRate.toFixed(1)}%
                </span>
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {PRIZE_TIERS.map((tier) => {
                const count = Number(perf.hitsByTier[String(tier)] ?? 0);
                return (
                  <span
                    key={tier}
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      count > 0 ? TIER_COLORS[tier] : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {tier} pts: {count}×
                  </span>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Não foi possível carregar o desempenho.</p>
        )}
      </div>

      {/* Toggle details */}
      {perf && !loading && (
        <div className="px-5 pb-4">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            {expanded ? '↑ Ocultar Detalhes' : '↓ Ver Detalhes'}
          </button>
        </div>
      )}

      {/* Detailed results table */}
      {expanded && perf && (
        <div className="border-t border-slate-200 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-800 text-white text-left">
                {(
                  [
                    ['concurso', 'Concurso'],
                    ['date', 'Data'],
                    ['matches', 'Acertos'],
                  ] as [SortKey, string][]
                ).map(([key, lbl]) => (
                  <th
                    key={key}
                    className="px-4 py-2 font-semibold whitespace-nowrap cursor-pointer select-none hover:bg-slate-700"
                    onClick={() => toggleSort(key)}
                  >
                    {lbl} {sortKey === key ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                  </th>
                ))}
                <th className="px-4 py-2 font-semibold whitespace-nowrap">Prêmio</th>
                <th className="px-4 py-2 font-semibold whitespace-nowrap">Números do Sorteio</th>
              </tr>
            </thead>
            <tbody>
              {sortedDraws.map((draw, i) => {
                const matchSet = new Set(draw.matchedNumbers);
                return (
                  <tr
                    key={draw.concurso}
                    className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-indigo-50 transition-colors`}
                  >
                    <td className="px-4 py-2 font-mono font-medium text-slate-600 whitespace-nowrap">
                      #{draw.concurso}
                    </td>
                    <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                      {formatDate(draw.date)}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                          draw.matches >= 11
                            ? TIER_COLORS[draw.matches] ?? TIER_COLORS[11]
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {draw.matches}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {draw.prizeTier !== null ? (
                        <span
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${TIER_COLORS[draw.prizeTier] ?? ''}`}
                        >
                          ✅ {draw.prizeTier} pts
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-0.5">
                        {[...draw.drawNumbers]
                          .sort((a, b) => a - b)
                          .map((n) => (
                            <span
                              key={n}
                              className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${
                                matchSet.has(n)
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              {String(n).padStart(2, '0')}
                            </span>
                          ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
