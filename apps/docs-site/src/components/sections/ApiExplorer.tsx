'use client'

import { useState } from 'react'
import { Card, Button, DropdownMenu, DropdownTrigger, DropdownContent, DropdownItem } from '@candlefish-ai/shared'
import { Play, Copy, Code, Zap } from 'lucide-react'

interface ApiEndpoint {
  id: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  description: string
  category: string
}

const endpoints: ApiEndpoint[] = [
  {
    id: 'get-agents',
    method: 'GET',
    path: '/agents',
    description: 'Retrieve all agents',
    category: 'Agents'
  },
  {
    id: 'create-agent',
    method: 'POST',
    path: '/agents',
    description: 'Create a new agent',
    category: 'Agents'
  },
  {
    id: 'get-workflows',
    method: 'GET',
    path: '/workflows',
    description: 'List all workflows',
    category: 'Workflows'
  },
  {
    id: 'execute-workflow',
    method: 'POST',
    path: '/workflows/{id}/execute',
    description: 'Execute a workflow',
    category: 'Workflows'
  },
]

export function ApiExplorer() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint>(endpoints[0])
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<string>('')

  const handleExecute = async () => {
    setLoading(true)
    // Simulate API call
    setTimeout(() => {
      setResponse(JSON.stringify({
        success: true,
        data: {
          id: '123',
          name: 'Sample Agent',
          status: 'active',
          created_at: new Date().toISOString()
        }
      }, null, 2))
      setLoading(false)
    }, 1500)
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'text-[#10b981]'
      case 'POST': return 'text-[#14b8a6]'
      case 'PUT': return 'text-[#f59e0b]'
      case 'DELETE': return 'text-[#ef4444]'
      default: return 'text-[#a3b3bf]'
    }
  }

  return (
    <Card className="p-6 bg-[#0f172a]/50 border-[#0f172a]/20">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-[#14b8a6]/20 rounded-lg">
          <Zap className="h-5 w-5 text-[#14b8a6]" />
        </div>
        <h3 className="text-xl font-semibold text-[#e6f9f6]">API Explorer</h3>
      </div>

      {/* Endpoint Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[#a3b3bf] mb-2">
          Select Endpoint
        </label>
        <DropdownMenu>
          <DropdownTrigger className="w-full justify-start">
            <span className={`font-mono font-semibold ${getMethodColor(selectedEndpoint.method)}`}>
              {selectedEndpoint.method}
            </span>
            <span className="text-[#e6f9f6] ml-2">{selectedEndpoint.path}</span>
          </DropdownTrigger>
          <DropdownContent size="lg">
            {endpoints.map((endpoint) => (
              <DropdownItem
                key={endpoint.id}
                onClick={() => setSelectedEndpoint(endpoint)}
                selected={selectedEndpoint.id === endpoint.id}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-xs font-semibold ${getMethodColor(endpoint.method)}`}>
                      {endpoint.method}
                    </span>
                    <span className="text-[#e6f9f6]">{endpoint.path}</span>
                  </div>
                  <div className="text-xs text-[#a3b3bf] mt-1">
                    {endpoint.description}
                  </div>
                </div>
              </DropdownItem>
            ))}
          </DropdownContent>
        </DropdownMenu>
      </div>

      {/* Request */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-[#a3b3bf]">Request</h4>
          <Button variant="ghost" size="sm">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <div className="bg-[#0b0f13] rounded-lg p-4 border border-[#0f172a]/20">
          <code className="text-[#14b8a6] text-sm">
            curl -X {selectedEndpoint.method} \\<br />
            &nbsp;&nbsp;https://api.candlefish.ai{selectedEndpoint.path} \\<br />
            &nbsp;&nbsp;-H "Authorization: Bearer YOUR_TOKEN" \\<br />
            &nbsp;&nbsp;-H "Content-Type: application/json"
          </code>
        </div>
      </div>

      {/* Execute Button */}
      <div className="mb-6">
        <Button onClick={handleExecute} disabled={loading} className="w-full">
          <Play className="h-4 w-4 mr-2" />
          {loading ? 'Executing...' : 'Execute'}
        </Button>
      </div>

      {/* Response */}
      {response && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-[#a3b3bf]">Response</h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#10b981] bg-[#10b981]/20 px-2 py-1 rounded">200 OK</span>
              <Button variant="ghost" size="sm">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="bg-[#0b0f13] rounded-lg p-4 border border-[#0f172a]/20">
            <pre className="text-sm text-[#e6f9f6] overflow-x-auto">
              {response}
            </pre>
          </div>
        </div>
      )}
    </Card>
  )
}
