import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { RecencyEntry } from '@shared/types';

interface Props {
  data: RecencyEntry[] | null;
  loading: boolean;
}

function barColor(daysAbsent: number): string {
  if (daysAbsent <= 7)  return '#27ae60';
  if (daysAbsent <= 14) return '#f39c12';
  return '#e74c3c';
}

interface TooltipPayload {
  value: number;
  payload: RecencyEntry;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow">
      <p className="font-semibold text-slate-700">Número {String(entry.number).padStart(2, '0')}</p>
      <p className="text-slate-500">
        Último sorteio: {entry.lastDate ? new Date(entry.lastDate + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
      </p>
      <p className="font-medium" style={{ color: barColor(entry.daysAbsent) }}>
        {entry.daysAbsent} dias ausente
      </p>
    </div>
  );
}

export default function RecencyChart({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="h-5 w-56 bg-slate-200 rounded animate-pulse mb-4" />
        <div className="h-96 bg-slate-100 rounded animate-pulse" />
      </div>
    );
  }
  if (!data?.length) return null;

  const chartData = data.map((d) => ({
    ...d,
    label: String(d.number).padStart(2, '0'),
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-700">
          🧊 Recência dos Números (dias desde último sorteio)
        </h2>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#27ae60' }} />
            ≤ 7 dias
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#f39c12' }} />
            8–14 dias
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#e74c3c' }} />
            &gt; 14 dias
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
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={28} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="daysAbsent" radius={[0, 4, 4, 0] as [number, number, number, number]}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={barColor(entry.daysAbsent)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
