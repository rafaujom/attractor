import { useState } from 'react';
import type { Draw, Ticket } from '@shared/types';

interface Props {
  draw: Draw;
  existingTicket: Ticket | null;
  onSave: (ticket: Ticket) => void;
  onClose: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export default function TicketModal({ draw, existingTicket, onSave, onClose }: Props) {
  const [selected, setSelected] = useState<Set<number>>(
    existingTicket ? new Set(existingTicket.numbers) : new Set()
  );
  const [phase, setPhase] = useState<'pick' | 'result'>(existingTicket ? 'result' : 'pick');
  const [savedTicket, setSavedTicket] = useState<Ticket | null>(existingTicket);
  const [description, setDescription] = useState(existingTicket?.description ?? '');

  const drawSet = new Set(draw.numbers);
  const isReadOnly = phase === 'result';

  function toggleNumber(n: number) {
    if (isReadOnly) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) {
        next.delete(n);
      } else if (next.size < 15) {
        next.add(n);
      }
      return next;
    });
  }

  function handleSave() {
    const pickedArr = Array.from(selected).sort((a, b) => a - b);
    const matches = pickedArr.filter((n) => drawSet.has(n)).length;
    const hasPrize = matches >= 11;
    const ticket: Ticket = {
      concurso: draw.concurso,
      numbers: pickedArr,
      matches,
      hasPrize,
      description: description.trim() || undefined,
    };
    setSavedTicket(ticket);
    setPhase('result');
    onSave(ticket);
  }

  function getBallClass(n: number): string {
    if (phase === 'pick') {
      if (selected.has(n)) return 'bg-blue-500 text-white border-blue-600';
      if (selected.size >= 15) return 'bg-white text-slate-300 border-slate-200 cursor-not-allowed';
      return 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer';
    }
    // result/view phase
    if (savedTicket?.numbers.includes(n)) {
      return drawSet.has(n)
        ? 'bg-green-500 text-white border-green-600'
        : 'bg-red-400 text-white border-red-500';
    }
    return 'bg-slate-100 text-slate-400 border-slate-200 cursor-default';
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-800">
              Concurso #{draw.concurso}
            </h3>
            <p className="text-xs text-slate-400">{formatDate(draw.date)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Result summary */}
          {phase === 'result' && savedTicket && (
            <div className={`rounded-lg p-3 text-sm font-semibold text-center ${
              savedTicket.hasPrize
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-slate-50 text-slate-600 border border-slate-200'
            }`}>
              {savedTicket.hasPrize
                ? `Você acertou ${savedTicket.matches} números — 🏆 Premiado!`
                : `Você acertou ${savedTicket.matches} números`}
            </div>
          )}

          {/* Picker label */}
          <p className="text-xs text-slate-500 font-medium">
            {phase === 'pick'
              ? `Selecione 15 números (${selected.size}/15 selecionados)`
              : 'Seus números — 🟢 acerto · 🔴 erro'}
          </p>

          {/* 5×5 number grid */}
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 25 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => toggleNumber(n)}
                disabled={isReadOnly || (selected.size >= 15 && !selected.has(n))}
                className={`rounded-full w-10 h-10 text-sm font-bold border-2 transition-colors mx-auto flex items-center justify-center ${getBallClass(n)}`}
              >
                {String(n).padStart(2, '0')}
              </button>
            ))}
          </div>

          {/* Ticket details */}
          {phase === 'pick' ? (
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1.5">Detalhes (opcional)</p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={200}
                placeholder="Anotações sobre este jogo…"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              />
            </div>
          ) : (
            savedTicket?.description && (
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1.5">Detalhes</p>
                <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 whitespace-pre-wrap">
                  {savedTicket.description}
                </p>
              </div>
            )
          )}

          {/* Draw result reference */}
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1.5">Resultado do Concurso</p>
            <div className="flex flex-wrap gap-1.5">
              {draw.numbers.map((n) => (
                <span
                  key={n}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold"
                >
                  {String(n).padStart(2, '0')}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-3 justify-end border-t border-slate-100 pt-4">
          {phase === 'pick' ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={selected.size !== 15}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Salvar
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
