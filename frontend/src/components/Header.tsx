import { useState } from 'react';
import { fetchLatest } from '../services/api';
import type { FetchResponse } from '@shared/types';

interface Props {
  onRefresh: () => void;
}

interface Msg {
  type: 'success' | 'error';
  text: string;
}

export default function Header({ onRefresh }: Props) {
  const [fetching, setFetching] = useState(false);
  const [msg,      setMsg]      = useState<Msg | null>(null);

  async function handleFetch() {
    try {
      setFetching(true);
      setMsg(null);
      const res: FetchResponse = await fetchLatest();
      setMsg({ type: 'success', text: res.message });
      onRefresh();
    } catch {
      setMsg({ type: 'error', text: 'Erro ao buscar novos resultados.' });
    } finally {
      setFetching(false);
      setTimeout(() => setMsg(null), 5000);
    }
  }

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎯</span>
          <div>
            <h1 className="text-xl font-bold text-slate-800 leading-tight">
              Lotofácil Gravity Dashboard
            </h1>
            <p className="text-xs text-slate-500">
              Análise estatística por categoria de gravidade
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {msg && (
            <span
              className={`text-sm px-3 py-1 rounded-full ${
                msg.type === 'success'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {msg.text}
            </span>
          )}
          <button
            onClick={handleFetch}
            disabled={fetching}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300
                       text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {fetching ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Buscando…
              </>
            ) : (
              <>⬇️ Buscar Novos Resultados</>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
