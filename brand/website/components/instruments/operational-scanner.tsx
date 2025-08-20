'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'

interface ScanResult {
  domain: string
  technologies: Array<{ name: string; category: string }>
  patterns: string[]
  scanDate: string
  disclaimer: string
}

export const OperationalScanner = ({ demoMode = false }: { demoMode?: boolean }) => {
  const [domain, setDomain] = useState('')
  const [scanning, setScanning] = useState(false)
  const [results, setResults] = useState<ScanResult | null>(null)
  const [scanPhase, setScanPhase] = useState('')
  const [error, setError] = useState('')

  const scanDomain = async () => {
    if (!domain) {
      setError('Please enter a domain to scan')
      return
    }

    setScanning(true)
    setResults(null)
    setError('')

    // Realistic scanning phases
    const phases = [
      'Analyzing public technology signals...',
      'Checking for common integrations...',
      'Identifying operational patterns...',
      'Generating insights...'
    ]

    for (const phase of phases) {
      setScanPhase(phase)
      await new Promise(resolve => setTimeout(resolve, 1500))
    }

    try {
      // Call actual API
      const response = await fetch('/api/instruments/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain })
      })
      
      if (!response.ok) {
        throw new Error('Failed to scan domain')
      }
      
      const scanResults = await response.json()
      setResults(scanResults)
    } catch (err) {
      setError('Unable to scan domain. Please ensure it\'s valid and publicly accessible.')
      console.error('Scan error:', err)
    } finally {
      setScanning(false)
      setScanPhase('')
    }
  }

  return (
    <div className="min-h-screen bg-[#0D1B2A] p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-4xl font-light text-[#F8F8F2] mb-4">
            Operational Scanner
          </h1>
          <p className="text-[#415A77]">
            Analyze any domain's operational footprint using public data. 
            This demonstrates our approach to understanding digital operations.
          </p>
        </header>

        {/* Input */}
        {!scanning && !results && (
          <div className="mb-12">
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="flex-1 bg-[#1B263B] border border-[#415A77] px-6 py-4 
                         text-[#F8F8F2] text-lg focus:border-[#3FD3C6] transition-colors"
              />
              <button
                onClick={scanDomain}
                disabled={!domain}
                className="px-8 py-4 bg-[#3FD3C6] text-[#0D1B2A] font-medium 
                         hover:bg-[#4FE3D6] transition-colors disabled:opacity-50"
              >
                Scan Domain
              </button>
            </div>
            
            {error && (
              <p className="text-[#E84855] mt-4">{error}</p>
            )}
            
            <p className="text-xs text-[#415A77] mt-4">
              This scanner uses only publicly available information
            </p>
          </div>
        )}

        {/* Scanning Animation */}
        {scanning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="relative w-32 h-32 mb-8">
              <motion.div
                className="absolute inset-0 border-4 border-[#3FD3C6] rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="absolute inset-4 border-4 border-[#4FE3D6] rounded-full"
                animate={{ rotate: -360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="absolute inset-8 border-4 border-[#5FF3E6] rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              />
            </div>
            
            <p className="text-[#3FD3C6] text-lg font-mono">{scanPhase}</p>
          </motion.div>
        )}

        {/* Results Display */}
        {results && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {/* Technology Signals */}
            <div className="bg-[#1C1C1C] p-8 border border-[#415A77]">
              <h2 className="text-2xl font-light text-[#F8F8F2] mb-4">
                Technology Signals Detected
              </h2>
              
              <div className="space-y-3">
                {results.technologies.map((tech, index) => (
                  <div key={index} className="flex items-center justify-between 
                                            py-2 border-b border-[#415A77]">
                    <span className="text-[#E0E1DD]">{tech.name}</span>
                    <span className="text-sm text-[#415A77]">{tech.category}</span>
                  </div>
                ))}
              </div>
              
              <p className="text-xs text-[#415A77] mt-4">
                Based on public headers, DNS records, and page analysis
              </p>
            </div>

            {/* Operational Patterns */}
            <div className="bg-[#1C1C1C] p-8 border border-[#415A77]">
              <h2 className="text-2xl font-light text-[#F8F8F2] mb-4">
                Common Operational Patterns
              </h2>
              
              <ul className="space-y-3">
                {results.patterns.map((pattern, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-[#3FD3C6] mr-3">→</span>
                    <span className="text-[#E0E1DD]">{pattern}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Disclaimer */}
            <div className="text-xs text-[#415A77] text-center">
              {results.disclaimer}
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setResults(null)
                  setDomain('')
                }}
                className="px-6 py-3 border border-[#415A77] text-[#E0E1DD] 
                         hover:border-[#3FD3C6] transition-colors"
              >
                Scan Another Domain
              </button>
              
              <button
                className="px-6 py-3 bg-[#3FD3C6] text-[#0D1B2A] font-medium 
                         hover:bg-[#4FE3D6] transition-colors"
              >
                Download Report
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}