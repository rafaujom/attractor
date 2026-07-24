import { useState, useEffect, useCallback } from 'react';
import { getDraws, getTickets, getPendingTickets, saveTicket, deleteTicket, extractErrorMessage } from '../services/api';
import type { DrawsResponse, GravityCategory, Draw, Ticket, TicketInput, SequentialStreakResponse } from '@shared/types';
import TicketModal from './TicketModal';

interface Props {
  refreshKey?: number;
  latestConcurso?: number;
  streaks?: SequentialStreakResponse | null;
}

type ModalTarget =
  | { kind: 'draw'; draw: Draw }
  | { kind: 'pending-edit'; ticket: Ticket }
  | { kind: 'pending-new' };

const CAT_BADGE: Record<GravityCategory, string> = {
  'high-gravity':  'bg-red-100 text-red-700',
  'mid-gravity':   'bg-blue-100 text-blue-700',
  'small-gravity': 'bg-green-100 text-green-700',
};

const CAT_EMOJI: Record<GravityCategory, string> = {
  'high-gravity':  '🔴',
  'mid-gravity':   '🔵',
  'small-gravity': '🟢',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export default function ResultsTable({ refreshKey, latestConcurso, streaks }: Props) {
  const [data,           setData]           = useState<DrawsResponse | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [page,           setPage]           = useState(1);
  const [category,       setCategory]       = useState('');
  const [tickets,        setTickets]        = useState<Record<number, Ticket>>({});
  const [pendingTickets, setPendingTickets] = useState<Ticket[]>([]);
  const [modalTarget,    setModalTarget]    = useState<ModalTarget | null>(null);
  const [confirmDeleteConcurso, setConfirmDeleteConcurso] = useState<number | null>(null);
  const [deletingConcursos,     setDeletingConcursos]     = useState<Set<number>>(new Set());
  const [deleteError,           setDeleteError]           = useState<{ concurso: number; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, pending] = await Promise.all([
        getDraws({ page, limit: 20, category: category || undefined }),
        getPendingTickets(),
      ]);
      setData(res);
      setPendingTickets(pending);
      if (res.draws.length > 0) {
        const concursos = res.draws.map((d) => d.concurso);
        const list = await getTickets(concursos);
        const map: Record<number, Ticket> = {};
        for (const t of list) map[t.concurso] = t;
        setTickets((prev) => ({ ...prev, ...map }));
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, category]);

  useEffect(() => { load(); }, [load, refreshKey]);
  useEffect(() => { setPage(1); }, [category]);

  function handleSave(ticket: TicketInput): Promise<Ticket> {
    return saveTicket(ticket).then((saved) => {
      if (saved.matches !== null) {
        setTickets((prev) => ({ ...prev, [saved.concurso]: saved }));
        setPendingTickets((prev) => prev.filter((t) => t.concurso !== saved.concurso));
      } else {
        setPendingTickets((prev) => {
          const others = prev.filter((t) => t.concurso !== saved.concurso);
          return [saved, ...others].sort((a, b) => b.concurso - a.concurso);
        });
      }
      return saved;
    });
  }

  function handleDelete(concurso: number) {
    setDeletingConcursos((prev) => new Set(prev).add(concurso));
    setDeleteError(null);
    deleteTicket(concurso)
      .then(() => {
        setPendingTickets((prev) => prev.filter((t) => t.concurso !== concurso));
        setConfirmDeleteConcurso((c) => (c === concurso ? null : c));
      })
      .catch((err) => {
        setDeleteError({ concurso, message: extractErrorMessage(err, 'Erro ao remover aposta. Tente novamente.') });
        setConfirmDeleteConcurso((c) => (c === concurso ? null : c));
      })
      .finally(() => {
        setDeletingConcursos((prev) => {
          const next = new Set(prev);
          next.delete(concurso);
          return next;
        });
      });
  }

  function ticketButton(draw: Draw) {
    const t = tickets[draw.concurso];
    if (!t) {
      return (
        <button
          onClick={() => setModalTarget({ kind: 'draw', draw })}
          className="px-2 py-1 text-xs rounded-lg border border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors whitespace-nowrap"
        >
          + My Ticket
        </button>
      );
    }
    return (
      <button
        onClick={() => setModalTarget({ kind: 'draw', draw })}
        className={`px-2 py-1 text-xs rounded-lg font-semibold border transition-colors whitespace-nowrap ${
          t.hasPrize
            ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
        }`}
      >
        ✅ {t.matches}/15
      </button>
    );
  }

  function pendingTicketButton(ticket: Ticket) {
    const disabled = confirmDeleteConcurso === ticket.concurso || deletingConcursos.has(ticket.concurso);
    return (
      <button
        onClick={() => setModalTarget({ kind: 'pending-edit', ticket })}
        disabled={disabled}
        className="px-2 py-1 text-xs rounded-lg border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
      >
        🕒 {ticket.numbers.length} números
      </button>
    );
  }

  function pendingDeleteControl(ticket: Ticket) {
    const isDeleting = deletingConcursos.has(ticket.concurso);

    if (confirmDeleteConcurso === ticket.concurso) {
      return (
        <span className="inline-flex items-center gap-1">
          <button
            onClick={() => handleDelete(ticket.concurso)}
            disabled={isDeleting}
            title="Confirmar remoção"
            className="px-1.5 py-1 text-xs rounded-lg border border-red-300 text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ✓
          </button>
          <button
            onClick={() => setConfirmDeleteConcurso(null)}
            disabled={isDeleting}
            title="Cancelar"
            className="px-1.5 py-1 text-xs rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ✕
          </button>
        </span>
      );
    }

    return (
      <button
        onClick={() => setConfirmDeleteConcurso(ticket.concurso)}
        disabled={isDeleting}
        title="Remover aposta"
        className="px-1.5 py-1 text-xs rounded-lg border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isDeleting ? '…' : '🗑️'}
      </button>
    );
  }

  const showPending = page === 1 && !category && pendingTickets.length > 0;
  const isEmpty = (data?.draws?.length ?? 0) === 0 && !showPending;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="text-base font-semibold text-slate-700">
          📋 Todos os Concursos
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalTarget({ kind: 'pending-new' })}
            className="text-sm px-3 py-1.5 rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors whitespace-nowrap"
          >
            + Nova Aposta
          </button>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="">Todas as categorias</option>
            <option value="high-gravity">🔴 High-Gravity</option>
            <option value="mid-gravity">🔵 Mid-Gravity</option>
            <option value="small-gravity">🟢 Small-Gravity</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800 text-white text-left">
              {['Concurso', 'Data', 'Categoria', 'Números Sorteados', 'My Ticket'].map((h) => (
                <th key={h} className="px-4 py-2 font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(10)].map((_, i) => (
                <tr key={i} className="border-b border-slate-100">
                  {[...Array(5)].map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-slate-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : isEmpty ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Nenhum resultado encontrado.
                </td>
              </tr>
            ) : (
              <>
                {showPending && pendingTickets.map((ticket) => (
                  <tr
                    key={`pending-${ticket.concurso}`}
                    className="border-b border-slate-100 bg-amber-50/60 hover:bg-amber-50 transition-colors"
                  >
                    <td className="px-4 py-2 font-mono font-medium text-slate-600">
                      #{ticket.concurso}
                    </td>
                    <td className="px-4 py-2 text-slate-400 italic whitespace-nowrap">—</td>
                    <td className="px-4 py-2 text-slate-400 italic">—</td>
                    <td className="px-4 py-2 text-slate-400 italic">—</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        {pendingTicketButton(ticket)}
                        {pendingDeleteControl(ticket)}
                      </div>
                      {deleteError?.concurso === ticket.concurso && (
                        <p className="text-xs text-red-600 mt-1">{deleteError.message}</p>
                      )}
                    </td>
                  </tr>
                ))}
                {data?.draws?.map((draw, i) => (
                  <tr
                    key={draw.concurso}
                    className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50 transition-colors`}
                  >
                    <td className="px-4 py-2 font-mono font-medium text-slate-600">
                      #{draw.concurso}
                    </td>
                    <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                      {formatDate(draw.date)}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${CAT_BADGE[draw.category]}`}>
                        {CAT_EMOJI[draw.category]} {draw.category}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-600 tracking-wide">
                      {draw.numbers.map((n) => String(n).padStart(2, '0')).join(' · ')}
                    </td>
                    <td className="px-4 py-2">
                      {ticketButton(draw)}
                    </td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {data?.pagination && (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
          <span>
            Mostrando {((page - 1) * 20) + 1}–{Math.min(page * 20, data.pagination.total)} de{' '}
            <strong>{data.pagination.total}</strong> concursos
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Anterior
            </button>
            <span className="px-2 font-medium">{page} / {data.pagination.pages}</span>
            <button
              onClick={() => setPage((p) => Math.min(data.pagination.pages, p + 1))}
              disabled={page === data.pagination.pages}
              className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Próxima →
            </button>
          </div>
        </div>
      )}

      {modalTarget?.kind === 'draw' && (
        <TicketModal
          draw={modalTarget.draw}
          concurso={modalTarget.draw.concurso}
          concursoEditable={false}
          existingTicket={tickets[modalTarget.draw.concurso] ?? null}
          streaks={streaks}
          onSave={handleSave}
          onClose={() => setModalTarget(null)}
        />
      )}
      {modalTarget?.kind === 'pending-edit' && (
        <TicketModal
          draw={null}
          concurso={modalTarget.ticket.concurso}
          concursoEditable={false}
          existingTicket={modalTarget.ticket}
          streaks={streaks}
          onSave={handleSave}
          onClose={() => setModalTarget(null)}
        />
      )}
      {modalTarget?.kind === 'pending-new' && (
        <TicketModal
          draw={null}
          concurso={(latestConcurso ?? data?.draws?.[0]?.concurso ?? 0) + 1}
          concursoEditable={true}
          existingTicket={null}
          streaks={streaks}
          onSave={handleSave}
          onClose={() => setModalTarget(null)}
        />
      )}
    </div>
  );
}
