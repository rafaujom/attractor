import { useState, useEffect, useCallback } from 'react';
import { getDraws } from '../services/api';

const CAT_BADGE = {
  'high-gravity':  'bg-red-100 text-red-700',
  'mid-gravity':   'bg-blue-100 text-blue-700',
  'small-gravity': 'bg-green-100 text-green-700',
};
const CAT_EMOJI = {
  'high-gravity':  '🔴',
  'mid-gravity':   '🔵',
  'small-gravity': '🟢',
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export default function ResultsTable({ onDataChange }) {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [page,       setPage]       = useState(1);
  const [category,   setCategory]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDraws({ page, limit: 20, category: category || undefined });
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, category]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 when filter changes
  useEffect(() => { setPage(1); }, [category]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="text-base font-semibold text-slate-700">
          📋 Todos os Concursos
        </h2>
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

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800 text-white text-left">
              {['Concurso', 'Data', 'Categoria', 'Números Sorteados'].map((h) => (
                <th key={h} className="px-4 py-2 font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(10)].map((_, i) => (
                <tr key={i} className="border-b border-slate-100">
                  {[...Array(4)].map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-slate-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data?.draws?.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  Nenhum resultado encontrado.
                </td>
              </tr>
            ) : (
              data?.draws?.map((draw, i) => (
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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
    </div>
  );
}
