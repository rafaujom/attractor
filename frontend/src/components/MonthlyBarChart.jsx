import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export default function MonthlyBarChart({ stats, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="h-5 w-48 bg-slate-200 rounded animate-pulse mb-4" />
        <div className="h-64 bg-slate-100 rounded animate-pulse" />
      </div>
    );
  }
  if (!stats?.monthly?.length) return null;

  const data = stats.monthly.map((m) => ({
    name:         m.label,
    'High':       m.highGravity,
    'Mid':        m.midGravity,
    'Small':      m.smallGravity,
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-base font-semibold text-slate-700 mb-4">
        📅 Sorteios por Mês e Categoria
      </h2>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="High"  stackId="a" fill="#e74c3c" radius={[0,0,0,0]} />
          <Bar dataKey="Mid"   stackId="a" fill="#2980b9" radius={[0,0,0,0]} />
          <Bar dataKey="Small" stackId="a" fill="#27ae60" radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
