import { Metadata } from 'next'
import { GraphQLPlayground } from '@/components/sections/GraphQLPlayground'
import { QueryHistory } from '@/components/sections/QueryHistory'
import { SchemaExplorer } from '@/components/sections/SchemaExplorer'

export const metadata: Metadata = {
  title: 'GraphQL Playground - Candlefish AI API',
  description: 'Interactive GraphQL playground to explore and test the Candlefish AI API.',
}

export default function PlaygroundPage() {
  return (
    <div className="min-h-screen bg-[#0b0f13]">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl lg:text-5xl font-bold text-[#e6f9f6] mb-4">
            GraphQL Playground
          </h1>
          <p className="text-lg text-[#a3b3bf]">
            Interactive environment to explore and test GraphQL queries, mutations, and subscriptions.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
          {/* Schema Explorer - Left Sidebar */}
          <div className="lg:col-span-1">
            <SchemaExplorer />
          </div>

          {/* Main Playground */}
          <div className="lg:col-span-2">
            <GraphQLPlayground />
          </div>

          {/* Query History - Right Sidebar */}
          <div className="lg:col-span-1">
            <QueryHistory />
          </div>
        </div>
      </div>
    </div>
  )
}
