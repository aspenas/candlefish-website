import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Research | Candlefish',
  description: 'Explore Candlefish research initiatives, technical documentation, and operational insights',
}

export default function ResearchPage() {
  return (
    <div className="min-h-screen pt-20" style={{
      background: 'linear-gradient(135deg, rgb(13, 27, 42) 0%, rgb(27, 38, 59) 50%, rgb(28, 28, 28) 100%)'
    }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-12">
          <h1 className="text-5xl font-light text-[#F8F8F2] mb-8 leading-tight">
            Research & Documentation
          </h1>
          <div className="max-w-none">
            <p className="text-2xl text-[#415A77] font-light leading-relaxed">
              Explore our technical research, operational insights, and comprehensive
              documentation for the Candlefish ecosystem.
            </p>
          </div>
        </header>

        <section aria-labelledby="research-areas-heading">
          <h2 id="research-areas-heading" className="sr-only">Research Areas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* NANDA Monitoring Card */}
          <article>
            <Link href="/research/monitoring" className="group block h-full focus:outline-none focus:ring-2 focus:ring-[#3FD3C6] focus:ring-offset-2 focus:ring-offset-[#0D1B2A]">
              <div className="h-full p-6 bg-[#1B263B]/50 backdrop-blur-sm border border-[#415A77]/30 hover:border-[#3FD3C6]/50 transition-all duration-300">
                <header className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-[#3FD3C6] flex items-center justify-center mr-3" aria-hidden="true">
                    <svg className="w-6 h-6 text-[#0D1B2A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-light text-[#F8F8F2] group-hover:text-[#3FD3C6] transition-colors">
                    NANDA Monitoring
                  </h3>
                </header>
                <p className="text-[#415A77] mb-3 font-light leading-relaxed">
                  Real-time operational monitoring for the NANDA index system with comprehensive
                  health metrics and SLO tracking.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-[#415A77]/20 text-[#E0E1DD] text-xs">Operations</span>
                  <span className="px-2 py-1 bg-[#415A77]/20 text-[#E0E1DD] text-xs">Metrics</span>
                  <span className="px-2 py-1 bg-[#415A77]/20 text-[#E0E1DD] text-xs">SLOs</span>
                </div>
              </div>
            </Link>
          </article>

          {/* Agent Architecture Card */}
          <article className="p-6 bg-[#1B263B]/30 border border-[#415A77]/20 opacity-75">
            <header className="flex items-center mb-3">
              <div className="w-10 h-10 bg-[#415A77]/50 flex items-center justify-center mr-3" aria-hidden="true">
                <svg className="w-6 h-6 text-[#E0E1DD]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-light text-[#415A77]">
                Agent Architecture
              </h3>
            </header>
            <p className="text-[#415A77]/70 mb-3 font-light leading-relaxed">
              Deep dive into the NANDA agent discovery infrastructure and distributed
              systems architecture.
            </p>
            <p className="text-sm text-[#415A77]/60 font-light" role="status" aria-label="Status: Coming soon">Coming soon</p>
          </article>

          {/* Performance Analysis Card */}
          <article className="p-6 bg-[#1B263B]/30 border border-[#415A77]/20 opacity-75">
            <header className="flex items-center mb-3">
              <div className="w-10 h-10 bg-[#415A77]/50 flex items-center justify-center mr-3" aria-hidden="true">
                <svg className="w-6 h-6 text-[#E0E1DD]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-light text-[#415A77]">
                Performance Analysis
              </h3>
            </header>
            <p className="text-[#415A77]/70 mb-3 font-light leading-relaxed">
              Benchmarks, optimization strategies, and performance tuning for
              high-scale AI agent operations.
            </p>
            <p className="text-sm text-[#415A77]/60 font-light" role="status" aria-label="Status: Coming soon">Coming soon</p>
          </article>

          {/* Security & Privacy Card */}
          <article className="p-6 bg-[#1B263B]/30 border border-[#415A77]/20 opacity-75">
            <header className="flex items-center mb-3">
              <div className="w-10 h-10 bg-[#415A77]/50 flex items-center justify-center mr-3" aria-hidden="true">
                <svg className="w-6 h-6 text-[#E0E1DD]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-light text-[#415A77]">
                Security & Privacy
              </h3>
            </header>
            <p className="text-[#415A77]/70 mb-3 font-light leading-relaxed">
              Zero-knowledge proofs, mix networks, and privacy-preserving
              agent discovery mechanisms.
            </p>
            <p className="text-sm text-[#415A77]/60 font-light" role="status" aria-label="Status: Coming soon">Coming soon</p>
          </article>

          {/* Integration Guides Card */}
          <article className="p-6 bg-[#1B263B]/30 border border-[#415A77]/20 opacity-75">
            <header className="flex items-center mb-3">
              <div className="w-10 h-10 bg-[#415A77]/50 flex items-center justify-center mr-3" aria-hidden="true">
                <svg className="w-6 h-6 text-[#E0E1DD]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-light text-[#415A77]">
                Integration Guides
              </h3>
            </header>
            <p className="text-[#415A77]/70 mb-3 font-light leading-relaxed">
              Step-by-step guides for integrating with OpenAI, Anthropic,
              Google A2A, and other platforms.
            </p>
            <p className="text-sm text-[#415A77]/60 font-light" role="status" aria-label="Status: Coming soon">Coming soon</p>
          </article>

          {/* Case Studies Card */}
          <article className="p-6 bg-[#1B263B]/30 border border-[#415A77]/20 opacity-75">
            <header className="flex items-center mb-3">
              <div className="w-10 h-10 bg-[#415A77]/50 flex items-center justify-center mr-3" aria-hidden="true">
                <svg className="w-6 h-6 text-[#E0E1DD]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-light text-[#415A77]">
                Case Studies
              </h3>
            </header>
            <p className="text-[#415A77]/70 mb-3 font-light leading-relaxed">
              Real-world implementations and success stories from production
              deployments at scale.
            </p>
            <p className="text-sm text-[#415A77]/60 font-light" role="status" aria-label="Status: Coming soon">Coming soon</p>
          </article>
          </div>
        </section>

        <aside className="mt-12 p-6 bg-[#1B263B]/30 border border-[#3FD3C6]/20 backdrop-blur-sm" aria-labelledby="docs-hub-heading">
          <h2 id="docs-hub-heading" className="text-lg font-light text-[#F8F8F2] mb-2 flex items-center">
            <svg className="w-5 h-5 mr-2 text-[#3FD3C6]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Documentation Hub
          </h2>
          <p className="text-[#415A77] mb-4 font-light leading-relaxed">
            Looking for comprehensive documentation? Visit our main docs portal for
            API references, developer guides, and more.
          </p>
          <Link
            href="/docs"
            className="inline-flex items-center px-6 py-3 bg-[#3FD3C6] text-[#0D1B2A] font-light hover:bg-[#3FD3C6]/90 focus:outline-none focus:ring-2 focus:ring-[#3FD3C6] focus:ring-offset-2 focus:ring-offset-[#0D1B2A] transition-all duration-300"
          >
            Browse Documentation
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </aside>
      </div>
    </div>
  )
}
