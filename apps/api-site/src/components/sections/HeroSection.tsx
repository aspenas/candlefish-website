import Link from 'next/link'
import { Button, CodeBlock } from '@candlefish-ai/shared'
import { Code, Zap, ArrowRight, Play, Shield } from 'lucide-react'

const quickExample = `curl -X POST https://api.candlefish.ai/v1/analyze \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Analyze this with Candlefish AI",
    "model": "candlefish-v2",
    "options": {
      "detailed": true
    }
  }'`

const responseExample = `{
  "id": "analysis_123",
  "status": "completed",
  "result": {
    "confidence": 0.94,
    "categories": ["technology", "ai"],
    "sentiment": "positive",
    "insights": [
      "High technical complexity detected",
      "Innovation-focused content"
    ]
  },
  "processing_time": "0.23s"
}`

const features = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Sub-second response times with global edge caching'
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'SOC 2 compliant with end-to-end encryption'
  },
  {
    icon: Code,
    title: 'Developer Friendly',
    description: 'RESTful APIs with comprehensive SDKs and docs'
  }
]

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-warm-white via-emerald-50/30 to-muted-sand/30 py-20 lg:py-32">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-xl" />
        <div className="absolute top-40 right-20 w-48 h-48 bg-amber-flame/20 rounded-full blur-2xl" />
        <div className="absolute bottom-20 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="api-container relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium">
              <Code className="w-4 h-4 mr-2" />
              Interactive API Reference
            </div>

            {/* Headline */}
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold text-charcoal mb-6">
                Build with the
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-amber-flame">
                  {' '}Candlefish API
                </span>
              </h1>
              <p className="text-xl text-slate-600 leading-relaxed">
                Powerful AI capabilities at your fingertips. From simple text analysis 
                to complex multi-modal processing, our API makes it easy to integrate 
                advanced AI into your applications.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {features.map((feature) => {
                const Icon = feature.icon
                return (
                  <div key={feature.title} className="text-center">
                    <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <Icon className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h3 className="font-semibold text-charcoal mb-1">{feature.title}</h3>
                    <p className="text-sm text-slate-600">{feature.description}</p>
                  </div>
                )
              })}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Button size="xl" asChild>
                <Link href="/playground">
                  <Play className="w-5 h-5 mr-2" />
                  Try it Live
                </Link>
              </Button>
              <Button variant="outline" size="xl" asChild>
                <Link href="/reference">
                  View Documentation
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>

            {/* Quick stats */}
            <div className="flex items-center space-x-8 pt-6 border-t border-slate-200">
              <div>
                <div className="text-2xl font-bold text-emerald-600">99.9%</div>
                <div className="text-sm text-slate-600">Uptime SLA</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-600">&lt;200ms</div>
                <div className="text-sm text-slate-600">Avg Response</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-600">150+</div>
                <div className="text-sm text-slate-600">API Endpoints</div>
              </div>
            </div>
          </div>

          {/* Code Examples */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-charcoal mb-4">Quick Example</h3>
              <CodeBlock
                code={quickExample}
                language="bash"
                title="Request"
                showLineNumbers={false}
              />
            </div>
            
            <div>
              <CodeBlock
                code={responseExample}
                language="json"
                title="Response"
                showLineNumbers={false}
              />
            </div>
          </div>
        </div>

        {/* API Status */}
        <div className="mt-20 pt-16 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div className="status-operational">
              <div className="status-dot status-dot-green" />
              <span className="font-medium">All systems operational</span>
            </div>
            <Link
              href="/status"
              className="text-emerald-600 hover:text-emerald-700 font-medium text-sm"
            >
              View Status Page →
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}