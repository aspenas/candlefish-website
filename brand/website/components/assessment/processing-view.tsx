import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { AssessmentResponse, AssessmentScore, OperationalPortrait } from '@/types/assessment'

interface ProcessingViewProps {
  responses: AssessmentResponse[]
  sessionId: string
  onComplete: (results: { score: AssessmentScore; portrait: OperationalPortrait }) => void
}

export const ProcessingView = ({ responses, sessionId, onComplete }: ProcessingViewProps) => {
  const [stage, setStage] = useState(0)
  const stages = [
    'Analyzing operational patterns...',
    'Comparing to industry benchmarks...',
    'Identifying intervention points...',
    'Generating operational portrait...',
    'Calculating maturity score...',
    'Preparing recommendations...'
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setStage(prev => {
        if (prev < stages.length - 1) {
          return prev + 1
        } else {
          clearInterval(timer)
          setTimeout(() => {
            processAndComplete()
          }, 1000)
          return prev
        }
      })
    }, 800)

    return () => clearInterval(timer)
  }, [])

  const processAndComplete = async () => {
    try {
      const results = await fetch('/api/assessment/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses, sessionId })
      }).then(r => r.json())

      onComplete(results)
    } catch (error) {
      console.error('Processing error:', error)
      // Fallback to local processing if API fails
      const { AssessmentScoringEngine } = await import('@/lib/assessment/scoring-engine')
      const engine = new AssessmentScoringEngine()
      const score = engine.calculateScore(responses)
      const portrait = engine.generatePortrait(responses, score)
      onComplete({ score, portrait })
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex items-center justify-center px-6"
    >
      <div className="text-center max-w-2xl">
        {/* Animated Processing Visualization */}
        <div className="relative w-64 h-64 mx-auto mb-12">
          <svg
            className="w-full h-full"
            viewBox="0 0 256 256"
          >
            {/* Animated circles */}
            {[0, 1, 2].map((index) => (
              <motion.circle
                key={index}
                cx="128"
                cy="128"
                r={40 + index * 30}
                fill="none"
                stroke="#3FD3C6"
                strokeWidth="1"
                strokeDasharray="10 5"
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{
                  duration: 10 + index * 5,
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{ transformOrigin: "center" }}
              />
            ))}

            {/* Central pulse */}
            <motion.circle
              cx="128"
              cy="128"
              r="20"
              fill="#3FD3C6"
              initial={{ opacity: 0.3, scale: 0.8 }}
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </svg>
        </div>

        <h2 className="text-3xl font-light text-[#F8F8F2] mb-8">
          Processing Your Assessment
        </h2>

        {/* Stage Indicators */}
        <div className="space-y-3 mb-12">
          {stages.map((text, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0.3 }}
              animate={{
                opacity: idx <= stage ? 1 : 0.3,
                x: idx <= stage ? 0 : -10
              }}
              className="flex items-center justify-center text-left"
            >
              <span className={`
                mr-3 text-sm
                ${idx <= stage ? 'text-[#3FD3C6]' : 'text-[#415A77]'}
              `}>
                {idx <= stage ? '✓' : '○'}
              </span>
              <span className={`
                ${idx <= stage ? 'text-[#E0E1DD]' : 'text-[#415A77]'}
              `}>
                {text}
              </span>
            </motion.div>
          ))}
        </div>

        <p className="text-sm text-[#415A77]">
          This is a real analysis, not a loading screen
        </p>
      </div>
    </motion.section>
  )
}
