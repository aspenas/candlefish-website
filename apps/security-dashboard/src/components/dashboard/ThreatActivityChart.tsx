import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { MetricDataPoint } from '../../types/security';

interface ThreatActivityChartProps {
  data: MetricDataPoint[];
  height?: number;
}

const ThreatActivityChart: React.FC<ThreatActivityChartProps> = ({ 
  data, 
  height = 300 
}) => {
  // Transform data for the chart
  const chartData = data.map((point) => ({
    timestamp: new Date(point.timestamp).getTime(),
    value: point.value,
    label: point.label || '',
    formattedTime: format(new Date(point.timestamp), 'HH:mm'),
  }));

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-soc-elevated border border-soc-border rounded-lg p-3 shadow-lg">
          <p className="text-white text-sm font-medium">
            {format(new Date(label), 'MMM dd, HH:mm')}
          </p>
          <p className="text-info-400 text-sm">
            Events: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom dot component for data points
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.value > 10) {
      return (
        <circle
          cx={cx}
          cy={cy}
          r={3}
          fill="#ef4444"
          stroke="#dc2626"
          strokeWidth={2}
          className="animate-pulse"
        />
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="threatGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#374151" 
            strokeOpacity={0.3}
          />
          
          <XAxis
            dataKey="formattedTime"
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          
          <YAxis
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          
          <Tooltip 
            content={<CustomTooltip />}
            cursor={{ stroke: '#3b82f6', strokeWidth: 1 }}
          />
          
          <Area
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#threatGradient)"
            dot={<CustomDot />}
            activeDot={{ r: 4, stroke: '#3b82f6', strokeWidth: 2, fill: '#1e40af' }}
          />
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Chart Legend */}
      <div className="flex items-center justify-center mt-4 space-x-6 text-xs text-soc-muted">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-gradient-to-r from-security-500 to-security-400 rounded-full"></div>
          <span>Threat Activity</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-critical-500 rounded-full animate-pulse"></div>
          <span>High Activity ({'>'}10 events)</span>
        </div>
      </div>
    </div>
  );
};

export default ThreatActivityChart;