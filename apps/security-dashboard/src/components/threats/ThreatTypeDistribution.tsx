import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { ThreatType } from '../../types/security';

interface ThreatTypeDistributionProps {
  data: Record<ThreatType, number>;
  height?: number;
}

const ThreatTypeDistribution: React.FC<ThreatTypeDistributionProps> = ({
  data,
  height = 300,
}) => {
  // Transform data for the chart
  const chartData = Object.entries(data)
    .filter(([_, count]) => count > 0)
    .map(([type, count]) => ({
      name: type.replace('_', ' '),
      value: count,
      fullName: type,
    }))
    .sort((a, b) => b.value - a.value); // Sort by count descending

  // Color mapping for different threat types
  const getBarColor = (threatType: string) => {
    switch (threatType) {
      case ThreatType.RANSOMWARE:
      case ThreatType.MALWARE:
        return '#ef4444'; // Critical red
      case ThreatType.APT:
      case ThreatType.DDoS:
        return '#f59e0b'; // High orange
      case ThreatType.PHISHING:
      case ThreatType.BRUTE_FORCE:
        return '#3b82f6'; // Medium blue
      case ThreatType.INSIDER_THREAT:
        return '#22c55e'; // Low green
      default:
        return '#6b7280'; // Default gray
    }
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / chartData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1);
      
      return (
        <div className="bg-soc-elevated border border-soc-border rounded-lg p-3 shadow-lg">
          <p className="text-white text-sm font-medium">
            {label}
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

  // Custom bar shape with rounded corners
  const CustomBar = (props: any) => {
    const { fill, ...rest } = props;
    return <Bar {...rest} fill={fill} radius={[2, 2, 0, 0]} />;
  };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-soc-muted mb-2">No threat type data available</div>
          <div className="text-sm text-soc-muted">
            No threats detected by type
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 60,
          }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#374151" 
            strokeOpacity={0.3}
          />
          <XAxis
            dataKey="name"
            stroke="#6b7280"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            angle={-45}
            textAnchor="end"
            height={60}
            interval={0}
          />
          <YAxis
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="value"
            radius={[2, 2, 0, 0]}
            animationBegin={0}
            animationDuration={800}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getBarColor(entry.fullName)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {/* Top Threats List */}
      <div className="mt-4 space-y-2">
        <h4 className="text-sm font-medium text-white mb-2">Top Threat Types</h4>
        {chartData.slice(0, 5).map((item, index) => (
          <div key={index} className="flex items-center justify-between p-2 bg-soc-elevated rounded">
            <div className="flex items-center space-x-3">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: getBarColor(item.fullName) }}
              />
              <span className="text-sm text-white font-medium">
                {item.name}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-white">
                {item.value}
              </span>
              <span className="text-xs text-soc-muted">
                ({((item.value / chartData.reduce((sum, i) => sum + i.value, 0)) * 100).toFixed(0)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Summary */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="bg-soc-elevated rounded p-2">
          <div className="text-lg font-bold text-white">
            {chartData.length}
          </div>
          <div className="text-xs text-soc-muted">Types</div>
        </div>
        <div className="bg-soc-elevated rounded p-2">
          <div className="text-lg font-bold text-white">
            {chartData.reduce((sum, item) => sum + item.value, 0)}
          </div>
          <div className="text-xs text-soc-muted">Total</div>
        </div>
        <div className="bg-soc-elevated rounded p-2">
          <div className="text-lg font-bold" style={{ color: getBarColor(chartData[0]?.fullName || '') }}>
            {chartData[0]?.value || 0}
          </div>
          <div className="text-xs text-soc-muted">Highest</div>
        </div>
      </div>
    </div>
  );
};

export default ThreatTypeDistribution;