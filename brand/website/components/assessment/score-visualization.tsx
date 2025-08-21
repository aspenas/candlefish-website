import { motion } from 'framer-motion'
import type { AssessmentScore } from '@/types/assessment'

interface OperationalScoreVisualizationProps {
  score: AssessmentScore
}

export const OperationalScoreVisualization = ({ score }: OperationalScoreVisualizationProps) => {
  const getColorForScore = (percentage: number) => {
    if (percentage < 20) return '#E84855'
    if (percentage < 40) return '#F77F00'
    if (percentage < 60) return '#FCBF49'
    if (percentage < 80) return '#3FD3C6'
    return '#4FE3D6'
  }

  const color = getColorForScore(score.percentage)

  return (
    <div className="relative">
      {/* Score Circle */}
      <div className="flex justify-center mb-8">
        <div className="relative w-64 h-64">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="128"
              cy="128"
              r="120"
              stroke="#1B263B"
              strokeWidth="8"
              fill="none"
            />

            {/* Score arc */}
            <motion.circle
              cx="128"
              cy="128"
              r="120"
              stroke={color}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${(score.percentage / 100) * 754} 754`}
              initial={{ strokeDasharray: "0 754" }}
              animate={{ strokeDasharray: `${(score.percentage / 100) * 754} 754` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.p
              className="text-5xl font-light text-[#F8F8F2]"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              {score.percentage}%
            </motion.p>
            <p className="text-sm text-[#415A77] uppercase tracking-wider mt-2">
              Overall Score
            </p>
          </div>
        </div>
      </div>

      {/* Level Indicator */}
      <div className="text-center">
        <motion.h2
          className="text-3xl font-light mb-2"
          style={{ color }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          {score.level}
        </motion.h2>

        {/* Level Description */}
        <p className="text-[#E0E1DD] max-w-2xl mx-auto">
          {getLevelDescription(score.level)}
        </p>
      </div>

      {/* Visual Level Bar */}
      <div className="mt-8 max-w-3xl mx-auto">
        <div className="flex justify-between mb-2">
          {['Ad-hoc', 'Scripted', 'Assisted', 'Orchestrated', 'Autonomous'].map((level, idx) => (
            <span
              key={level}
              className={`text-xs ${
                idx * 20 <= score.percentage ? 'text-[#3FD3C6]' : 'text-[#415A77]'
              }`}
            >
              {level}
            </span>
          ))}
        </div>

        <div className="h-2 bg-[#1B263B] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${score.percentage}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  )
}

function getLevelDescription(level: string): string {
  const descriptions: Record<string, string> = {
    'Level 0: Ad-hoc': 'Operations run on tribal knowledge and heroics. Every day is different, and not in a good way.',
    'Level 1: Scripted': 'Basic processes exist but require constant human intervention. Documentation exists somewhere.',
    'Level 2: Assisted': 'Systems help but don\'t drive. Humans still do most of the thinking and deciding.',
    'Level 3: Orchestrated': 'Systems coordinate effectively. Humans focus on exceptions and improvements.',
    'Level 4: Autonomous': 'Operations run themselves. Humans design the future, not operate the present.'
  }

  return descriptions[level] || 'Your operational maturity level indicates significant opportunity for systematic improvement.'
}
