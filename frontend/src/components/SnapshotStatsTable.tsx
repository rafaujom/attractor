import { useMemo, useState } from 'react';
import type { Snapshot } from '@shared/types';
import { barColor, drawsAbsentColor } from '../utils/streakColors';
import SortableHeader, { type SortDirection } from './common/SortableHeader';

interface Props {
  snapshot: Snapshot;
  pickedNumbers: number[];
  drawnSet: Set<number>;
}

type SortColumn = 'drawsAbsent' | 'currentStreak' | 'maxStreak' | 'avgStreak' | 'medianStreak' | 'stdDevStreak';

const ZOOM_MIN = 0.7;
const ZOOM_MAX = 1.6;
const ZOOM_STEP = 0.1;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export default function SnapshotStatsTable({ snapshot, pickedNumbers, drawnSet }: Props) {
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [zoom, setZoom] = useState(1);

  const pickedSet = useMemo(() => new Set(pickedNumbers), [pickedNumbers]);

  const enrichedData = useMemo(() => {
    const recencyMap = new Map(snapshot.numberRecency.map((e) => [e.number, e.drawsAbsent]));
    return snapshot.sequentialStreaks.map((d) => ({ ...d, drawsAbsent: recencyMap.get(d.number) ?? 0 }));
  }, [snapshot]);

  const tableRows = useMemo(() => {
    const column = sortColumn ?? 'currentStreak';
    const sign = sortColumn === null || sortDirection === 'desc' ? -1 : 1;
    return [...enrichedData]
      .sort((a, b) => sign * (a[column] - b[column]))
      .map((d) => ({ ...d, label: pad(d.number) }));
  }, [enrichedData, sortColumn, sortDirection]);

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  }

  function rowClass(number: number, index: number): string {
    if (pickedSet.has(number)) {
      return drawnSet.has(number) ? 'bg-green-50' : 'bg-red-50';
    }
    return index % 2 === 0 ? 'bg-white' : 'bg-slate-50';
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-green-100 border border-green-300" />
            Meu número — acertou
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm bg-red-100 border border-red-300" />
            Meu número — não saiu
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 10) / 10))}
            disabled={zoom <= ZOOM_MIN}
            className="w-6 h-6 flex items-center justify-center rounded border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-100 disabled:opacity-30"
            aria-label="Diminuir zoom"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="text-[11px] text-slate-500 w-10 text-center hover:underline"
            aria-label="Redefinir zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 10) / 10))}
            disabled={zoom >= ZOOM_MAX}
            className="w-6 h-6 flex items-center justify-center rounded border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-100 disabled:opacity-30"
            aria-label="Aumentar zoom"
          >
            +
          </button>
        </div>
      </div>

      <div className="overflow-auto max-h-96 border border-slate-200 rounded-lg">
        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white text-left">
                <th className="px-4 py-2 font-semibold text-left">Número</th>
                <SortableHeader
                  label="Sorteios Ausente"
                  column="drawsAbsent"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                  title="Sorteios desde a última vez que este número foi sorteado, na entrada"
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
                />
                <SortableHeader
                  label="Mediana"
                  column="medianStreak"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Desvio Padrão"
                  column="stdDevStreak"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </tr>
            </thead>
            <tbody>
              {tableRows.map((d, i) => {
                const picked = pickedSet.has(d.number);
                return (
                  <tr key={d.number} className={`border-b border-slate-100 ${rowClass(d.number, i)}`}>
                    <td className={`px-4 py-2 text-slate-700 ${picked ? 'font-extrabold' : 'font-medium'}`}>
                      {d.label}
                    </td>
                    <td className="px-4 py-2 text-center font-semibold" style={{ color: drawsAbsentColor(d.drawsAbsent) }}>
                      {d.drawsAbsent}
                    </td>
                    <td className="px-4 py-2 text-center font-semibold" style={{ color: barColor(d.currentStreak) }}>
                      {d.currentStreak}
                    </td>
                    <td className="px-4 py-2 text-center">{d.maxStreak}</td>
                    <td className="px-4 py-2 text-center">{d.avgStreak.toFixed(1)}</td>
                    <td className="px-4 py-2 text-center">{d.medianStreak.toFixed(1)}</td>
                    <td className="px-4 py-2 text-center">{d.stdDevStreak.toFixed(1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
