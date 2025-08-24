import { Card, Button } from '@candlefish-ai/shared'
import { Rocket, CheckCircle, ExternalLink } from 'lucide-react'

export function QuickStart() {
  const steps = [
    {
      title: 'Get your API Key',
      description: 'Sign up for a Candlefish AI account and generate your API key',
      action: 'Get API Key',
      href: '/auth/signup'
    },
    {
      title: 'Install SDK',
      description: 'Choose your preferred language and install our SDK',
      action: 'View SDKs',
      href: '/sdks'
    },
    {
      title: 'Make your first call',
      description: 'Send your first API request and see the magic happen',
      action: 'Try Example',
      href: '/examples'
    }
  ]

  return (
    <Card className="p-8 bg-[#0f172a]/50 border-[#0f172a]/20">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-[#14b8a6]/20 rounded-lg">
          <Rocket className="h-6 w-6 text-[#14b8a6]" />
        </div>
        <h2 className="text-2xl font-bold text-[#e6f9f6]">Quick Start</h2>
      </div>

      <div className="space-y-6">
        {steps.map((step, index) => (
          <div key={index} className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-[#14b8a6] text-white rounded-full flex items-center justify-center font-semibold text-sm">
              {index + 1}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[#e6f9f6] mb-2">{step.title}</h3>
              <p className="text-[#a3b3bf] mb-4">{step.description}</p>
              <Button variant="outline" size="sm" asChild>
                <a href={step.href}>
                  {step.action}
                  <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-[#10b981]/10 border border-[#10b981]/20 rounded-lg">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-[#10b981] mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-[#10b981] font-medium text-sm">Ready in 5 minutes</div>
            <div className="text-[#a3b3bf] text-sm">
              Follow these steps and you'll have your first AI agent running in no time.
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
