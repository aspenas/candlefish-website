import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, XCircle, AlertTriangle, FileText, TrendingUp, TrendingDown } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Components
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Progress } from '../ui/Progress';

// Types
import { SecurityEvent } from '../../types/security';

interface ComplianceDashboardsProps {
  events: SecurityEvent[];
  className?: string;
}

interface ComplianceFramework {
  id: string;
  name: string;
  version: string;
  description: string;
  overallScore: number;
  trend: number;
  requirements: ComplianceRequirement[];
  lastAssessment: string;
  nextAssessment: string;
  criticalFindings: number;
  status: 'COMPLIANT' | 'PARTIALLY_COMPLIANT' | 'NON_COMPLIANT' | 'NOT_ASSESSED';
}

interface ComplianceRequirement {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIALLY_COMPLIANT' | 'NOT_ASSESSED';
  score: number;
  evidence: string[];
  gaps: string[];
  recommendations: string[];
  lastReviewed: string;
  owner: string;
  relatedEvents: SecurityEvent[];
}

// Generate compliance data based on security events
const generateComplianceData = (events: SecurityEvent[]): ComplianceFramework[] => {
  const frameworks: ComplianceFramework[] = [
    {
      id: 'iso-27001',
      name: 'ISO 27001',
      version: '2013',
      description: 'Information Security Management Systems',
      overallScore: 0,
      trend: 0,
      requirements: [],
      lastAssessment: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      nextAssessment: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      criticalFindings: 0,
      status: 'PARTIALLY_COMPLIANT'
    },
    {
      id: 'nist-csf',
      name: 'NIST Cybersecurity Framework',
      version: '1.1',
      description: 'Framework for improving cybersecurity posture',
      overallScore: 0,
      trend: 0,
      requirements: [],
      lastAssessment: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      nextAssessment: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toISOString(),
      criticalFindings: 0,
      status: 'PARTIALLY_COMPLIANT'
    },
    {
      id: 'soc2',
      name: 'SOC 2 Type II',
      version: '2017',
      description: 'Service Organization Control 2',
      overallScore: 0,
      trend: 0,
      requirements: [],
      lastAssessment: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      nextAssessment: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      criticalFindings: 0,
      status: 'COMPLIANT'
    },
    {
      id: 'gdpr',
      name: 'GDPR',
      version: '2018',
      description: 'General Data Protection Regulation',
      overallScore: 0,
      trend: 0,
      requirements: [],
      lastAssessment: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      nextAssessment: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
      criticalFindings: 0,
      status: 'PARTIALLY_COMPLIANT'
    }
  ];

  // Generate requirements for each framework
  frameworks.forEach(framework => {
    framework.requirements = generateRequirements(framework.id, events);
    
    // Calculate overall score and status
    const totalScore = framework.requirements.reduce((sum, req) => sum + req.score, 0);
    framework.overallScore = framework.requirements.length > 0 ? totalScore / framework.requirements.length : 0;
    
    // Determine status based on score
    if (framework.overallScore >= 90) framework.status = 'COMPLIANT';
    else if (framework.overallScore >= 70) framework.status = 'PARTIALLY_COMPLIANT';
    else if (framework.overallScore >= 50) framework.status = 'NON_COMPLIANT';
    else framework.status = 'NOT_ASSESSED';
    
    // Count critical findings
    framework.criticalFindings = framework.requirements.filter(req => 
      req.status === 'NON_COMPLIANT' && req.score < 50
    ).length;
    
    // Calculate trend (simplified)
    framework.trend = Math.random() * 10 - 5; // Random for demo
  });

  return frameworks;
};

const generateRequirements = (frameworkId: string, events: SecurityEvent[]): ComplianceRequirement[] => {
  const requirementTemplates: Record<string, Array<{
    title: string;
    description: string;
    category: string;
  }>> = {
    'iso-27001': [
      {
        title: 'Information Security Policy',
        description: 'Establish and maintain information security policies',
        category: 'Governance'
      },
      {
        title: 'Access Control Management',
        description: 'Control access to information and information processing facilities',
        category: 'Access Control'
      },
      {
        title: 'Incident Management',
        description: 'Ensure consistent and effective approach to incident management',
        category: 'Incident Response'
      },
      {
        title: 'Risk Assessment',
        description: 'Conduct regular information security risk assessments',
        category: 'Risk Management'
      },
      {
        title: 'Security Monitoring',
        description: 'Monitor information systems for security events',
        category: 'Monitoring'
      }
    ],
    'nist-csf': [
      {
        title: 'Asset Management',
        description: 'Identify and manage organizational assets',
        category: 'Identify'
      },
      {
        title: 'Access Controls',
        description: 'Implement appropriate access controls',
        category: 'Protect'
      },
      {
        title: 'Anomaly Detection',
        description: 'Detect cybersecurity events and anomalies',
        category: 'Detect'
      },
      {
        title: 'Response Planning',
        description: 'Develop and implement incident response capabilities',
        category: 'Respond'
      },
      {
        title: 'Recovery Planning',
        description: 'Develop and implement recovery capabilities',
        category: 'Recover'
      }
    ],
    'soc2': [
      {
        title: 'Security Principle',
        description: 'Protect against unauthorized access',
        category: 'Security'
      },
      {
        title: 'Availability Principle',
        description: 'Ensure system availability as agreed',
        category: 'Availability'
      },
      {
        title: 'Processing Integrity',
        description: 'Ensure complete, valid, accurate, timely processing',
        category: 'Processing Integrity'
      },
      {
        title: 'Confidentiality Principle',
        description: 'Protect confidential information',
        category: 'Confidentiality'
      },
      {
        title: 'Privacy Principle',
        description: 'Collect, use, retain, disclose personal information appropriately',
        category: 'Privacy'
      }
    ],
    'gdpr': [
      {
        title: 'Data Protection by Design',
        description: 'Implement data protection by design and by default',
        category: 'Design'
      },
      {
        title: 'Data Subject Rights',
        description: 'Enable data subject rights (access, rectification, erasure)',
        category: 'Rights'
      },
      {
        title: 'Data Breach Notification',
        description: 'Report data breaches within 72 hours',
        category: 'Breach Management'
      },
      {
        title: 'Data Protection Impact Assessment',
        description: 'Conduct DPIA for high-risk processing',
        category: 'Assessment'
      },
      {
        title: 'Record of Processing',
        description: 'Maintain records of processing activities',
        category: 'Documentation'
      }
    ]
  };

  const templates = requirementTemplates[frameworkId] || [];
  
  return templates.map((template, index) => {
    // Filter events relevant to this requirement
    const relatedEvents = events.filter(event => {
      const eventType = event.type.toLowerCase();
      const requirementTitle = template.title.toLowerCase();
      
      // Simple matching logic
      if (requirementTitle.includes('access') && eventType.includes('access')) return true;
      if (requirementTitle.includes('incident') && eventType.includes('malware')) return true;
      if (requirementTitle.includes('monitoring') && eventType.includes('suspicious')) return true;
      if (requirementTitle.includes('breach') && eventType.includes('data')) return true;
      
      return Math.random() > 0.7; // Some random assignment for demo
    }).slice(0, 5);

    // Calculate score based on events and framework
    let score = 85; // Base score
    
    // Reduce score for related security events
    relatedEvents.forEach(event => {
      if (event.severity === 'CRITICAL') score -= 10;
      else if (event.severity === 'HIGH') score -= 5;
      else if (event.severity === 'MEDIUM') score -= 2;
    });
    
    score = Math.max(0, Math.min(100, score));
    
    // Determine status
    let status: ComplianceRequirement['status'];
    if (score >= 90) status = 'COMPLIANT';
    else if (score >= 70) status = 'PARTIALLY_COMPLIANT';
    else if (score >= 50) status = 'NON_COMPLIANT';
    else status = 'NOT_ASSESSED';

    // Generate gaps and recommendations based on score
    const gaps: string[] = [];
    const recommendations: string[] = [];
    
    if (score < 90) {
      gaps.push('Documentation incomplete');
      recommendations.push('Update documentation and policies');
    }
    
    if (score < 70) {
      gaps.push('Control implementation gaps');
      recommendations.push('Implement missing security controls');
    }
    
    if (relatedEvents.length > 3) {
      gaps.push('High number of related security events');
      recommendations.push('Enhance monitoring and response capabilities');
    }

    return {
      id: `${frameworkId}-req-${index + 1}`,
      title: template.title,
      description: template.description,
      category: template.category,
      status,
      score,
      evidence: [
        'Policy documentation review',
        'Technical configuration audit',
        'Process walkthrough'
      ],
      gaps,
      recommendations,
      lastReviewed: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      owner: ['Security Team', 'IT Operations', 'Compliance Officer'][Math.floor(Math.random() * 3)],
      relatedEvents
    };
  });
};

const STATUS_COLORS = {
  COMPLIANT: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  PARTIALLY_COMPLIANT: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  NON_COMPLIANT: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  NOT_ASSESSED: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' }
};

const STATUS_ICONS = {
  COMPLIANT: CheckCircle,
  PARTIALLY_COMPLIANT: AlertTriangle,
  NON_COMPLIANT: XCircle,
  NOT_ASSESSED: FileText
};

export const ComplianceDashboards: React.FC<ComplianceDashboardsProps> = ({
  events,
  className = ''
}) => {
  const [selectedFramework, setSelectedFramework] = useState<string>('iso-27001');
  
  const frameworks = useMemo(() => generateComplianceData(events), [events]);
  
  const selectedFrameworkData = useMemo(() => 
    frameworks.find(f => f.id === selectedFramework),
    [frameworks, selectedFramework]
  );

  // Aggregate compliance statistics
  const complianceStats = useMemo(() => {
    const totalRequirements = frameworks.reduce((sum, f) => sum + f.requirements.length, 0);
    const compliantRequirements = frameworks.reduce((sum, f) => 
      sum + f.requirements.filter(r => r.status === 'COMPLIANT').length, 0
    );
    
    const statusCounts = frameworks.reduce((acc, f) => {
      f.requirements.forEach(req => {
        acc[req.status] = (acc[req.status] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRequirements,
      compliantRequirements,
      complianceRate: totalRequirements > 0 ? (compliantRequirements / totalRequirements) * 100 : 0,
      statusDistribution: Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
        percentage: (count / totalRequirements) * 100
      }))
    };
  }, [frameworks]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Framework Selection */}
      <div className=\"flex items-center space-x-4 overflow-x-auto\">
        {frameworks.map(framework => (
          <Button
            key={framework.id}
            variant={selectedFramework === framework.id ? 'default' : 'outline'}
            size=\"sm\"
            onClick={() => setSelectedFramework(framework.id)}
            className=\"flex items-center space-x-2 whitespace-nowrap\"
          >
            <Shield className=\"w-4 h-4\" />
            <span>{framework.name}</span>
            <Badge 
              className={`ml-2 text-xs ${STATUS_COLORS[framework.status].bg} ${STATUS_COLORS[framework.status].text} ${STATUS_COLORS[framework.status].border}`}
            >
              {framework.overallScore.toFixed(0)}%
            </Badge>
          </Button>
        ))}
      </div>

      {/* Compliance Overview */}
      <div className=\"grid grid-cols-1 md:grid-cols-4 gap-4\">
        <Card className=\"p-4\">
          <div className=\"flex items-center justify-between mb-2\">
            <span className=\"text-sm text-gray-400\">Overall Compliance</span>
            <CheckCircle className=\"w-4 h-4 text-green-400\" />
          </div>
          <div className=\"text-2xl font-bold text-white\">
            {complianceStats.complianceRate.toFixed(1)}%
          </div>
          <div className=\"text-xs text-gray-400\">
            {complianceStats.compliantRequirements} of {complianceStats.totalRequirements} requirements
          </div>
        </Card>

        <Card className=\"p-4\">
          <div className=\"flex items-center justify-between mb-2\">
            <span className=\"text-sm text-gray-400\">Active Frameworks</span>
            <FileText className=\"w-4 h-4 text-blue-400\" />
          </div>
          <div className=\"text-2xl font-bold text-white\">{frameworks.length}</div>
          <div className=\"text-xs text-gray-400\">compliance frameworks</div>
        </Card>

        <Card className=\"p-4\">
          <div className=\"flex items-center justify-between mb-2\">
            <span className=\"text-sm text-gray-400\">Critical Findings</span>
            <AlertTriangle className=\"w-4 h-4 text-red-400\" />
          </div>
          <div className=\"text-2xl font-bold text-white\">
            {frameworks.reduce((sum, f) => sum + f.criticalFindings, 0)}
          </div>
          <div className=\"text-xs text-gray-400\">require attention</div>
        </Card>

        <Card className=\"p-4\">
          <div className=\"flex items-center justify-between mb-2\">
            <span className=\"text-sm text-gray-400\">Next Assessment</span>
            <FileText className=\"w-4 h-4 text-orange-400\" />
          </div>
          <div className=\"text-2xl font-bold text-white\">
            {Math.min(...frameworks.map(f => 
              Math.ceil((new Date(f.nextAssessment).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
            ))}
          </div>
          <div className=\"text-xs text-gray-400\">days</div>
        </Card>
      </div>

      {selectedFrameworkData && (
        <div className=\"grid grid-cols-1 lg:grid-cols-3 gap-6\">
          {/* Framework Details */}
          <Card className=\"p-6 lg:col-span-2\">
            <div className=\"flex items-center justify-between mb-6\">
              <div>
                <h3 className=\"text-lg font-semibold text-white flex items-center\">
                  <Shield className=\"w-5 h-5 mr-2\" />
                  {selectedFrameworkData.name}
                </h3>
                <p className=\"text-sm text-gray-400 mt-1\">
                  {selectedFrameworkData.description} • Version {selectedFrameworkData.version}
                </p>
              </div>
              
              <div className=\"flex items-center space-x-4\">
                <div className=\"text-right\">
                  <div className=\"text-2xl font-bold text-white\">
                    {selectedFrameworkData.overallScore.toFixed(0)}%
                  </div>
                  <div className={`text-xs flex items-center ${
                    selectedFrameworkData.trend > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {selectedFrameworkData.trend > 0 ? (
                      <TrendingUp className=\"w-3 h-3 mr-1\" />
                    ) : (
                      <TrendingDown className=\"w-3 h-3 mr-1\" />
                    )}
                    {Math.abs(selectedFrameworkData.trend).toFixed(1)}%
                  </div>
                </div>
                <Badge 
                  className={`${STATUS_COLORS[selectedFrameworkData.status].bg} ${STATUS_COLORS[selectedFrameworkData.status].text} ${STATUS_COLORS[selectedFrameworkData.status].border}`}
                >
                  {selectedFrameworkData.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>

            {/* Progress Bar */}
            <div className=\"mb-6\">
              <div className=\"flex justify-between items-center mb-2\">
                <span className=\"text-sm text-gray-400\">Compliance Progress</span>
                <span className=\"text-sm text-white font-medium\">
                  {selectedFrameworkData.requirements.filter(r => r.status === 'COMPLIANT').length} / {selectedFrameworkData.requirements.length}
                </span>
              </div>
              <Progress 
                value={selectedFrameworkData.overallScore} 
                max={100} 
                className=\"h-3\"
              />
            </div>

            {/* Requirements List */}
            <div className=\"space-y-3\">
              <h4 className=\"font-medium text-white mb-4\">Requirements ({selectedFrameworkData.requirements.length})</h4>
              {selectedFrameworkData.requirements.map((requirement, index) => {
                const StatusIcon = STATUS_ICONS[requirement.status];
                return (
                  <motion.div
                    key={requirement.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className=\"p-4 bg-gray-800 rounded-lg border border-gray-700\"
                  >
                    <div className=\"flex items-start justify-between mb-2\">
                      <div className=\"flex items-center space-x-3\">
                        <StatusIcon className={`w-5 h-5 ${STATUS_COLORS[requirement.status].text}`} />
                        <div>
                          <h5 className=\"font-medium text-white\">{requirement.title}</h5>
                          <p className=\"text-sm text-gray-400\">{requirement.description}</p>
                        </div>
                      </div>
                      
                      <div className=\"text-right\">
                        <div className=\"text-lg font-bold text-white\">{requirement.score}%</div>
                        <Badge variant=\"outline\" className=\"text-xs mt-1\">
                          {requirement.category}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Progress bar for individual requirement */}
                    <div className=\"mb-3\">
                      <Progress value={requirement.score} max={100} className=\"h-2\" />
                    </div>
                    
                    <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-400\">
                      <div>
                        <span className=\"font-medium\">Owner:</span>
                        <span className=\"ml-1 text-gray-300\">{requirement.owner}</span>
                      </div>
                      <div>
                        <span className=\"font-medium\">Last Review:</span>
                        <span className=\"ml-1 text-gray-300\">
                          {new Date(requirement.lastReviewed).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className=\"font-medium\">Related Events:</span>
                        <span className=\"ml-1 text-gray-300\">{requirement.relatedEvents.length}</span>
                      </div>
                    </div>
                    
                    {/* Gaps and Recommendations */}
                    {(requirement.gaps.length > 0 || requirement.recommendations.length > 0) && (
                      <div className=\"mt-3 pt-3 border-t border-gray-700\">
                        {requirement.gaps.length > 0 && (
                          <div className=\"mb-2\">
                            <span className=\"text-xs font-medium text-red-400\">Gaps:</span>
                            <div className=\"text-xs text-gray-300 mt-1\">
                              {requirement.gaps[0]}
                            </div>
                          </div>
                        )}
                        {requirement.recommendations.length > 0 && (
                          <div>
                            <span className=\"text-xs font-medium text-blue-400\">Recommendation:</span>
                            <div className=\"text-xs text-gray-300 mt-1\">
                              {requirement.recommendations[0]}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </Card>

          {/* Compliance Status Distribution */}
          <Card className=\"p-6\">
            <h3 className=\"text-lg font-semibold text-white mb-6\">
              Status Distribution
            </h3>
            
            <div className=\"h-64 mb-6\">
              <ResponsiveContainer width=\"100%\" height=\"100%\">
                <PieChart>
                  <Pie
                    data={complianceStats.statusDistribution}
                    cx=\"50%\"
                    cy=\"50%\"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey=\"count\"
                  >
                    {complianceStats.statusDistribution.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS]?.bg || '#6B7280'} 
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ payload }) => {
                      if (payload && payload[0]) {
                        const data = payload[0].payload;
                        return (
                          <div className=\"bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg\">
                            <p className=\"text-white font-medium\">{data.status.replace('_', ' ')}</p>
                            <p className=\"text-gray-300\">{data.count} requirements</p>
                            <p className=\"text-gray-400 text-sm\">{data.percentage.toFixed(1)}%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className=\"space-y-3\">
              {complianceStats.statusDistribution.map((item) => {
                const status = item.status as keyof typeof STATUS_COLORS;
                const StatusIcon = STATUS_ICONS[status];
                return (
                  <div key={item.status} className=\"flex items-center justify-between\">
                    <div className=\"flex items-center space-x-2\">
                      <StatusIcon className={`w-4 h-4 ${STATUS_COLORS[status]?.text || 'text-gray-400'}`} />
                      <span className=\"text-sm text-gray-300\">
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className=\"flex items-center space-x-2\">
                      <span className=\"text-sm text-white font-medium\">{item.count}</span>
                      <span className=\"text-xs text-gray-400\">
                        ({item.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Framework Summary */}
            <div className=\"mt-6 pt-6 border-t border-gray-700\">
              <h4 className=\"font-medium text-white mb-4\">All Frameworks</h4>
              <div className=\"space-y-3\">
                {frameworks.map((framework) => (
                  <div key={framework.id} className=\"flex items-center justify-between\">
                    <div>
                      <div className=\"text-sm font-medium text-white\">{framework.name}</div>
                      <div className=\"text-xs text-gray-400\">{framework.requirements.length} requirements</div>
                    </div>
                    <div className=\"text-right\">
                      <div className=\"text-sm font-bold text-white\">{framework.overallScore.toFixed(0)}%</div>
                      <Badge 
                        className={`text-xs ${STATUS_COLORS[framework.status].bg} ${STATUS_COLORS[framework.status].text} ${STATUS_COLORS[framework.status].border}`}
                        variant=\"outline\"
                      >
                        {framework.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ComplianceDashboards;