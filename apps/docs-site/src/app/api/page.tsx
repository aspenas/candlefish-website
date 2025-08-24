import { Metadata } from 'next'
import { ApiExplorer } from '@/components/sections/ApiExplorer'
import { OpenApiViewer } from '@/components/sections/OpenApiViewer'

export const metadata: Metadata = {
  title: 'API Reference - Candlefish AI Documentation',
  description: 'Complete API reference for Candlefish AI platform with interactive examples and testing tools.',
}

export default function ApiPage() {
  return (
    <div className="min-h-screen bg-[#0b0f13]">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl lg:text-6xl font-bold text-[#e6f9f6] mb-6">
              API Reference
            </h1>
            <p className="text-xl text-[#a3b3bf] leading-relaxed">
              Comprehensive reference for all Candlefish AI endpoints, with interactive examples and real-time testing.
            </p>
          </div>

          {/* API Explorer */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <ApiExplorer />
            <OpenApiViewer />
          </div>
        </div>
      </div>
    </div>
  )
}
