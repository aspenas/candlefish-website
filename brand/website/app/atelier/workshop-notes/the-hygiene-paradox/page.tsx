'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { AtelierDesignProvider, SpatialText, ReadingPlane } from '../../../../components/atelier/AtelierDesignSystem';
import { AmbientSystem } from '../../../../components/atelier/AmbientSystem';
import { DynamicBackground } from '../../../../components/atelier/DynamicBackground';
import { FocusManager } from '../../../../components/atelier/FocusManager';
import { ReadingMode } from '../../../../components/atelier/ReadingMode';
import '../../../../styles/atelier-enhancements.css';
import '../../../../styles/atelier-refined.css';

// Log component initialization
if (typeof window !== 'undefined') {
  console.log('Hygiene Paradox Workshop initializing...');
}

interface SecurityPosture {
  domain: string;
  hygieneScore: number;
  practicalityScore: number;
  complianceRate: number;
  userFrustration: number;
  bypassAttempts: number;
  actualSecurity: number; // actual vs theoretical security
  paradoxIntensity: number; // how much hygiene hurts security
}

interface DeletionEvent {
  timestamp: Date;
  itemType: string;
  reason: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  userId: string;
  context: string;
  hygieneMotivation: boolean;
}

interface BoundaryViolation {
  timestamp: Date;
  violationType: string;
  severity: number;
  detectionMethod: string;
  context: string;
  justification: string;
  approved: boolean;
  hygieneRuleViolated: string;
  businessImpact: number;
}

interface HygieneRule {
  rule: string;
  category: 'security' | 'compliance' | 'process' | 'data';
  theoreticalBenefit: number;
  practicalCompliance: number;
  violationFrequency: number;
  businessFriction: number;
  securityValue: number; // actual security benefit
  paradoxScore: number; // how counterproductive it is
}

interface MetricData {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  paradox?: number; // 0-1, how paradoxical this metric is
}

export default function HygieneParadoxWorkshop() {
  console.log('HygieneParadoxWorkshop rendering...');
  
  const [securityPostures, setSecurityPostures] = useState<SecurityPosture[]>([
    {
      domain: 'Password Policies',
      hygieneScore: 0.94,
      practicalityScore: 0.23,
      complianceRate: 0.31,
      userFrustration: 0.89,
      bypassAttempts: 47,
      actualSecurity: 0.42,
      paradoxIntensity: 0.85
    },
    {
      domain: 'Data Classification',
      hygieneScore: 0.87,
      practicalityScore: 0.45,
      complianceRate: 0.56,
      userFrustration: 0.73,
      bypassAttempts: 23,
      actualSecurity: 0.68,
      paradoxIntensity: 0.62
    },
    {
      domain: 'Access Controls',
      hygieneScore: 0.91,
      practicalityScore: 0.34,
      complianceRate: 0.41,
      userFrustration: 0.82,
      bypassAttempts: 38,
      actualSecurity: 0.51,
      paradoxIntensity: 0.78
    },
    {
      domain: 'Change Management',
      hygieneScore: 0.83,
      practicalityScore: 0.67,
      complianceRate: 0.74,
      userFrustration: 0.45,
      bypassAttempts: 12,
      actualSecurity: 0.79,
      paradoxIntensity: 0.34
    }
  ]);

  const [deletionEvents, setDeletionEvents] = useState<DeletionEvent[]>([
    {
      timestamp: new Date(Date.now() - 180000),
      itemType: 'Temporary files',
      reason: 'Disk space compliance',
      impact: 'medium',
      recoverable: false,
      userId: 'system',
      context: 'Automated cleanup',
      hygieneMotivation: true
    },
    {
      timestamp: new Date(Date.now() - 420000),
      itemType: 'Development database',
      reason: 'Data retention policy',
      impact: 'high',
      recoverable: true,
      userId: 'admin-sarah',
      context: 'Quarterly cleanup',
      hygieneMotivation: true
    },
    {
      timestamp: new Date(Date.now() - 720000),
      itemType: 'Meeting recordings',
      reason: 'Privacy compliance',
      impact: 'critical',
      recoverable: false,
      userId: 'compliance-bot',
      context: '90-day auto-delete',
      hygieneMotivation: true
    }
  ]);

  const [boundaryViolations, setBoundaryViolations] = useState<BoundaryViolation[]>([
    {
      timestamp: new Date(Date.now() - 300000),
      violationType: 'Shared credentials',
      severity: 0.76,
      detectionMethod: 'Log analysis',
      context: 'Emergency system access',
      justification: 'Production outage - needed immediate access',
      approved: true,
      hygieneRuleViolated: 'Individual account requirement',
      businessImpact: 0.89
    },
    {
      timestamp: new Date(Date.now() - 540000),
      violationType: 'Unencrypted data transfer',
      severity: 0.84,
      detectionMethod: 'Network monitoring',
      context: 'Partner integration',
      justification: 'Legacy system compatibility',
      approved: false,
      hygieneRuleViolated: 'Data encryption in transit',
      businessImpact: 0.67
    },
    {
      timestamp: new Date(Date.now() - 840000),
      violationType: 'Unapproved software installation',
      severity: 0.45,
      detectionMethod: 'Endpoint monitoring',
      context: 'Developer productivity tool',
      justification: 'Standard tool not available',
      approved: true,
      hygieneRuleViolated: 'Software approval process',
      businessImpact: 0.23
    }
  ]);

  const [hygieneRules, setHygieneRules] = useState<HygieneRule[]>([
    {
      rule: 'Passwords must be 16+ characters with symbols',
      category: 'security',
      theoreticalBenefit: 0.91,
      practicalCompliance: 0.28,
      violationFrequency: 0.73,
      businessFriction: 0.87,
      securityValue: 0.34,
      paradoxScore: 0.89
    },
    {
      rule: 'All data must be classified before storage',
      category: 'compliance',
      theoreticalBenefit: 0.84,
      practicalCompliance: 0.52,
      violationFrequency: 0.48,
      businessFriction: 0.61,
      securityValue: 0.71,
      paradoxScore: 0.43
    },
    {
      rule: 'Software changes require 3-level approval',
      category: 'process',
      theoreticalBenefit: 0.76,
      practicalCompliance: 0.43,
      violationFrequency: 0.67,
      businessFriction: 0.93,
      securityValue: 0.58,
      paradoxScore: 0.78
    },
    {
      rule: 'Personal devices prohibited on network',
      category: 'security',
      theoreticalBenefit: 0.88,
      practicalCompliance: 0.31,
      violationFrequency: 0.84,
      businessFriction: 0.89,
      securityValue: 0.29,
      paradoxScore: 0.91
    }
  ]);

  const [liveMetrics, setLiveMetrics] = useState<MetricData[]>([
    { label: 'Hygiene Score', value: '87%', trend: 'up', paradox: 0.73 },
    { label: 'Deletions Today', value: '1,247', trend: 'up', paradox: 0.68 },
    { label: 'Boundary Violations', value: '34 active', trend: 'down', paradox: 0.82 },
    { label: 'Actual Security', value: '54%', trend: 'down', paradox: 0.91 }
  ]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: scrollRef });
  const progressScale = useTransform(scrollYProgress, [0, 1], [0, 100]);

  useEffect(() => {
    // Simulate ongoing security posture changes
    const postureInterval = setInterval(() => {
      setSecurityPostures(prev => prev.map(posture => ({
        ...posture,
        hygieneScore: Math.max(0.5, Math.min(0.98, posture.hygieneScore + (Math.random() * 0.04 - 0.02))),
        practicalityScore: Math.max(0.1, Math.min(0.8, posture.practicalityScore + (Math.random() * 0.06 - 0.03))),
        complianceRate: Math.max(0.1, Math.min(0.9, posture.complianceRate + (Math.random() * 0.08 - 0.04))),
        userFrustration: Math.max(0.2, Math.min(0.95, posture.userFrustration + (Math.random() * 0.05 - 0.025))),
        bypassAttempts: Math.max(0, posture.bypassAttempts + Math.floor(Math.random() * 6 - 3)),
        actualSecurity: Math.max(0.1, Math.min(0.9, posture.actualSecurity + (Math.random() * 0.06 - 0.03)))
      })));
    }, 4000);

    // Generate new deletion events periodically
    const deletionInterval = setInterval(() => {
      if (Math.random() < 0.2) {
        const itemTypes = ['Log files', 'Cache data', 'Temporary uploads', 'Old backups', 'User sessions'];
        const reasons = ['Storage quota', 'Retention policy', 'Privacy compliance', 'Security cleanup', 'Performance optimization'];
        const impacts: ('low' | 'medium' | 'high' | 'critical')[] = ['low', 'medium', 'high', 'critical'];
        const userIds = ['system', 'admin-sarah', 'compliance-bot', 'cleanup-service', 'security-scanner'];
        
        const newDeletion: DeletionEvent = {
          timestamp: new Date(),
          itemType: itemTypes[Math.floor(Math.random() * itemTypes.length)],
          reason: reasons[Math.floor(Math.random() * reasons.length)],
          impact: impacts[Math.floor(Math.random() * impacts.length)],
          recoverable: Math.random() > 0.6,
          userId: userIds[Math.floor(Math.random() * userIds.length)],
          context: Math.random() > 0.5 ? 'Automated cleanup' : 'Manual review',
          hygieneMotivation: Math.random() > 0.2
        };

        setDeletionEvents(prev => [newDeletion, ...prev.slice(0, 9)]);
      }
    }, 5000);

    // Generate boundary violations occasionally
    const violationInterval = setInterval(() => {
      if (Math.random() < 0.15) {
        const violationTypes = ['Shared access', 'Unencrypted transfer', 'Unapproved software', 'Policy bypass', 'Emergency override'];
        const detectionMethods = ['Log analysis', 'Network monitoring', 'User report', 'Audit scan', 'Automated alert'];
        const contexts = ['Production emergency', 'Business requirement', 'Technical limitation', 'Time constraint', 'Resource unavailability'];
        const rules = ['Password policy', 'Encryption requirement', 'Approval process', 'Access controls', 'Data classification'];
        
        const newViolation: BoundaryViolation = {
          timestamp: new Date(),
          violationType: violationTypes[Math.floor(Math.random() * violationTypes.length)],
          severity: Math.random() * 0.8 + 0.2,
          detectionMethod: detectionMethods[Math.floor(Math.random() * detectionMethods.length)],
          context: contexts[Math.floor(Math.random() * contexts.length)],
          justification: 'Business necessity override',
          approved: Math.random() > 0.4,
          hygieneRuleViolated: rules[Math.floor(Math.random() * rules.length)],
          businessImpact: Math.random() * 0.8 + 0.2
        };

        setBoundaryViolations(prev => [newViolation, ...prev.slice(0, 9)]);
      }
    }, 7000);

    // Update hygiene rule effectiveness
    const rulesInterval = setInterval(() => {
      setHygieneRules(prev => prev.map(rule => ({
        ...rule,
        practicalCompliance: Math.max(0.1, Math.min(0.9, rule.practicalCompliance + (Math.random() * 0.06 - 0.03))),
        violationFrequency: Math.max(0.1, Math.min(0.95, rule.violationFrequency + (Math.random() * 0.05 - 0.025))),
        businessFriction: Math.max(0.2, Math.min(0.98, rule.businessFriction + (Math.random() * 0.04 - 0.02))),
        securityValue: Math.max(0.1, Math.min(0.9, rule.securityValue + (Math.random() * 0.05 - 0.025)))
      })));
    }, 6000);

    return () => {
      clearInterval(postureInterval);
      clearInterval(deletionInterval);
      clearInterval(violationInterval);
      clearInterval(rulesInterval);
    };
  }, []);

  return (
    <AtelierDesignProvider>
      <div className="min-h-screen relative bg-gradient-to-b from-black via-gray-900 to-gray-800 overflow-hidden">
        {/* Operational Background Systems */}
        <AmbientSystem
          intensity={0.3}
          followMouse={true}
          breathingRate={13000}
        />
        
        <DynamicBackground
          intensity={0.35}
          enableParallax={true}
          readingMode={true}
        />

        {/* Live System Status Bar */}
        <motion.div 
          className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-gray-100/5"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.5, duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        >
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <SpatialText level="caption" className="text-red-400 font-mono">
                  WORKSHOP // THE-HYGIENE-PARADOX
                </SpatialText>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  <SpatialText level="caption" className="text-gray-100/60">
                    Paradox Monitoring Active
                  </SpatialText>
                </div>
              </div>
              
              <div className="flex items-center gap-8">
                {liveMetrics.map((metric, i) => (
                  <motion.div
                    key={metric.label}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <SpatialText level="caption" className="text-gray-100/40">
                      {metric.label}:
                    </SpatialText>
                    <span className={`font-mono text-sm ${
                      metric.trend === 'up' ? 'text-red-400' :
                      metric.trend === 'down' ? 'text-orange-500' :
                      'text-gray-100/60'
                    }`}>
                      {metric.value}
                    </span>
                    {metric.paradox && (
                      <div className="w-8 h-1 bg-pearl/20 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-red-400/60"
                          animate={{ width: `${metric.paradox * 100}%` }}
                        />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        <FocusManager>
          <ReadingMode threshold={800}>
            <main ref={scrollRef} className="relative z-10 pt-20 overflow-y-auto h-screen">
              <AnimatePresence mode="wait">
                {/* Introduction */}
                <ReadingPlane sectionId="intro" priority="primary" className="min-h-screen flex items-center">
                  <motion.section
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
                    className="max-w-6xl mx-auto px-8 py-16"
                  >
                    <div className="space-y-12">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                      >
                        <SpatialText level="hero" className="text-gray-100 mb-4">
                          The Hygiene Paradox
                        </SpatialText>
                        <SpatialText level="subtitle" className="text-gray-100/60 italic">
                          Workshop Note - When Security Theater Undermines Security
                        </SpatialText>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6, duration: 0.8 }}
                        className="space-y-8"
                      >
                        <div className="border-l-2 border-red-400/30 pl-8 space-y-6">
                          <SpatialText level="body" className="text-gray-100/80 leading-relaxed">
                            Perfect security hygiene often creates perfect security vulnerabilities. The more 
                            we clean, classify, restrict, and delete in the name of security, the more we 
                            train users to work around our systems. The cleanest looking security posture 
                            can hide the messiest actual security reality.
                          </SpatialText>
                          
                          <SpatialText level="title" className="text-red-400">
                            Hygiene rules optimized for compliance audits often produce the opposite of their intended effect.
                          </SpatialText>
                        </div>

                        {/* Security Posture Tracker */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.9, duration: 0.8 }}
                          className="bg-gradient-to-br from-red-400/5 to-transparent border border-red-400/20 rounded-lg p-8 mt-12"
                        >
                          <SpatialText level="title" className="text-red-400 mb-6">
                            Security Posture vs Reality Tracker
                          </SpatialText>
                          
                          <div className="space-y-6">
                            {securityPostures.map((posture, i) => (
                              <motion.div
                                key={posture.domain}
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 1.2 + i * 0.15 }}
                                className={`bg-gradient-to-r from-gray-500/[0.05] to-transparent border-l-4 rounded-r-lg p-6 ${
                                  posture.paradoxIntensity > 0.8 ? 'border-red-500/80' :
                                  posture.paradoxIntensity > 0.6 ? 'border-orange-500/80' :
                                  posture.paradoxIntensity > 0.4 ? 'border-yellow-500/80' :
                                  'border-green-500/80'
                                }`}
                              >
                                <div className="grid grid-cols-4 gap-6">
                                  <div>
                                    <SpatialText level="title" className="text-gray-100 mb-2">
                                      {posture.domain}
                                    </SpatialText>
                                    <div className="space-y-2">
                                      <div className={`px-3 py-1 rounded-full text-xs font-mono ${
                                        posture.paradoxIntensity > 0.8 ? 'bg-red-500/20 text-red-400' :
                                        posture.paradoxIntensity > 0.6 ? 'bg-orange-500/20 text-orange-400' :
                                        posture.paradoxIntensity > 0.4 ? 'bg-yellow-500/20 text-yellow-400' :
                                        'bg-green-500/20 text-green-400'
                                      }`}>
                                        PARADOX: {(posture.paradoxIntensity * 100).toFixed(0)}%
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <SpatialText level="caption" className="text-gray-100/50">
                                          Bypass Attempts:
                                        </SpatialText>
                                        <span className="font-mono text-sm text-orange-400">
                                          {posture.bypassAttempts}/week
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <SpatialText level="caption" className="text-gray-100/50 mb-3">
                                      Hygiene vs Practicality:
                                    </SpatialText>
                                    <div className="space-y-3">
                                      <div>
                                        <div className="flex justify-between items-center mb-1">
                                          <SpatialText level="caption" className="text-gray-100/60">
                                            Hygiene Score
                                          </SpatialText>
                                          <span className="font-mono text-sm text-blue-400">
                                            {(posture.hygieneScore * 100).toFixed(0)}%
                                          </span>
                                        </div>
                                        <div className="h-1 bg-pearl/10 rounded-full overflow-hidden">
                                          <div 
                                            className="h-full bg-blue-400" 
                                            style={{ width: `${posture.hygieneScore * 100}%` }}
                                          />
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <div className="flex justify-between items-center mb-1">
                                          <SpatialText level="caption" className="text-gray-100/60">
                                            Practicality
                                          </SpatialText>
                                          <span className="font-mono text-sm text-cyan-400">
                                            {(posture.practicalityScore * 100).toFixed(0)}%
                                          </span>
                                        </div>
                                        <div className="h-1 bg-pearl/10 rounded-full overflow-hidden">
                                          <motion.div
                                            className="h-full bg-cyan-400"
                                            animate={{ width: `${posture.practicalityScore * 100}%` }}
                                            transition={{ delay: 1.5 + i * 0.1, duration: 0.8 }}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <SpatialText level="caption" className="text-gray-100/50 mb-3">
                                      User Impact:
                                    </SpatialText>
                                    <div className="space-y-3">
                                      <div>
                                        <div className="flex justify-between items-center mb-1">
                                          <SpatialText level="caption" className="text-gray-100/60">
                                            Compliance Rate
                                          </SpatialText>
                                          <span className="font-mono text-sm text-green-400">
                                            {(posture.complianceRate * 100).toFixed(0)}%
                                          </span>
                                        </div>
                                        <div className="h-1 bg-pearl/10 rounded-full overflow-hidden">
                                          <div 
                                            className="h-full bg-green-400" 
                                            style={{ width: `${posture.complianceRate * 100}%` }}
                                          />
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <div className="flex justify-between items-center mb-1">
                                          <SpatialText level="caption" className="text-gray-100/60">
                                            User Frustration
                                          </SpatialText>
                                          <span className="font-mono text-sm text-red-400">
                                            {(posture.userFrustration * 100).toFixed(0)}%
                                          </span>
                                        </div>
                                        <div className="h-1 bg-pearl/10 rounded-full overflow-hidden">
                                          <div 
                                            className="h-full bg-red-400" 
                                            style={{ width: `${posture.userFrustration * 100}%` }}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="text-right">
                                    <SpatialText level="caption" className="text-gray-100/50 mb-2">
                                      Actual Security Achieved:
                                    </SpatialText>
                                    <div className={`text-3xl font-mono mb-2 ${
                                      posture.actualSecurity > 0.7 ? 'text-green-400' :
                                      posture.actualSecurity > 0.5 ? 'text-yellow-400' :
                                      'text-red-400'
                                    }`}>
                                      {(posture.actualSecurity * 100).toFixed(0)}%
                                    </div>
                                    <SpatialText level="caption" className="text-gray-100/40">
                                      vs {(posture.hygieneScore * 100).toFixed(0)}% theoretical
                                    </SpatialText>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      </motion.div>
                    </div>
                  </motion.section>
                </ReadingPlane>

                {/* Deletion Counter */}
                <ReadingPlane sectionId="deletion-counter" priority="primary" className="min-h-screen flex items-center">
                  <motion.section
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="max-w-6xl mx-auto px-8 py-16"
                  >
                    <div className="space-y-12">
                      <div className="text-center space-y-4">
                        <SpatialText level="hero" className="text-gray-100">
                          Hygiene-Motivated Deletion Counter
                        </SpatialText>
                        <SpatialText level="body" className="text-gray-100/60">
                          Tracking what gets deleted in the name of cleanliness, compliance, and security hygiene.
                        </SpatialText>
                      </div>
                      
                      {/* Deletion Statistics */}
                      <div className="grid grid-cols-4 gap-6">
                        {[
                          { 
                            label: 'Total Deletions Today', 
                            value: deletionEvents.length * 43, 
                            color: 'text-red-400',
                            sublabel: 'items removed'
                          },
                          { 
                            label: 'Hygiene Motivated', 
                            value: `${Math.floor(deletionEvents.filter(d => d.hygieneMotivation).length / deletionEvents.length * 100)}%`, 
                            color: 'text-orange-400',
                            sublabel: 'of deletions'
                          },
                          { 
                            label: 'Recoverable', 
                            value: deletionEvents.filter(d => d.recoverable).length, 
                            color: 'text-green-400',
                            sublabel: `of ${deletionEvents.length} recent`
                          },
                          { 
                            label: 'Critical Impact', 
                            value: deletionEvents.filter(d => d.impact === 'critical').length, 
                            color: 'text-purple-400',
                            sublabel: 'high-risk deletions'
                          }
                        ].map((stat, i) => (
                          <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="text-center p-6 bg-black/40 border border-gray-100/10 rounded-lg"
                          >
                            <div className={`text-3xl font-mono mb-2 ${stat.color}`}>
                              {stat.value}
                            </div>
                            <SpatialText level="caption" className="text-gray-100/50 mb-1">
                              {stat.label}
                            </SpatialText>
                            <SpatialText level="caption" className="text-gray-100/30">
                              {stat.sublabel}
                            </SpatialText>
                          </motion.div>
                        ))}
                      </div>

                      {/* Recent Deletion Events */}
                      <div className="space-y-4">
                        <SpatialText level="title" className="text-red-400">
                          Recent Deletion Events
                        </SpatialText>
                        
                        <div className="space-y-3">
                          {deletionEvents.map((deletion, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -30 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                              className={`flex items-center justify-between p-4 rounded-lg border-l-4 ${
                                deletion.impact === 'critical' ? 'border-red-500 bg-red-500/5' :
                                deletion.impact === 'high' ? 'border-orange-500 bg-orange-500/5' :
                                deletion.impact === 'medium' ? 'border-yellow-500 bg-yellow-500/5' :
                                'border-blue-500 bg-blue-500/5'
                              }`}
                            >
                              <div className="flex items-center gap-6">
                                <div className="text-center">
                                  <div className="text-xs text-gray-100/40 mb-1">
                                    {deletion.timestamp.toLocaleTimeString()}
                                  </div>
                                  <div className={`px-2 py-1 rounded-full text-xs font-mono ${
                                    deletion.impact === 'critical' ? 'bg-red-500/20 text-red-400' :
                                    deletion.impact === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                    deletion.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-blue-500/20 text-blue-400'
                                  }`}>
                                    {deletion.impact.toUpperCase()}
                                  </div>
                                </div>
                                
                                <div>
                                  <SpatialText level="body" className="text-gray-100/90 mb-1">
                                    {deletion.itemType}
                                  </SpatialText>
                                  <SpatialText level="caption" className="text-gray-100/50">
                                    Reason: {deletion.reason} • Context: {deletion.context}
                                  </SpatialText>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <SpatialText level="caption" className="text-gray-100/50">
                                    By: {deletion.userId}
                                  </SpatialText>
                                  <div className="flex items-center gap-2 mt-1">
                                    {deletion.recoverable ? (
                                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                                        RECOVERABLE
                                      </span>
                                    ) : (
                                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">
                                        PERMANENT
                                      </span>
                                    )}
                                    {deletion.hygieneMotivation && (
                                      <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                                        HYGIENE
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* The Deletion Paradox */}
                      <div className="mt-16 p-8 bg-gradient-to-br from-red-400/10 to-transparent border border-red-400/30 rounded-lg">
                        <SpatialText level="title" className="text-red-400 mb-4">
                          The Deletion Paradox
                        </SpatialText>
                        <blockquote className="text-gray-100/80 italic text-lg leading-relaxed mb-4">
                          "Every deletion in the name of security hygiene potentially removes evidence, 
                          context, or recovery options. The cleaner we make our systems, the harder 
                          they become to debug, audit, or restore when things go wrong."
                        </blockquote>
                        <SpatialText level="body" className="text-gray-100/70">
                          Security hygiene that prioritizes appearance over forensic capability 
                          can paradoxically make systems less secure and less recoverable.
                        </SpatialText>
                      </div>
                    </div>
                  </motion.section>
                </ReadingPlane>

                {/* Boundary Violation Detector */}
                <ReadingPlane sectionId="boundary-violations" priority="primary" className="min-h-screen flex items-center">
                  <motion.section className="max-w-6xl mx-auto px-8 py-16">
                    <div className="space-y-12">
                      <SpatialText level="hero" className="text-gray-100">
                        Boundary Violation Detector
                      </SpatialText>

                      <div className="space-y-6">
                        {boundaryViolations.map((violation, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.15 }}
                            className={`bg-gradient-to-r from-purple-500/[0.05] to-transparent border-l-4 p-6 rounded-r-lg ${
                              violation.approved ? 'border-green-500/60' : 'border-red-500/60'
                            }`}
                          >
                            <div className="grid grid-cols-3 gap-8">
                              <div>
                                <div className="flex items-center gap-3 mb-2">
                                  <SpatialText level="title" className="text-gray-100">
                                    {violation.violationType}
                                  </SpatialText>
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    violation.approved ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                  }`}>
                                    {violation.approved ? 'APPROVED' : 'VIOLATION'}
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <SpatialText level="caption" className="text-gray-100/50">
                                      Detected:
                                    </SpatialText>
                                    <span className="font-mono text-sm text-gray-100/60">
                                      {violation.timestamp.toLocaleTimeString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <SpatialText level="caption" className="text-gray-100/50">
                                      Method:
                                    </SpatialText>
                                    <span className="font-mono text-sm text-cyan-400">
                                      {violation.detectionMethod}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <SpatialText level="caption" className="text-gray-100/50">
                                      Severity:
                                    </SpatialText>
                                    <span className={`font-mono text-sm ${
                                      violation.severity > 0.8 ? 'text-red-400' :
                                      violation.severity > 0.6 ? 'text-orange-400' :
                                      violation.severity > 0.4 ? 'text-yellow-400' :
                                      'text-green-400'
                                    }`}>
                                      {(violation.severity * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <SpatialText level="caption" className="text-gray-100/50 mb-3">
                                  Context & Justification:
                                </SpatialText>
                                <div className="space-y-3">
                                  <div>
                                    <SpatialText level="caption" className="text-gray-100/40 mb-1">
                                      Context:
                                    </SpatialText>
                                    <SpatialText level="body" className="text-gray-100/80">
                                      {violation.context}
                                    </SpatialText>
                                  </div>
                                  <div>
                                    <SpatialText level="caption" className="text-gray-100/40 mb-1">
                                      Justification:
                                    </SpatialText>
                                    <SpatialText level="body" className="text-gray-100/80 italic">
                                      "{violation.justification}"
                                    </SpatialText>
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <SpatialText level="caption" className="text-gray-100/50 mb-3">
                                  Rule & Impact:
                                </SpatialText>
                                <div className="space-y-3">
                                  <div>
                                    <SpatialText level="caption" className="text-gray-100/40 mb-1">
                                      Hygiene Rule Violated:
                                    </SpatialText>
                                    <div className="text-sm bg-red-500/10 text-red-400 px-2 py-1 rounded border border-red-500/20">
                                      {violation.hygieneRuleViolated}
                                    </div>
                                  </div>
                                  <div>
                                    <SpatialText level="caption" className="text-gray-100/40 mb-1">
                                      Business Impact:
                                    </SpatialText>
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 h-2 bg-pearl/10 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-orange-400" 
                                          style={{ width: `${violation.businessImpact * 100}%` }}
                                        />
                                      </div>
                                      <span className="font-mono text-sm text-orange-400">
                                        {(violation.businessImpact * 100).toFixed(0)}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Hygiene Rule Effectiveness Analysis */}
                      <div className="mt-16 space-y-6">
                        <SpatialText level="title" className="text-gray-100">
                          Hygiene Rule Effectiveness Analysis
                        </SpatialText>
                        
                        {hygieneRules.map((rule, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + i * 0.1 }}
                            className={`p-6 rounded-lg border-l-4 ${
                              rule.paradoxScore > 0.8 ? 'border-red-500 bg-red-500/5' :
                              rule.paradoxScore > 0.6 ? 'border-orange-500 bg-orange-500/5' :
                              rule.paradoxScore > 0.4 ? 'border-yellow-500 bg-yellow-500/5' :
                              'border-green-500 bg-green-500/5'
                            }`}
                          >
                            <div className="grid grid-cols-4 gap-6">
                              <div>
                                <SpatialText level="title" className="text-gray-100 mb-2">
                                  {rule.category.charAt(0).toUpperCase() + rule.category.slice(1)} Rule
                                </SpatialText>
                                <SpatialText level="body" className="text-gray-100/70 mb-3">
                                  {rule.rule}
                                </SpatialText>
                                <div className={`px-3 py-1 rounded-full text-xs font-mono ${
                                  rule.paradoxScore > 0.8 ? 'bg-red-500/20 text-red-400' :
                                  rule.paradoxScore > 0.6 ? 'bg-orange-500/20 text-orange-400' :
                                  rule.paradoxScore > 0.4 ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-green-500/20 text-green-400'
                                }`}>
                                  PARADOX: {(rule.paradoxScore * 100).toFixed(0)}%
                                </div>
                              </div>
                              
                              {[
                                { label: 'Theoretical Benefit', value: rule.theoreticalBenefit, color: 'text-blue-400' },
                                { label: 'Practical Compliance', value: rule.practicalCompliance, color: 'text-cyan-400' },
                                { label: 'Actual Security Value', value: rule.securityValue, color: 'text-green-400' }
                              ].map((metric, j) => (
                                <div key={metric.label} className="text-center">
                                  <SpatialText level="caption" className="text-gray-100/50 mb-2">
                                    {metric.label}
                                  </SpatialText>
                                  <div className={`text-2xl font-mono mb-2 ${metric.color}`}>
                                    {(metric.value * 100).toFixed(0)}%
                                  </div>
                                  <div className="w-full h-2 bg-pearl/10 rounded-full overflow-hidden">
                                    <motion.div
                                      className={`h-full ${
                                        metric.color.includes('blue') ? 'bg-blue-400' :
                                        metric.color.includes('cyan') ? 'bg-cyan-400' :
                                        'bg-green-400'
                                      }`}
                                      animate={{ width: `${metric.value * 100}%` }}
                                      transition={{ delay: 0.8 + j * 0.1, duration: 0.8 }}
                                    />
                                  </div>
                                  {j === 2 && (
                                    <SpatialText level="caption" className="text-gray-100/40 mt-1">
                                      Violation Rate: {(rule.violationFrequency * 100).toFixed(0)}%
                                    </SpatialText>
                                  )}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Breaking the Paradox */}
                      <div className="grid grid-cols-2 gap-8 mt-16">
                        {[
                          {
                            approach: 'Security by Design, Not Rules',
                            description: 'Build security into systems rather than layering rules on top',
                            example: 'Encrypted storage by default instead of encryption compliance policies'
                          },
                          {
                            approach: 'Measure Actual Outcomes',
                            description: 'Track real security incidents, not hygiene compliance scores',
                            example: 'Time to detect breaches vs. password complexity compliance rates'
                          },
                          {
                            approach: 'User-Friendly Security',
                            description: 'Make secure actions easier than insecure ones',
                            example: 'Single sign-on instead of password rotation requirements'
                          },
                          {
                            approach: 'Contextual Flexibility',
                            description: 'Allow appropriate exceptions with proper justification',
                            example: 'Emergency access procedures instead of rigid approval chains'
                          }
                        ].map((item, i) => (
                          <motion.div
                            key={item.approach}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + i * 0.15 }}
                            className="bg-gradient-to-br from-pearl/[0.03] to-transparent border border-gray-100/10 rounded-lg p-6"
                          >
                            <SpatialText level="title" className="text-red-400 mb-2">
                              {item.approach}
                            </SpatialText>
                            <SpatialText level="body" className="text-gray-100/70 mb-3">
                              {item.description}
                            </SpatialText>
                            <SpatialText level="caption" className="text-gray-100/50 italic">
                              Example: {item.example}
                            </SpatialText>
                          </motion.div>
                        ))}
                      </div>

                      {/* Operational Insight */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="mt-12 p-8 bg-black/60 border border-gray-100/20 rounded-lg text-center"
                      >
                        <SpatialText level="body" className="text-gray-100/90 italic mb-4">
                          The most secure organizations aren't the cleanest - they're the ones where 
                          security supports rather than obstructs the work that needs to get done.
                        </SpatialText>
                        <SpatialText level="caption" className="text-red-400">
                          True security hygiene makes the right thing the easy thing.
                        </SpatialText>
                      </motion.div>
                    </div>
                  </motion.section>
                </ReadingPlane>
              </AnimatePresence>
            </main>
          </ReadingMode>
        </FocusManager>

        {/* Operational Progress Indicator */}
        <motion.div
          className="fixed bottom-8 right-8 z-50"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          <div className="bg-black/80 backdrop-blur-xl border border-gray-100/10 rounded-lg p-4">
            <SpatialText level="caption" className="text-gray-100/40 mb-2">
              Paradox Analysis
            </SpatialText>
            <div className="w-32 h-1 bg-pearl/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-red-400 to-red-400/50"
                style={{ width: progressScale }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </AtelierDesignProvider>
  );
}