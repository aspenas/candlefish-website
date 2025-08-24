import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CodeBlock } from '@candlefish-ai/shared'
import { Zap, Terminal, Rocket, Shield } from 'lucide-react'

const quickStartSteps = [
  {
    icon: Shield,
    title: 'Get API Key',
    description: 'Sign up and get your API key from the dashboard',
    code: `curl -H "Authorization: Bearer YOUR_API_KEY" \\
  https://api.candlefish.ai/v1/status`,
    href: '/authentication'
  },
  {
    icon: Terminal,
    title: 'Install SDK',
    description: 'Choose your preferred language and install our SDK',
    code: `npm install @candlefish-ai/sdk
# or
pip install candlefish-ai
# or  
go get github.com/candlefish-ai/go-sdk`,
    href: '/sdks'
  },
  {
    icon: Zap,
    title: 'Make First Call',
    description: 'Send your first request and see the magic happen',
    code: `import { CandlefishAI } from '@candlefish-ai/sdk'

const client = new CandlefishAI({
  apiKey: 'your-api-key'
})

const response = await client.analyze({
  text: 'Hello, Candlefish!'
})`,
    href: '/getting-started/first-request'
  },
  {
    icon: Rocket,
    title: 'Build & Deploy',
    description: 'Scale your application with production-ready patterns',
    code: `// Production-ready configuration
const client = new CandlefishAI({
  apiKey: process.env.CANDLEFISH_API_KEY,
  timeout: 30000,
  retries: 3,
  environment: 'production'
})`,
    href: '/guides/production'
  }
]

export function QuickStartSection() {
  return (
    <section className="py-20 lg:py-32 bg-white">
      <div className="docs-container">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-charcoal mb-6">
            Get Started in Minutes
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Follow these simple steps to integrate Candlefish AI into your application. 
            From authentication to your first API call.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {quickStartSteps.map((step, index) => {
            const Icon = step.icon
            return (
              <Card key={step.title} className="group hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-amber-100 to-amber-200 rounded-lg group-hover:from-amber-200 group-hover:to-amber-300 transition-colors">
                      <Icon className="w-6 h-6 text-amber-700" />
                    </div>
                    <div className="flex items-center justify-center w-8 h-8 bg-deep-indigo text-white rounded-full text-sm font-semibold">
                      {index + 1}
                    </div>
                  </div>
                  <CardTitle className="text-xl">{step.title}</CardTitle>
                  <CardDescription>{step.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <CodeBlock
                      code={step.code}
                      language={step.code.includes('curl') ? 'bash' : step.code.includes('pip') ? 'bash' : 'javascript'}
                      showLineNumbers={false}
                    />
                  </div>
                  <Link
                    href={step.href}
                    className="text-amber-600 hover:text-amber-700 font-medium text-sm inline-flex items-center group/link"
                  >
                    Learn more
                    <svg
                      className="w-4 h-4 ml-1 transition-transform group-hover/link:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Continue Learning */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-lg">
            <Zap className="w-5 h-5 text-amber-600 mr-2" />
            <span className="text-amber-800 font-medium mr-4">Ready for more?</span>
            <Link
              href="/guides"
              className="text-amber-600 hover:text-amber-700 font-semibold underline"
            >
              Explore Advanced Guides
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}