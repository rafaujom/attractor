import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { RepeatRateResponse } from '@shared/types';

interface Props {
  data: RepeatRateResponse | null;
  loading: boolean;
}

export default function RepeatRateChart({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="h-5 w-56 bg-slate-200 rounded animate-pulse mb-4" />
        <div className="h-64 bg-slate-100 rounded animate-pulse" />
      </div>
    );
  }
  if (!data?.entries?.length) return null;

  const chartData = Object.entries(data.distribution).map(([repeats, count]) => ({
    repeats: Number(repeats),
    count,
  }));

  const latest = data.entries[data.entries.length - 1];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-700">
          🔁 Repetição em Relação ao Sorteio Anterior
        </h2>
        <span className="text-sm text-slate-500">
          Média histórica: <strong className="text-slate-700">{data.average}</strong> números repetidos por sorteio
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Concurso {latest.concurso} repetiu <strong className="text-slate-700">{latest.repeats}</strong> número(s) do concurso {latest.previousConcurso}.
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="repeats" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <ReferenceLine x={Math.round(data.average)} stroke="#e74c3c" strokeDasharray="4 4" />
          <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0] as [number, number, number, number]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
