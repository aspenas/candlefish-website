import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow, format } from 'date-fns'
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ClockIcon,
  ShieldExclamationIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { Deployment, EnvironmentType } from '../../types/deployment.types'
import { useDeploymentOperations } from '../../hooks/useDeploymentOperations'
import { EnvironmentBadge } from './EnvironmentSelector'

interface RollbackInterfaceProps {
  deployments: Deployment[]
  environment: EnvironmentType
  onRollbackComplete?: () => void
}

interface RollbackConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  currentDeployment: Deployment
  targetDeployment: Deployment
  onConfirm: (reason: string) => Promise<void>
}

function RollbackConfirmationModal({
  isOpen,
  onClose,
  currentDeployment,
  targetDeployment,
  onConfirm
}: RollbackConfirmationModalProps) {
  const [reason, setReason] = useState('')
  const [isRollingBack, setIsRollingBack] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for the rollback')
      return
    }

    setIsRollingBack(true)
    setError(null)

    try {
      await onConfirm(reason.trim())
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate rollback')
    } finally {
      setIsRollingBack(false)
    }
  }

  const handleClose = () => {
    if (!isRollingBack) {
      setReason('')
      setError(null)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="glass-card max-w-2xl w-full"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <ArrowPathIcon className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Confirm Rollback</h2>
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone without another deployment
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              disabled={isRollingBack}
              className="p-2 hover:bg-muted/50 rounded-lg transition-colors disabled:opacity-50"
            >
              <XMarkIcon className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg mb-6">
            <ShieldExclamationIcon className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-orange-400 mb-1">Production Rollback Warning</h3>
              <p className="text-sm text-orange-200/80">
                Rolling back in production will immediately affect all users. Ensure this is necessary and
                that the target version is stable.
              </p>
            </div>
          </div>

          {/* Rollback Details */}
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Current Version */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">Current Version</h3>
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-foreground">
                      {currentDeployment.service} v{currentDeployment.version}
                    </span>
                    <EnvironmentBadge environment={currentDeployment.environment.name} />
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div>Deployed: {format(new Date(currentDeployment.completedAt || currentDeployment.triggeredAt), 'PPp')}</div>
                    <div>By: {currentDeployment.triggeredBy}</div>
                    <div>Commit: {currentDeployment.commitSha.substring(0, 8)}</div>
                  </div>
                </div>
              </div>

              {/* Target Version */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">Rollback Target</h3>
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-foreground">
                      {targetDeployment.service} v{targetDeployment.version}
                    </span>
                    <EnvironmentBadge environment={targetDeployment.environment.name} />
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div>Deployed: {format(new Date(targetDeployment.completedAt || targetDeployment.triggeredAt), 'PPp')}</div>
                    <div>By: {targetDeployment.triggeredBy}</div>
                    <div>Commit: {targetDeployment.commitSha.substring(0, 8)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Impact Summary */}
            <div className="p-4 bg-muted/20 rounded-lg">
              <div className="flex items-start gap-3">
                <InformationCircleIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2">Expected Impact</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Service will temporarily be unavailable during rollback (~2-5 minutes)</li>
                    <li>• All users will be immediately moved to the previous version</li>
                    <li>• Recent data changes may need manual verification</li>
                    <li>• Database migrations since the target version will remain in place</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Reason Input */}
          <div className="mb-6">
            <label htmlFor="rollback-reason" className="block text-sm font-medium text-foreground mb-2">
              Reason for Rollback *
            </label>
            <textarea
              id="rollback-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe why this rollback is necessary..."
              className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg
                       text-foreground placeholder-muted-foreground resize-none
                       focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
              rows={3}
              disabled={isRollingBack}
            />
            {error && (
              <p className="text-sm text-red-400 mt-2">{error}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={handleClose}
              disabled={isRollingBack}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground
                       border border-border rounded-lg hover:bg-muted/50 transition-colors
                       disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              onClick={handleConfirm}
              disabled={isRollingBack || !reason.trim()}
              className="px-4 py-2 text-sm font-medium bg-orange-500 hover:bg-orange-600
                       text-white rounded-lg transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center gap-2"
            >
              {isRollingBack ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                  </motion.div>
                  Initiating Rollback...
                </>
              ) : (
                <>
                  <ArrowPathIcon className="w-4 h-4" />
                  Confirm Rollback
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function DeploymentCard({
  deployment,
  onSelect,
  isSelected
}: {
  deployment: Deployment
  onSelect: () => void
  isSelected: boolean
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`
        glass-card cursor-pointer transition-all duration-200
        ${isSelected ? 'ring-2 ring-primary border-primary/50' : 'hover:border-primary/30'}
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground">v{deployment.version}</h3>
            <EnvironmentBadge environment={deployment.environment.name} showStatus={false} />
          </div>
          <div className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(deployment.completedAt || deployment.triggeredAt), { addSuffix: true })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CheckCircleIcon className="w-5 h-5 text-green-400" />
          {isSelected && (
            <div className="w-3 h-3 bg-primary rounded-full" />
          )}
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">By:</span>
          <span className="text-foreground">{deployment.triggeredBy}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Commit:</span>
          <span className="font-mono text-foreground">{deployment.commitSha.substring(0, 8)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Success Rate:</span>
          <span className="text-foreground">{deployment.metrics.successRate.toFixed(1)}%</span>
        </div>
      </div>

      <div className="mt-3 p-2 bg-muted/20 rounded text-xs text-muted-foreground truncate">
        {deployment.commitMessage}
      </div>
    </motion.div>
  )
}

export function RollbackInterface({
  deployments,
  environment,
  onRollbackComplete
}: RollbackInterfaceProps) {
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const { rollbackDeployment } = useDeploymentOperations()

  // Get current deployment (most recent completed)
  const currentDeployment = deployments
    .filter(d => d.status === 'completed')
    .sort((a, b) => new Date(b.completedAt || b.triggeredAt).getTime() - new Date(a.completedAt || a.triggeredAt).getTime())[0]

  // Get available rollback targets (exclude current)
  const rollbackTargets = deployments
    .filter(d => d.status === 'completed' && d.id !== currentDeployment?.id)
    .sort((a, b) => new Date(b.completedAt || b.triggeredAt).getTime() - new Date(a.completedAt || a.triggeredAt).getTime())
    .slice(0, 10) // Show last 10 successful deployments

  const selectedDeployment = rollbackTargets.find(d => d.id === selectedDeploymentId)

  const handleRollback = async (reason: string) => {
    if (!selectedDeployment || !currentDeployment) return

    await rollbackDeployment({
      deploymentId: currentDeployment.id,
      targetDeploymentId: selectedDeployment.id,
      reason,
      triggeredBy: 'current_user' // Would get from auth context
    })

    onRollbackComplete?.()
  }

  if (!currentDeployment) {
    return (
      <div className="glass-card text-center py-12">
        <ExclamationTriangleIcon className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No Deployments Available</h3>
        <p className="text-muted-foreground">
          No successful deployments found for the {environment} environment.
        </p>
      </div>
    )
  }

  if (rollbackTargets.length === 0) {
    return (
      <div className="glass-card text-center py-12">
        <InformationCircleIcon className="w-12 h-12 text-blue-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No Rollback Targets</h3>
        <p className="text-muted-foreground">
          No previous deployments available for rollback in the {environment} environment.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Rollback Deployment</h2>
        <p className="text-muted-foreground">
          Select a previous deployment to rollback to. This will immediately replace the current version.
        </p>
      </div>

      {/* Current Deployment */}
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-foreground">Current Deployment</h3>
        <div className="glass-card border-2 border-blue-500/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <CheckCircleIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">
                {currentDeployment.service} v{currentDeployment.version}
              </h4>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>Deployed {formatDistanceToNow(new Date(currentDeployment.completedAt || currentDeployment.triggeredAt), { addSuffix: true })}</span>
                <span>•</span>
                <span>By {currentDeployment.triggeredBy}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="text-lg font-semibold text-green-400">
                {currentDeployment.metrics.successRate.toFixed(1)}%
              </div>
              <div className="text-muted-foreground">Success Rate</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-foreground">
                {currentDeployment.healthChecks.filter(hc => hc.status === 'healthy').length}
              </div>
              <div className="text-muted-foreground">Healthy Services</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-foreground">
                {Math.round((currentDeployment.duration || 0) / 1000 / 60)}m
              </div>
              <div className="text-muted-foreground">Deploy Time</div>
            </div>
          </div>
        </div>
      </div>

      {/* Rollback Targets */}
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-foreground">Select Rollback Target</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rollbackTargets.map((deployment) => (
            <DeploymentCard
              key={deployment.id}
              deployment={deployment}
              onSelect={() => setSelectedDeploymentId(deployment.id)}
              isSelected={selectedDeploymentId === deployment.id}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
        <div className="flex-1">
          {selectedDeployment && (
            <div className="text-sm text-muted-foreground">
              Selected: {selectedDeployment.service} v{selectedDeployment.version}
              ({formatDistanceToNow(new Date(selectedDeployment.completedAt || selectedDeployment.triggeredAt), { addSuffix: true })})
            </div>
          )}
        </div>

        <button
          onClick={() => setShowConfirmation(true)}
          disabled={!selectedDeployment}
          className="px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50
                   text-white font-medium rounded-lg transition-colors
                   disabled:cursor-not-allowed flex items-center gap-2"
        >
          <ArrowPathIcon className="w-4 h-4" />
          Initiate Rollback
        </button>
      </div>

      {/* Confirmation Modal */}
      {selectedDeployment && (
        <RollbackConfirmationModal
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          currentDeployment={currentDeployment}
          targetDeployment={selectedDeployment}
          onConfirm={handleRollback}
        />
      )}
    </div>
  )
}
