import { Metadata } from 'next'
import { RESTExplorer } from '@/components/sections/RESTExplorer'
import { EndpointsList } from '@/components/sections/EndpointsList'

export const metadata: Metadata = {
  title: 'REST API Explorer - Candlefish AI API',
  description: 'Interactive REST API testing interface for Candlefish AI platform.',
}

export default function RESTPage() {
  return (
    <div className="min-h-screen bg-[#0b0f13]">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl lg:text-5xl font-bold text-[#e6f9f6] mb-4">
            REST API Explorer
          </h1>
          <p className="text-lg text-[#a3b3bf]">
            Test and explore REST API endpoints with request/response history and authentication.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Endpoints List */}
          <div className="lg:col-span-1">
            <EndpointsList />
          </div>

          {/* REST Explorer */}
          <div className="lg:col-span-2">
            <RESTExplorer />
          </div>
        </div>
      </div>
    </div>
  )
}
