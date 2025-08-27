import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp, Shield, Target } from 'lucide-react';

// Components
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

// Types
import { SecurityEvent } from '../../types/security';

interface RiskMatricesProps {
  events: SecurityEvent[];
  timeRange: string;
  className?: string;
}

interface RiskItem {
  id: string;
  name: string;
  category: string;
  probability: number;
  impact: number;
  riskScore: number;
  trend: number;
  mitigations: string[];
  events: SecurityEvent[];
}

const RISK_LEVELS = {
  LOW: { min: 0, max: 25, color: 'bg-green-500', textColor: 'text-green-400' },
  MEDIUM: { min: 25, max: 50, color: 'bg-yellow-500', textColor: 'text-yellow-400' },
  HIGH: { min: 50, max: 75, color: 'bg-orange-500', textColor: 'text-orange-400' },
  CRITICAL: { min: 75, max: 100, color: 'bg-red-500', textColor: 'text-red-400' }
};

const getRiskLevel = (score: number): keyof typeof RISK_LEVELS => {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MEDIUM';
  return 'LOW';
};

// Generate risk assessments from events
const generateRiskAssessments = (events: SecurityEvent[]): RiskItem[] => {
  const riskMap = new Map<string, RiskItem>();
  
  // Categorize events by type and calculate risk
  const eventsByType = events.reduce((acc, event) => {
    const category = event.type.replace(/_/g, ' ');
    if (!acc[category]) acc[category] = [];
    acc[category].push(event);
    return acc;
  }, {} as Record<string, SecurityEvent[]>);

  Object.entries(eventsByType).forEach(([category, categoryEvents]) => {
    const criticalEvents = categoryEvents.filter(e => e.severity === 'CRITICAL').length;
    const highEvents = categoryEvents.filter(e => e.severity === 'HIGH').length;
    const totalEvents = categoryEvents.length;
    
    // Calculate probability based on frequency and severity
    const probability = Math.min(100, (totalEvents / events.length) * 100 + (criticalEvents * 5));
    
    // Calculate impact based on severity distribution
    const impact = Math.min(100, 
      (criticalEvents * 40 + highEvents * 25 + (totalEvents - criticalEvents - highEvents) * 10) / totalEvents
    );
    
    const riskScore = (probability * impact) / 100;
    
    // Calculate trend (simplified)
    const recentEvents = categoryEvents.filter(e => 
      new Date(e.timestamp).getTime() > Date.now() - (24 * 60 * 60 * 1000)
    ).length;
    const trend = recentEvents > (totalEvents / 7) ? 10 : -5; // Up if more than daily average
    
    riskMap.set(category, {
      id: category.toLowerCase().replace(/\s+/g, '-'),
      name: category,
      category: 'Security',
      probability,
      impact,
      riskScore,
      trend,
      mitigations: generateMitigations(category),
      events: categoryEvents
    });
  });

  // Add some additional business risks
  riskMap.set('data-breach', {
    id: 'data-breach',
    name: 'Data Breach',
    category: 'Business',
    probability: 30,
    impact: 90,
    riskScore: 27,
    trend: 5,
    mitigations: ['Data encryption', 'Access controls', 'DLP solutions'],
    events: events.filter(e => e.type.includes('DATA') || e.type.includes('ACCESS'))
  });

  riskMap.set('system-compromise', {
    id: 'system-compromise',
    name: 'System Compromise',
    category: 'Technical',
    probability: 40,
    impact: 80,
    riskScore: 32,
    trend: -2,
    mitigations: ['Endpoint protection', 'Network segmentation', 'Patch management'],
    events: events.filter(e => e.type.includes('MALWARE') || e.type.includes('UNAUTHORIZED'))
  });

  return Array.from(riskMap.values()).sort((a, b) => b.riskScore - a.riskScore);
};

const generateMitigations = (category: string): string[] => {
  const mitigationMap: Record<string, string[]> = {
    'AUTHENTICATION FAILURE': ['MFA implementation', 'Account lockout policies', 'Strong password requirements'],
    'UNAUTHORIZED ACCESS': ['Access controls', 'Privileged access management', 'Zero trust architecture'],
    'MALWARE DETECTED': ['Antivirus updates', 'Email filtering', 'User training'],
    'SUSPICIOUS ACTIVITY': ['Behavioral analytics', 'Monitoring enhancement', 'Incident response'],
    'DATA EXFILTRATION': ['Data loss prevention', 'Network monitoring', 'Encryption'],
    'CONFIGURATION CHANGE': ['Change management', 'Configuration baselines', 'Automated compliance'],
    'VULNERABILITY DISCOVERED': ['Patch management', 'Vulnerability scanning', 'Risk assessment'],
    'COMPLIANCE VIOLATION': ['Policy updates', 'Training programs', 'Audit procedures']
  };
  
  return mitigationMap[category] || ['Risk assessment', 'Control implementation', 'Monitoring'];
};

export const RiskMatrices: React.FC<RiskMatricesProps> = ({
  events,
  timeRange,
  className = ''
}) => {
  const riskAssessments = useMemo(() => generateRiskAssessments(events), [events]);

  // Create risk matrix data
  const riskMatrix = useMemo(() => {
    const matrix: Array<Array<RiskItem[]>> = Array(5).fill(null).map(() => Array(5).fill(null).map(() => []));
    
    riskAssessments.forEach(risk => {
      const probBucket = Math.min(4, Math.floor(risk.probability / 20));
      const impactBucket = Math.min(4, Math.floor(risk.impact / 20));
      matrix[4 - impactBucket][probBucket].push(risk); // Invert impact for display (high at top)
    });
    
    return matrix;
  }, [riskAssessments]);

  const getCellColor = (probability: number, impact: number): string => {
    const score = (probability * impact) / 100;
    const level = getRiskLevel(score);
    return RISK_LEVELS[level].color;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Risk Summary Cards */}
      <div className=\"grid grid-cols-1 md:grid-cols-4 gap-4\">
        {Object.entries(RISK_LEVELS).map(([level, config]) => {
          const count = riskAssessments.filter(r => getRiskLevel(r.riskScore) === level).length;
          return (
            <Card key={level} className=\"p-4\">
              <div className=\"flex items-center justify-between mb-2\">
                <span className={`text-sm font-medium ${config.textColor}`}>{level} RISK</span>
                <div className={`w-3 h-3 rounded-full ${config.color}`} />
              </div>
              <div className=\"text-2xl font-bold text-white\">{count}</div>
              <div className=\"text-xs text-gray-400\">items</div>
            </Card>
          );
        })}
      </div>

      <div className=\"grid grid-cols-1 lg:grid-cols-3 gap-6\">
        {/* Risk Matrix */}
        <Card className=\"p-6 lg:col-span-2\">
          <div className=\"flex items-center justify-between mb-6\">
            <h3 className=\"text-lg font-semibold text-white flex items-center\">
              <AlertTriangle className=\"w-5 h-5 mr-2\" />
              Risk Matrix
            </h3>
            <div className=\"text-sm text-gray-400\">
              Probability vs Impact Analysis
            </div>
          </div>

          <div className=\"relative\">
            {/* Y-axis label (Impact) */}
            <div className=\"absolute -left-12 top-1/2 transform -translate-y-1/2 -rotate-90 text-sm text-gray-400 font-medium\">
              IMPACT
            </div>
            
            {/* X-axis label (Probability) */}
            <div className=\"text-center mt-4 mb-4 text-sm text-gray-400 font-medium\">
              PROBABILITY
            </div>

            {/* Matrix Grid */}
            <div className=\"grid grid-cols-5 gap-1 mb-4\">
              {riskMatrix.map((row, rowIndex) =>
                row.map((cell, colIndex) => {
                  const probability = (colIndex + 1) * 20;
                  const impact = (5 - rowIndex) * 20;
                  const cellScore = (probability * impact) / 100;
                  const level = getRiskLevel(cellScore);
                  
                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={`aspect-square ${RISK_LEVELS[level].color} bg-opacity-20 border border-gray-600 rounded flex items-center justify-center cursor-pointer hover:bg-opacity-40 transition-all`}
                      title={`Probability: ${probability}%, Impact: ${impact}%, Score: ${cellScore.toFixed(1)}`}
                    >
                      {cell.length > 0 && (
                        <div className={`w-6 h-6 ${RISK_LEVELS[level].color} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                          {cell.length}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Axis labels */}
            <div className=\"flex justify-between text-xs text-gray-400 mb-2\">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
              <span>Very High</span>
              <span>Extreme</span>
            </div>
            
            <div className=\"absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-400\">
              <span>Extreme</span>
              <span>Very High</span>
              <span>High</span>
              <span>Medium</span>
              <span>Low</span>
            </div>
          </div>
        </Card>

        {/* Top Risks */}
        <Card className=\"p-6\">
          <h3 className=\"text-lg font-semibold text-white mb-6 flex items-center\">
            <Target className=\"w-5 h-5 mr-2\" />
            Top Risks
          </h3>
          
          <div className=\"space-y-4\">
            {riskAssessments.slice(0, 8).map((risk, index) => {
              const level = getRiskLevel(risk.riskScore);
              return (
                <motion.div
                  key={risk.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className=\"p-3 bg-gray-800 rounded-lg border border-gray-700\"
                >
                  <div className=\"flex items-center justify-between mb-2\">
                    <h4 className=\"font-medium text-white text-sm\">{risk.name}</h4>
                    <div className=\"flex items-center space-x-2\">
                      <Badge 
                        className={`text-xs ${RISK_LEVELS[level].textColor} ${RISK_LEVELS[level].color} bg-opacity-20`}
                        variant=\"outline\"
                      >
                        {level}
                      </Badge>
                      {risk.trend > 0 && (
                        <TrendingUp className=\"w-4 h-4 text-red-400\" />
                      )}
                    </div>
                  </div>
                  
                  <div className=\"grid grid-cols-2 gap-4 text-xs text-gray-400 mb-2\">
                    <div>
                      <span>Probability:</span>
                      <span className=\"ml-1 text-white font-medium\">{risk.probability.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span>Impact:</span>
                      <span className=\"ml-1 text-white font-medium\">{risk.impact.toFixed(1)}%</span>
                    </div>
                  </div>
                  
                  <div className=\"text-xs text-gray-400 mb-2\">
                    <span>Risk Score:</span>
                    <span className=\"ml-1 text-white font-bold\">{risk.riskScore.toFixed(1)}</span>
                    <span className=\"ml-2\">Events: {risk.events.length}</span>
                  </div>
                  
                  {/* Risk Score Bar */}
                  <div className=\"w-full bg-gray-700 rounded-full h-2 mb-2\">
                    <div 
                      className={`h-2 rounded-full ${RISK_LEVELS[level].color}`}
                      style={{ width: `${risk.riskScore}%` }}
                    />
                  </div>
                  
                  {/* Top Mitigation */}
                  {risk.mitigations.length > 0 && (
                    <div className=\"text-xs text-gray-400\">
                      <span className=\"font-medium\">Key Mitigation:</span>
                      <span className=\"ml-1 text-gray-300\">{risk.mitigations[0]}</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Risk Trends */}
      <Card className=\"p-6\">
        <h3 className=\"text-lg font-semibold text-white mb-6 flex items-center\">
          <TrendingUp className=\"w-5 h-5 mr-2\" />
          Risk Trends & Mitigation Status
        </h3>
        
        <div className=\"overflow-x-auto\">
          <table className=\"w-full text-sm\">
            <thead>
              <tr className=\"border-b border-gray-700\">
                <th className=\"text-left py-3 px-4 text-gray-400\">Risk</th>
                <th className=\"text-left py-3 px-4 text-gray-400\">Category</th>
                <th className=\"text-left py-3 px-4 text-gray-400\">Score</th>
                <th className=\"text-left py-3 px-4 text-gray-400\">Trend</th>
                <th className=\"text-left py-3 px-4 text-gray-400\">Events</th>
                <th className=\"text-left py-3 px-4 text-gray-400\">Mitigations</th>
              </tr>
            </thead>
            <tbody>
              {riskAssessments.slice(0, 10).map((risk) => {
                const level = getRiskLevel(risk.riskScore);
                return (
                  <tr key={risk.id} className=\"border-b border-gray-800 hover:bg-gray-800/50\">
                    <td className=\"py-3 px-4\">
                      <div className=\"font-medium text-white\">{risk.name}</div>
                    </td>
                    <td className=\"py-3 px-4\">
                      <Badge variant=\"outline\" className=\"text-xs\">
                        {risk.category}
                      </Badge>
                    </td>
                    <td className=\"py-3 px-4\">
                      <div className=\"flex items-center space-x-2\">
                        <span className={`font-bold ${RISK_LEVELS[level].textColor}`}>
                          {risk.riskScore.toFixed(1)}
                        </span>
                        <Badge 
                          className={`text-xs ${RISK_LEVELS[level].textColor} ${RISK_LEVELS[level].color} bg-opacity-20`}
                          variant=\"outline\"
                        >
                          {level}
                        </Badge>
                      </div>
                    </td>
                    <td className=\"py-3 px-4\">
                      <div className={`flex items-center space-x-1 ${
                        risk.trend > 0 ? 'text-red-400' : 'text-green-400'
                      }`}>
                        <TrendingUp className={`w-4 h-4 ${risk.trend < 0 ? 'rotate-180' : ''}`} />
                        <span className=\"text-xs font-medium\">{Math.abs(risk.trend)}%</span>
                      </div>
                    </td>
                    <td className=\"py-3 px-4 text-white font-medium\">
                      {risk.events.length}
                    </td>
                    <td className=\"py-3 px-4\">
                      <div className=\"flex flex-wrap gap-1\">
                        {risk.mitigations.slice(0, 2).map((mitigation, idx) => (
                          <Badge key={idx} variant=\"outline\" className=\"text-xs\">
                            {mitigation}
                          </Badge>
                        ))}
                        {risk.mitigations.length > 2 && (
                          <Badge variant=\"outline\" className=\"text-xs text-gray-400\">
                            +{risk.mitigations.length - 2}
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default RiskMatrices;