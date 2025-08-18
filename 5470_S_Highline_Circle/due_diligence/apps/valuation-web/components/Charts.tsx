'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LabelList } from 'recharts';

export function ChartCard({ title, subtitle, data, dataKey, unit, height = 260 }:{
  title: string; subtitle?: string; data: any[]; dataKey: string; unit?: '%' | 'money'; height?: number;
}) {
  return (
    <div className="bg-white rounded-[var(--cf-radius-xl)] shadow-[var(--cf-shadow-soft)] border border-black/5 p-5">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-lg font-medium">{title}</h3>
        {subtitle && <div className="text-slate text-sm">{subtitle}</div>}
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
            <CartesianGrid stroke="#EEE" vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <Tooltip formatter={(v: number) => unit === '%' ? `${v.toFixed(2)}%` : `$${(v/1_000_000).toFixed(2)}M`} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
            <Bar dataKey={dataKey} fill="var(--cf-amber)">
              <LabelList dataKey={dataKey} position="top" formatter={(v: number) => unit === '%' ? `${v.toFixed(2)}%` : `$${(v/1_000_000).toFixed(2)}M`} style={{ fontSize: 12 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
