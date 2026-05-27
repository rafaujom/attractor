import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TooltipProps } from 'recharts';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import type { StatsResponse, GravityCategory } from '@shared/types';

interface Props {
  stats: StatsResponse | null;
  loading: boolean;
}

interface PieDataEntry {
  name: GravityCategory;
  value: number;
  pct: string;
}

type CustomTooltipProps = TooltipProps<ValueType, NameType>;

const COLORS: Record<GravityCategory, string> = {
  'high-gravity':  '#e74c3c',
  'mid-gravity':   '#2980b9',
  'small-gravity': '#27ae60',
};

const LABELS: Record<GravityCategory, string> = {
  'high-gravity':  'High-Gravity',
  'mid-gravity':   'Mid-Gravity',
  'small-gravity': 'Small-Gravity',
};

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const nameStr = String(entry.name ?? '');
  const pct = (entry.payload as PieDataEntry | undefined)?.pct ?? '';
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold">{LABELS[nameStr as GravityCategory] ?? nameStr}</p>
      <p className="text-slate-600">{entry.value} sorteios ({pct}%)</p>
    </div>
  );
};

export default function GravityPieChart({ stats, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="h-5 w-48 bg-slate-200 rounded animate-pulse mb-4" />
        <div className="h-64 bg-slate-100 rounded animate-pulse" />
      </div>
    );
  }
  if (!stats) return null;

  const data: PieDataEntry[] = (Object.entries(stats.categories) as [GravityCategory, number][]).map(
    ([name, value]) => ({ name, value, pct: ((value / stats.total) * 100).toFixed(1) })
  );

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-base font-semibold text-slate-700 mb-4">
        📊 Distribuição por Categoria
      </h2>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            label={({ pct }: PieDataEntry) => `${pct}%`}
            labelLine={false}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={COLORS[entry.name]} />
            ))}
          </Pie>
          <Tooltip content={(props) => <CustomTooltip {...props} />} />
          <Legend
            formatter={(value: string) => LABELS[value as GravityCategory] ?? value}
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
