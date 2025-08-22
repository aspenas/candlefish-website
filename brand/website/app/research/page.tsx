import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Research | Candlefish',
  description: 'Explore Candlefish research initiatives, technical documentation, and operational insights',
}

export default function ResearchPage() {
  return (
    <div className="min-h-screen bg-atelier-canvas">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-5xl font-bold text-ink-primary mb-8">
          Research & Documentation
        </h1>

        <div className="prose prose-lg max-w-none mb-12">
          <p className="lead text-xl text-gray-600">
            Explore our technical research, operational insights, and comprehensive
            documentation for the Candlefish ecosystem.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* NANDA Monitoring Card */}
          <Link href="/research/monitoring" className="group">
            <div className="h-full p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-material-concrete">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-operation-active rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-ink-primary group-hover:text-operation-active transition-colors">
                  NANDA Monitoring
                </h2>
              </div>
              <p className="text-gray-600 mb-3">
                Real-time operational monitoring for the NANDA index system with comprehensive
                health metrics and SLO tracking.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-gray-100 text-xs rounded">Operations</span>
                <span className="px-2 py-1 bg-gray-100 text-xs rounded">Metrics</span>
                <span className="px-2 py-1 bg-gray-100 text-xs rounded">SLOs</span>
              </div>
            </div>
          </Link>

          {/* Agent Architecture Card */}
          <div className="p-6 bg-white rounded-lg shadow-sm border border-material-concrete opacity-75">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-gray-400 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-400">
                Agent Architecture
              </h2>
            </div>
            <p className="text-gray-400 mb-3">
              Deep dive into the NANDA agent discovery infrastructure and distributed
              systems architecture.
            </p>
            <p className="text-sm text-gray-400 italic">Coming soon</p>
          </div>

          {/* Performance Analysis Card */}
          <div className="p-6 bg-white rounded-lg shadow-sm border border-material-concrete opacity-75">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-gray-400 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-400">
                Performance Analysis
              </h2>
            </div>
            <p className="text-gray-400 mb-3">
              Benchmarks, optimization strategies, and performance tuning for
              high-scale AI agent operations.
            </p>
            <p className="text-sm text-gray-400 italic">Coming soon</p>
          </div>

          {/* Security & Privacy Card */}
          <div className="p-6 bg-white rounded-lg shadow-sm border border-material-concrete opacity-75">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-gray-400 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-400">
                Security & Privacy
              </h2>
            </div>
            <p className="text-gray-400 mb-3">
              Zero-knowledge proofs, mix networks, and privacy-preserving
              agent discovery mechanisms.
            </p>
            <p className="text-sm text-gray-400 italic">Coming soon</p>
          </div>

          {/* Integration Guides Card */}
          <div className="p-6 bg-white rounded-lg shadow-sm border border-material-concrete opacity-75">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-gray-400 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-400">
                Integration Guides
              </h2>
            </div>
            <p className="text-gray-400 mb-3">
              Step-by-step guides for integrating with OpenAI, Anthropic,
              Google A2A, and other platforms.
            </p>
            <p className="text-sm text-gray-400 italic">Coming soon</p>
          </div>

          {/* Case Studies Card */}
          <div className="p-6 bg-white rounded-lg shadow-sm border border-material-concrete opacity-75">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-gray-400 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-400">
                Case Studies
              </h2>
            </div>
            <p className="text-gray-400 mb-3">
              Real-world implementations and success stories from production
              deployments at scale.
            </p>
            <p className="text-sm text-gray-400 italic">Coming soon</p>
          </div>
        </div>

        <div className="mt-12 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            📚 Documentation Hub
          </h3>
          <p className="text-blue-800 mb-4">
            Looking for comprehensive documentation? Visit our main docs portal for
            API references, developer guides, and more.
          </p>
          <Link
            href="/docs"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Browse Documentation
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
