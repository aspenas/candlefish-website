import React, { useState, useMemo } from 'react';
import { ApolloProvider } from '@apollo/client';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';

// Apollo Client
import { apolloClient } from '../lib/apollo-client';

// Components
import { RealTimeThreatDashboard } from '../components/threat-detection/RealTimeThreatDashboard';
import { SecurityAnalyticsDashboard } from '../components/analytics/SecurityAnalyticsDashboard';
import { IncidentResponseWorkflow } from '../components/incident-response/IncidentResponseWorkflow';

// Types
import { SecurityEvent, Severity } from '../types/security';

// Mock data generation for demonstration
const generateMockEvents = (count: number = 100): SecurityEvent[] => {
  const eventTypes = [
    'AUTHENTICATION_FAILURE',
    'UNAUTHORIZED_ACCESS',
    'MALWARE_DETECTED',
    'SUSPICIOUS_ACTIVITY',
    'DATA_EXFILTRATION',
    'CONFIGURATION_CHANGE',
    'VULNERABILITY_DISCOVERED',
    'COMPLIANCE_VIOLATION'
  ];

  const severities: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const sources = ['Firewall', 'IDS', 'Antivirus', 'SIEM', 'Endpoint Detection', 'Network Monitor'];
  
  const countries = ['United States', 'China', 'Russia', 'Germany', 'United Kingdom', 'Brazil'];
  const regions = ['North America', 'Asia', 'Europe', 'South America'];
  
  const events: SecurityEvent[] = [];
  
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const source = sources[Math.floor(Math.random() * sources.length)];
    const country = countries[Math.floor(Math.random() * countries.length)];
    
    events.push({
      id: `event-${i + 1}`,
      timestamp: timestamp.toISOString(),
      type: eventType,
      severity,
      title: `${eventType.replace(/_/g, ' ')} Alert #${i + 1}`,
      description: `Security event detected: ${eventType.replace(/_/g, ' ').toLowerCase()} from ${source}`,
      source,
      sourceIP: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      destinationIP: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      sourcePort: Math.floor(Math.random() * 65535),
      destinationPort: Math.floor(Math.random() * 65535),
      protocol: ['TCP', 'UDP', 'HTTP', 'HTTPS'][Math.floor(Math.random() * 4)],
      cefFields: {
        version: '0',
        deviceVendor: 'Security Vendor',
        deviceProduct: source,
        deviceVersion: '1.0',
        signatureID: `SIG-${Math.floor(Math.random() * 10000)}`,
        name: eventType,
        severity: severity,
        extension: 'Additional CEF data'
      },
      assetId: `asset-${Math.floor(Math.random() * 10) + 1}`,
      asset: {
        id: `asset-${Math.floor(Math.random() * 10) + 1}`,
        name: `Server-${Math.floor(Math.random() * 100) + 1}`,
        type: 'SERVER',
        environment: 'PRODUCTION',
        platform: 'AWS',
        securityLevel: 'HIGH',
        healthStatus: 'HEALTHY',
        createdAt: timestamp.toISOString(),
        updatedAt: timestamp.toISOString(),
        vulnerabilities: [],
        alerts: [],
        tags: ['server', 'production'],
        lastHealthCheck: timestamp.toISOString()
      },
      userId: `user-${Math.floor(Math.random() * 5) + 1}`,
      user: {
        id: `user-${Math.floor(Math.random() * 5) + 1}`,
        name: `User ${Math.floor(Math.random() * 100) + 1}`,
        email: `user${Math.floor(Math.random() * 100) + 1}@company.com`,
        role: 'USER'
      },
      metadata: {
        ruleId: `RULE-${Math.floor(Math.random() * 1000)}`,
        confidence: Math.floor(Math.random() * 40) + 60,
        category: 'Security',
        subcategory: eventType
      },
      status: 'NEW',
      tags: ['automated', source.toLowerCase()],
      threatLevel: severity === 'CRITICAL' ? 'CRITICAL' : 
                   severity === 'HIGH' ? 'HIGH' :
                   severity === 'MEDIUM' ? 'MEDIUM' : 'LOW',
      mitreAttackTactics: Math.random() > 0.5 ? [{
        tacticId: `TA000${Math.floor(Math.random() * 9) + 1}`,
        tacticName: ['Initial Access', 'Execution', 'Persistence', 'Defense Evasion'][Math.floor(Math.random() * 4)],
        techniques: [{
          techniqueId: `T1${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
          techniqueName: 'Sample Technique',
          subTechniques: []
        }]
      }] : undefined,
      indicators: Math.random() > 0.7 ? [
        {
          type: ['IP', 'DOMAIN', 'HASH', 'EMAIL'][Math.floor(Math.random() * 4)],
          value: `indicator-${Math.floor(Math.random() * 10000)}`,
          confidence: Math.floor(Math.random() * 40) + 60,
          source: source,
          firstSeen: timestamp.toISOString(),
          lastSeen: timestamp.toISOString()
        }
      ] : undefined,
      geoLocation: {
        country: country,
        region: regions[Math.floor(Math.random() * regions.length)],
        city: `City ${Math.floor(Math.random() * 100)}`,
        latitude: (Math.random() - 0.5) * 180,
        longitude: (Math.random() - 0.5) * 360,
        organization: `ISP ${Math.floor(Math.random() * 10)}`,
        isp: `ISP Provider ${Math.floor(Math.random() * 5)}`
      },
      riskScore: Math.floor(Math.random() * 50) + (severity === 'CRITICAL' ? 50 : severity === 'HIGH' ? 30 : 10),
      falsePositiveProbability: Math.random() * 0.3
    });
  }
  
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const ThreatDetectionDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics' | 'incidents'>('dashboard');
  
  // Generate mock events for demonstration
  const mockEvents = useMemo(() => generateMockEvents(150), []);

  return (
    <ApolloProvider client={apolloClient}>
      <div className="min-h-screen bg-gray-900 text-white">
        <Helmet>
          <title>Threat Detection - Security Dashboard</title>
          <meta name="description" content="Real-time threat detection and security analytics dashboard" />
        </Helmet>

        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-white">
                  Candlefish Security Dashboard
                </h1>
              </div>
              
              <nav className="flex space-x-8">
                {[
                  { id: 'dashboard', label: 'Threat Detection' },
                  { id: 'analytics', label: 'Security Analytics' },
                  { id: 'incidents', label: 'Incident Response' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <RealTimeThreatDashboard 
                  events={mockEvents}
                  autoRefresh={true}
                  maxEvents={1000}
                />
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <SecurityAnalyticsDashboard 
                  events={mockEvents}
                  timeRange="24h"
                />
              </motion.div>
            )}

            {activeTab === 'incidents' && (
              <motion.div
                key="incidents"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <IncidentResponseWorkflow 
                  events={mockEvents}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="bg-gray-800 border-t border-gray-700 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-sm">
                © 2024 Candlefish AI. Advanced threat detection and security operations platform.
              </p>
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <span>Events: {mockEvents.length}</span>
                <span>•</span>
                <span>Last Update: {new Date().toLocaleString()}</span>
                <span>•</span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>System Operational</span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </ApolloProvider>
  );
};

export default ThreatDetectionDashboard;