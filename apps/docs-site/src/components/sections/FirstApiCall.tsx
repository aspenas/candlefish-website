'use client'

import { useState } from 'react'
import { Card, Button } from '@candlefish-ai/shared'
import { Zap, Play, Copy, Check } from 'lucide-react'

export function FirstApiCall() {
  const [copied, setCopied] = useState(false)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState('')

  const exampleCode = `const candlefish = new CandlefishAI({
  apiKey: process.env.CANDLEFISH_API_KEY
});

const response = await candlefish.agents.create({
  name: "My First Agent",
  description: "A simple AI agent to get started",
  capabilities: ["text-processing", "data-analysis"]
});

console.log("Agent created:", response.data);`

  const copyCode = () => {
    navigator.clipboard.writeText(exampleCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const runExample = () => {
    setRunning(true)
    // Simulate API call
    setTimeout(() => {
      setResult(`{
  "success": true,
  "data": {
    "id": "agent_12345",
    "name": "My First Agent",
    "description": "A simple AI agent to get started",
    "status": "active",
    "capabilities": ["text-processing", "data-analysis"],
    "created_at": "${new Date().toISOString()}"
  }
}`)
      setRunning(false)
    }, 2000)
  }

  return (
    <Card className="p-8 bg-[#0f172a]/50 border-[#0f172a]/20">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-[#f59e0b]/20 rounded-lg">
          <Zap className="h-6 w-6 text-[#f59e0b]" />
        </div>
        <h2 className="text-2xl font-bold text-[#e6f9f6]">Your First API Call</h2>
      </div>

      {/* Code Example */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-[#e6f9f6]">Example Code</h3>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyCode}
            >
              {copied ? (
                <Check className="h-4 w-4 text-[#10b981]" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="sm"
              onClick={runExample}
              disabled={running}
            >
              <Play className="h-4 w-4 mr-2" />
              {running ? 'Running...' : 'Try It'}
            </Button>
          </div>
        </div>

        <div className="bg-[#0b0f13] rounded-lg p-4 border border-[#0f172a]/20 overflow-x-auto">
          <pre className="text-sm">
            <code className="text-[#e6f9f6]">
              <span className="text-[#22d3ee]">const</span> <span className="text-[#f59e0b]">candlefish</span> <span className="text-[#a3b3bf]">=</span> <span className="text-[#22d3ee]">new</span> <span className="text-[#14b8a6]">CandlefishAI</span>({'{'}
              {'\n'}  <span className="text-[#f59e0b]">apiKey</span>: <span className="text-[#a3b3bf]">process.env.CANDLEFISH_API_KEY</span>
              {'\n'}{'}'});
              {'\n'}
              {'\n'}<span className="text-[#22d3ee]">const</span> <span className="text-[#f59e0b]">response</span> <span className="text-[#a3b3bf]">=</span> <span className="text-[#22d3ee]">await</span> <span className="text-[#f59e0b]">candlefish</span>.<span className="text-[#14b8a6]">agents</span>.<span className="text-[#14b8a6]">create</span>({'{'}
              {'\n'}  <span className="text-[#f59e0b]">name</span>: <span className="text-[#10b981]">"My First Agent"</span>,
              {'\n'}  <span className="text-[#f59e0b]">description</span>: <span className="text-[#10b981]">"A simple AI agent to get started"</span>,
              {'\n'}  <span className="text-[#f59e0b]">capabilities</span>: [<span className="text-[#10b981]">"text-processing"</span>, <span className="text-[#10b981]">"data-analysis"</span>]
              {'\n'}{'}'});
              {'\n'}
              {'\n'}<span className="text-[#a3b3bf]">console.log</span>(<span className="text-[#10b981]">"Agent created:"</span>, <span className="text-[#f59e0b]">response</span>.<span className="text-[#14b8a6]">data</span>);
            </code>
          </pre>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div>
          <h3 className="text-lg font-semibold text-[#e6f9f6] mb-3">Response</h3>
          <div className="bg-[#0b0f13] rounded-lg p-4 border border-[#0f172a]/20">
            <pre className="text-sm text-[#10b981] overflow-x-auto">
              {result}
            </pre>
          </div>
        </div>
      )}

      {/* Next Steps */}
      <div className="mt-8 p-4 bg-[#14b8a6]/10 border border-[#14b8a6]/20 rounded-lg">
        <h4 className="text-[#14b8a6] font-medium text-sm mb-2">Next Steps</h4>
        <ul className="text-[#a3b3bf] text-sm space-y-1">
          <li>• Explore more agent capabilities</li>
          <li>• Set up webhooks for real-time updates</li>
          <li>• Check out our advanced examples</li>
        </ul>
      </div>
    </Card>
  )
}
