import { Fragment, useState } from 'react';
import type { PairEntry } from '@shared/types';

interface Props {
  data: PairEntry[] | null;
  loading: boolean;
}

interface HoverInfo {
  pair: PairEntry;
  x: number;
  y: number;
}

const NUMBERS = Array.from({ length: 25 }, (_, i) => i + 1);

export default function PairHeatmap({ data, loading }: Props) {
  const [hover, setHover] = useState<HoverInfo | null>(null);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="h-5 w-56 bg-slate-200 rounded animate-pulse mb-4" />
        <div className="h-96 bg-slate-100 rounded animate-pulse" />
      </div>
    );
  }
  if (!data?.length) return null;

  const lookup = new Map(data.map((p) => [`${p.a}-${p.b}`, p]));
  const maxCount = Math.max(...data.map((p) => p.count));

  const colorFor = (count: number) => {
    if (count === 0) return '#f8fafc';
    const t = count / maxCount;
    // interpolate slate-100 -> blue-700
    const r = Math.round(238 + t * (29 - 238));
    const g = Math.round(242 + t * (78 - 242));
    const b = Math.round(247 + t * (216 - 247));
    return `rgb(${r},${g},${b})`;
  };

  const top10 = [...data].sort((x, y) => y.count - x.count).slice(0, 10);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-base font-semibold text-slate-700 mb-4">
        🔗 Pares Mais Frequentes
      </h2>

      <div className="overflow-x-auto">
        <div
          className="inline-grid select-none"
          style={{ gridTemplateColumns: `28px repeat(25, 26px)` }}
          onMouseLeave={() => setHover(null)}
        >
          <div className="w-7 h-6" />
          {NUMBERS.map((n) => (
            <div
              key={`col-${n}`}
              className="text-[9px] text-slate-500 text-center font-medium flex items-end justify-center h-6"
            >
              {n}
            </div>
          ))}

          {NUMBERS.map((a) => (
            <Fragment key={`row-${a}`}>
              <div className="text-[9px] text-slate-500 text-right pr-1 font-medium flex items-center justify-end w-7 h-[26px]">
                {a}
              </div>
              {NUMBERS.map((b) => {
                if (a === b) {
                  return (
                    <div key={`${a}-${b}`} className="w-[26px] h-[26px] border border-white" />
                  );
                }
                const key = a < b ? `${a}-${b}` : `${b}-${a}`;
                const entry = lookup.get(key);
                const count = entry?.count ?? 0;
                return (
                  <div
                    key={`${a}-${b}`}
                    className="w-[26px] h-[26px] border border-white cursor-pointer"
                    style={{ background: colorFor(count) }}
                    onMouseEnter={(e) =>
                      entry && setHover({ pair: entry, x: e.clientX, y: e.clientY })
                    }
                    onClick={(e) =>
                      entry && setHover({ pair: entry, x: e.clientX, y: e.clientY })
                    }
                  />
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {hover && (
        <div
          className="fixed z-50 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow pointer-events-none"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
        >
          <p className="font-semibold text-slate-700">
            {String(hover.pair.a).padStart(2, '0')} + {String(hover.pair.b).padStart(2, '0')}
          </p>
          <p className="text-slate-500">
            {hover.pair.count} sorteio{hover.pair.count === 1 ? '' : 's'} ({hover.pair.pct}%)
          </p>
        </div>
      )}

      <div className="overflow-x-auto mt-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800 text-white text-left">
              <th className="px-4 py-2 font-semibold text-center">Número</th>
              <th className="px-4 py-2 font-semibold text-center">Número</th>
              <th className="px-4 py-2 font-semibold text-center">Ocorrências</th>
              <th className="px-4 py-2 font-semibold text-center">%</th>
            </tr>
          </thead>
          <tbody>
            {top10.map((p, i) => (
              <tr
                key={`${p.a}-${p.b}`}
                className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
              >
                <td className="px-4 py-2 text-center font-medium text-slate-700">
                  {String(p.a).padStart(2, '0')}
                </td>
                <td className="px-4 py-2 text-center font-medium text-slate-700">
                  {String(p.b).padStart(2, '0')}
                </td>
                <td className="px-4 py-2 text-center">{p.count}</td>
                <td className="px-4 py-2 text-center text-slate-500">{p.pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
