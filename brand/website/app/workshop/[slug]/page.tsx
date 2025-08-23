import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getWorkshopProject, getWorkshopSlugs } from '../../../lib/workshop/utils'
import { sanitizeProjectForPublic } from '../../../lib/workshop/privacy'
import { getStatusColor, formatDate } from '../../../lib/workshop/utils'
import ArchitectureVisualization from '../../../components/workshop/ArchitectureVisualization'
import TelemetryChart from '../../../components/workshop/TelemetryChart'
import { MDXRemote } from 'next-mdx-remote/rsc'

export async function generateStaticParams() {
  const slugs = getWorkshopSlugs()
  return slugs.map((slug) => ({
    slug: slug,
  }))
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const project = await getWorkshopProject(params.slug)
  
  if (!project || !project.safe_public) {
    return {
      title: 'Project Not Found - Candlefish Workshop',
    }
  }

  const sanitized = sanitizeProjectForPublic(project)

  return {
    title: `${sanitized.title} - Candlefish Workshop`,
    description: `${sanitized.status} project in ${sanitized.domain.join(', ')}. ${sanitized.client_name}.`,
    openGraph: {
      title: sanitized.title,
      description: `${sanitized.status} - Updated ${formatDate(sanitized.updated_at)}`,
      type: 'article',
      publishedTime: sanitized.updated_at,
    },
  }
}

export default async function WorkshopDetail({ params }: { params: { slug: string } }) {
  const project = await getWorkshopProject(params.slug)
  
  if (!project || !project.safe_public) {
    notFound()
  }

  const sanitized = sanitizeProjectForPublic(project)

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
        {/* Header */}
        <header className="border-b border-[#333] px-6 py-4 relative">
          <div className="absolute left-0 bottom-0 w-full h-px bg-gradient-to-r from-transparent via-[#3FD3C6]/20 to-transparent" />
          <div className="max-w-5xl mx-auto">
            <Link href="/workshop" className="text-xs text-[#888] hover:text-[#3FD3C6] transition-colors">
              ← Back to Workshop
            </Link>
            <div className="flex justify-between items-start mt-4">
              <div>
                <h1 className="text-3xl text-[#fff] mb-2">{sanitized.title}</h1>
                <p className="text-sm text-[#666]">{sanitized.client_name}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 text-sm border ${getStatusColor(sanitized.status)}`}>
                  {sanitized.status}
                </span>
                <div className="text-xs text-[#666]">
                  Updated {formatDate(sanitized.updated_at)}
                </div>
              </div>
            </div>
          </div>
        </header>

        <article className="max-w-5xl mx-auto px-6 py-8">
          {/* Overview Section */}
          <section className="mb-12">
            <h2 className="text-xs uppercase text-[#888] mb-4">Overview</h2>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <h3 className="text-xs text-[#666] mb-1">Domains</h3>
                <div className="flex flex-wrap gap-2">
                  {sanitized.domain.map((d: string) => (
                    <span key={d} className="px-2 py-1 text-xs bg-[#1a1a1a] text-[#888] rounded">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs text-[#666] mb-1">Complexity</h3>
                <p className="text-sm text-[#fff]">{sanitized.complexity}</p>
              </div>
              <div>
                <h3 className="text-xs text-[#666] mb-1">Impact</h3>
                <p className="text-sm text-[#fff]">{sanitized.impact}</p>
              </div>
            </div>
          </section>

          {/* Metrics Section */}
          {sanitized.metrics && Object.keys(sanitized.metrics).length > 0 && (
            <section className="mb-12">
              <h2 className="text-xs uppercase text-[#888] mb-4">Live Metrics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {Object.entries(sanitized.metrics).map(([key, value]) => (
                  <div key={key} className="border border-[#333] p-4">
                    <h3 className="text-xs text-[#666] mb-2">
                      {key.replace(/_/g, ' ').replace(/pct/g, '%').toUpperCase()}
                    </h3>
                    <p className="text-2xl text-[#3FD3C6]">{value}</p>
                  </div>
                ))}
              </div>
              
              {/* Telemetry visualization */}
              <div className="mt-6">
                <TelemetryChart metrics={sanitized.metrics} />
              </div>
            </section>
          )}

          {/* Architecture Section */}
          {sanitized.architecture && (
            <section className="mb-12">
              <h2 className="text-xs uppercase text-[#888] mb-4">Architecture</h2>
              <div className="border border-[#333] p-6 bg-[#050505] rounded">
                <ArchitectureVisualization 
                  nodes={sanitized.architecture.nodes}
                  links={sanitized.architecture.links}
                />
              </div>
              
              {/* Stack */}
              {sanitized.stack && sanitized.stack.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-xs text-[#666] mb-2">Technology Stack</h3>
                  <div className="flex flex-wrap gap-2">
                    {sanitized.stack.map((tech: string) => (
                      <span key={tech} className="px-3 py-1 text-xs border border-[#333] text-[#888]">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Content Section */}
          {sanitized.content && (
            <section className="mb-12 prose prose-invert prose-sm max-w-none">
              <MDXRemote source={sanitized.content} />
            </section>
          )}

          {/* Changelog Section */}
          {sanitized.changelog && sanitized.changelog.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xs uppercase text-[#888] mb-4">Changelog</h2>
              <div className="space-y-4">
                {sanitized.changelog.map((entry: any, index: number) => (
                  <div key={index} className="border-l-2 border-[#333] pl-4">
                    <div className="text-xs text-[#666] mb-1">{entry.date}</div>
                    <p className="text-sm text-[#d4d4d4]">{entry.entry}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Next Milestone */}
          {sanitized.next_milestone && (
            <section className="mb-12">
              <h2 className="text-xs uppercase text-[#888] mb-4">Next Milestone</h2>
              <div className="border border-[#3FD3C6]/30 bg-[#3FD3C6]/5 p-6 rounded">
                <h3 className="text-lg text-[#3FD3C6] mb-2">{sanitized.next_milestone.name}</h3>
                <p className="text-sm text-[#888]">Target: {sanitized.next_milestone.eta}</p>
              </div>
            </section>
          )}

          {/* Links */}
          {sanitized.links && (
            <section className="mb-12">
              <h2 className="text-xs uppercase text-[#888] mb-4">Resources</h2>
              <div className="flex gap-4">
                {sanitized.links.repo && (
                  <a 
                    href={sanitized.links.repo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-xs border border-[#333] text-[#888] hover:text-[#3FD3C6] hover:border-[#3FD3C6] transition-colors"
                  >
                    Repository →
                  </a>
                )}
                {sanitized.links.design && (
                  <a 
                    href={sanitized.links.design}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-xs border border-[#333] text-[#888] hover:text-[#3FD3C6] hover:border-[#3FD3C6] transition-colors"
                  >
                    Design →
                  </a>
                )}
                {sanitized.links.doc && (
                  <a 
                    href={sanitized.links.doc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-xs border border-[#333] text-[#888] hover:text-[#3FD3C6] hover:border-[#3FD3C6] transition-colors"
                  >
                    Documentation →
                  </a>
                )}
              </div>
            </section>
          )}
        </article>
      </div>
    </main>
  )
}