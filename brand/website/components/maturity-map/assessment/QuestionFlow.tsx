'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import type { Industry, QuestionResponse } from '@/lib/graphql/types'

interface QuestionFlowProps {
  industry: Industry
  responses: QuestionResponse[]
  onResponsesChange: (responses: QuestionResponse[]) => void
}

const SAMPLE_QUESTIONS = [
  {
    id: 'standardization',
    text: 'How standardized are your operational processes?',
    category: 'Process Maturity',
    options: [
      { value: 1, label: 'No standardization - processes vary by individual' },
      { value: 2, label: 'Some documentation exists but inconsistently followed' },
      { value: 3, label: 'Standardized processes with regular compliance checks' },
      { value: 4, label: 'Highly standardized with continuous improvement cycles' },
      { value: 5, label: 'Fully automated with self-optimizing processes' }
    ]
  },
  {
    id: 'measurement',
    text: 'How comprehensive is your performance measurement system?',
    category: 'Measurement & Analytics',
    options: [
      { value: 1, label: 'Minimal metrics tracked manually' },
      { value: 2, label: 'Basic KPIs tracked with simple tools' },
      { value: 3, label: 'Comprehensive dashboard with real-time data' },
      { value: 4, label: 'Predictive analytics and trend analysis' },
      { value: 5, label: 'AI-driven insights with automated decision making' }
    ]
  },
  {
    id: 'governance',
    text: 'How mature is your operational governance structure?',
    category: 'Governance & Control',
    options: [
      { value: 1, label: 'Ad-hoc decision making with unclear authority' },
      { value: 2, label: 'Basic hierarchy with some defined roles' },
      { value: 3, label: 'Clear governance structure with defined processes' },
      { value: 4, label: 'Mature governance with risk management integration' },
      { value: 5, label: 'Autonomous governance with AI-assisted decisions' }
    ]
  }
]

export function QuestionFlow({
  industry,
  responses,
  onResponsesChange
}: QuestionFlowProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const currentQuestion = SAMPLE_QUESTIONS[currentQuestionIndex]
  
  const handleAnswer = (questionId: string, value: number, label: string) => {
    const newResponse: QuestionResponse = {
      questionId,
      response: value,
      followUp: label
    }
    
    const updatedResponses = responses.filter(r => r.questionId !== questionId)
    updatedResponses.push(newResponse)
    
    onResponsesChange(updatedResponses)
    
    if (currentQuestionIndex < SAMPLE_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const progress = ((currentQuestionIndex + 1) / SAMPLE_QUESTIONS.length) * 100

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Progress */}
      <div className="text-center space-y-2">
        <div className="text-sm text-gray-400">
          Question {currentQuestionIndex + 1} of {SAMPLE_QUESTIONS.length}
        </div>
        <Progress value={progress} className="h-2" />
        <div className="text-xs text-gray-500">
          {industry.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())} Industry
        </div>
      </div>

      {/* Question Card */}
      <motion.div
        key={currentQuestion.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-8">
          <div className="text-center mb-8">
            <div className="text-blue-400 text-sm font-medium mb-2">
              {currentQuestion.category}
            </div>
            <h3 className="text-xl font-semibold text-white mb-4">
              {currentQuestion.text}
            </h3>
            <div className="w-16 h-1 bg-blue-500 mx-auto rounded-full" />
          </div>

          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => (
              <motion.button
                key={option.value}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleAnswer(currentQuestion.id, option.value, option.label)}
                className="w-full p-4 text-left rounded-lg border border-gray-700 hover:border-blue-500 hover:bg-blue-500/5 transition-all group"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full border border-gray-600 flex items-center justify-center group-hover:border-blue-500 group-hover:text-blue-400 transition-colors">
                    {option.value}
                  </div>
                  <div className="text-gray-300 group-hover:text-white transition-colors">
                    {option.label}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </Button>
        
        <div className="text-sm text-gray-400">
          {responses.length} / {SAMPLE_QUESTIONS.length} answered
        </div>
      </div>
    </div>
  )
}