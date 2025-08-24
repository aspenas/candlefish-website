'use client'

import { Card } from '@candlefish-ai/shared'
import { FileText, ExternalLink } from 'lucide-react'

export function OpenApiViewer() {
  return (
    <Card className="p-6 bg-[#0f172a]/50 border-[#0f172a]/20">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-[#22d3ee]/20 rounded-lg">
          <FileText className="h-5 w-5 text-[#22d3ee]" />
        </div>
        <h3 className="text-xl font-semibold text-[#e6f9f6]">OpenAPI Specification</h3>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-[#a3b3bf] mb-2">Schema Version</h4>
          <div className="bg-[#0b0f13] rounded-lg p-3 border border-[#0f172a]/20">
            <span className="text-[#14b8a6] font-mono">v2.1.0</span>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-[#a3b3bf] mb-2">Base URL</h4>
          <div className="bg-[#0b0f13] rounded-lg p-3 border border-[#0f172a]/20">
            <span className="text-[#e6f9f6] font-mono">https://api.candlefish.ai</span>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-[#a3b3bf] mb-2">Authentication</h4>
          <div className="bg-[#0b0f13] rounded-lg p-3 border border-[#0f172a]/20">
            <div className="text-[#e6f9f6] text-sm">Bearer Token</div>
            <div className="text-[#a3b3bf] text-xs mt-1">
              Include your API key in the Authorization header
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-[#a3b3bf] mb-2">Available Formats</h4>
          <div className="space-y-2">
            <a
              href="/openapi.json"
              className="flex items-center justify-between p-3 bg-[#0b0f13] rounded-lg border border-[#0f172a]/20 hover:bg-[#0f172a]/30 transition-colors"
            >
              <div>
                <div className="text-[#e6f9f6] text-sm font-medium">JSON</div>
                <div className="text-[#a3b3bf] text-xs">Machine-readable format</div>
              </div>
              <ExternalLink className="h-4 w-4 text-[#a3b3bf]" />
            </a>
            <a
              href="/openapi.yaml"
              className="flex items-center justify-between p-3 bg-[#0b0f13] rounded-lg border border-[#0f172a]/20 hover:bg-[#0f172a]/30 transition-colors"
            >
              <div>
                <div className="text-[#e6f9f6] text-sm font-medium">YAML</div>
                <div className="text-[#a3b3bf] text-xs">Human-readable format</div>
              </div>
              <ExternalLink className="h-4 w-4 text-[#a3b3bf]" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-[#a3b3bf] mb-2">Endpoints Summary</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0b0f13] rounded-lg p-3 border border-[#0f172a]/20">
              <div className="text-[#e6f9f6] text-lg font-semibold">47</div>
              <div className="text-[#a3b3bf] text-xs">Total Endpoints</div>
            </div>
            <div className="bg-[#0b0f13] rounded-lg p-3 border border-[#0f172a]/20">
              <div className="text-[#e6f9f6] text-lg font-semibold">12</div>
              <div className="text-[#a3b3bf] text-xs">Resource Types</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
