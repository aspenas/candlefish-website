'use client'

import React, { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'

interface RiskScore {
  category: string
  score: number
  maxScore: number
  trend: 'up' | 'down' | 'stable'
  description: string
}

interface RiskScoreGaugesProps {
  scores?: RiskScore[]
  className?: string
}

const RiskScoreGauges: React.FC<RiskScoreGaugesProps> = ({ 
  scores = [],
  className = ''
}) => {
  const [animatedScores, setAnimatedScores] = useState<number[]>([])

  // Mock data for demonstration
  const mockScores: RiskScore[] = [
    {
      category: 'Network Security',
      score: 85,
      maxScore: 100,
      trend: 'up',
      description: 'Firewall rules and intrusion detection effectiveness'
    },
    {
      category: 'Data Protection',
      score: 92,
      maxScore: 100,
      trend: 'stable',
      description: 'Encryption and access control measures'
    },
    {
      category: 'Threat Detection',
      score: 78,
      maxScore: 100,
      trend: 'down',
      description: 'Speed and accuracy of threat identification'
    },
    {
      category: 'Incident Response',
      score: 88,
      maxScore: 100,
      trend: 'up',
      description: 'Efficiency of security incident handling'
    }
  ]

  const activeScores = scores.length > 0 ? scores : mockScores

  // Animate gauge values on mount
  useEffect(() => {
    const initialScores = activeScores.map(() => 0)
    setAnimatedScores(initialScores)

    const timer = setTimeout(() => {
      setAnimatedScores(activeScores.map(score => score.score))
    }, 100)

    return () => clearTimeout(timer)
  }, [activeScores])

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 90) return '#22c55e' // green
    if (percentage >= 70) return '#f59e0b' // yellow
    if (percentage >= 50) return '#f97316' // orange
    return '#ef4444' // red
  }

  const getScoreLevel = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 90) return 'Excellent'
    if (percentage >= 70) return 'Good'
    if (percentage >= 50) return 'Fair'
    return 'Poor'
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        )
      case 'down':
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
        )
      case 'stable':
        return (
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        )
    }
  }

  const Gauge: React.FC<{ score: RiskScore; animatedScore: number }> = ({ score, animatedScore }) => {
    const percentage = (animatedScore / score.maxScore) * 100
    const strokeDasharray = 2 * Math.PI * 45 // circumference of circle with radius 45
    const strokeDashoffset = strokeDasharray - (strokeDasharray * percentage) / 100
    const color = getScoreColor(score.score, score.maxScore)

    return (
      <Card className="p-6 text-center">
        <div className="relative w-32 h-32 mx-auto mb-4">
          {/* Background circle */}
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="#e5e7eb"
              strokeWidth="8"
              fill="none"
              className="dark:stroke-gray-600"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke={color}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          
          {/* Score text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {Math.round(animatedScore)}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              /{score.maxScore}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {score.category}
          </h3>
          
          <div className="flex items-center justify-center gap-2">
            <span 
              className="text-sm font-medium"
              style={{ color }}
            >
              {getScoreLevel(score.score, score.maxScore)}
            </span>
            {getTrendIcon(score.trend)}
          </div>
          
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {score.description}
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className={className}>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Security Risk Assessment
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Overall security posture across key areas
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {activeScores.map((score, index) => (
          <Gauge 
            key={score.category} 
            score={score} 
            animatedScore={animatedScores[index] || 0}
          />
        ))}
      </div>

      {/* Overall Score Summary */}
      <Card className="mt-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Overall Security Score
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Weighted average across all security categories
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {Math.round(activeScores.reduce((sum, score) => sum + score.score, 0) / activeScores.length)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              /100
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default RiskScoreGauges