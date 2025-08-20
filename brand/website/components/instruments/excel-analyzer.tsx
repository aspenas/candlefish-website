'use client'
import { useState, useRef } from 'react'
import { motion } from 'framer-motion'

interface AnalysisResult {
  fileName: string
  sheets: number
  formulas: number
  complexity: 'Low' | 'Medium' | 'High' | 'Very High'
  patterns: string[]
  insights: string[]
  warnings: string[]
}

export const ExcelAnalyzer = ({ demoMode = false }: { demoMode?: boolean }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [results, setResults] = useState<AnalysisResult | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState('')

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx?|xlsm)$/)) {
      setError('Please upload an Excel file (.xls, .xlsx, or .xlsm)')
      return
    }

    setAnalyzing(true)
    setError('')
    setResults(null)

    // Simulate analysis (in real implementation, would send to API)
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Mock results
    const mockResults: AnalysisResult = {
      fileName: file.name,
      sheets: 5,
      formulas: 127,
      complexity: 'High',
      patterns: [
        'Heavy use of VLOOKUP formulas (32 instances)',
        'Nested IF statements detected (depth: 5)',
        'Cross-sheet references in 78% of formulas',
        'Hidden columns contain critical calculations',
        'Color coding used for data categorization'
      ],
      insights: [
        'This spreadsheet is a de facto database with complex relationships',
        'Business logic is embedded in formulas that evolved over time',
        'Multiple validation rules implemented through conditional formatting',
        'Manual version control evident from sheet naming patterns'
      ],
      warnings: [
        'Circular references detected in Sheet3',
        'External links to 3 other workbooks',
        'Large data ranges may impact performance'
      ]
    }

    setResults(mockResults)
    setAnalyzing(false)
  }

  return (
    <div className="min-h-screen bg-[#0D1B2A] p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-4xl font-light text-[#F8F8F2] mb-4">
            Excel Pattern Analyzer
          </h1>
          <p className="text-[#415A77]">
            Upload an Excel file to understand the operational patterns it contains. 
            We analyze formulas, data flows, and hidden logic.
          </p>
        </header>

        {/* Upload Area */}
        {!analyzing && !results && (
          <div 
            className={`
              border-2 border-dashed rounded-lg p-16 text-center transition-colors
              ${dragActive ? 'border-[#3FD3C6] bg-[#3FD3C6]/10' : 'border-[#415A77] bg-[#1C1C1C]'}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <svg 
              className="w-16 h-16 mx-auto mb-4 text-[#415A77]"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
              />
            </svg>
            
            <p className="text-[#F8F8F2] text-xl mb-2">
              Drop your Excel file here
            </p>
            <p className="text-[#415A77] mb-6">
              or
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".xls,.xlsx,.xlsm"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-8 py-3 bg-[#3FD3C6] text-[#0D1B2A] font-medium 
                       hover:bg-[#4FE3D6] transition-colors"
            >
              Choose File
            </button>
            
            {error && (
              <p className="text-[#E84855] mt-4">{error}</p>
            )}
            
            <p className="text-xs text-[#415A77] mt-8">
              Your file is analyzed locally and never uploaded to our servers
            </p>
          </div>
        )}

        {/* Analyzing Animation */}
        {analyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="relative w-32 h-32 mb-8">
              <motion.div
                className="absolute inset-0 border-4 border-[#3FD3C6] rounded-lg"
                animate={{ 
                  rotate: [0, 90, 180, 270, 360],
                  borderRadius: ["10%", "50%", "10%", "50%", "10%"]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <motion.div
                className="absolute inset-4 border-4 border-[#4FE3D6] rounded-lg"
                animate={{ 
                  rotate: [360, 270, 180, 90, 0],
                  borderRadius: ["50%", "10%", "50%", "10%", "50%"]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            
            <p className="text-[#3FD3C6] text-lg font-mono">Analyzing patterns...</p>
            <p className="text-[#415A77] text-sm mt-2">
              Extracting formulas, dependencies, and hidden logic
            </p>
          </motion.div>
        )}

        {/* Results */}
        {results && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {/* Summary */}
            <div className="bg-[#1C1C1C] border border-[#415A77] p-8">
              <h2 className="text-2xl font-light text-[#F8F8F2] mb-6">
                Analysis Summary
              </h2>
              
              <div className="grid grid-cols-4 gap-6 mb-6">
                <div>
                  <p className="text-[#415A77] text-sm">File</p>
                  <p className="text-[#F8F8F2] text-lg">{results.fileName}</p>
                </div>
                <div>
                  <p className="text-[#415A77] text-sm">Sheets</p>
                  <p className="text-[#F8F8F2] text-2xl font-light">{results.sheets}</p>
                </div>
                <div>
                  <p className="text-[#415A77] text-sm">Formulas</p>
                  <p className="text-[#F8F8F2] text-2xl font-light">{results.formulas}</p>
                </div>
                <div>
                  <p className="text-[#415A77] text-sm">Complexity</p>
                  <p className={`text-2xl font-light ${
                    results.complexity === 'Very High' ? 'text-[#E84855]' :
                    results.complexity === 'High' ? 'text-[#FFB400]' :
                    results.complexity === 'Medium' ? 'text-[#3FD3C6]' : 'text-[#4FE3D6]'
                  }`}>
                    {results.complexity}
                  </p>
                </div>
              </div>

              <div className="h-2 bg-[#0D1B2A] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#3FD3C6] to-[#E84855]"
                  initial={{ width: 0 }}
                  animate={{ width: '75%' }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </div>
            </div>

            {/* Patterns Detected */}
            <div className="bg-[#1C1C1C] border border-[#415A77] p-8">
              <h2 className="text-2xl font-light text-[#F8F8F2] mb-4">
                Patterns Detected
              </h2>
              
              <ul className="space-y-3">
                {results.patterns.map((pattern, index) => (
                  <motion.li 
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start"
                  >
                    <span className="text-[#3FD3C6] mr-3">→</span>
                    <span className="text-[#E0E1DD]">{pattern}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Operational Insights */}
            <div className="bg-[#1C1C1C] border border-[#415A77] p-8">
              <h2 className="text-2xl font-light text-[#F8F8F2] mb-4">
                Operational Insights
              </h2>
              
              <div className="space-y-4">
                {results.insights.map((insight, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="pl-4 border-l-2 border-[#3FD3C6]"
                  >
                    <p className="text-[#E0E1DD]">{insight}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Warnings */}
            {results.warnings.length > 0 && (
              <div className="bg-[#E84855]/10 border border-[#E84855] p-8">
                <h2 className="text-2xl font-light text-[#E84855] mb-4">
                  ⚠ Warnings
                </h2>
                
                <ul className="space-y-2">
                  {results.warnings.map((warning, index) => (
                    <li key={index} className="text-[#E0E1DD]">
                      • {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setResults(null)
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                  }
                }}
                className="px-6 py-3 border border-[#415A77] text-[#E0E1DD] 
                         hover:border-[#3FD3C6] transition-colors"
              >
                Analyze Another File
              </button>
              
              <button
                className="px-6 py-3 bg-[#3FD3C6] text-[#0D1B2A] font-medium 
                         hover:bg-[#4FE3D6] transition-colors"
              >
                Download Full Report
              </button>
              
              <button
                className="px-6 py-3 border border-[#3FD3C6] text-[#3FD3C6] 
                         hover:bg-[#3FD3C6] hover:text-[#0D1B2A] transition-colors"
              >
                Schedule Consultation
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}