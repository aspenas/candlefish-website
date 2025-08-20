import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { assessmentDimensions } from '@/lib/assessment/questions'
import type { AssessmentResponse } from '@/types/assessment'

interface AssessmentViewProps {
  dimension: number
  onResponse: (response: AssessmentResponse) => void
  onBack: () => void
}

export const AssessmentView = ({ dimension, onResponse, onBack }: AssessmentViewProps) => {
  const currentQuestion = assessmentDimensions[dimension]
  const [selected, setSelected] = useState<number | null>(null)
  const [followUpAnswer, setFollowUpAnswer] = useState('')
  const [showFollowUp, setShowFollowUp] = useState(false)
  const [hoveredOption, setHoveredOption] = useState<number | null>(null)

  const handleSelection = (value: number) => {
    setSelected(value)
    setShowFollowUp(true)
  }

  const handleSubmit = () => {
    if (selected !== null) {
      onResponse({
        dimension: currentQuestion.id,
        value: selected,
        followUp: followUpAnswer,
        timestamp: Date.now()
      })
      
      // Reset for next question
      setSelected(null)
      setFollowUpAnswer('')
      setShowFollowUp(false)
    }
  }

  return (
    <motion.section
      key={dimension}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-4xl mx-auto px-6 pt-24"
    >
      {/* Dimension Header */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[#3FD3C6] text-sm uppercase tracking-wider">
            Dimension {dimension + 1} of 14
          </span>
          <span className="text-[#415A77] text-sm">
            {Math.round(((dimension + 1) / 14) * 100)}% Complete
          </span>
        </div>
        
        <h2 className="text-4xl font-light text-[#F8F8F2] mb-2">
          {currentQuestion.dimension}
        </h2>
        
        <p className="text-[#415A77] leading-relaxed">
          {currentQuestion.context}
        </p>
      </div>

      {/* The Question */}
      <div className="mb-12">
        <h3 className="text-2xl text-[#E0E1DD] mb-8 leading-relaxed">
          {currentQuestion.question}
        </h3>

        {/* Options */}
        <div className="space-y-4">
          {currentQuestion.options.map((option, index) => (
            <motion.button
              key={option.value}
              className={`
                w-full text-left p-6 border transition-all duration-300
                ${selected === option.value 
                  ? 'bg-[#1B263B] border-[#3FD3C6]' 
                  : 'bg-[#0D1B2A]/50 border-[#415A77] hover:border-[#E0E1DD]'
                }
              `}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleSelection(option.value)}
              onMouseEnter={() => setHoveredOption(option.value)}
              onMouseLeave={() => setHoveredOption(null)}
            >
              <div className="flex items-start">
                <span className={`
                  mr-4 text-lg font-light
                  ${selected === option.value ? 'text-[#3FD3C6]' : 'text-[#415A77]'}
                `}>
                  {String.fromCharCode(65 + index)}
                </span>
                
                <div className="flex-1">
                  <p className={`
                    text-lg mb-2
                    ${selected === option.value ? 'text-[#F8F8F2]' : 'text-[#E0E1DD]'}
                  `}>
                    {option.label}
                  </p>
                  
                  {/* Show insight on hover or selection */}
                  <AnimatePresence>
                    {(hoveredOption === option.value || selected === option.value) && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-sm text-[#3FD3C6] italic"
                      >
                        → {option.insight}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Follow-up Question */}
      <AnimatePresence>
        {showFollowUp && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-12 p-6 bg-[#1C1C1C] border border-[#415A77]"
          >
            <label className="block text-[#E0E1DD] mb-4">
              {currentQuestion.followUp}
            </label>
            <textarea
              value={followUpAnswer}
              onChange={(e) => setFollowUpAnswer(e.target.value)}
              className="w-full bg-[#0D1B2A] border border-[#415A77] px-4 py-3 
                       text-[#F8F8F2] focus:border-[#3FD3C6] transition-colors
                       focus:outline-none resize-none"
              rows={3}
              placeholder="Your insight here (optional but valuable)"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={onBack}
          className="text-[#415A77] hover:text-[#E0E1DD] transition-colors"
          disabled={dimension === 0}
        >
          {dimension > 0 && '← Previous'}
        </button>

        <button
          onClick={handleSubmit}
          disabled={selected === null}
          className={`
            px-8 py-3 transition-all duration-300
            ${selected !== null
              ? 'bg-[#1B263B] border border-[#3FD3C6] text-[#E0E1DD] hover:bg-[#3FD3C6]/10'
              : 'bg-[#1B263B] border border-[#415A77] text-[#415A77] cursor-not-allowed'
            }
          `}
        >
          {dimension < 13 ? 'Next Question →' : 'Complete Assessment'}
        </button>
      </div>

      {/* Dimension Progress Bar */}
      <div className="mt-16">
        <div className="flex justify-between mb-2">
          {assessmentDimensions.map((dim, idx) => (
            <div
              key={dim.id}
              className={`
                h-1 flex-1 mx-0.5 transition-all duration-500
                ${idx < dimension 
                  ? 'bg-[#3FD3C6]' 
                  : idx === dimension 
                  ? 'bg-[#3FD3C6]/50' 
                  : 'bg-[#415A77]'
                }
              `}
            />
          ))}
        </div>
      </div>
    </motion.section>
  )
}