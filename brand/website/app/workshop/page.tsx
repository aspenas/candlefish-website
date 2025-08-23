'use client'

import React, { useState, useMemo, useCallback, memo } from 'react'
import Link from 'next/link'
import { workshopLogs } from '../../data/workshop/workshop-logs'
import type { WorkshopLog, WorkshopFailure, WorkshopComponent, WorkshopChangelogEntry } from '../../data/workshop/types'

// Memoized sub-components for better performance
const WorkshopHeader = memo(() => (
  <header className="border-b border-[#333] px-6 py-4 relative">
    <div className="absolute left-0 bottom-0 w-full h-px bg-gradient-to-r from-transparent via-[#3FD3C6]/20 to-transparent"></div>
    <div className="max-w-6xl mx-auto">
      <Link href="/" className="text-xs text-[#888] hover:text-[#3FD3C6] transition-colors">
        ← Back to Codex
      </Link>
      <h1 className="text-lg text-[#fff] mt-2">Workshop Logs</h1>
      <p className="text-xs text-[#666] mt-1">
        Complete build history. Failures included. No sanitization.
      </p>
    </div>
  </header>
))
WorkshopHeader.displayName = 'WorkshopHeader'

const StatusBadge = memo(({ status }: { status: string }) => {
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'active-research': return 'text-[#00ff00] border-[#00ff00]'
      case 'production': return 'text-[#00ffff] border-[#00ffff]'
      case 'beta-testing': return 'text-[#ffff00] border-[#ffff00]'
      default: return 'text-[#888] border-[#888]'
    }
  }, [])

  return (
    <span className={`px-2 py-1 border ${getStatusColor(status)}`}>
      {status}
    </span>
  )
})
StatusBadge.displayName = 'StatusBadge'

const FailureItem = memo(({ failure }: { failure: WorkshopFailure }) => (
  <div className="border-l-2 border-[#ff4444] pl-3 text-xs">
    <div className="flex gap-4 text-[#888]">
      <span>{failure.date}</span>
      <span>{failure.version}</span>
    </div>
    <div className="text-[#d4d4d4] mt-1">
      Attempt: {failure.attempt}
    </div>
    <div className="text-[#ff8888] mt-1">
      {failure.result}
    </div>
    <div className="text-[#aaa] mt-1">
      → {failure.learning}
    </div>
  </div>
))
FailureItem.displayName = 'FailureItem'

const ComponentItem = memo(({
  component,
  logId,
  index,
  showCode,
  onToggleCode
}: {
  component: WorkshopComponent
  logId: string
  index: number
  showCode: boolean
  onToggleCode: () => void
}) => (
  <div className="mb-4 border border-[#333] p-3">
    <div className="flex justify-between items-center mb-2">
      <span className="text-sm text-[#fff]">{component.name}</span>
      <div className="flex gap-3 text-xs">
        <span className={`px-2 py-1 border ${
          component.status === 'production' ? 'border-[#00ff00] text-[#00ff00]' :
          component.status === 'working' ? 'border-[#ffff00] text-[#ffff00]' :
          'border-[#ff9500] text-[#ff9500]'
        }`}>
          {component.status}
        </span>
        {component.accuracy && (
          <span className="text-[#888]">
            Accuracy: {component.accuracy}
          </span>
        )}
      </div>
    </div>

    {component.code && (
      <div>
        <button
          onClick={onToggleCode}
          className="text-xs text-[#6666ff] hover:text-[#8888ff]"
        >
          {showCode ? 'Hide' : 'Show'} Code
        </button>

        {showCode && (
          <pre className="mt-2 p-2 bg-[#1a1a1a] text-xs overflow-x-auto">
            <code>{component.code.trim()}</code>
          </pre>
        )}
      </div>
    )}
  </div>
))
ComponentItem.displayName = 'ComponentItem'

const ChangelogItem = memo(({ entry }: { entry: WorkshopChangelogEntry }) => (
  <div className="text-xs">
    <div className="flex gap-4 text-[#888]">
      <span className="text-[#fff]">{entry.version}</span>
      <span>{entry.date}</span>
    </div>
    <ul className="mt-1 space-y-1">
      {entry.changes.map((change, j) => (
        <li key={j} className={`
          ${change.startsWith('ADD:') ? 'text-[#44ff44]' :
            change.startsWith('FIX:') ? 'text-[#ff9944]' :
            change.startsWith('IMPROVE:') ? 'text-[#4444ff]' :
            change.startsWith('BREAKTHROUGH:') ? 'text-[#ffff00]' :
            'text-[#aaa]'}
        `}>
          {change}
        </li>
      ))}
    </ul>
  </div>
))
ChangelogItem.displayName = 'ChangelogItem'

const WorkshopLogItem = memo(({ log }: { log: WorkshopLog }) => {
  const [showCode, setShowCode] = useState<{ [key: string]: boolean }>({})

  const toggleCode = useCallback((key: string) => {
    setShowCode(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  return (
    <article className="mb-12 border border-[#333] p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl text-[#fff] mb-2">{log.title}</h2>
          <div className="flex gap-3 text-xs">
            <StatusBadge status={log.status} />
            <span className="px-2 py-1 border border-[#666] text-[#aaa]">
              {log.version}
            </span>
            <span className="text-[#666]">
              Started: {log.startDate}
            </span>
          </div>
        </div>
      </div>

      {/* Problem Statement */}
      <div className="mb-6">
        <h3 className="text-xs uppercase text-[#888] mb-2">Initial Problem</h3>
        <p className="text-sm text-[#d4d4d4] mb-3">{log.problem.initial}</p>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[#888]">Constraints:</span>
            <ul className="mt-1 space-y-1">
              {log.problem.constraints.map((c, i) => (
                <li key={i} className="text-[#aaa]">• {c}</li>
              ))}
            </ul>
          </div>
          <div>
            <span className="text-[#888]">Initial Metrics:</span>
            <dl className="mt-1 space-y-1">
              {Object.entries(log.problem.metrics).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-[#666]">{k}:</dt>
                  <dd className="text-[#aaa]">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Failures */}
      <div className="mb-6">
        <h3 className="text-xs uppercase text-[#888] mb-2">
          Failures ({log.failures.length})
        </h3>
        <div className="space-y-2">
          {log.failures.slice(0, 3).map((failure, i) => (
            <FailureItem key={i} failure={failure} />
          ))}
        </div>
      </div>

      {/* Current Solution */}
      <div className="mb-6">
        <h3 className="text-xs uppercase text-[#888] mb-2">Current Approach</h3>
        <p className="text-sm text-[#d4d4d4] mb-3">
          {log.currentSolution.approach}
        </p>

        {log.currentSolution.components.map((comp, i) => (
          <ComponentItem
            key={i}
            component={comp}
            logId={log.id}
            index={i}
            showCode={showCode[`${log.id}-${i}`] || false}
            onToggleCode={() => toggleCode(`${log.id}-${i}`)}
          />
        ))}
      </div>

      {/* Changelog */}
      <div className="mb-6" id={`${log.id}-changelog`}>
        <h3 className="text-xs uppercase text-[#888] mb-2">Changelog</h3>
        <div className="space-y-3">
          {log.changelog.slice(0, 2).map((entry, i) => (
            <ChangelogItem key={i} entry={entry} />
          ))}
        </div>
      </div>

      {/* Limitations & Next Steps */}
      <div className="grid grid-cols-2 gap-6 text-xs">
        <div>
          <h3 className="uppercase text-[#888] mb-2">Known Limitations</h3>
          <ul className="space-y-1">
            {log.limitations.map((limit, i) => (
              <li key={i} className="text-[#ff9944]">• {limit}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="uppercase text-[#888] mb-2">Next Steps</h3>
          <ul className="space-y-1">
            {log.nextSteps.map((step, i) => (
              <li key={i} className="text-[#44ff44]">• {step}</li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  )
})
WorkshopLogItem.displayName = 'WorkshopLogItem'

export default function WorkshopLogs() {
  // Memoize the logs to prevent unnecessary re-renders
  const memoizedLogs = useMemo(() => workshopLogs, [])

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#d4d4d4] font-mono pt-20 relative">
      {/* Subtle brand accent overlay */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          background: `linear-gradient(135deg, transparent 0%, rgba(63, 211, 198, 0.1) 50%, transparent 100%)`
        }}
      />
      <div className="relative z-10">
        <WorkshopHeader />

        <section className="max-w-6xl mx-auto px-6 py-8">
          {memoizedLogs.map((log) => (
            <WorkshopLogItem key={log.id} log={log} />
          ))}
        </section>
      </div>
    </main>
  )
}
