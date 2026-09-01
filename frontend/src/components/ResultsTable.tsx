import { useState, useEffect, useCallback, useMemo } from 'react';
import { getDraws, getTickets, getPendingTickets, saveTicket, updateTicket, deleteTicket, extractErrorMessage } from '../services/api';
import type { DrawsResponse, GravityCategory, Draw, Ticket, TicketInput } from '@shared/types';
import TicketModal from './TicketModal';

interface Props {
  refreshKey?: number;
  latestConcurso?: number;
  avgSum?: number;
}

const MAX_TICKETS_PER_DRAW = 10;

type ModalTarget =
  | { kind: 'draw'; draw: Draw; ticket: Ticket | null }
  | { kind: 'pending'; concurso: number; ticket: Ticket | null }
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

export default function ResultsTable({ refreshKey, latestConcurso, avgSum }: Props) {
  const [data,           setData]           = useState<DrawsResponse | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [page,           setPage]           = useState(1);
  const [category,       setCategory]       = useState('');
  const [tickets,        setTickets]        = useState<Record<number, Ticket[]>>({});
  const [pendingTickets, setPendingTickets] = useState<Ticket[]>([]);
  const [modalTarget,    setModalTarget]    = useState<ModalTarget | null>(null);
  const [confirmDeleteTicketId, setConfirmDeleteTicketId] = useState<string | null>(null);
  const [deletingTicketIds,     setDeletingTicketIds]     = useState<Set<string>>(new Set());
  const [deleteError,           setDeleteError]           = useState<{ ticketId: string; message: string } | null>(null);

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
        const map: Record<number, Ticket[]> = {};
        for (const t of list) {
          (map[t.concurso] ??= []).push(t);
        }
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

  const pendingByConcurso = useMemo(() => {
    const groups = new Map<number, Ticket[]>();
    for (const t of pendingTickets) {
      const arr = groups.get(t.concurso) ?? [];
      arr.push(t);
      groups.set(t.concurso, arr);
    }
    return [...groups.entries()].sort((a, b) => b[0] - a[0]);
  }, [pendingTickets]);

  function handleSave(input: TicketInput, existingId: string | null): Promise<Ticket> {
    const req = existingId ? updateTicket(existingId, input) : saveTicket(input);
    return req.then((saved) => {
      if (saved.matches !== null) {
        setTickets((prev) => {
          const list = prev[saved.concurso] ?? [];
          const next = existingId ? list.map((t) => (t.id === saved.id ? saved : t)) : [...list, saved];
          return { ...prev, [saved.concurso]: next };
        });
        setPendingTickets((prev) => prev.filter((t) => t.id !== saved.id));
      } else {
        setPendingTickets((prev) => {
          const others = prev.filter((t) => t.id !== saved.id);
          return [saved, ...others].sort((a, b) => b.concurso - a.concurso);
        });
      }
      return saved;
    });
  }

  function handleDelete(ticket: Ticket) {
    setDeletingTicketIds((prev) => new Set(prev).add(ticket.id));
    setDeleteError(null);
    deleteTicket(ticket.id)
      .then(() => {
        setPendingTickets((prev) => prev.filter((t) => t.id !== ticket.id));
        setConfirmDeleteTicketId((id) => (id === ticket.id ? null : id));
      })
      .catch((err) => {
        setDeleteError({ ticketId: ticket.id, message: extractErrorMessage(err, 'Erro ao remover aposta. Tente novamente.') });
        setConfirmDeleteTicketId((id) => (id === ticket.id ? null : id));
      })
      .finally(() => {
        setDeletingTicketIds((prev) => {
          const next = new Set(prev);
          next.delete(ticket.id);
          return next;
        });
      });
  }

  function ticketBadges(draw: Draw) {
    const list = tickets[draw.concurso] ?? [];
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {list.map((t) => (
          <button
            key={t.id}
            onClick={() => setModalTarget({ kind: 'draw', draw, ticket: t })}
            className={`px-2 py-1 text-xs rounded-lg font-semibold border transition-colors whitespace-nowrap ${
              t.hasPrize
                ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
            }`}
          >
            ✅ {t.matches}/15
          </button>
        ))}
        {list.length === 0 && (
          <button
            onClick={() => setModalTarget({ kind: 'draw', draw, ticket: null })}
            className="px-2 py-1 text-xs rounded-lg border border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors whitespace-nowrap"
          >
            + My Ticket
          </button>
        )}
        {list.length > 0 && list.length < MAX_TICKETS_PER_DRAW && (
          <button
            onClick={() => setModalTarget({ kind: 'draw', draw, ticket: null })}
            title="Adicionar aposta"
            className="w-6 h-6 flex items-center justify-center text-xs rounded-lg border border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            +
          </button>
        )}
      </div>
    );
  }

  function pendingTicketBadge(ticket: Ticket) {
    return (
      <button
        onClick={() => setModalTarget({ kind: 'pending', concurso: ticket.concurso, ticket })}
        className="px-2 py-1 text-xs rounded-lg border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors whitespace-nowrap"
      >
        🕒 {ticket.numbers.length} números
      </button>
    );
  }

  function pendingDeleteControl(ticket: Ticket) {
    const isDeleting = deletingTicketIds.has(ticket.id);

    if (confirmDeleteTicketId === ticket.id) {
      return (
        <span className="inline-flex items-center gap-1">
          <button
            onClick={() => handleDelete(ticket)}
            disabled={isDeleting}
            title="Confirmar remoção"
            className="px-1.5 py-1 text-xs rounded-lg border border-red-300 text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ✓
          </button>
          <button
            onClick={() => setConfirmDeleteTicketId(null)}
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
        onClick={() => setConfirmDeleteTicketId(ticket.id)}
        disabled={isDeleting || deletingTicketIds.has(ticket.id)}
        title="Remover aposta"
        className="px-1.5 py-1 text-xs rounded-lg border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isDeleting ? '…' : '🗑️'}
      </button>
    );
  }

  const showPending = page === 1 && !category && pendingByConcurso.length > 0;
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
                {showPending && pendingByConcurso.map(([concurso, ticketsForConcurso]) => (
                  <tr
                    key={`pending-${concurso}`}
                    className="border-b border-slate-100 bg-amber-50/60 hover:bg-amber-50 transition-colors"
                  >
                    <td className="px-4 py-2 font-mono font-medium text-slate-600">
                      #{concurso}
                    </td>
                    <td className="px-4 py-2 text-slate-400 italic whitespace-nowrap">—</td>
                    <td className="px-4 py-2 text-slate-400 italic">—</td>
                    <td className="px-4 py-2 text-slate-400 italic">—</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {ticketsForConcurso.map((ticket) => (
                          <span key={ticket.id} className="inline-flex items-center gap-1.5">
                            {pendingTicketBadge(ticket)}
                            {pendingDeleteControl(ticket)}
                          </span>
                        ))}
                        {ticketsForConcurso.length < MAX_TICKETS_PER_DRAW && (
                          <button
                            onClick={() => setModalTarget({ kind: 'pending', concurso, ticket: null })}
                            title="Adicionar aposta"
                            className="w-6 h-6 flex items-center justify-center text-xs rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors"
                          >
                            +
                          </button>
                        )}
                      </div>
                      {ticketsForConcurso.some((t) => deleteError?.ticketId === t.id) && (
                        <p className="text-xs text-red-600 mt-1">{deleteError?.message}</p>
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
                      {ticketBadges(draw)}
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
          existingTicket={modalTarget.ticket}
          onSave={(input) => handleSave(input, modalTarget.ticket?.id ?? null)}
          onClose={() => setModalTarget(null)}
          avgSum={avgSum}
        />
      )}
      {modalTarget?.kind === 'pending' && (
        <TicketModal
          draw={null}
          concurso={modalTarget.concurso}
          concursoEditable={false}
          existingTicket={modalTarget.ticket}
          onSave={(input) => handleSave(input, modalTarget.ticket?.id ?? null)}
          onClose={() => setModalTarget(null)}
          avgSum={avgSum}
        />
      )}
      {modalTarget?.kind === 'pending-new' && (
        <TicketModal
          draw={null}
          concurso={(latestConcurso ?? data?.draws?.[0]?.concurso ?? 0) + 1}
          concursoEditable={true}
          existingTicket={null}
          onSave={(input) => handleSave(input, null)}
          onClose={() => setModalTarget(null)}
          avgSum={avgSum}
        />
      )}
    </div>
  );
}
