import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertCircle, 
  Clock, 
  Users, 
  CheckCircle, 
  XCircle, 
  Play, 
  Pause,
  ArrowRight,
  Plus,
  MessageSquare,
  FileText,
  Target,
  Zap
} from 'lucide-react';

// Components
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { CaseManagementBoard } from './CaseManagementBoard';
import { PlaybookExecutionInterface } from './PlaybookExecutionInterface';
import { AlertTriageQueue } from './AlertTriageQueue';
import { AutomatedResponseControls } from './AutomatedResponseControls';
import { InvestigationTimeline } from './InvestigationTimeline';

// GraphQL
import { GET_SECURITY_CASES, GET_SECURITY_PLAYBOOKS } from '../../graphql/queries/threat-detection.graphql';

// Types
import { SecurityEvent, Severity } from '../../types/security';

interface IncidentResponseWorkflowProps {
  events: SecurityEvent[];
  className?: string;
}

interface SecurityCase {
  id: string;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  severity: Severity;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  tags: string[];
  category: string;
  subcategory: string;
  affectedAssets: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  relatedEvents: SecurityEvent[];
  evidence: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    hash: string;
    uploadedBy: {
      id: string;
      name: string;
    };
    uploadedAt: string;
    metadata: Record<string, any>;
  }>;
  timeline: Array<{
    id: string;
    timestamp: string;
    action: string;
    description: string;
    userId: string;
    userName: string;
    attachments?: string[];
  }>;
  playbooks: Array<{
    id: string;
    name: string;
    version: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    progress: number;
    steps: Array<{
      id: string;
      name: string;
      status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
      assignedTo?: string;
      completedAt?: string;
      notes?: string;
    }>;
  }>;
  metrics: {
    timeToDetection?: number;
    timeToContainment?: number;
    timeToResolution?: number;
    escalationCount: number;
    falsePositiveFlag: boolean;
  };
  sla: {
    responseTime: number;
    resolutionTime: number;
    breached: boolean;
  };
}

// Generate mock cases from events
const generateSecurityCases = (events: SecurityEvent[]): SecurityCase[] => {
  const criticalEvents = events.filter(e => e.severity === 'CRITICAL');
  const highEvents = events.filter(e => e.severity === 'HIGH');
  
  const cases: SecurityCase[] = [];
  
  // Create cases from critical events
  criticalEvents.slice(0, 3).forEach((event, index) => {
    cases.push({
      id: `case-${event.id}`,
      title: `Critical Incident: ${event.title}`,
      description: event.description,
      status: ['OPEN', 'IN_PROGRESS', 'RESOLVED'][index % 3] as any,
      priority: 'CRITICAL',
      severity: event.severity,
      assignedTo: {
        id: 'analyst-1',
        name: 'Security Analyst',
        email: 'analyst@company.com'
      },
      createdBy: {
        id: 'system',
        name: 'Security System',
        email: 'system@company.com'
      },
      createdAt: event.timestamp,
      updatedAt: event.timestamp,
      dueDate: new Date(new Date(event.timestamp).getTime() + 4 * 60 * 60 * 1000).toISOString(),
      tags: event.tags || ['incident', 'critical'],
      category: 'Security Incident',
      subcategory: event.type.replace(/_/g, ' '),
      affectedAssets: event.asset ? [{
        id: event.asset.id,
        name: event.asset.name,
        type: event.asset.type
      }] : [],
      relatedEvents: [event],
      evidence: [],
      timeline: [
        {
          id: `timeline-${event.id}-1`,
          timestamp: event.timestamp,
          action: 'CASE_CREATED',
          description: 'Case automatically created from security event',
          userId: 'system',
          userName: 'Security System'
        }
      ],
      playbooks: [
        {
          id: `playbook-${event.id}`,
          name: 'Critical Incident Response',
          version: '1.0',
          status: index === 0 ? 'RUNNING' : index === 1 ? 'COMPLETED' : 'PENDING',
          progress: index === 0 ? 60 : index === 1 ? 100 : 0,
          steps: [
            {
              id: 'step-1',
              name: 'Initial Assessment',
              status: 'COMPLETED'
            },
            {
              id: 'step-2',
              name: 'Containment',
              status: index >= 1 ? 'COMPLETED' : 'RUNNING'
            },
            {
              id: 'step-3',
              name: 'Eradication',
              status: index === 1 ? 'COMPLETED' : 'PENDING'
            },
            {
              id: 'step-4',
              name: 'Recovery',
              status: 'PENDING'
            }
          ]
        }
      ],
      metrics: {
        timeToDetection: 5,
        timeToContainment: index === 0 ? undefined : 30,
        timeToResolution: index === 1 ? 120 : undefined,
        escalationCount: 0,
        falsePositiveFlag: false
      },
      sla: {
        responseTime: 4,
        resolutionTime: 24,
        breached: false
      }
    });
  });

  return cases;
};

const PRIORITY_COLORS = {
  LOW: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  MEDIUM: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  HIGH: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/20'
};

const STATUS_COLORS = {
  OPEN: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  IN_PROGRESS: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  RESOLVED: 'text-green-400 bg-green-500/10 border-green-500/20',
  CLOSED: 'text-gray-400 bg-gray-500/10 border-gray-500/20'
};

export const IncidentResponseWorkflow: React.FC<IncidentResponseWorkflowProps> = ({
  events,
  className = ''
}) => {
  const [activeView, setActiveView] = useState<'overview' | 'cases' | 'playbooks' | 'triage' | 'automation' | 'timeline'>('overview');
  const [selectedCase, setSelectedCase] = useState<SecurityCase | null>(null);

  // Generate security cases
  const securityCases = useMemo(() => generateSecurityCases(events), [events]);

  // GraphQL queries
  const { data: casesData, loading: casesLoading } = useQuery(GET_SECURITY_CASES, {
    variables: {
      filter: {},
      pagination: { limit: 50, offset: 0 },
      sort: { field: 'createdAt', direction: 'DESC' }
    },
    pollInterval: 30000
  });

  const { data: playbooksData, loading: playbooksLoading } = useQuery(GET_SECURITY_PLAYBOOKS, {
    variables: {
      filter: { isActive: true },
      pagination: { limit: 20, offset: 0 }
    }
  });

  // Statistics
  const stats = useMemo(() => {
    const cases = casesData?.securityCases?.items || securityCases;
    
    const openCases = cases.filter((c: SecurityCase) => c.status === 'OPEN').length;
    const inProgressCases = cases.filter((c: SecurityCase) => c.status === 'IN_PROGRESS').length;
    const criticalCases = cases.filter((c: SecurityCase) => c.priority === 'CRITICAL').length;
    const breachedSLA = cases.filter((c: SecurityCase) => c.sla.breached).length;
    
    const avgResponseTime = cases.reduce((sum: number, c: SecurityCase) => {
      return sum + (c.metrics.timeToDetection || 0);
    }, 0) / cases.length || 0;
    
    const avgResolutionTime = cases.reduce((sum: number, c: SecurityCase) => {
      return sum + (c.metrics.timeToResolution || 0);
    }, 0) / cases.filter((c: SecurityCase) => c.metrics.timeToResolution).length || 0;

    return {
      totalCases: cases.length,
      openCases,
      inProgressCases,
      criticalCases,
      breachedSLA,
      avgResponseTime,
      avgResolutionTime
    };
  }, [casesData, securityCases]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className=\"flex items-center justify-between\">
        <div>
          <h2 className=\"text-2xl font-bold text-white flex items-center\">
            <AlertCircle className=\"w-6 h-6 mr-2\" />
            Incident Response
          </h2>
          <p className=\"text-gray-400 text-sm mt-1\">
            Comprehensive incident response and case management
          </p>
        </div>

        <div className=\"flex items-center space-x-4\">
          <Button variant=\"outline\" size=\"sm\">
            <Plus className=\"w-4 h-4 mr-1\" />
            New Case
          </Button>
          <Button size=\"sm\">
            <Play className=\"w-4 h-4 mr-1\" />
            Run Playbook
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className=\"grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4\">
        <Card className=\"p-4\">
          <div className=\"flex items-center justify-between mb-2\">
            <span className=\"text-sm text-gray-400\">Total Cases</span>
            <FileText className=\"w-4 h-4 text-blue-400\" />
          </div>
          <div className=\"text-2xl font-bold text-white\">{stats.totalCases}</div>
        </Card>

        <Card className=\"p-4\">
          <div className=\"flex items-center justify-between mb-2\">
            <span className=\"text-sm text-gray-400\">Open Cases</span>
            <AlertCircle className=\"w-4 h-4 text-orange-400\" />
          </div>
          <div className=\"text-2xl font-bold text-white\">{stats.openCases}</div>
        </Card>

        <Card className=\"p-4\">
          <div className=\"flex items-center justify-between mb-2\">
            <span className=\"text-sm text-gray-400\">In Progress</span>
            <Clock className=\"w-4 h-4 text-blue-400\" />
          </div>
          <div className=\"text-2xl font-bold text-white\">{stats.inProgressCases}</div>
        </Card>

        <Card className=\"p-4\">
          <div className=\"flex items-center justify-between mb-2\">
            <span className=\"text-sm text-gray-400\">Critical</span>
            <XCircle className=\"w-4 h-4 text-red-400\" />
          </div>
          <div className=\"text-2xl font-bold text-white\">{stats.criticalCases}</div>
        </Card>

        <Card className=\"p-4\">
          <div className=\"flex items-center justify-between mb-2\">
            <span className=\"text-sm text-gray-400\">Avg Response</span>
            <Clock className=\"w-4 h-4 text-green-400\" />
          </div>
          <div className=\"text-2xl font-bold text-white\">
            {stats.avgResponseTime.toFixed(0)}m
          </div>
        </Card>

        <Card className=\"p-4\">
          <div className=\"flex items-center justify-between mb-2\">
            <span className=\"text-sm text-gray-400\">SLA Breached</span>
            <AlertCircle className=\"w-4 h-4 text-red-400\" />
          </div>
          <div className=\"text-2xl font-bold text-white\">{stats.breachedSLA}</div>
        </Card>
      </div>

      {/* Navigation */}
      <div className=\"flex items-center space-x-1 bg-gray-800 rounded-lg p-1 overflow-x-auto\">
        {[
          { key: 'overview', label: 'Overview', icon: FileText },
          { key: 'cases', label: 'Case Management', icon: AlertCircle },
          { key: 'playbooks', label: 'Playbooks', icon: Play },
          { key: 'triage', label: 'Alert Triage', icon: Target },
          { key: 'automation', label: 'Automation', icon: Zap },
          { key: 'timeline', label: 'Timeline', icon: Clock }
        ].map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={activeView === key ? 'default' : 'ghost'}
            size=\"sm\"
            onClick={() => setActiveView(key as any)}
            className=\"flex items-center space-x-2 whitespace-nowrap\"
          >
            <Icon className=\"w-4 h-4\" />
            <span>{label}</span>
          </Button>
        ))}
      </div>

      {/* Content */}
      <div className=\"space-y-6\">
        {activeView === 'overview' && (
          <div className=\"grid grid-cols-1 lg:grid-cols-3 gap-6\">
            {/* Recent Cases */}
            <Card className=\"p-6 lg:col-span-2\">
              <h3 className=\"text-lg font-semibold text-white mb-6\">Recent Cases</h3>
              
              <div className=\"space-y-4\">
                {securityCases.slice(0, 5).map((securityCase, index) => (
                  <motion.div
                    key={securityCase.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                      selectedCase?.id === securityCase.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
                    }`}
                    onClick={() => setSelectedCase(securityCase)}
                  >
                    <div className=\"flex items-start justify-between mb-3\">
                      <div className=\"flex items-center space-x-3\">
                        <Badge 
                          className={PRIORITY_COLORS[securityCase.priority]}
                          variant=\"outline\"
                        >
                          {securityCase.priority}
                        </Badge>
                        <Badge 
                          className={STATUS_COLORS[securityCase.status]}
                          variant=\"outline\"
                        >
                          {securityCase.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <div className=\"text-xs text-gray-400\">
                        {new Date(securityCase.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <h4 className=\"font-semibold text-white mb-2\">{securityCase.title}</h4>
                    <p className=\"text-sm text-gray-300 mb-3\">{securityCase.description}</p>

                    <div className=\"flex items-center justify-between text-sm\">
                      <div className=\"flex items-center space-x-4 text-gray-400\">
                        {securityCase.assignedTo && (
                          <div className=\"flex items-center space-x-1\">
                            <Users className=\"w-4 h-4\" />
                            <span>{securityCase.assignedTo.name}</span>
                          </div>
                        )}
                        <div className=\"flex items-center space-x-1\">
                          <Clock className=\"w-4 h-4\" />
                          <span>{securityCase.relatedEvents.length} events</span>
                        </div>
                      </div>
                      
                      {securityCase.playbooks.length > 0 && (
                        <div className=\"flex items-center space-x-2\">
                          <div className=\"flex items-center space-x-1 text-gray-400\">
                            <Play className=\"w-4 h-4\" />
                            <span>{securityCase.playbooks[0].progress}%</span>
                          </div>
                          <div className=\"w-16 bg-gray-700 rounded-full h-2\">
                            <div 
                              className=\"bg-blue-500 h-2 rounded-full transition-all duration-300\"
                              style={{ width: `${securityCase.playbooks[0].progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>

            {/* Active Playbooks */}
            <Card className=\"p-6\">
              <h3 className=\"text-lg font-semibold text-white mb-6\">Active Playbooks</h3>
              
              <div className=\"space-y-4\">
                {securityCases
                  .filter(c => c.playbooks.some(p => p.status === 'RUNNING'))
                  .slice(0, 4)
                  .map((securityCase, index) => {
                    const activePlaybook = securityCase.playbooks.find(p => p.status === 'RUNNING');
                    if (!activePlaybook) return null;

                    return (
                      <motion.div
                        key={securityCase.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className=\"p-3 bg-gray-800 rounded-lg border border-gray-700\"
                      >
                        <div className=\"flex items-center justify-between mb-2\">
                          <span className=\"font-medium text-white text-sm\">
                            {activePlaybook.name}
                          </span>
                          <Badge variant=\"outline\" className=\"text-xs\">
                            {activePlaybook.status}
                          </Badge>
                        </div>
                        
                        <div className=\"text-xs text-gray-400 mb-2\">{securityCase.title}</div>
                        
                        <div className=\"flex items-center justify-between\">
                          <span className=\"text-xs text-gray-400\">
                            Step: {activePlaybook.steps.findIndex(s => s.status === 'RUNNING') + 1}/{activePlaybook.steps.length}
                          </span>
                          <span className=\"text-xs text-white font-medium\">
                            {activePlaybook.progress}%
                          </span>
                        </div>
                        
                        <div className=\"w-full bg-gray-700 rounded-full h-1 mt-2\">
                          <div 
                            className=\"bg-blue-500 h-1 rounded-full transition-all duration-300\"
                            style={{ width: `${activePlaybook.progress}%` }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            </Card>
          </div>
        )}

        {activeView === 'cases' && (
          <CaseManagementBoard 
            cases={casesData?.securityCases?.items || securityCases}
            onCaseSelect={setSelectedCase}
            selectedCase={selectedCase}
          />
        )}

        {activeView === 'playbooks' && (
          <PlaybookExecutionInterface 
            playbooks={playbooksData?.securityPlaybooks?.items || []}
            cases={securityCases}
          />
        )}

        {activeView === 'triage' && (
          <AlertTriageQueue events={events} />
        )}

        {activeView === 'automation' && (
          <AutomatedResponseControls 
            events={events}
            playbooks={playbooksData?.securityPlaybooks?.items || []}
          />
        )}

        {activeView === 'timeline' && selectedCase && (
          <InvestigationTimeline 
            case={selectedCase}
            events={selectedCase.relatedEvents}
          />
        )}
      </div>
    </div>
  );
};

export default IncidentResponseWorkflow;