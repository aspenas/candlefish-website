'use client'

import { useState } from 'react'
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider'
import { GraphQLProvider } from '@/components/providers/GraphQLProvider'
import { LoginForm } from '@/components/auth/LoginForm'
import { OperatorDashboard } from '@/components/maturity-map/OperatorDashboard'
import { AssessmentWizard } from '@/components/maturity-map/assessment/AssessmentWizard'
import { AssessmentProgressTracker } from '@/components/maturity-map/progress/AssessmentProgressTracker'
import { ReportGenerator } from '@/components/maturity-map/reports/ReportGenerator'
import { SolutionPackageBuilder } from '@/components/maturity-map/solutions/SolutionPackageBuilder'

type AppView = 'dashboard' | 'new-assessment' | 'assessment-progress' | 'report-generator' | 'solution-builder'

function MaturityMapApp() {
  const { user, isAuthenticated } = useAuth()
  const [currentView, setCurrentView] = useState<AppView>('dashboard')
  const [currentAssessmentId, setCurrentAssessmentId] = useState<string | null>(null)

  if (!isAuthenticated) {
    return <LoginForm />
  }

  const handleNewAssessment = () => {
    setCurrentView('new-assessment')
  }

  const handleAssessmentCreated = (assessmentId: string) => {
    setCurrentAssessmentId(assessmentId)
    setCurrentView('assessment-progress')
  }

  const handleAssessmentComplete = () => {
    setCurrentView('dashboard')
    setCurrentAssessmentId(null)
  }

  const handleGenerateReport = (assessmentId: string) => {
    setCurrentAssessmentId(assessmentId)
    setCurrentView('report-generator')
  }

  const handleBuildSolutions = (assessmentId: string) => {
    setCurrentAssessmentId(assessmentId)
    setCurrentView('solution-builder')
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'new-assessment':
        return (
          <AssessmentWizard
            operatorId={user!.id}
            onComplete={handleAssessmentCreated}
            onCancel={() => setCurrentView('dashboard')}
          />
        )
      
      case 'assessment-progress':
        return currentAssessmentId ? (
          <AssessmentProgressTracker
            assessmentId={currentAssessmentId}
            onComplete={handleAssessmentComplete}
          />
        ) : null
      
      case 'report-generator':
        return currentAssessmentId ? (
          <ReportGenerator
            assessmentId={currentAssessmentId}
            onComplete={() => setCurrentView('dashboard')}
          />
        ) : null
      
      case 'solution-builder':
        return currentAssessmentId ? (
          <SolutionPackageBuilder
            assessmentId={currentAssessmentId}
            recommendations={[]} // This would come from the assessment
            franchiseTier={user!.franchiseTier}
            maturityLevel="SYSTEMATIC" // This would come from the assessment
            onComplete={() => setCurrentView('dashboard')}
          />
        ) : null
      
      default:
        return (
          <OperatorDashboard 
            operatorId={user!.id}
            onNewAssessment={handleNewAssessment}
            onGenerateReport={handleGenerateReport}
            onBuildSolutions={handleBuildSolutions}
          />
        )
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0D1B2A] via-[#1B263B] to-[#1C1C1C]">
      {renderCurrentView()}
    </main>
  )
}

export default function OperationalMaturityAssessment() {
  return (
    <AuthProvider>
      <GraphQLProvider>
        <MaturityMapApp />
      </GraphQLProvider>
    </AuthProvider>
  )
}
