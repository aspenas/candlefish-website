import { useState } from 'react'
import { motion } from 'framer-motion'
import { OperationalScoreVisualization } from './score-visualization'
import { DimensionalRadarChart } from './radar-chart'
import { OperationalPortraitCanvas } from './portrait-canvas'
import { InterventionTimeline } from './intervention-timeline'
import { trackReportDownload, trackConsultationRequest } from '@/lib/assessment/analytics'
import { downloadJSON } from '@/lib/assessment/utils'
import { copyToClipboard, createShareableText, showShareDialog, checkBrowserSupport } from '@/lib/assessment/share-utils'
import { generateAssessmentPDF, openAssessmentForPrint } from '@/utils/generate-pdf'
import type { AssessmentScore, OperationalPortrait, AssessmentResponse } from '@/types/assessment'

interface ResultsViewProps {
  score: AssessmentScore
  portrait: OperationalPortrait
  responses: AssessmentResponse[]
  sessionId: string
  onRequestConsultation: () => void
}

export const ResultsView = ({
  score,
  portrait,
  responses,
  sessionId,
  onRequestConsultation
}: ResultsViewProps) => {
  const [downloading, setDownloading] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [browserSupport] = useState(() => checkBrowserSupport())

  const downloadPDF = async () => {
    setDownloading(true)
    try {
      if (!browserSupport.canDownload) {
        throw new Error('Your browser does not support file downloads. Please try a different browser.')
      }

      // Use improved PDF generation with error handling
      await generateAssessmentPDF(score, portrait, sessionId)
      trackReportDownload(sessionId, 'pdf')

      // Show success feedback
      alert('Report downloaded successfully! To save as PDF, open the HTML file and use your browser\'s print function (Ctrl+P or Cmd+P) and select "Save as PDF".')

    } catch (error) {
      console.error('PDF generation failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

      // Try fallback to print window
      try {
        await openAssessmentForPrint(score, portrait, sessionId)
        alert(`Download failed, but opened print view instead. Error: ${errorMessage}`)
      } catch (printError) {
        console.error('Print fallback also failed:', printError)

        // Final fallback to JSON download
        try {
          downloadJSON({ score, portrait, responses }, `assessment-${sessionId}.json`)
          trackReportDownload(sessionId, 'json')
          alert(`Both PDF and print failed. Downloaded data as JSON instead. Original error: ${errorMessage}`)
        } catch (jsonError) {
          console.error('JSON fallback failed:', jsonError)
          alert(`All download methods failed. Please try:\n1. Using a different browser\n2. Disabling pop-up blockers\n3. Contacting support at hello@candlefish.ai\n\nError: ${errorMessage}`)
        }
      }
    } finally {
      setDownloading(false)
    }
  }

  const handleConsultationRequest = () => {
    trackConsultationRequest(sessionId, score)
    onRequestConsultation()
  }

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto px-6 pt-24 pb-32"
    >
      {/* Header */}
      <header className="mb-16 text-center">
        <h1 className="text-5xl font-light text-[#F8F8F2] mb-4">
          Your Operational Portrait
        </h1>
        <p className="text-xl text-[#415A77]">
          Assessment ID: <span className="text-[#3FD3C6] font-mono">{sessionId}</span>
        </p>
      </header>

      {/* Overall Score */}
      <div className="mb-20">
        <OperationalScoreVisualization score={score} />

        <div className="grid grid-cols-3 gap-8 mt-12">
          <div className="text-center">
            <p className="text-3xl font-light text-[#F8F8F2]">
              {score.level.split(':')[1]}
            </p>
            <p className="text-sm text-[#415A77] uppercase tracking-wider">
              Maturity Level
            </p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-light text-[#F8F8F2]">
              {score.percentile}th
            </p>
            <p className="text-sm text-[#415A77] uppercase tracking-wider">
              Industry Percentile
            </p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-light text-[#F8F8F2]">
              {score.readiness}%
            </p>
            <p className="text-sm text-[#415A77] uppercase tracking-wider">
              Transformation Ready
            </p>
          </div>
        </div>
      </div>

      {/* Dimensional Breakdown */}
      <div className="mb-20">
        <h2 className="text-3xl font-light text-[#F8F8F2] mb-8">
          Dimensional Analysis
        </h2>

        <DimensionalRadarChart
          dimensions={score.dimensions}
          industry={score.industryComparison}
        />

        {/* Top 3 Strengths & Weaknesses */}
        <div className="grid md:grid-cols-2 gap-12 mt-12">
          <div>
            <h3 className="text-xl text-[#3FD3C6] mb-4">Operational Strengths</h3>
            <ul className="space-y-3">
              {score.strengths.map((strength, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="text-[#3FD3C6] mr-3">↗</span>
                  <div>
                    <p className="text-[#E0E1DD]">{strength.dimension}</p>
                    <p className="text-sm text-[#415A77]">{strength.insight}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xl text-[#E84855] mb-4">Intervention Points</h3>
            <ul className="space-y-3">
              {score.interventions.map((intervention, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="text-[#E84855] mr-3">!</span>
                  <div>
                    <p className="text-[#E0E1DD]">{intervention.dimension}</p>
                    <p className="text-sm text-[#415A77]">{intervention.action}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Operational Portrait Visualization */}
      <div className="mb-20">
        <h2 className="text-3xl font-light text-[#F8F8F2] mb-8">
          Your Operational Signature
        </h2>

        <div className="bg-[#1C1C1C] p-12 rounded">
          <OperationalPortraitCanvas portrait={portrait} />
        </div>

        <p className="text-sm text-[#415A77] mt-4 text-center">
          This unique visualization represents your operational DNA -
          a combination of strengths, gaps, and potential.
        </p>
      </div>

      {/* Recommended Interventions */}
      <div className="mb-20">
        <h2 className="text-3xl font-light text-[#F8F8F2] mb-8">
          Recommended Intervention Sequence
        </h2>

        <InterventionTimeline
          interventions={score.recommendedInterventions}
          timeline={score.suggestedTimeline}
        />
      </div>

      {/* Candlefish Fit Assessment */}
      <div className="mb-20 p-12 bg-gradient-to-r from-[#1B263B] to-[#1C1C1C]">
        <h2 className="text-3xl font-light text-[#F8F8F2] mb-6">
          Candlefish Collaboration Fit
        </h2>

        {score.candlefishFit.qualified ? (
          <>
            <p className="text-xl text-[#3FD3C6] mb-4">
              Your operation shows strong potential for systematic transformation.
            </p>
            <p className="text-[#E0E1DD] mb-8">
              {score.candlefishFit.reason}
            </p>
            <button
              onClick={handleConsultationRequest}
              className="bg-[#3FD3C6] text-[#0D1B2A] px-8 py-4 hover:bg-[#4FE3D6] transition-colors"
            >
              Request Consultation
            </button>
          </>
        ) : (
          <>
            <p className="text-xl text-[#E84855] mb-4">
              Your operation would benefit from foundational improvements first.
            </p>
            <p className="text-[#E0E1DD] mb-8">
              {score.candlefishFit.reason}
            </p>
            <p className="text-sm text-[#415A77]">
              We recommend focusing on: {score.candlefishFit.prerequisites.join(', ')}
            </p>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-6">
        <button
          onClick={downloadPDF}
          disabled={downloading}
          className="px-8 py-4 bg-[#1B263B] border border-[#415A77] text-[#E0E1DD]
                   hover:border-[#3FD3C6] transition-all duration-300 disabled:opacity-50"
        >
          {downloading ? 'Generating PDF...' : 'Download Full Report (PDF)'}
        </button>

        <button
          onClick={async () => {
            setSharing(true)
            try {
              const shareData = {
                title: 'Operational Maturity Assessment Results',
                text: `I scored ${score.percentage || 0}% (${score.level || 'Assessment'}) - ${score.percentile || 0}th percentile in operational maturity.`,
                url: `${window.location.origin}/assessment/results/${sessionId}`
              }

              if (browserSupport.canShare && navigator.share) {
                try {
                  await navigator.share(shareData)
                  console.log('Results shared successfully')
                } catch (shareError) {
                  // Handle share cancellation or failure
                  if ((shareError as Error).name !== 'AbortError') {
                    console.error('Native share failed:', shareError)
                    // Fall through to custom share dialog
                    showShareDialog(score, sessionId)
                  }
                  // If AbortError, user cancelled - do nothing
                }
              } else {
                // Use custom share dialog for better UX
                showShareDialog(score, sessionId)
              }
            } catch (error) {
              console.error('Share failed:', error)
              const errorMessage = error instanceof Error ? error.message : 'Unknown error'
              alert(`Sharing failed: ${errorMessage}\n\nYou can manually copy this URL to share: ${window.location.origin}/assessment/results/${sessionId}`)
            } finally {
              setSharing(false)
            }
          }}
          disabled={sharing}
          className="px-8 py-4 bg-[#1B263B] border border-[#415A77] text-[#E0E1DD]
                   hover:border-[#3FD3C6] transition-all duration-300 disabled:opacity-50"
        >
          {sharing ? 'Sharing...' : browserSupport.canShare ? 'Share Results' : 'Copy Share Link'}
        </button>
      </div>
    </motion.section>
  )
}
