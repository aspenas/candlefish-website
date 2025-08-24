import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import {
  RocketLaunchIcon,
  WrenchIcon,
  CheckCircleIcon,
  BeakerIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  StopIcon,
  ClockIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'
import { Deployment, DeploymentStage } from '../../types/deployment.types'
import { useRealtimeDeploymentUpdates } from '../../hooks/useDeploymentOperations'
import { EnvironmentBadge } from './EnvironmentSelector'

interface DeploymentProgressProps {
  deployment: Deployment
  onCancel?: (deploymentId: string) => void
  onViewLogs?: (deploymentId: string) => void
  expanded?: boolean
}

const stageConfig = {
  initializing: {
    icon: ClockIcon,
    label: 'Initializing',
    description: 'Setting up deployment environment',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20'
  },
  building: {
    icon: WrenchIcon,
    label: 'Building',
    description: 'Compiling and packaging application',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20'
  },
  testing: {
    icon: BeakerIcon,
    label: 'Testing',
    description: 'Running automated tests',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20'
  },
  deploying: {
    icon: RocketLaunchIcon,
    label: 'Deploying',
    description: 'Deploying to target environment',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20'
  },
  health_checking: {
    icon: ShieldCheckIcon,
    label: 'Health Checks',
    description: 'Verifying application health',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20'
  },
  routing_traffic: {
    icon: GlobeAltIcon,
    label: 'Routing Traffic',
    description: 'Routing traffic to new deployment',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20'
  },
  completing: {
    icon: CheckCircleIcon,
    label: 'Completing',
    description: 'Finalizing deployment',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20'
  },
  cleaning_up: {
    icon: WrenchIcon,
    label: 'Cleaning Up',
    description: 'Cleaning up temporary resources',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20'
  }
}

const stages: DeploymentStage[] = [
  'initializing',
  'building',
  'testing',
  'deploying',
  'health_checking',
  'routing_traffic',
  'completing',
  'cleaning_up'
]

function ProgressBar({ progress, stage }: { progress: number; stage: DeploymentStage }) {
  return (
    <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
      <motion.div
        className={`h-full ${stageConfig[stage].bgColor} rounded-full relative`}
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{ x: ['0%', '100%'] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear',
            repeatDelay: 0.5
          }}
        />
      </motion.div>
    </div>
  )
}

function StageIndicator({
  stage,
  isActive,
  isCompleted,
  progress
}: {
  stage: DeploymentStage
  isActive: boolean
  isCompleted: boolean
  progress?: number
}) {
  const config = stageConfig[stage]

  return (
    <div className={`
      flex items-center gap-3 p-3 rounded-lg transition-all duration-300
      ${isActive ? `${config.bgColor} border border-current/30` : 'bg-muted/20'}
    `}>
      <div className={`
        p-2 rounded-lg transition-all duration-300
        ${isActive ? config.bgColor : 'bg-muted/30'}
        ${isCompleted ? 'bg-green-500/20' : ''}
      `}>
        {isCompleted ? (
          <CheckCircleIcon className="w-4 h-4 text-green-400" />
        ) : (
          <config.icon className={`w-4 h-4 ${
            isActive ? config.color : 'text-muted-foreground'
          }`} />
        )}
      </div>

      <div className="flex-1">
        <div className={`text-sm font-medium ${
          isActive ? config.color : isCompleted ? 'text-green-400' : 'text-muted-foreground'
        }`}>
          {config.label}
        </div>
        <div className="text-xs text-muted-foreground">
          {config.description}
        </div>
      </div>

      {isActive && progress !== undefined && (
        <div className="text-xs text-muted-foreground">
          {Math.round(progress)}%
        </div>
      )}
    </div>
  )
}

export function DeploymentProgress({
  deployment,
  onCancel,
  onViewLogs,
  expanded: controlledExpanded = false
}: DeploymentProgressProps) {
  const [expanded, setExpanded] = useState(controlledExpanded)
  const [currentStage, setCurrentStage] = useState<DeploymentStage>('initializing')
  const [progress, setProgress] = useState(0)
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const { updates } = useRealtimeDeploymentUpdates(deployment.id)

  // Process real-time updates
  useEffect(() => {
    const latestUpdate = updates[updates.length - 1]
    if (latestUpdate && latestUpdate.type === 'deployment_progress') {
      const progressData = latestUpdate.data as any
      if (progressData.stage) setCurrentStage(progressData.stage)
      if (progressData.progress !== undefined) setProgress(progressData.progress)
      if (progressData.estimatedTimeRemaining) setEstimatedTimeRemaining(progressData.estimatedTimeRemaining)
      if (progressData.message) {
        setLogs(prev => [...prev, progressData.message].slice(-10)) // Keep last 10 messages
      }
    }
  }, [updates])

  // Simulate progress for demo purposes
  useEffect(() => {
    if (['pending', 'running', 'deploying', 'testing'].includes(deployment.status)) {
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = Math.min(prev + Math.random() * 2, 100)

          // Update stage based on progress
          const stageIndex = Math.floor((newProgress / 100) * stages.length)
          const newStage = stages[Math.min(stageIndex, stages.length - 1)]
          if (newStage !== currentStage) {
            setCurrentStage(newStage)
            setLogs(prev => [...prev, `Starting ${stageConfig[newStage].label.toLowerCase()}...`].slice(-10))
          }

          return newProgress
        })
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [deployment.status, currentStage])

  const currentStageIndex = stages.indexOf(currentStage)
  const overallProgress = ((currentStageIndex / stages.length) * 100) + (progress / stages.length)

  const formatTimeRemaining = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const canCancel = ['pending', 'running', 'deploying', 'testing'].includes(deployment.status)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/20 rounded-lg">
            <RocketLaunchIcon className="w-6 h-6 text-primary" />
          </div>

          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-foreground">
                {deployment.service} v{deployment.version}
              </h3>
              <EnvironmentBadge environment={deployment.environment.name} />
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Triggered by {deployment.triggeredBy}</span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(deployment.triggeredAt), { addSuffix: true })}</span>
              {estimatedTimeRemaining && (
                <>
                  <span>•</span>
                  <span>~{formatTimeRemaining(estimatedTimeRemaining)} remaining</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onViewLogs && (
            <button
              onClick={() => onViewLogs(deployment.id)}
              className="px-3 py-1.5 text-sm bg-muted/50 hover:bg-muted/70 text-muted-foreground
                         hover:text-foreground rounded-lg transition-colors"
            >
              View Logs
            </button>
          )}

          {canCancel && onCancel && (
            <button
              onClick={() => onCancel(deployment.id)}
              className="px-3 py-1.5 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400
                         hover:text-red-300 rounded-lg transition-colors flex items-center gap-1"
            >
              <StopIcon className="w-3 h-3" />
              Cancel
            </button>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
          >
            {expanded ? (
              <ChevronUpIcon className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            {stageConfig[currentStage].label}
          </span>
          <span className="text-sm text-muted-foreground">
            {Math.round(overallProgress)}%
          </span>
        </div>
        <ProgressBar progress={overallProgress} stage={currentStage} />
      </div>

      {/* Current Stage Info */}
      <div className="mb-6 p-4 bg-muted/20 rounded-lg">
        <div className="flex items-center gap-3 mb-2">
          <stageConfig[currentStage].icon className={`w-5 h-5 ${stageConfig[currentStage].color}`} />
          <span className="text-sm font-medium text-foreground">
            {stageConfig[currentStage].description}
          </span>
        </div>

        {logs.length > 0 && (
          <div className="text-xs text-muted-foreground font-mono">
            {logs[logs.length - 1]}
          </div>
        )}
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6"
          >
            {/* Stage Timeline */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-4">Deployment Stages</h4>
              <div className="space-y-2">
                {stages.map((stage, index) => (
                  <StageIndicator
                    key={stage}
                    stage={stage}
                    isActive={stage === currentStage}
                    isCompleted={index < currentStageIndex}
                    progress={stage === currentStage ? progress : undefined}
                  />
                ))}
              </div>
            </div>

            {/* Recent Logs */}
            {logs.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-4">Recent Activity</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {logs.map((log, index) => (
                    <div key={index} className="text-xs font-mono text-muted-foreground p-2 bg-muted/10 rounded">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deployment Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Branch:</span>
                <span className="ml-2 font-mono text-foreground">{deployment.branch}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Commit:</span>
                <span className="ml-2 font-mono text-foreground">{deployment.commitSha.substring(0, 8)}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Message:</span>
                <span className="ml-2 text-foreground">{deployment.commitMessage}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
