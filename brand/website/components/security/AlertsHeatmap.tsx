'use client'

import React from 'react'
import AttackPatternHeatmap from './AttackPatternHeatmap'

// Reuse AttackPatternHeatmap for alerts
const AlertsHeatmap: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={className}>
      <AttackPatternHeatmap />
    </div>
  )
}

export default AlertsHeatmap