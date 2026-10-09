import { useEffect, useState } from 'react';
import { getSuggestedTicket, getGravityPrediction, extractErrorMessage } from '../services/api';
import type { SuggestedTicketResponse, GravityPredictionResponse, GravityCategory } from '@shared/types';
import Tooltip from './Tooltip';

const CATEGORY_LABELS: Record<GravityCategory, string> = {
  'high-gravity': 'High-Gravity',
  'mid-gravity': 'Mid-Gravity',
  'small-gravity': 'Small-Gravity',
};

const CATEGORY_ROWS: Record<GravityCategory, { icon: string; label: string }> = {
  'high-gravity': { icon: '🔴', label: 'High-gravity' },
  'mid-gravity': { icon: '🔵', label: 'Mid-gravity' },
  'small-gravity': { icon: '🟢', label: 'Small-gravity' },
};

const SELECTOR_ORDER: GravityCategory[] = ['small-gravity', 'mid-gravity', 'high-gravity'];

const CATEGORY_SELECTOR: Record<GravityCategory, { icon: string; label: string; title: string }> = {
  'small-gravity': { icon: '🟢', label: 'Pequena', title: 'Pequena Gravitação' },
  'mid-gravity': { icon: '🔵', label: 'Média', title: 'Média Gravitação' },
  'high-gravity': { icon: '🔴', label: 'Alta', title: 'Alta Gravitação' },
};

function adjustmentTooltip(p: GravityPredictionResponse, category: GravityCategory): string {
  const base = 'O % histórico é a frequência da categoria em todos os sorteios.';
  if (!p.streakCategory || p.streakLength === 0) return base;
  const streakLabel = CATEGORY_LABELS[p.streakCategory];
  const effect = category === p.streakCategory
    ? 'Por isso a probabilidade desta categoria é reduzida.'
    : 'Por isso a probabilidade desta categoria é aumentada.';
  return `${base} O % ajustado considera os últimos ${p.lookback} sorteios: ${p.streakLength} seguido(s) foram ${streakLabel}. Quanto maior a sequência, maior a chance de mudança de categoria. ${effect}`;
}

export default function SuggestedTicket({ refreshKey = 0 }: { refreshKey?: number }) {
  const [suggestion, setSuggestion] = useState<SuggestedTicketResponse | null>(null);
  const [prediction, setPrediction] = useState<GravityPredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GravityCategory>('mid-gravity');
  const [userPicked, setUserPicked] = useState(false);
  const [generatedFor, setGeneratedFor] = useState<GravityCategory | null>(null);

  // Load (and recalculate on new results) the prediction used for the default.
  useEffect(() => {
    getGravityPrediction().then(setPrediction).catch(() => {});
  }, [refreshKey]);

  // Default the selector to the highest adjusted-probability category until
  // the user makes an explicit choice.
  useEffect(() => {
    if (userPicked || !prediction) return;
    const top = prediction.entries.reduce((a, b) => (b.adjustedPct > a.adjustedPct ? b : a));
    setSelected(top.category);
  }, [prediction, userPicked]);

  async function handleGenerate() {
    try {
      setLoading(true);
      setError(null);
      const [data, pred] = await Promise.all([getSuggestedTicket(selected), getGravityPrediction()]);
      setSuggestion(data);
      setGeneratedFor(selected);
      setPrediction(pred);
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
        <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden" role="group" aria-label="Categoria de gravitação alvo">
          {SELECTOR_ORDER.map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={selected === cat}
              onClick={() => { setSelected(cat); setUserPicked(true); }}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                selected === cat ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {CATEGORY_SELECTOR[cat].icon} {CATEGORY_SELECTOR[cat].label}
            </button>
          ))}
        </div>
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
          {generatedFor && (
            <p className="text-sm font-semibold text-slate-700">
              {CATEGORY_SELECTOR[generatedFor].icon} Sugestão {CATEGORY_SELECTOR[generatedFor].title}
            </p>
          )}
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

          {prediction && (
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1.5">
                Próximo Concurso — Probabilidade de Gravitação
              </p>
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100">
                    <th className="py-1.5 pr-3 font-medium">Categoria</th>
                    <th className="py-1.5 pr-3 font-medium">Histórico %</th>
                    <th className="py-1.5 pr-3 font-medium">Ajustado (sequência) %</th>
                    <th className="py-1.5 pr-3 font-medium">Veredito</th>
                  </tr>
                </thead>
                <tbody>
                  {prediction.entries.map((e) => (
                    <tr key={e.category} className="border-b border-slate-50 last:border-0">
                      <td className="py-1.5 pr-3 font-semibold text-slate-700">
                        <Tooltip content={adjustmentTooltip(prediction, e.category)}>
                          {CATEGORY_ROWS[e.category].icon} {CATEGORY_ROWS[e.category].label}
                        </Tooltip>
                      </td>
                      <td className="py-1.5 pr-3 text-slate-600">{e.basePct}%</td>
                      <td className="py-1.5 pr-3 text-slate-600">{e.adjustedPct}%</td>
                      <td className="py-1.5 pr-3">
                        {e.favored && (
                          <span className="inline-block rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 font-semibold">
                            Favored
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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
