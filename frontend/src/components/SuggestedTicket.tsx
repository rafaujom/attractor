import { useState } from 'react';
import { getSuggestedTicket, extractErrorMessage } from '../services/api';
import type { SuggestedTicketResponse, GravityCategory } from '@shared/types';
import Tooltip from './Tooltip';

const CATEGORY_LABELS: Record<GravityCategory, string> = {
  'high-gravity': 'High-Gravity',
  'mid-gravity': 'Mid-Gravity',
  'small-gravity': 'Small-Gravity',
};

export default function SuggestedTicket() {
  const [suggestion, setSuggestion] = useState<SuggestedTicketResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    try {
      setLoading(true);
      setError(null);
      const data = await getSuggestedTicket();
      setSuggestion(data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Erro ao gerar sugestão. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-base font-semibold text-slate-700">
          <Tooltip content="Combina frequência histórica, sequência ativa (streak), presença no último sorteio e sinergia entre pares para pontuar cada número. Não garante mais acertos — sorteios são independentes — mas reflete os padrões observados até agora.">
            🎯 Sugestão de Jogo
          </Tooltip>
        </h2>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300
                     text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Gerando…
            </>
          ) : (
            <>{suggestion ? '🔄 Gerar Novamente' : '✨ Gerar Sugestão'}</>
          )}
        </button>
      </div>

      {error && (
        <div className="rounded-lg p-3 text-sm bg-red-50 text-red-700 border border-red-200 mb-4">
          ⚠️ {error}
        </div>
      )}

      {!suggestion && !loading && !error && (
        <p className="text-sm text-slate-500">
          Clique em "Gerar Sugestão" para calcular 15 números com base nas estatísticas atuais.
        </p>
      )}

      {suggestion && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {suggestion.numbers.map((n) => (
              <span
                key={n}
                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white text-sm font-bold"
              >
                {String(n).padStart(2, '0')}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
            <span>Categoria: <strong className="text-slate-700">{CATEGORY_LABELS[suggestion.shape.category]}</strong></span>
            <span>Soma: <strong className="text-slate-700">{suggestion.shape.sum}</strong></span>
            <span>Ímpares/Pares: <strong className="text-slate-700">{suggestion.shape.odd}/{suggestion.shape.even}</strong></span>
            <span>Maior sequência consecutiva: <strong className="text-slate-700">{suggestion.shape.maxConsecutiveRun}</strong></span>
          </div>

          <div>
            <p className="text-xs text-slate-500 font-medium mb-1.5">
              Por que esses números (baseado em {suggestion.basedOnDraws} sorteios, até o concurso {suggestion.latestConcurso})
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100">
                    <th className="py-1.5 pr-3 font-medium">Número</th>
                    <th className="py-1.5 pr-3 font-medium">Frequência</th>
                    <th className="py-1.5 pr-3 font-medium">Sequência atual</th>
                    <th className="py-1.5 pr-3 font-medium">No último sorteio</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestion.reasoning.map((r) => (
                    <tr key={r.number} className="border-b border-slate-50 last:border-0">
                      <td className="py-1.5 pr-3 font-semibold text-slate-700">{String(r.number).padStart(2, '0')}</td>
                      <td className="py-1.5 pr-3 text-slate-600">{r.freqPct}%</td>
                      <td className="py-1.5 pr-3 text-slate-600">{r.currentStreak > 0 ? `${r.currentStreak} (máx. ${r.maxStreak})` : '—'}</td>
                      <td className="py-1.5 pr-3 text-slate-600">{r.wasInLastDraw ? '✅' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Sorteios são eventos independentes — esta sugestão reflete padrões históricos, não uma previsão com maior probabilidade de acerto.
          </p>
        </div>
      )}
    </div>
  );
}
