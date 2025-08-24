'use client'

import { useState } from 'react'
import { Card, Button, Spinner } from '@candlefish-ai/shared'
import { Play, Save, Download, Settings } from 'lucide-react'

export function GraphQLPlayground() {
  const [query, setQuery] = useState(`query GetAgents($limit: Int = 10) {
  agents(limit: $limit) {
    id
    name
    description
    status
    capabilities
    createdAt
    updatedAt
  }
}`)

  const [variables, setVariables] = useState(`{
  "limit": 5
}`)

  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState('')
  const [headers, setHeaders] = useState(`{
  "Authorization": "Bearer YOUR_TOKEN",
  "Content-Type": "application/json"
}`)

  const executeQuery = async () => {
    setLoading(true)

    // Simulate GraphQL API call
    setTimeout(() => {
      setResponse(JSON.stringify({
        data: {
          agents: [
            {
              id: 'agent_1',
              name: 'Text Processor',
              description: 'Agent specialized in text processing and analysis',
              status: 'active',
              capabilities: ['text-processing', 'sentiment-analysis'],
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z'
            },
            {
              id: 'agent_2',
              name: 'Data Analyzer',
              description: 'Agent for data analysis and reporting',
              status: 'active',
              capabilities: ['data-analysis', 'reporting'],
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z'
            }
          ]
        }
      }, null, 2))
      setLoading(false)
    }, 1500)
  }

  const saveQuery = () => {
    const savedQueries = JSON.parse(localStorage.getItem('graphql-queries') || '[]')
    const newQuery = {
      id: Date.now(),
      name: `Query ${savedQueries.length + 1}`,
      query,
      variables,
      timestamp: new Date().toISOString()
    }
    savedQueries.push(newQuery)
    localStorage.setItem('graphql-queries', JSON.stringify(savedQueries))
  }

  return (
    <Card className="h-full flex flex-col bg-[#0f172a]/50 border-[#0f172a]/20">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#0f172a]/20">
        <h3 className="text-lg font-semibold text-[#e6f9f6]">Query Editor</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={saveQuery}>
            <Save className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={executeQuery} disabled={loading}>
            {loading ? <Spinner size="sm" /> : <Play className="h-4 w-4" />}
            {loading ? 'Running...' : 'Execute'}
          </Button>
        </div>
      </div>

      {/* Query Editor */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 grid grid-rows-2 gap-1">
          {/* Query */}
          <div className="flex flex-col min-h-0">
            <div className="px-4 py-2 text-sm font-medium text-[#a3b3bf] bg-[#0b0f13]/50">
              Query
            </div>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 p-4 bg-[#0b0f13] text-[#e6f9f6] font-mono text-sm border-0 outline-0 resize-none focus:ring-2 focus:ring-[#14b8a6] rounded-none"
              placeholder="Enter your GraphQL query..."
              spellCheck={false}
            />
          </div>

          {/* Variables & Headers */}
          <div className="grid grid-cols-2 gap-1 min-h-0">
            <div className="flex flex-col min-h-0">
              <div className="px-4 py-2 text-sm font-medium text-[#a3b3bf] bg-[#0b0f13]/50">
                Variables
              </div>
              <textarea
                value={variables}
                onChange={(e) => setVariables(e.target.value)}
                className="flex-1 p-4 bg-[#0b0f13] text-[#e6f9f6] font-mono text-sm border-0 outline-0 resize-none focus:ring-2 focus:ring-[#14b8a6] rounded-none"
                placeholder="Enter variables..."
                spellCheck={false}
              />
            </div>
            <div className="flex flex-col min-h-0">
              <div className="px-4 py-2 text-sm font-medium text-[#a3b3bf] bg-[#0b0f13]/50">
                Headers
              </div>
              <textarea
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
                className="flex-1 p-4 bg-[#0b0f13] text-[#e6f9f6] font-mono text-sm border-0 outline-0 resize-none focus:ring-2 focus:ring-[#14b8a6] rounded-none"
                placeholder="Enter headers..."
                spellCheck={false}
              />
            </div>
          </div>
        </div>

        {/* Response */}
        {response && (
          <div className="border-t border-[#0f172a]/20">
            <div className="px-4 py-2 text-sm font-medium text-[#a3b3bf] bg-[#0b0f13]/50 flex items-center justify-between">
              Response
              <span className="text-xs text-[#10b981] bg-[#10b981]/20 px-2 py-1 rounded">
                200 OK
              </span>
            </div>
            <div className="p-4 bg-[#0b0f13] max-h-64 overflow-auto">
              <pre className="text-[#10b981] text-sm font-mono">{response}</pre>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
