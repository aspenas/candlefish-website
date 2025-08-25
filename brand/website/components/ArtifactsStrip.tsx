'use client'

import React from 'react'
import Link from 'next/link'

interface Package {
  name: string
  version: string
  description: string
  publishedDate: string
  npmUrl: string
  githubUrl?: string
  bundleSize?: string
  hasTypes?: boolean
  snippet?: string
  whyOpenSourced: string
}

const packages: Package[] = [
  {
    name: 'candlefish-claude-deploy',
    version: '1.0.2',
    description: 'Automated deployment toolkit for Claude Code projects',
    publishedDate: '2025-08-15',
    npmUrl: 'https://www.npmjs.com/package/candlefish-claude-deploy',
    hasTypes: true,
    whyOpenSourced: 'Simplifies Claude Code deployment workflows',
    snippet: `import { deploy } from 'candlefish-claude-deploy'
await deploy({ project: 'my-app' })`
  },
  {
    name: '@candlefish/react-components',
    version: '0.3.1',
    description: 'Operational UI components for React applications',
    publishedDate: '2025-08-10',
    npmUrl: 'https://www.npmjs.com/package/@candlefish/react-components',
    bundleSize: '42kb',
    hasTypes: true,
    whyOpenSourced: 'Share our battle-tested UI patterns',
    snippet: `import { OperationalMatrix } from '@candlefish/react-components'
<OperationalMatrix data={metrics} />`
  },
  {
    name: '@candlefish/team-setup',
    version: '0.1.5',
    description: 'Development environment setup for operational teams',
    publishedDate: '2025-08-01',
    npmUrl: 'https://www.npmjs.com/package/@candlefish/team-setup',
    hasTypes: false,
    whyOpenSourced: 'Standardize dev environments across teams',
    snippet: `npx @candlefish/team-setup init
# Configures ESLint, TypeScript, Git hooks`
  }
]

export const ArtifactsStrip: React.FC = () => {
  const [expandedPackage, setExpandedPackage] = React.useState<string | null>(null)

  return (
    <section className="py-16 bg-[#0a0a0a] border-t border-b border-[#333]">
      <div className="max-w-7xl mx-auto px-6">
        <header className="mb-8">
          <h2 className="text-2xl text-[#fff] font-light mb-2">Published Artifacts</h2>
          <p className="text-sm text-[#666]">
            Real tools from real operational work. Open-sourced for verification.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <article
              key={pkg.name}
              className="border border-[#333] hover:border-[#3FD3C6]/50 transition-all"
            >
              <div className="p-4">
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-sm text-[#3FD3C6] font-mono">{pkg.name}</h3>
                    <p className="text-xs text-[#666] mt-1">v{pkg.version} · {pkg.publishedDate}</p>
                  </div>
                  <div className="flex gap-2">
                    {pkg.hasTypes && (
                      <span className="text-xs px-2 py-0.5 bg-[#1a1a1a] text-[#888] rounded">TS</span>
                    )}
                    {pkg.bundleSize && (
                      <span className="text-xs px-2 py-0.5 bg-[#1a1a1a] text-[#888] rounded">
                        {pkg.bundleSize}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-[#aaa] mb-3">{pkg.description}</p>

                {/* Why open-sourced */}
                <p className="text-xs text-[#666] italic mb-3">
                  "{pkg.whyOpenSourced}"
                </p>

                {/* Toggle snippet */}
                <button
                  onClick={() => setExpandedPackage(expandedPackage === pkg.name ? null : pkg.name)}
                  className="text-xs text-[#6666ff] hover:text-[#8888ff] transition-colors"
                >
                  {expandedPackage === pkg.name ? 'Hide' : 'Show'} example
                </button>

                {/* Expandable snippet */}
                {expandedPackage === pkg.name && pkg.snippet && (
                  <div className="mt-3 p-3 bg-[#050505] border border-[#333] rounded">
                    <pre className="text-xs text-[#888] overflow-x-auto">
                      <code>{pkg.snippet}</code>
                    </pre>
                  </div>
                )}

                {/* Links */}
                <div className="mt-3 pt-3 border-t border-[#333] flex gap-3">
                  <a
                    href={pkg.npmUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#6666ff] hover:text-[#8888ff] transition-colors"
                  >
                    npm →
                  </a>
                  {pkg.githubUrl && (
                    <a
                      href={pkg.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#6666ff] hover:text-[#8888ff] transition-colors"
                    >
                      github →
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
