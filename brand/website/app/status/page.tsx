'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'

interface StatusData {
  current: {
    timestamp: string
    hash: string
    instruments: Array<{
      id: string
      name: string
      status: string
      performance: any
      isSimulated?: boolean
    }>
  }
  historical: Array<{
    filename: string
    date: string
    url: string
  }>
  meta: {
    generated: string
    version: string
    verificationMethod: string
  }
}

export default function StatusPage() {
  const [status, setStatus] = useState<StatusData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/status')
      .then(res => res.json())
      .then(data => {
        setStatus(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch status:', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-[#d4d4d4] font-mono pt-20">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <p className="text-[#666]">Loading status...</p>
        </div>
      </main>
    )
  }

  if (!status) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-[#d4d4d4] font-mono pt-20">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <p className="text-red-400">Failed to load status</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#d4d4d4] font-mono pt-20">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <header className="mb-8">
          <Link href="/" className="text-xs text-[#888] hover:text-[#3FD3C6] transition-colors">
            ← Back to Home
          </Link>
          <h1 className="text-2xl text-[#fff] mt-2">System Status</h1>
          <p className="text-sm text-[#666] mt-1">
            Signed instrument snapshots with cryptographic verification
          </p>
        </header>

        {/* Current Status */}
        <section className="mb-12">
          <h2 className="text-lg text-[#3FD3C6] mb-4">Current Snapshot</h2>
          <div className="bg-[#111] border border-[#333] p-4 rounded">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-xs text-[#666]">Generated:</span>
                <p className="text-sm text-[#fff]">{new Date(status.current.timestamp).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-xs text-[#666]">Verification:</span>
                <p className="text-sm text-[#fff]">{status.meta.verificationMethod}</p>
              </div>
            </div>
            <div className="mb-4">
              <span className="text-xs text-[#666]">SHA-256 Hash:</span>
              <p className="text-xs text-[#3FD3C6] font-mono break-all">{status.current.hash}</p>
            </div>
            <div>
              <span className="text-xs text-[#666]">Instruments:</span>
              <div className="mt-2 space-y-1">
                {status.current.instruments.map(instrument => (
                  <div key={instrument.id} className="flex justify-between text-xs">
                    <span className="text-[#aaa]">
                      {instrument.name}
                      {instrument.isSimulated && (
                        <span className="ml-2 text-[#666]">(simulated)</span>
                      )}
                    </span>
                    <span className={`
                      ${instrument.status === 'operational' ? 'text-green-400' :
                        instrument.status === 'calibrating' ? 'text-yellow-400' :
                        instrument.status === 'testing' ? 'text-blue-400' :
                        'text-red-400'}
                    `}>
                      {instrument.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[#333]">
              <a
                href="/status/instruments-latest.json"
                className="text-xs text-[#6666ff] hover:text-[#8888ff]"
                download
              >
                Download Latest Snapshot →
              </a>
            </div>
          </div>
        </section>

        {/* Historical Snapshots */}
        <section>
          <h2 className="text-lg text-[#3FD3C6] mb-4">Historical Snapshots</h2>
          <div className="bg-[#111] border border-[#333] p-4 rounded">
            {status.historical.length > 0 ? (
              <div className="space-y-2">
                {status.historical.slice(0, 7).map(snapshot => (
                  <div key={snapshot.filename} className="flex justify-between items-center text-xs">
                    <span className="text-[#aaa]">{snapshot.date}</span>
                    <a
                      href={snapshot.url}
                      className="text-[#6666ff] hover:text-[#8888ff]"
                      download
                    >
                      Download →
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#666]">No historical snapshots available yet</p>
            )}
          </div>
        </section>

        {/* Provenance Information */}
        <section className="mt-12">
          <h2 className="text-lg text-[#3FD3C6] mb-4">Data Provenance</h2>
          <div className="bg-[#111] border border-[#333] p-4 rounded">
            <dl className="space-y-2">
              <div className="flex justify-between text-xs">
                <dt className="text-[#666]">Data Source:</dt>
                <dd className="text-[#aaa]">Prometheus/OpenTelemetry</dd>
              </div>
              <div className="flex justify-between text-xs">
                <dt className="text-[#666]">Scrape Interval:</dt>
                <dd className="text-[#aaa]">15 seconds</dd>
              </div>
              <div className="flex justify-between text-xs">
                <dt className="text-[#666]">Sampling Window:</dt>
                <dd className="text-[#aaa]">5 minute rolling average</dd>
              </div>
              <div className="flex justify-between text-xs">
                <dt className="text-[#666]">Aggregation Method:</dt>
                <dd className="text-[#aaa]">Rate calculation</dd>
              </div>
              <div className="flex justify-between text-xs">
                <dt className="text-[#666]">Update Frequency:</dt>
                <dd className="text-[#aaa]">Daily at 00:00 UTC</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>
    </main>
  )
}
