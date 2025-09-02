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
  console.log('Excel as Truth Source Workshop initializing...');
}

interface SpreadsheetPattern {
  pattern: string;
  frequency: number;
  complexity: number;
  accuracy: number;
  maintainability: number;
  businessCritical: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface FormulaAnalysis {
  formula: string;
  complexity: number;
  dependencies: number;
  volatility: number;
  errorProne: number;
  businessLogic: string;
  alternatives: string[];
}

interface ExcelMetric {
  category: string;
  value: string | number;
  trend: 'up' | 'down' | 'stable';
  criticality: number;
}

interface TruthValidation {
  source: string;
  truthiness: number;
  consistency: number;
  freshness: number;
  authority: number;
  conflicts: string[];
}

export default function ExcelAsTruthSourceWorkshop() {
  console.log('ExcelAsTruthSourceWorkshop rendering...');
  
  const [spreadsheetPatterns, setSpreadsheetPatterns] = useState<SpreadsheetPattern[]>([
    {
      pattern: 'VLOOKUP-based master data',
      frequency: 0.89,
      complexity: 0.67,
      accuracy: 0.84,
      maintainability: 0.32,
      businessCritical: true,
      riskLevel: 'high'
    },
    {
      pattern: 'Manual aggregation formulas',
      frequency: 0.76,
      complexity: 0.43,
      accuracy: 0.71,
      maintainability: 0.28,
      businessCritical: true,
      riskLevel: 'medium'
    },
    {
      pattern: 'Hardcoded reference tables',
      frequency: 0.92,
      complexity: 0.21,
      accuracy: 0.95,
      maintainability: 0.15,
      businessCritical: false,
      riskLevel: 'critical'
    },
    {
      pattern: 'Cross-sheet dependencies',
      frequency: 0.65,
      complexity: 0.88,
      accuracy: 0.61,
      maintainability: 0.18,
      businessCritical: true,
      riskLevel: 'critical'
    }
  ]);

  const [formulaAnalyses, setFormulaAnalyses] = useState<FormulaAnalysis[]>([
    {
      formula: '=IF(VLOOKUP(A2,Data!$A$2:$Z$1000,12,FALSE)>100,VLOOKUP(A2,Data!$A$2:$Z$1000,15,FALSE)*1.2,"N/A")',
      complexity: 0.91,
      dependencies: 7,
      volatility: 0.74,
      errorProne: 0.83,
      businessLogic: 'Price calculation with volume discounts',
      alternatives: ['Database query', 'Power Query', 'Structured data model']
    },
    {
      formula: '=SUMIFS(Sales!$D:$D,Sales!$A:$A,">="&DATE(2024,1,1),Sales!$B:$B,C2)',
      complexity: 0.56,
      dependencies: 3,
      volatility: 0.41,
      errorProne: 0.32,
      businessLogic: 'YTD sales by category',
      alternatives: ['Pivot table', 'Power BI', 'SQL aggregation']
    },
    {
      formula: '=INDEX(MATCH(B2,Names!$A:$A,0),MATCH("Status",Names!$1:$1,0))',
      complexity: 0.78,
      dependencies: 4,
      volatility: 0.68,
      errorProne: 0.59,
      businessLogic: 'Dynamic status lookup',
      alternatives: ['Normalized tables', 'Relational joins', 'API integration']
    }
  ]);

  const [truthValidations, setTruthValidations] = useState<TruthValidation[]>([
    {
      source: 'Q4_Budget_FINAL_v3.xlsx',
      truthiness: 0.78,
      consistency: 0.65,
      freshness: 0.23,
      authority: 0.91,
      conflicts: ['Different totals in Summary tab', 'Missing Q4 actuals']
    },
    {
      source: 'Customer_Master_2024.xlsx',
      truthiness: 0.84,
      consistency: 0.79,
      freshness: 0.67,
      authority: 0.88,
      conflicts: ['Duplicate entries', 'Outdated contact info']
    },
    {
      source: 'Pricing_Rules_CURRENT.xlsx',
      truthiness: 0.92,
      consistency: 0.88,
      freshness: 0.89,
      authority: 0.95,
      conflicts: ['Regional variations unclear']
    }
  ]);

  const [excelMetrics, setExcelMetrics] = useState<ExcelMetric[]>([
    { category: 'Formulas Analyzed', value: '1,247', trend: 'up', criticality: 0.65 },
    { category: 'Pattern Recognition', value: '94.3%', trend: 'up', criticality: 0.78 },
    { category: 'Truth Confidence', value: '0.823', trend: 'stable', criticality: 0.91 },
    { category: 'Maintenance Debt', value: '47 hours', trend: 'down', criticality: 0.84 }
  ]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: scrollRef });
  const progressScale = useTransform(scrollYProgress, [0, 1], [0, 100]);

  useEffect(() => {
    // Simulate formula complexity analysis updates
    const formulaInterval = setInterval(() => {
      setFormulaAnalyses(prev => prev.map(formula => ({
        ...formula,
        complexity: Math.max(0.1, Math.min(1, formula.complexity + (Math.random() * 0.05 - 0.025))),
        errorProne: Math.max(0.1, Math.min(1, formula.errorProne + (Math.random() * 0.04 - 0.02)))
      })));
    }, 3000);

    // Update truth validation scores
    const truthInterval = setInterval(() => {
      setTruthValidations(prev => prev.map(validation => ({
        ...validation,
        truthiness: Math.max(0.1, Math.min(1, validation.truthiness + (Math.random() * 0.06 - 0.03))),
        consistency: Math.max(0.1, Math.min(1, validation.consistency + (Math.random() * 0.04 - 0.02))),
        freshness: Math.max(0.1, Math.min(1, validation.freshness + (Math.random() * 0.08 - 0.04)))
      })));
    }, 4000);

    // Update spreadsheet pattern recognition
    const patternInterval = setInterval(() => {
      setSpreadsheetPatterns(prev => prev.map(pattern => ({
        ...pattern,
        frequency: Math.max(0.1, Math.min(1, pattern.frequency + (Math.random() * 0.03 - 0.015))),
        accuracy: Math.max(0.1, Math.min(1, pattern.accuracy + (Math.random() * 0.04 - 0.02)))
      })));
    }, 5000);

    return () => {
      clearInterval(formulaInterval);
      clearInterval(truthInterval);
      clearInterval(patternInterval);
    };
  }, []);

  return (
    <AtelierDesignProvider>
      <div className="min-h-screen relative bg-gradient-to-b from-black via-gray-900 to-gray-800 overflow-hidden">
        {/* Operational Background Systems */}
        <AmbientSystem
          intensity={0.2}
          followMouse={true}
          breathingRate={10000}
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
                <SpatialText level="caption" className="text-green-400 font-mono">
                  WORKSHOP // EXCEL-AS-TRUTH-SOURCE
                </SpatialText>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <SpatialText level="caption" className="text-gray-100/60">
                    Pattern Analysis Active
                  </SpatialText>
                </div>
              </div>
              
              <div className="flex items-center gap-8">
                {excelMetrics.map((metric, i) => (
                  <motion.div
                    key={metric.category}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <SpatialText level="caption" className="text-gray-100/40">
                      {metric.category}:
                    </SpatialText>
                    <span className={`font-mono text-sm ${
                      metric.trend === 'up' ? 'text-green-400' :
                      metric.trend === 'down' ? 'text-orange-500' :
                      'text-gray-100/60'
                    }`}>
                      {metric.value}
                    </span>
                    <div className="w-8 h-1 bg-pearl/20 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-green-400/60"
                        animate={{ width: `${metric.criticality * 100}%` }}
                      />
                    </div>
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
                          Treating Excel as a Source of Truth
                        </SpatialText>
                        <SpatialText level="subtitle" className="text-gray-100/60 italic">
                          Workshop Note - Spreadsheet Pattern Analysis
                        </SpatialText>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6, duration: 0.8 }}
                        className="space-y-8"
                      >
                        <div className="border-l-2 border-green-400/30 pl-8 space-y-6">
                          <SpatialText level="body" className="text-gray-100/80 leading-relaxed">
                            Every organization has them: the Excel files that run the business. Not officially, 
                            but practically. They contain the real pricing rules, the actual customer data, 
                            the formulas that generate the numbers everyone relies on. What happens when we 
                            treat these spreadsheets as legitimate sources of truth?
                          </SpatialText>
                          
                          <SpatialText level="title" className="text-green-400">
                            Sometimes the most important business logic lives in cell F47 of a spreadsheet nobody wants to admit exists.
                          </SpatialText>
                        </div>

                        {/* Live Pattern Recognition Display */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.9, duration: 0.8 }}
                          className="bg-gradient-to-br from-green-400/5 to-transparent border border-green-400/20 rounded-lg p-8 mt-12"
                        >
                          <SpatialText level="title" className="text-green-400 mb-6">
                            Detected Spreadsheet Patterns
                          </SpatialText>
                          
                          <div className="space-y-4">
                            {spreadsheetPatterns.map((pattern, i) => (
                              <motion.div
                                key={pattern.pattern}
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 1.2 + i * 0.15 }}
                                className={`p-4 rounded-lg border-l-4 ${
                                  pattern.riskLevel === 'critical' ? 'border-red-500 bg-red-500/5' :
                                  pattern.riskLevel === 'high' ? 'border-orange-500 bg-orange-500/5' :
                                  pattern.riskLevel === 'medium' ? 'border-yellow-500 bg-yellow-500/5' :
                                  'border-blue-500 bg-blue-500/5'
                                }`}
                              >
                                <div className="grid grid-cols-5 gap-4 items-center">
                                  <div className="col-span-2">
                                    <SpatialText level="body" className="text-gray-100/90 mb-1">
                                      {pattern.pattern}
                                    </SpatialText>
                                    <div className="flex items-center gap-2">
                                      {pattern.businessCritical && (
                                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">
                                          BUSINESS CRITICAL
                                        </span>
                                      )}
                                      <span className={`text-xs px-2 py-1 rounded-full ${
                                        pattern.riskLevel === 'critical' ? 'bg-red-500/20 text-red-400' :
                                        pattern.riskLevel === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                        pattern.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                        'bg-blue-500/20 text-blue-400'
                                      }`}>
                                        {pattern.riskLevel.toUpperCase()}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {['frequency', 'complexity', 'accuracy', 'maintainability'].map((metric, j) => (
                                    <div key={metric} className="text-center">
                                      <SpatialText level="caption" className="text-gray-100/50 mb-1">
                                        {metric.charAt(0).toUpperCase() + metric.slice(1)}
                                      </SpatialText>
                                      <div className="space-y-1">
                                        <div className={`font-mono text-sm ${
                                          pattern[metric as keyof SpreadsheetPattern] > 0.7 ? 'text-red-400' :
                                          pattern[metric as keyof SpreadsheetPattern] > 0.5 ? 'text-yellow-400' :
                                          'text-green-400'
                                        }`}>
                                          {((pattern[metric as keyof SpreadsheetPattern] as number) * 100).toFixed(0)}%
                                        </div>
                                        <div className="w-12 h-1 bg-pearl/10 rounded-full overflow-hidden mx-auto">
                                          <motion.div
                                            className={`h-full ${
                                              pattern[metric as keyof SpreadsheetPattern] > 0.7 ? 'bg-red-400' :
                                              pattern[metric as keyof SpreadsheetPattern] > 0.5 ? 'bg-yellow-400' :
                                              'bg-green-400'
                                            }`}
                                            animate={{ width: `${(pattern[metric as keyof SpreadsheetPattern] as number) * 100}%` }}
                                            transition={{ delay: 1.5 + i * 0.1 + j * 0.05, duration: 0.8 }}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      </motion.div>
                    </div>
                  </motion.section>
                </ReadingPlane>

                {/* Formula Complexity Analyzer */}
                <ReadingPlane sectionId="formulas" priority="primary" className="min-h-screen flex items-center">
                  <motion.section
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="max-w-6xl mx-auto px-8 py-16"
                  >
                    <div className="space-y-12">
                      <SpatialText level="hero" className="text-gray-100">
                        Formula Complexity Analyzer
                      </SpatialText>
                      
                      <div className="space-y-6">
                        {formulaAnalyses.map((formula, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.2 }}
                            className="bg-gradient-to-br from-yellow-500/[0.03] to-transparent border border-yellow-500/20 rounded-lg p-6 overflow-hidden"
                          >
                            {/* Formula Display */}
                            <div className="mb-6">
                              <SpatialText level="caption" className="text-gray-100/50 mb-2">
                                Formula:
                              </SpatialText>
                              <div className="bg-black/50 border border-gray-100/10 rounded p-4 font-mono text-sm text-yellow-400 overflow-x-auto">
                                {formula.formula}
                              </div>
                            </div>
                            
                            {/* Analysis Metrics */}
                            <div className="grid grid-cols-2 gap-8">
                              <div>
                                <SpatialText level="title" className="text-gray-100 mb-4">
                                  Complexity Analysis
                                </SpatialText>
                                
                                <div className="space-y-4">
                                  {[
                                    { label: 'Complexity Score', value: formula.complexity, color: 'text-red-400' },
                                    { label: 'Dependencies', value: formula.dependencies / 10, color: 'text-orange-400' },
                                    { label: 'Volatility', value: formula.volatility, color: 'text-yellow-400' },
                                    { label: 'Error Prone', value: formula.errorProne, color: 'text-red-400' }
                                  ].map((metric, j) => (
                                    <div key={metric.label} className="flex items-center justify-between">
                                      <SpatialText level="caption" className="text-gray-100/60">
                                        {metric.label}:
                                      </SpatialText>
                                      <div className="flex items-center gap-3">
                                        <div className="w-24 h-2 bg-pearl/10 rounded-full overflow-hidden">
                                          <motion.div
                                            className={`h-full ${metric.color.includes('red') ? 'bg-red-400' : 
                                                        metric.color.includes('orange') ? 'bg-orange-400' : 
                                                        'bg-yellow-400'}`}
                                            animate={{ width: `${(typeof metric.value === 'number' ? metric.value : 0) * 100}%` }}
                                            transition={{ delay: 0.5 + j * 0.1, duration: 0.8 }}
                                          />
                                        </div>
                                        <span className={`font-mono text-sm ${metric.color}`}>
                                          {typeof metric.value === 'number' 
                                            ? (metric.value * 100).toFixed(0) + '%'
                                            : metric.value}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              <div>
                                <SpatialText level="title" className="text-gray-100 mb-4">
                                  Business Context
                                </SpatialText>
                                
                                <div className="space-y-4">
                                  <div>
                                    <SpatialText level="caption" className="text-gray-100/50 mb-2">
                                      Business Logic:
                                    </SpatialText>
                                    <SpatialText level="body" className="text-gray-100/80">
                                      {formula.businessLogic}
                                    </SpatialText>
                                  </div>
                                  
                                  <div>
                                    <SpatialText level="caption" className="text-gray-100/50 mb-2">
                                      Suggested Alternatives:
                                    </SpatialText>
                                    <div className="flex flex-wrap gap-2">
                                      {formula.alternatives.map((alt, k) => (
                                        <span
                                          key={alt}
                                          className="text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded-full border border-green-500/20"
                                        >
                                          {alt}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Risk Assessment */}
                            <div className="mt-6 pt-4 border-t border-gray-100/10">
                              <div className="flex justify-between items-center">
                                <SpatialText level="caption" className="text-gray-100/50">
                                  Overall Risk Score: Complexity × Error Rate × Dependencies
                                </SpatialText>
                                <span className="font-mono text-lg text-red-400">
                                  {(formula.complexity * formula.errorProne * (formula.dependencies / 10)).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* The Excel Truth Paradox */}
                      <div className="mt-16 p-8 bg-gradient-to-br from-green-400/10 to-transparent border border-green-400/30 rounded-lg">
                        <SpatialText level="title" className="text-green-400 mb-4">
                          The Excel Truth Paradox
                        </SpatialText>
                        <blockquote className="text-gray-100/80 italic text-lg leading-relaxed mb-4">
                          "The more business-critical a spreadsheet becomes, the less likely anyone is to 
                          understand how it actually works - yet the more everyone depends on it being correct."
                        </blockquote>
                        <SpatialText level="body" className="text-gray-100/70">
                          This creates a unique form of technical debt: invisible, undocumented business logic 
                          that's simultaneously fragile and indispensable.
                        </SpatialText>
                      </div>
                    </div>
                  </motion.section>
                </ReadingPlane>

                {/* Truth Validation Dashboard */}
                <ReadingPlane sectionId="truth-validation" priority="primary" className="min-h-screen flex items-center">
                  <motion.section className="max-w-6xl mx-auto px-8 py-16">
                    <div className="space-y-12">
                      <SpatialText level="hero" className="text-gray-100">
                        Truth Source Validation
                      </SpatialText>

                      <div className="grid gap-6">
                        {truthValidations.map((validation, i) => (
                          <motion.div
                            key={validation.source}
                            initial={{ opacity: 0, x: -40 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.15 }}
                            className="bg-gradient-to-r from-blue-500/[0.05] to-transparent border-l-4 border-blue-500/40 p-6 rounded-r-lg"
                          >
                            <div className="grid grid-cols-5 gap-6 items-center">
                              <div>
                                <SpatialText level="title" className="text-gray-100 mb-2">
                                  {validation.source}
                                </SpatialText>
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full ${
                                    validation.truthiness > 0.8 ? 'bg-green-400' :
                                    validation.truthiness > 0.6 ? 'bg-yellow-400' : 'bg-red-400'
                                  }`} />
                                  <SpatialText level="caption" className="text-gray-100/50">
                                    Truth Score: {(validation.truthiness * 100).toFixed(0)}%
                                  </SpatialText>
                                </div>
                              </div>
                              
                              {['consistency', 'freshness', 'authority'].map((metric, j) => (
                                <div key={metric} className="text-center">
                                  <SpatialText level="caption" className="text-gray-100/50 mb-2">
                                    {metric.charAt(0).toUpperCase() + metric.slice(1)}
                                  </SpatialText>
                                  <div className="space-y-2">
                                    <span className={`font-mono text-lg ${
                                      validation[metric as keyof TruthValidation] > 0.7 ? 'text-green-400' :
                                      validation[metric as keyof TruthValidation] > 0.5 ? 'text-yellow-400' :
                                      'text-red-400'
                                    }`}>
                                      {((validation[metric as keyof TruthValidation] as number) * 100).toFixed(0)}%
                                    </span>
                                    <div className="w-16 h-2 bg-pearl/10 rounded-full overflow-hidden mx-auto">
                                      <motion.div
                                        className={`h-full ${
                                          validation[metric as keyof TruthValidation] > 0.7 ? 'bg-green-400' :
                                          validation[metric as keyof TruthValidation] > 0.5 ? 'bg-yellow-400' :
                                          'bg-red-400'
                                        }`}
                                        animate={{ width: `${(validation[metric as keyof TruthValidation] as number) * 100}%` }}
                                        transition={{ delay: 0.5 + j * 0.1, duration: 0.8 }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                              
                              <div>
                                <SpatialText level="caption" className="text-gray-100/50 mb-2">
                                  Known Conflicts:
                                </SpatialText>
                                <div className="space-y-1">
                                  {validation.conflicts.slice(0, 2).map((conflict, k) => (
                                    <div key={k} className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded">
                                      {conflict}
                                    </div>
                                  ))}
                                  {validation.conflicts.length > 2 && (
                                    <div className="text-xs text-gray-400">
                                      +{validation.conflicts.length - 2} more
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Truth Source Principles */}
                      <div className="grid grid-cols-2 gap-8 mt-16">
                        {[
                          {
                            principle: 'Acknowledge Reality',
                            description: 'Accept that Excel files contain real business logic',
                            strategy: 'Document, version control, backup critical spreadsheets'
                          },
                          {
                            principle: 'Validate Truth Claims',
                            description: 'Not all spreadsheet data is equally trustworthy',
                            strategy: 'Implement automated consistency checks and validation rules'
                          },
                          {
                            principle: 'Plan Migration Paths',
                            description: 'Excel truth sources should evolve, not persist forever',
                            strategy: 'Identify candidates for database migration or API replacement'
                          },
                          {
                            principle: 'Maintain Provenance',
                            description: 'Track the source and lineage of critical data',
                            strategy: 'Create audit trails and change logs for business-critical files'
                          }
                        ].map((item, i) => (
                          <motion.div
                            key={item.principle}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + i * 0.15 }}
                            className="bg-gradient-to-br from-pearl/[0.03] to-transparent border border-gray-100/10 rounded-lg p-6"
                          >
                            <SpatialText level="title" className="text-green-400 mb-2">
                              {item.principle}
                            </SpatialText>
                            <SpatialText level="body" className="text-gray-100/70 mb-4">
                              {item.description}
                            </SpatialText>
                            <SpatialText level="caption" className="text-gray-100/50 italic">
                              Strategy: {item.strategy}
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
                          The goal isn't to eliminate Excel as a truth source - 
                          it's to treat it with the respect and rigor it deserves.
                        </SpatialText>
                        <SpatialText level="caption" className="text-green-400">
                          Sometimes the most important truths live in the most humble containers.
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
              Truth Analysis
            </SpatialText>
            <div className="w-32 h-1 bg-pearl/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-green-400 to-green-400/50"
                style={{ width: progressScale }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </AtelierDesignProvider>
  );
}