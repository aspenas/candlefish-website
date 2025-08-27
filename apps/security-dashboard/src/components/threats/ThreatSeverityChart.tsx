import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { Severity } from '../../types/security';

interface ThreatSeverityChartProps {
  data: Record<Severity, number>;
  height?: number;
}

const ThreatSeverityChart: React.FC<ThreatSeverityChartProps> = ({
  data,
  height = 300,
}) => {
  // Transform data for the chart
  const chartData = Object.entries(data)
    .filter(([_, count]) => count > 0)
    .map(([severity, count]) => ({
      name: severity,
      value: count,
      label: `${severity} (${count})`,
    }));

  // Color mapping for severity levels
  const COLORS = {
    [Severity.CRITICAL]: '#ef4444',
    [Severity.HIGH]: '#f59e0b',
    [Severity.MEDIUM]: '#3b82f6',
    [Severity.LOW]: '#22c55e',
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / chartData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1);
      
      return (
        <div className="bg-soc-elevated border border-soc-border rounded-lg p-3 shadow-lg">
          <p className="text-white text-sm font-medium">
            {data.name} Severity
          </p>
          <p className="text-soc-muted text-sm">
            Count: {data.value}
          </p>
          <p className="text-soc-muted text-sm">
            Percentage: {percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom label
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show labels for slices less than 5%
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Custom legend
  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-white">
              {entry.value}: {data[entry.value as Severity]}
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-soc-muted mb-2">No threat data available</div>
          <div className="text-sm text-soc-muted">
            No threats detected or all have been resolved
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[entry.name as Severity]} 
                stroke={COLORS[entry.name as Severity]}
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-center">
        <div className="bg-soc-elevated rounded p-3">
          <div className="text-2xl font-bold text-white">
            {chartData.reduce((sum, item) => sum + item.value, 0)}
          </div>
          <div className="text-sm text-soc-muted">Total Threats</div>
        </div>
        <div className="bg-soc-elevated rounded p-3">
          <div className="text-2xl font-bold text-critical-400">
            {data[Severity.CRITICAL] || 0}
          </div>
          <div className="text-sm text-soc-muted">Critical</div>
        </div>
      </div>
    </div>
  );
};

export default ThreatSeverityChart;