'use client'

import { useState } from 'react'
import { Card, Button } from '@candlefish-ai/shared'
import { Terminal, Copy, Check } from 'lucide-react'

export function InstallationGuide() {
  const [selectedLanguage, setSelectedLanguage] = useState('javascript')
  const [copiedCommand, setCopiedCommand] = useState('')

  const languages = {
    javascript: {
      name: 'JavaScript',
      install: 'npm install @candlefish-ai/sdk',
      import: 'import { CandlefishAI } from "@candlefish-ai/sdk"'
    },
    python: {
      name: 'Python',
      install: 'pip install candlefish-ai',
      import: 'from candlefish_ai import CandlefishAI'
    },
    curl: {
      name: 'cURL',
      install: '# No installation required',
      import: 'curl -H "Authorization: Bearer YOUR_TOKEN"'
    },
    go: {
      name: 'Go',
      install: 'go get github.com/candlefish-ai/go-sdk',
      import: 'import "github.com/candlefish-ai/go-sdk"'
    }
  }

  const copyToClipboard = (text: string, command: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCommand(command)
    setTimeout(() => setCopiedCommand(''), 2000)
  }

  return (
    <Card className="p-8 bg-[#0f172a]/50 border-[#0f172a]/20">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-[#22d3ee]/20 rounded-lg">
          <Terminal className="h-6 w-6 text-[#22d3ee]" />
        </div>
        <h2 className="text-2xl font-bold text-[#e6f9f6]">Installation</h2>
      </div>

      {/* Language Selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(languages).map(([key, lang]) => (
          <Button
            key={key}
            variant={selectedLanguage === key ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedLanguage(key)}
          >
            {lang.name}
          </Button>
        ))}
      </div>

      {/* Installation Command */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-[#e6f9f6] mb-3">Install SDK</h3>
        <div className="relative">
          <div className="bg-[#0b0f13] rounded-lg p-4 border border-[#0f172a]/20">
            <code className="text-[#14b8a6] text-sm font-mono">
              {languages[selectedLanguage as keyof typeof languages].install}
            </code>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2"
            onClick={() => copyToClipboard(
              languages[selectedLanguage as keyof typeof languages].install,
              'install'
            )}
          >
            {copiedCommand === 'install' ? (
              <Check className="h-4 w-4 text-[#10b981]" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Import Statement */}
      <div>
        <h3 className="text-lg font-semibold text-[#e6f9f6] mb-3">Import</h3>
        <div className="relative">
          <div className="bg-[#0b0f13] rounded-lg p-4 border border-[#0f172a]/20">
            <code className="text-[#22d3ee] text-sm font-mono">
              {languages[selectedLanguage as keyof typeof languages].import}
            </code>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2"
            onClick={() => copyToClipboard(
              languages[selectedLanguage as keyof typeof languages].import,
              'import'
            )}
          >
            {copiedCommand === 'import' ? (
              <Check className="h-4 w-4 text-[#10b981]" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
}
