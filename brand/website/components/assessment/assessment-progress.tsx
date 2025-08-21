import { motion } from 'framer-motion'

interface AssessmentProgressProps {
  stage: string
  dimension: number
  total: number
}

export const AssessmentProgress = ({ stage, dimension, total }: AssessmentProgressProps) => {
  const percentage = ((dimension + 1) / total) * 100

  return (
    <div className="fixed top-0 left-0 right-0 bg-[#0D1B2A]/95 backdrop-blur-sm z-50 border-b border-[#415A77]">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#3FD3C6] text-xs uppercase tracking-wider mb-1">
              Operational Maturity Assessment
            </p>
            <p className="text-[#E0E1DD] text-sm">
              Question {dimension + 1} of {total}
            </p>
          </div>

          <div className="text-right">
            <p className="text-[#E0E1DD] text-lg font-light">
              {Math.round(percentage)}%
            </p>
            <p className="text-[#415A77] text-xs">
              Complete
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-1 bg-[#1B263B] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[#3FD3C6] to-[#4FE3D6]"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  )
}
