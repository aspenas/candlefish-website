/**
 * Disaster Recovery Control Center
 * Backup status overview, restoration controls, and failover management
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  HardDrive,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Upload,
  Server,
  Database,
  Settings,
  Activity,
  MapPin,
  Zap,
  Timer,
  FileText,
  Play,
  Pause,
  Square,
  RefreshCw,
  Bell,
  Calendar,
  TrendingUp,
  Gauge,
  Globe,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

import {
  useDRStore,
  useBackupStatus,
  useFailoverStatus,
} from '@/stores/useInfrastructureStore';
import { useDRWebSocket } from '@/hooks/useInfrastructureWebSocket';
import {
  BackupStatus,
  RestorePoint,
  FailoverStatus,
  DRMetrics,
  DRDrill,
} from '@/lib/types/infrastructure';

// ===== TYPES =====

interface RestoreFormData {
  restorePointId: string;
  targetEnvironment: 'production' | 'staging' | 'development';
  confirmationText: string;
}

interface DrillFormData {
  name: string;
  type: 'backup-restore' | 'failover' | 'full-dr';
  scheduledTime: string;
  description?: string;
}

// ===== MOCK DATA =====

const mockBackups: BackupStatus[] = [
  {
    id: 'backup-1',
    type: 'database',
    status: 'completed',
    startTime: new Date(Date.now() - 3600000).toISOString(),
    endTime: new Date(Date.now() - 3300000).toISOString(),
    size: '2.4 GB',
    location: 's3://backups/db/2025-01-15-12-00.sql.gz',
    retentionDate: new Date(Date.now() + 30 * 24 * 3600000).toISOString(),
  },
  {
    id: 'backup-2',
    type: 'files',
    status: 'completed',
    startTime: new Date(Date.now() - 7200000).toISOString(),
    endTime: new Date(Date.now() - 6900000).toISOString(),
    size: '850 MB',
    location: 's3://backups/files/2025-01-15-10-00.tar.gz',
    retentionDate: new Date(Date.now() + 30 * 24 * 3600000).toISOString(),
  },
  {
    id: 'backup-3',
    type: 'full',
    status: 'running',
    startTime: new Date(Date.now() - 1800000).toISOString(),
    size: '4.2 GB',
    location: 's3://backups/full/2025-01-15-13-00/',
    retentionDate: new Date(Date.now() + 90 * 24 * 3600000).toISOString(),
  },
];

const mockRestorePoints: RestorePoint[] = [
  {
    id: 'restore-1',
    name: 'Pre-deployment backup',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    type: 'manual',
    size: '2.4 GB',
    integrity: 'verified',
    description: 'Manual backup before v2.1.0 deployment',
  },
  {
    id: 'restore-2',
    name: 'Daily automated backup',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    type: 'automatic',
    size: '2.3 GB',
    integrity: 'verified',
  },
  {
    id: 'restore-3',
    name: 'Weekly full backup',
    timestamp: new Date(Date.now() - 604800000).toISOString(),
    type: 'automatic',
    size: '4.1 GB',
    integrity: 'verified',
  },
];

const mockDrills: DRDrill[] = [
  {
    id: 'drill-1',
    name: 'Monthly Failover Test',
    scheduledTime: new Date(Date.now() + 86400000).toISOString(),
    status: 'scheduled',
    type: 'failover',
  },
  {
    id: 'drill-2',
    name: 'Backup Restore Validation',
    scheduledTime: new Date(Date.now() - 604800000).toISOString(),
    completedTime: new Date(Date.now() - 603000000).toISOString(),
    status: 'completed',
    type: 'backup-restore',
    results: {
      rto: 12, // minutes
      rpo: 3,  // minutes
      success: true,
      issues: [],
    },
  },
];

// ===== COMPONENTS =====

const BackupCard: React.FC<{
  backup: BackupStatus;
  onRestore?: (backup: BackupStatus) => void;
}> = ({ backup, onRestore }) => {
  const getTypeIcon = (type: BackupStatus['type']) => {
    switch (type) {
      case 'database':
        return <Database className="h-4 w-4" />;
      case 'files':
        return <FileText className="h-4 w-4" />;
      case 'configuration':
        return <Settings className="h-4 w-4" />;
      case 'full':
        return <HardDrive className="h-4 w-4" />;
      default:
        return <HardDrive className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: BackupStatus['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'running':
        return <Activity className="h-4 w-4 text-blue-600 animate-pulse" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'scheduled':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: BackupStatus['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'running':
        return 'text-blue-600 bg-blue-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'scheduled':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const duration = backup.endTime 
    ? new Date(backup.endTime).getTime() - new Date(backup.startTime).getTime()
    : Date.now() - new Date(backup.startTime).getTime();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              {getTypeIcon(backup.type)}
            </div>
            <div>
              <h3 className="font-medium text-sm capitalize">{backup.type} Backup</h3>
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(backup.startTime), { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(backup.status)}
            <Badge className={cn('text-xs', getStatusColor(backup.status))}>
              {backup.status}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-3 text-xs">
          <div>
            <span className="text-gray-500">Size:</span>
            <div className="font-medium">{backup.size}</div>
          </div>
          <div>
            <span className="text-gray-500">Duration:</span>
            <div className="font-medium">
              {Math.round(duration / 60000)}m
            </div>
          </div>
        </div>

        {backup.status === 'running' && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600">Progress</span>
              <span className="text-xs text-gray-600">75%</span>
            </div>
            <Progress value={75} className="h-2" />
          </div>
        )}

        <div className="mb-3 p-2 bg-gray-50 rounded text-xs font-mono truncate">
          {backup.location}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Expires: {format(new Date(backup.retentionDate), 'MMM dd')}
          </div>
          <div className="flex items-center space-x-1">
            {backup.status === 'completed' && onRestore && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRestore(backup)}
                className="h-7 px-2 text-blue-600 hover:text-blue-700"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

const RestorePointCard: React.FC<{
  point: RestorePoint;
  onRestore: (point: RestorePoint) => void;
}> = ({ point, onRestore }) => {
  const getIntegrityIcon = (integrity: RestorePoint['integrity']) => {
    switch (integrity) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'unverified':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'corrupted':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTypeIcon = (type: RestorePoint['type']) => {
    return type === 'manual' 
      ? <Settings className="h-4 w-4" />
      : <Timer className="h-4 w-4" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              {getTypeIcon(point.type)}
            </div>
            <div>
              <h3 className="font-medium text-sm">{point.name}</h3>
              <p className="text-xs text-gray-500">
                {format(new Date(point.timestamp), 'PPpp')}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getIntegrityIcon(point.integrity)}
            <Badge variant="outline" className="text-xs">
              {point.type}
            </Badge>
          </div>
        </div>

        {point.description && (
          <div className="mb-3 text-xs text-gray-600">
            {point.description}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-3 text-xs">
          <div>
            <span className="text-gray-500">Size:</span>
            <div className="font-medium">{point.size}</div>
          </div>
          <div>
            <span className="text-gray-500">Integrity:</span>
            <div className="font-medium capitalize">{point.integrity}</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(point.timestamp), { addSuffix: true })}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRestore(point)}
            disabled={point.integrity === 'corrupted'}
            className="h-7 px-2 text-blue-600 hover:text-blue-700"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Restore
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};

const FailoverPanel: React.FC<{
  status: FailoverStatus;
  onInitiateFailover: () => void;
  onFailback: () => void;
}> = ({ status, onInitiateFailover, onFailback }) => {
  const getStatusColor = (status: FailoverStatus['status']) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50';
      case 'standby':
        return 'text-blue-600 bg-blue-50';
      case 'failing-over':
        return 'text-yellow-600 bg-yellow-50';
      case 'failed-over':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const isFailingOver = status.status === 'failing-over';

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Failover Control</h3>
        <Badge className={cn('text-sm', getStatusColor(status.status))}>
          {status.status.replace('-', ' ')}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Primary Region */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className={cn(
              'p-3 rounded-lg',
              status.healthChecks.primary 
                ? 'bg-green-100 text-green-600' 
                : 'bg-red-100 text-red-600'
            )}>
              <Server className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-medium">Primary Region</h4>
              <p className="text-sm text-gray-600">{status.primaryRegion}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={cn(
              'w-3 h-3 rounded-full',
              status.healthChecks.primary ? 'bg-green-500' : 'bg-red-500'
            )} />
            <span className="text-sm">
              {status.healthChecks.primary ? 'Healthy' : 'Unhealthy'}
            </span>
          </div>
        </div>

        {/* Secondary Region */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className={cn(
              'p-3 rounded-lg',
              status.healthChecks.secondary 
                ? 'bg-green-100 text-green-600' 
                : 'bg-red-100 text-red-600'
            )}>
              <Server className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-medium">Secondary Region</h4>
              <p className="text-sm text-gray-600">{status.secondaryRegion}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={cn(
              'w-3 h-3 rounded-full',
              status.healthChecks.secondary ? 'bg-green-500' : 'bg-red-500'
            )} />
            <span className="text-sm">
              {status.healthChecks.secondary ? 'Healthy' : 'Unhealthy'}
            </span>
          </div>
        </div>
      </div>

      {status.lastFailover && (
        <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              Last failover: {format(new Date(status.lastFailover), 'PPpp')}
            </span>
          </div>
        </div>
      )}

      {isFailingOver && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Failover Progress</span>
            <span className="text-sm text-gray-600">65%</span>
          </div>
          <Progress value={65} className="h-2" />
        </div>
      )}

      <div className="flex space-x-3">
        {status.status === 'active' && (
          <Button
            onClick={onInitiateFailover}
            disabled={!status.healthChecks.secondary}
            className="flex-1"
            variant="outline"
          >
            <Zap className="h-4 w-4 mr-2" />
            Initiate Failover
          </Button>
        )}
        
        {status.status === 'failed-over' && (
          <Button
            onClick={onFailback}
            disabled={!status.healthChecks.primary}
            className="flex-1"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Failback to Primary
          </Button>
        )}

        {isFailingOver && (
          <Button
            variant="outline"
            className="flex-1"
            disabled
          >
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Failing Over...
          </Button>
        )}
      </div>
    </Card>
  );
};

const DrillCard: React.FC<{
  drill: DRDrill;
  onStart?: (drill: DRDrill) => void;
  onCancel?: (id: string) => void;
}> = ({ drill, onStart, onCancel }) => {
  const getStatusIcon = (status: DRDrill['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'running':
        return <Activity className="h-4 w-4 text-blue-600 animate-pulse" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'scheduled':
        return <Calendar className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTypeIcon = (type: DRDrill['type']) => {
    switch (type) {
      case 'backup-restore':
        return <RotateCcw className="h-4 w-4" />;
      case 'failover':
        return <Zap className="h-4 w-4" />;
      case 'full-dr':
        return <Shield className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const isUpcoming = new Date(drill.scheduledTime) > new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              {getTypeIcon(drill.type)}
            </div>
            <div>
              <h3 className="font-medium text-sm">{drill.name}</h3>
              <p className="text-xs text-gray-500">
                {drill.status === 'completed' 
                  ? format(new Date(drill.completedTime!), 'PPpp')
                  : format(new Date(drill.scheduledTime), 'PPpp')
                }
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(drill.status)}
            <Badge variant="outline" className="text-xs capitalize">
              {drill.type.replace('-', ' ')}
            </Badge>
          </div>
        </div>

        {drill.results && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-500">RTO:</span>
                <div className="font-medium">{drill.results.rto}m</div>
              </div>
              <div>
                <span className="text-gray-500">RPO:</span>
                <div className="font-medium">{drill.results.rpo}m</div>
              </div>
            </div>
            
            {drill.results.issues.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-red-600">
                  {drill.results.issues.length} issue(s) found
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {isUpcoming 
              ? `In ${formatDistanceToNow(new Date(drill.scheduledTime))}`
              : formatDistanceToNow(new Date(drill.scheduledTime), { addSuffix: true })
            }
          </div>
          
          <div className="flex items-center space-x-1">
            {drill.status === 'scheduled' && isUpcoming && onStart && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onStart(drill)}
                className="h-7 px-2 text-green-600 hover:text-green-700"
              >
                <Play className="h-3 w-3" />
              </Button>
            )}
            
            {drill.status === 'running' && onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCancel(drill.id)}
                className="h-7 px-2 text-red-600 hover:text-red-700"
              >
                <Square className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

const RestoreDialog: React.FC<{
  restorePoint: RestorePoint | BackupStatus | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: RestoreFormData) => void;
}> = ({ restorePoint, isOpen, onClose, onConfirm }) => {
  const [formData, setFormData] = useState<RestoreFormData>({
    restorePointId: '',
    targetEnvironment: 'staging',
    confirmationText: '',
  });

  useEffect(() => {
    if (restorePoint) {
      setFormData(prev => ({
        ...prev,
        restorePointId: restorePoint.id,
        confirmationText: '',
      }));
    }
  }, [restorePoint]);

  const confirmationRequired = `RESTORE ${restorePoint?.id?.toUpperCase()}`;
  const isConfirmationValid = formData.confirmationText === confirmationRequired;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isConfirmationValid) {
      onConfirm(formData);
      onClose();
    }
  };

  if (!isOpen || !restorePoint) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="max-w-md mx-auto p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 rounded-lg bg-red-100 text-red-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Confirm Restore</h2>
            <p className="text-sm text-gray-600">This action cannot be undone</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">Restore Point Details</h3>
            <div className="space-y-2 text-sm">
              <div><strong>ID:</strong> {restorePoint.id}</div>
              {'name' in restorePoint ? (
                <div><strong>Name:</strong> {restorePoint.name}</div>
              ) : (
                <div><strong>Type:</strong> {restorePoint.type}</div>
              )}
              {'timestamp' in restorePoint ? (
                <div><strong>Created:</strong> {format(new Date(restorePoint.timestamp), 'PPpp')}</div>
              ) : (
                <div><strong>Created:</strong> {format(new Date(restorePoint.startTime), 'PPpp')}</div>
              )}
              {'size' in restorePoint && <div><strong>Size:</strong> {restorePoint.size}</div>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Environment *
            </label>
            <select
              value={formData.targetEnvironment}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                targetEnvironment: e.target.value as any 
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            >
              <option value="development">Development</option>
              <option value="staging">Staging</option>
              <option value="production">Production</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirmation *
            </label>
            <Input
              type="text"
              value={formData.confirmationText}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                confirmationText: e.target.value 
              }))}
              placeholder={`Type "${confirmationRequired}" to confirm`}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Type <code className="bg-gray-100 px-1 rounded">{confirmationRequired}</code> to confirm
            </p>
          </div>

          {formData.targetEnvironment === 'production' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-800 font-medium">
                  WARNING: Restoring to production will overwrite current data
                </span>
              </div>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <Button
              type="submit"
              disabled={!isConfirmationValid}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restore
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
};

// ===== MAIN COMPONENT =====

export const DisasterRecoveryControlCenter: React.FC = () => {
  const {
    backupStatus,
    restorePoints,
    failoverStatus,
    metrics,
    drills,
    isRestoring,
    updateBackupStatus,
    updateRestorePoints,
    updateFailoverStatus,
    addDrill,
    setRestoring,
  } = useDRStore();

  const { triggerBackup, initiateFailover } = useDRWebSocket();

  const [selectedRestore, setSelectedRestore] = useState<RestorePoint | BackupStatus | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  // Initialize with mock data
  useEffect(() => {
    updateBackupStatus(mockBackups);
    updateRestorePoints(mockRestorePoints);
    mockDrills.forEach(drill => {
      if (!drills.find(d => d.id === drill.id)) {
        addDrill(drill);
      }
    });
  }, []);

  // Handle backup operations
  const handleTriggerBackup = async (type: 'database' | 'files' | 'full') => {
    triggerBackup(type);
    
    // Add new backup to list
    const newBackup: BackupStatus = {
      id: `backup-${Date.now()}`,
      type,
      status: 'running',
      startTime: new Date().toISOString(),
      size: 'Calculating...',
      location: `s3://backups/${type}/${format(new Date(), 'yyyy-MM-dd-HH-mm')}/`,
      retentionDate: new Date(Date.now() + 30 * 24 * 3600000).toISOString(),
    };

    updateBackupStatus([newBackup, ...backupStatus]);
  };

  // Handle restore operations
  const handleRestore = (item: RestorePoint | BackupStatus) => {
    setSelectedRestore(item);
    setShowRestoreDialog(true);
  };

  const handleConfirmRestore = async (data: RestoreFormData) => {
    setRestoring(true);
    
    // Simulate restore process
    setTimeout(() => {
      setRestoring(false);
    }, 5000);
  };

  // Handle failover operations
  const handleInitiateFailover = async () => {
    initiateFailover();
    
    updateFailoverStatus({
      ...failoverStatus,
      status: 'failing-over',
    });

    // Simulate failover completion
    setTimeout(() => {
      updateFailoverStatus({
        ...failoverStatus,
        status: 'failed-over',
        lastFailover: new Date().toISOString(),
      });
    }, 10000);
  };

  const handleFailback = async () => {
    updateFailoverStatus({
      ...failoverStatus,
      status: 'failing-over',
    });

    // Simulate failback completion
    setTimeout(() => {
      updateFailoverStatus({
        ...failoverStatus,
        status: 'active',
      });
    }, 8000);
  };

  const stats = useMemo(() => {
    const completedBackups = backupStatus.filter(b => b.status === 'completed').length;
    const runningBackups = backupStatus.filter(b => b.status === 'running').length;
    const verifiedRestorePoints = restorePoints.filter(p => p.integrity === 'verified').length;
    const upcomingDrills = drills.filter(d => d.status === 'scheduled' && new Date(d.scheduledTime) > new Date()).length;

    return {
      completedBackups,
      runningBackups,
      verifiedRestorePoints,
      upcomingDrills,
    };
  }, [backupStatus, restorePoints, drills]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Disaster Recovery Control Center</h1>
          <p className="text-gray-600 mt-1">
            Backup management, restoration controls, and failover operations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => handleTriggerBackup('database')}
            variant="outline"
            size="sm"
          >
            <Database className="h-4 w-4 mr-2" />
            DB Backup
          </Button>
          <Button
            onClick={() => handleTriggerBackup('full')}
            size="sm"
          >
            <HardDrive className="h-4 w-4 mr-2" />
            Full Backup
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Completed Backups</p>
              <p className="text-xl font-semibold">{stats.completedBackups}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Backups</p>
              <p className="text-xl font-semibold">{stats.runningBackups}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Restore Points</p>
              <p className="text-xl font-semibold">{stats.verifiedRestorePoints}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Upcoming Drills</p>
              <p className="text-xl font-semibold">{stats.upcomingDrills}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* RTO/RPO Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-red-100 text-red-600">
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">RTO Target</p>
              <p className="text-xl font-semibold">{metrics.rto}m</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">RPO Target</p>
              <p className="text-xl font-semibold">{metrics.rpo}m</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Backup Frequency</p>
              <p className="text-xl font-semibold capitalize">{metrics.backupFrequency}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-teal-100 text-teal-600">
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Replication Lag</p>
              <p className="text-xl font-semibold">{metrics.replicationLag}s</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Failover Control */}
      <FailoverPanel
        status={failoverStatus}
        onInitiateFailover={handleInitiateFailover}
        onFailback={handleFailback}
      />

      {/* Backup Status */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Backups ({backupStatus.length})</h2>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => handleTriggerBackup('files')}
              variant="outline"
              size="sm"
            >
              <FileText className="h-4 w-4 mr-2" />
              Files
            </Button>
            <Button
              onClick={() => handleTriggerBackup('configuration')}
              variant="outline"
              size="sm"
            >
              <Settings className="h-4 w-4 mr-2" />
              Config
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {backupStatus.map((backup) => (
              <BackupCard
                key={backup.id}
                backup={backup}
                onRestore={handleRestore}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Restore Points */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Restore Points ({restorePoints.length})</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {restorePoints.map((point) => (
              <RestorePointCard
                key={point.id}
                point={point}
                onRestore={handleRestore}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* DR Drills */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">DR Drills ({drills.length})</h2>
          <Button
            variant="outline"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Schedule Drill
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {drills.map((drill) => (
              <DrillCard
                key={drill.id}
                drill={drill}
                onStart={() => {}}
                onCancel={() => {}}
              />
            ))}
          </AnimatePresence>
        </div>

        {drills.length === 0 && (
          <Card className="p-8 text-center">
            <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No DR drills scheduled
            </h3>
            <p className="text-gray-600 mb-4">
              Schedule disaster recovery drills to test your backup and failover procedures
            </p>
            <Button>
              <Calendar className="h-4 w-4 mr-2" />
              Schedule First Drill
            </Button>
          </Card>
        )}
      </div>

      {/* Restore Dialog */}
      <RestoreDialog
        restorePoint={selectedRestore}
        isOpen={showRestoreDialog}
        onClose={() => {
          setShowRestoreDialog(false);
          setSelectedRestore(null);
        }}
        onConfirm={handleConfirmRestore}
      />

      {/* Restoring Overlay */}
      {isRestoring && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <Card className="p-6 max-w-md mx-auto">
            <div className="text-center">
              <div className="p-4 rounded-lg bg-blue-100 text-blue-600 mx-auto w-fit mb-4">
                <RefreshCw className="h-8 w-8 animate-spin" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Restoring Data</h3>
              <p className="text-gray-600 mb-4">
                Please wait while we restore your data. This may take several minutes.
              </p>
              <Progress value={45} className="h-2" />
              <p className="text-xs text-gray-500 mt-2">45% complete</p>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default DisasterRecoveryControlCenter;