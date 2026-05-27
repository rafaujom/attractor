const CARDS = [
  {
    key:    'total',
    label:  'Total de Concursos',
    emoji:  '🎲',
    bg:     'bg-slate-100',
    text:   'text-slate-700',
    value:  (s) => s.total,
    sub:    (s) => `Último: #${s.latestConcurso}`,
  },
  {
    key:    'high',
    label:  'High-Gravity',
    emoji:  '🔴',
    bg:     'bg-red-50',
    text:   'text-red-700',
    value:  (s) => s.categories['high-gravity'],
    sub:    (s) => `${((s.categories['high-gravity'] / s.total) * 100).toFixed(1)}% dos sorteios`,
  },
  {
    key:    'mid',
    label:  'Mid-Gravity',
    emoji:  '🔵',
    bg:     'bg-blue-50',
    text:   'text-blue-700',
    value:  (s) => s.categories['mid-gravity'],
    sub:    (s) => `${((s.categories['mid-gravity'] / s.total) * 100).toFixed(1)}% dos sorteios`,
  },
  {
    key:    'small',
    label:  'Small-Gravity',
    emoji:  '🟢',
    bg:     'bg-green-50',
    text:   'text-green-700',
    value:  (s) => s.categories['small-gravity'],
    sub:    (s) => `${((s.categories['small-gravity'] / s.total) * 100).toFixed(1)}% dos sorteios`,
  },
];

function Skeleton() {
  return (
    <div className="animate-pulse h-24 bg-slate-200 rounded-xl" />
  );
}

export default function StatsCards({ stats, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {CARDS.map((c) => <Skeleton key={c.key} />)}
      </div>
    );
  }
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map((c) => (
        <div key={c.key} className={`${c.bg} rounded-xl p-4 shadow-sm`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{c.emoji}</span>
            <span className={`text-xs font-semibold uppercase tracking-wide ${c.text}`}>
              {c.label}
            </span>
          </div>
          <div className={`text-3xl font-bold ${c.text}`}>{c.value(stats)}</div>
          <div className="text-xs text-slate-500 mt-1">{c.sub(stats)}</div>
        </div>
      ))}
    </div>
  );
}
