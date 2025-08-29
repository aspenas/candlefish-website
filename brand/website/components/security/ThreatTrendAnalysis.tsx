'use client'

import React from 'react'
import { Card } from '@/components/ui/Card'

const ThreatTrendAnalysis: React.FC<{ className?: string }> = ({ className }) => {
  const trends = [
    { name: 'DDoS Attacks', change: '+15%', trend: 'up', count: 23 },
    { name: 'Phishing Attempts', change: '-8%', trend: 'down', count: 45 },
    { name: 'Malware Detection', change: '+32%', trend: 'up', count: 12 },
    { name: 'Brute Force', change: '-12%', trend: 'down', count: 8 },
    { name: 'SQL Injection', change: '+5%', trend: 'up', count: 6 }
  ]

  return (
    <Card className={`p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Threat Trend Analysis
      </h3>
      
      <div className="space-y-4">
        {trends.map((trend) => (
          <div key={trend.name} className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {trend.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {trend.count} incidents this week
              </div>
            </div>
            <div className={`flex items-center gap-1 text-sm ${
              trend.trend === 'up' ? 'text-red-500' : 'text-green-500'
            }`}>
              {trend.trend === 'up' ? '↗' : '↘'}
              {trend.change}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default ThreatTrendAnalysis