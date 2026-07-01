import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { SequentialStreakEntry } from '@shared/types';

interface Props {
  data: SequentialStreakEntry[] | null;
  loading: boolean;
}

function barColor(currentStreak: number): string {
  if (currentStreak === 0) return '#cbd5e1';
  if (currentStreak <= 2)  return '#27ae60';
  if (currentStreak <= 4)  return '#f39c12';
  return '#e74c3c';
}

interface TooltipPayload {
  value: number;
  payload: SequentialStreakEntry;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow">
      <p className="font-semibold text-slate-700">Número {String(entry.number).padStart(2, '0')}</p>
      <p className="font-medium" style={{ color: barColor(entry.currentStreak) }}>
        Sequência atual: {entry.currentStreak}
      </p>
      <p className="text-slate-500">Máxima: {entry.maxStreak}</p>
      <p className="text-slate-500">Mínima: {entry.minStreak}</p>
    </div>
  );
}

export default function SequentialStreakChart({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="h-5 w-56 bg-slate-200 rounded animate-pulse mb-4" />
        <div className="h-96 bg-slate-100 rounded animate-pulse" />
      </div>
    );
  }
  if (!data?.length) return null;

  const chartData = [...data]
    .sort((a, b) => b.currentStreak - a.currentStreak)
    .map((d) => ({ ...d, label: String(d.number).padStart(2, '0') }));

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-700">
          🔥 Sequência Consecutiva por Número
        </h2>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#27ae60' }} />
            1–2
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#f39c12' }} />
            3–4
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#e74c3c' }} />
            5+
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#cbd5e1' }} />
            0
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={560}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={28} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="currentStreak" radius={[0, 4, 4, 0] as [number, number, number, number]}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={barColor(entry.currentStreak)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="overflow-x-auto mt-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800 text-white text-left">
              {['Número', 'Sequência Atual', 'Sequência Máxima', 'Sequência Mínima'].map((h) => (
                <th key={h} className="px-4 py-2 font-semibold text-center first:text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chartData.map((d, i) => (
              <tr
                key={d.number}
                className={`border-b border-slate-100 ${
                  d.currentStreak === 0 ? 'text-slate-400' : (i % 2 === 0 ? 'bg-white' : 'bg-slate-50')
                }`}
              >
                <td className="px-4 py-2 font-medium text-slate-700">{d.label}</td>
                <td className="px-4 py-2 text-center font-semibold" style={{ color: barColor(d.currentStreak) }}>
                  {d.currentStreak}
                </td>
                <td className="px-4 py-2 text-center">{d.maxStreak}</td>
                <td className="px-4 py-2 text-center">{d.minStreak}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
