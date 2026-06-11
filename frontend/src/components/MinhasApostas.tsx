import { useState, useEffect, useRef } from 'react';
import { getTickets, createTicket } from '../services/api';
import type { Ticket } from '@shared/types';
import NumberPicker from './NumberPicker';
import TicketCard   from './TicketCard';

interface Props {
  refreshKey?: number;
}

export default function MinhasApostas({ refreshKey }: Props) {
  const [tickets,         setTickets]         = useState<Ticket[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [showForm,        setShowForm]        = useState(false);
  const [label,           setLabel]           = useState('');
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [saving,          setSaving]          = useState(false);
  const [saveError,       setSaveError]       = useState<string | null>(null);

  const prevRefreshKey = useRef<number | undefined>(undefined);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await getTickets();
      setTickets(data);
    } catch {
      // silently ignore load errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    if (prevRefreshKey.current !== undefined && prevRefreshKey.current !== refreshKey) {
      loadTickets();
    }
    prevRefreshKey.current = refreshKey;
  }, [refreshKey]);

  const handleSave = async () => {
    if (selectedNumbers.length !== 15) return;
    setSaving(true);
    setSaveError(null);
    try {
      const ticket = await createTicket({
        numbers: selectedNumbers,
        label:   label.trim() || undefined,
      });
      setTickets((prev) => [ticket, ...prev]);
      setShowForm(false);
      setSelectedNumbers([]);
      setLabel('');
    } catch {
      setSaveError('Não foi possível salvar a aposta. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedNumbers([]);
    setLabel('');
    setSaveError(null);
  };

  const handleDelete = (id: string) => {
    setTickets((prev) => prev.filter((t) => t._id !== id));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      {/* Section header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <h2 className="text-base font-semibold text-slate-700">🎟️ Minhas Apostas</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + Nova Aposta
          </button>
        )}
      </div>

      {/* New ticket form */}
      {showForm && (
        <div className="mb-6 p-5 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-sm font-semibold text-slate-700 mb-4">Nova Aposta</p>

          <div className="mb-4">
            <label className="block text-xs text-slate-500 mb-1" htmlFor="ticket-label">
              Nome (opcional)
            </label>
            <input
              id="ticket-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex: Combinação favorita"
              maxLength={50}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <NumberPicker selected={selectedNumbers} onChange={setSelectedNumbers} />

          {saveError && (
            <p className="mt-3 text-sm text-red-600">{saveError}</p>
          )}

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSave}
              disabled={selectedNumbers.length !== 15 || saving}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Salvando…' : 'Salvar Aposta'}
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-slate-600 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Ticket list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p className="text-4xl mb-3">🎟️</p>
          <p className="text-sm">Nenhuma aposta salva ainda.</p>
          <p className="text-xs mt-1">Clique em "Nova Aposta" para começar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket, i) => (
            <TicketCard
              key={ticket._id}
              ticket={ticket}
              index={i}
              refreshKey={refreshKey}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
