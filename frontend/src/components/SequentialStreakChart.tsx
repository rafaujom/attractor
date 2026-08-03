import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { SequentialStreakEntry, RecencyResponse } from '@shared/types';

interface Props {
  data: SequentialStreakEntry[] | null;
  recency: RecencyResponse | null;
  loading: boolean;
}

type SortColumn = 'daysAbsent' | 'currentStreak' | 'maxStreak' | 'avgStreak' | 'medianStreak' | 'stdDevStreak';
type SortDirection = 'asc' | 'desc';

function barColor(currentStreak: number): string {
  if (currentStreak === 0) return '#cbd5e1';
  if (currentStreak <= 2)  return '#27ae60';
  if (currentStreak <= 4)  return '#f39c12';
  return '#e74c3c';
}

function daysAbsentColor(daysAbsent: number): string {
  if (daysAbsent <= 7)  return '#27ae60';
  if (daysAbsent <= 14) return '#f39c12';
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
      <p className="text-slate-500">Média: {entry.avgStreak.toFixed(1)}</p>
      <p className="text-slate-500">Mediana: {entry.medianStreak.toFixed(1)}</p>
      <p className="text-slate-500">Desvio Padrão: {entry.stdDevStreak.toFixed(1)}</p>
    </div>
  );
}

function SortableHeader({
  label, column, activeColumn, direction, onSort, title,
}: {
  label: string;
  column: SortColumn;
  activeColumn: SortColumn | null;
  direction: SortDirection;
  onSort: (column: SortColumn) => void;
  title?: string;
}) {
  const isActive = activeColumn === column;
  return (
    <th
      onClick={() => onSort(column)}
      title={title}
      className="px-4 py-2 font-semibold text-center cursor-pointer select-none hover:bg-slate-700"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={`text-[10px] ${isActive ? 'opacity-100' : 'opacity-30'}`}>
          {isActive && direction === 'asc' ? '▲' : '▼'}
        </span>
      </span>
    </th>
  );
}

export default function SequentialStreakChart({ data, recency, loading }: Props) {
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const recencyMap = useMemo(() => {
    const map = new Map<number, number>();
    recency?.forEach((r) => map.set(r.number, r.daysAbsent));
    return map;
  }, [recency]);

  const enrichedData = useMemo(() => {
    if (!data?.length) return [];
    return data.map((d) => ({ ...d, daysAbsent: recencyMap.get(d.number) ?? 9999 }));
  }, [data, recencyMap]);

  const chartData = useMemo(() => {
    if (!enrichedData.length) return [];
    return [...enrichedData]
      .sort((a, b) => b.currentStreak - a.currentStreak)
      .map((d) => ({ ...d, label: String(d.number).padStart(2, '0') }));
  }, [enrichedData]);

  const tableRows = useMemo(() => {
    if (!enrichedData.length) return [];
    const column = sortColumn ?? 'currentStreak';
    const sign = sortColumn === null || sortDirection === 'desc' ? -1 : 1;
    return [...enrichedData]
      .sort((a, b) => sign * (a[column] - b[column]))
      .map((d) => ({ ...d, label: String(d.number).padStart(2, '0') }));
  }, [enrichedData, sortColumn, sortDirection]);

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="h-5 w-56 bg-slate-200 rounded animate-pulse mb-4" />
        <div className="h-96 bg-slate-100 rounded animate-pulse" />
      </div>
    );
  }
  if (!enrichedData.length) return null;

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
              <th className="px-4 py-2 font-semibold text-left">Número</th>
              <SortableHeader
                label="Ausência (dias)"
                column="daysAbsent"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={handleSort}
                title="Dias desde o último sorteio em que este número foi sorteado"
              />
              <SortableHeader
                label="Sequência Atual"
                column="currentStreak"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                label="Sequência Máxima"
                column="maxStreak"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                label="Média"
                column="avgStreak"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={handleSort}
                title="Comprimento médio de todas as sequências consecutivas completas deste número em todos os sorteios"
              />
              <SortableHeader
                label="Mediana"
                column="medianStreak"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={handleSort}
                title="Valor central de todas as sequências consecutivas completas deste número em todos os sorteios"
              />
              <SortableHeader
                label="Desvio Padrão"
                column="stdDevStreak"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={handleSort}
                title="Dispersão (desvio padrão) das sequências consecutivas completas deste número em todos os sorteios"
              />
            </tr>
          </thead>
          <tbody>
            {tableRows.map((d, i) => (
              <tr
                key={d.number}
                className={`border-b border-slate-100 ${
                  d.currentStreak === 0 ? 'text-slate-400' : (i % 2 === 0 ? 'bg-white' : 'bg-slate-50')
                }`}
              >
                <td className="px-4 py-2 font-medium text-slate-700">{d.label}</td>
                <td className="px-4 py-2 text-center font-semibold" style={{ color: daysAbsentColor(d.daysAbsent) }}>
                  {d.daysAbsent}
                </td>
                <td className="px-4 py-2 text-center font-semibold" style={{ color: barColor(d.currentStreak) }}>
                  {d.currentStreak}
                </td>
                <td className="px-4 py-2 text-center">{d.maxStreak}</td>
                <td className="px-4 py-2 text-center">{d.avgStreak.toFixed(1)}</td>
                <td className="px-4 py-2 text-center">{d.medianStreak.toFixed(1)}</td>
                <td className="px-4 py-2 text-center">{d.stdDevStreak.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
